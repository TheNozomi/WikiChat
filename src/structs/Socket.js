const { EventEmitter } = require('events');
const io = require('socket.io-client');
const ChatUser = require('./ChatUser');
const Message = require('./Message');
const InitQuery = require('./models/InitQuery');

class Socket extends EventEmitter {
    constructor(room) {
        super();

        this.room = room;
        
        // Connection variables
        this.firstConnect = true;
        this.connected = false;
        this.socket = null;
        this.wikiId = null;
        this.name = null;
        this.port = null;
        this.host = null;
        this.key = null;

        this._connecting = this.resolvable();
        this._ready = this.resolvable();

        // For handling leave timeout offsets
        this.partTimeouts = {};
    }

    resolvable() {
        let resolve,
        promise = new Promise(res => resolve = res);

        promise.resolve = resolve;

        return promise;
    }

    async send(data) {
        await this._connecting;

        if (typeof data.xport == 'function') {
            this.socket.send(data.xport());
        } else {
            this.socket.send(data);
        }
    }

    async connect() {
        this.roomId = this.room.roomId;
        this.wikiId = this.room.chat.wikiId;
        this.name = this.room.chat.client.user.name;
        this.port = this.room.chat.port;
        this.host = this.room.chat.host;
        this.key = this.room.chat.key;

        if (this.firstConnect) {
            this.firstConnect = false;
        } else {
            this._connecting = this.resolvable();
            this._ready = this.resolvable();
        }

        this.socket = this.createSocket();

        await this._ready;

        return this;
    }

    getSocketUrl() {
        return `https://${this.host}:${this.port}`;
    }

    createSocket() {
        this.socket = io.connect(this.getSocketUrl(), {
            query: {
                name: this.name,
                key: this.key,
                roomId: this.roomId,
                serverId: this.wikiId
            }
        });
        this.socket.on('connect', this.onConnect.bind(this));
        this.socket.on('message', this.onMessage.bind(this));
        this.socket.on('disconnect', this.onDisconnect.bind(this));
        return this.socket;
    }

    onConnect() {
        this.connected = true;
        this._connecting.resolve(this);
        this.send(new InitQuery());
        this.emit('connected');
    }

    onMessage(message) {
        const event = message.event.split(':').shift(),
        method = this['on_' + event];

        let data;
        try {
            if (message.data) {
                data = typeof message.data == 'object'
                    ? data
                    : JSON.parse(message.data);
            }
        } catch(e) {
            console.log('Unable to parse message', message);
            return;
        }

        if (method) {
            method.call(this, data);
        } else {
            console.log('Unhandled event', event, data);
        }

        this.emit('event', message);
    }

    onDisconnect() {
        this.connected = false;
        this.emit('disconnected');
    }

    on_meta() {
        // Do nothing
    }

    on_disableReconnect() {
        // Do nothing
    }

    on_initial({ collections }) {
        const { chats, users, privateUsers, blockedUsers, blockedByUsers } = collections;

        users.models.forEach(model => {
            const user = new ChatUser(model.attrs, this.room);
            this.room.users.set(user.name, user);
        });

        chats.models.forEach(model => {
            const { attrs } = model,
            message = new Message(attrs, this.room, this.room.users.get(attrs.name));
            this.room.messages.set(message.id, message);
        });

        if (privateUsers.models.length) {
            console.log('Private users exists');
        }

        if (blockedUsers.models.length) {
            console.log('Blocked users exists');
        }

        if (blockedByUsers.models.length) {
            console.log('Blocked by users exists');
        }

        this._ready.resolve();
    }

    on_join({ attrs }) {
        if (this.partTimeouts[attrs.name]) {
            clearTimeout(this.partTimeouts[attrs.name]);
            delete this.partTimeouts[attrs.name];
        }
        const existing = this.room.users.get(attrs.name);
        if (existing) {
            console.log('Joined while already in room; update');
            this.on_updateUser({ attrs }, existing);
            return;
        }
        const user = new ChatUser(attrs, this.room);
        this.emit('join', user);
    }

    onLeave(attrs) {
        delete this.partTimeouts[attrs.name];
        const user = this.room.users.get(attrs.name);
        if (!user) {
            console.log('User left without being in chat', attrs, this.room.users);
            return;
        }
        this.emit('leave', user);
    }

    on_part({ attrs }) {
        if (this.partTimeouts[attrs.name]) {
            console.log('Double parting', attrs);
            return;
        }
        this.partTimeouts[attrs.name] = setTimeout(this.onLeave.bind(this, attrs), 45000);
    }

    on_logout({ attrs }) {
        if (this.partTimeouts[attrs.name]) {
            console.log('Double parting', attrs);
            return;
        }
        this.partTimeouts[attrs.name] = setTimeout(this.onLeave.bind(this, attrs), 10000);
    }

    on_chat({ attrs }) {
        const user = this.room.users.get(attrs.name);
        if (!user) {
            console.log('Received message from non-existent user', attrs, this.room.users);
            return;
        }
        const message = new Message(attrs, this.room, user);
        this.emit('message', message);
    }

    on_kick({ attrs }) {
        if (this.partTimeouts[attrs.kickedUserName]) {
            clearTimeout(this.partTimeouts[attrs.kickedUserName]);
            delete this.partTimeouts[attrs.kickedUserName];
        }
        attrs.room = this.room;
        this.emit('kick', attrs);
    }

    on_ban({ attrs }) {
        if (this.partTimeouts[attrs.kickedUserName]) {
            clearTimeout(this.partTimeouts[attrs.kickedUserName]);
            delete this.partTimeouts[attrs.kickedUserName];
        }
        attrs.room = this.room;
        this.emit('ban', attrs);
    }

    on_updateUser({ attrs }, obj) {
        const user = obj || this.room.users.get(attrs.name);
        if (!user) {
            console.log('Called updateUser on a non-existent user', attrs, this.room.users);
            return;
        }
        const oldProps = user.update(attrs);
        this.emit('updateUser', user, oldProps);
    }

    on_openPrivateRoom({ attrs }) {
        const Room = require('./Room');

        const existing = this.room.chat.privates.get(attrs.roomId);

        if (existing) {
            // console.log('Called onPrivateRoom while room already exists; this is normal');
            return;
        }

        const room = new Room(attrs.roomId, this.room.chat);

        this.room.chat.addRoom(room, attrs.users);

        this.emit('openPrivateRoom', room);
    }
}

module.exports = Socket;