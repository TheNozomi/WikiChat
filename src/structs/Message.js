const ChatEntry = require('./models/ChatEntry');

class Message extends ChatEntry {
    constructor(attrs, room, user) {
        super(attrs, room);
        this.name = attrs.name;
        this.user = user;
        this.self = room.chat.client.user.name == this.name;
        this.avatar = attrs.avatarSrc || user.avatar;
    }

    json() {
        return {
            ...super.json(),
            name: this.name,
            avatarSrc: this.avatar
        };
    }
}

module.exports = Message;