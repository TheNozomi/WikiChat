// TODO: everything, ditinguish in declaration and usage Room from Chat
const EventEmitter = require('events').EventEmitter;
const Collection = require('./Collection');
const Socket = require('./Socket');
const Message = require('./Message');
const Models = {
    LogoutCommand: require('./models/LogoutCommand'),
    Status: require('./models/Status')
};

class Room extends EventEmitter {
    constructor(id, chat) {
        super();
        this.clientUsername = chat.client.user.name;

        this.roomId = id || chat.roomId;
        this.isPrivate = id !== null && id !== chat.roomId;

        this.users = new Collection();
        this.messages = new Collection();
        this.pendingMessages = new Collection();

        this.socket = this.createSocket();
    }

    async connect() {
        await this.socket.connect();
    }

    async leave() {
        this.socket.send(new Models.LogoutCommand());
        setTimeout(()=> this.socket.socket.disconnect(), 1000);
    }

    async setStatus(message, state) {
        this.socket.send(new Models.Status(message, state));
    }

    createSocket() {
        const socket = new Socket(this);
        socket.on('join', this.onJoin.bind(this));
        socket.on('leave', this.onLeave.bind(this));
        socket.on('message', this.onMessage.bind(this));
        socket.on('kick', this.onKick.bind(this));
        socket.on('ban', this.onBan.bind(this));
        socket.on('updateUser', this.onUpdateUser.bind(this));
        socket.on('openPrivateRoom', this.onOpenPrivateRoom.bind(this));
        return socket;
    }

    async send(text) {
        await this.socket._ready;
        this.socket.send(
            new Message({
                text,
                name: this.clientUsername
                roomId: this.roomId
            },
            this,
            this.users.get(this.clientUsername))
        );
    }

    onJoin(user) {
        this.users.set(user.name, user);
        this.emit('join', user);
    }

    onLeave(user) {
        this.users.delete(user.name);
        this.emit('leave', user);
    }

    onMessage(message) {
        this.messages.set(message.id, message);
        this.users.get(message.user.name).lastMessage = message;
        this.emit('message', message);
        if (this.isPrivate) {
            this.emit('message.private', message);
        }
        if (message.self) {
            this.emit('message.self', message);
        }
    }

    onKick(event) {
        this.emit('kick', event.room, this.users.get(event.kickedUserName), this.users.get(event.moderatorName));
        setTimeout(() => this.users.delete(event.kickedUserName), 1500); // timeout before deleting because some socket events may arrive late
    }

    onBan(event) {
        let banEvent = {
            moderator: this.users.get(event.moderatorName),
            reason: event.reason
        }
        if (parseInt(event.time) !== 0) { // ban
            banEvent.bannedUser = this.users.get(event.kickedUserName);
            banEvent.banLength = parseInt(event.time);
            this.emit('ban', event.room, banEvent);
            setTimeout(() => this.users.delete(event.kickedUserName), 1500); // timeout before deleting because some socket events may arrive late
        } else { // unban
            banEvent.unbannedUserName = event.kickedUserName;
            this.emit('unban', event.room, banEvent);
        }
    }

    onUpdateUser(user, oldProps) {
        this.emit('updateUser', user, oldProps);
    }

    onOpenPrivateRoom(room) {
        this.emit('room', room);
        this.emit('room.private', room);
    }

}

module.exports = Room;