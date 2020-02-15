const User = require('./User');
const Status = require('./models/Status');

class ChatUser extends User {
    constructor(attrs, room) {
        super(attrs.name, room.chat._client);
        this.room = room;
        this.chat = room.chat;
        this.since = attrs.since
            ? new Date(attrs.since['0'] * 1000)
            : null;
        this.status = new Status(attrs.statusMessage, attrs.statusState);
        this.mod = attrs.isModerator;
        // this.admin = attrs.canPromoteModerator;
        this.staff = attrs.isStaff;
        this.avatar = this.parseAvatar(attrs.avatarSrc);
        this.edits = attrs.editCount;
        this.groups = attrs.groups.sort();
        this.privateRoom = null;
    }

    createPrivateRoom() {
        if (this.privateRoom) return this.privateRoom;

    }

    privateMessage() {

    }
}

module.exports = ChatUser;