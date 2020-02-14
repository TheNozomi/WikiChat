const EventEmitter = require('events').EventEmitter;

class ChatEntry extends EventEmitter {
    constructor(attrs, room) {
        super();
        this.room = room;
        this.id = attrs.id;
        this.text = attrs.text;
        this.time = attrs.timeStamp
            ? new Date(attrs.timeStamp)
            : null;
        this.continued = !!attrs.continued;
        if (attrs.temp) {
            console.log('Encountered temp inline alert', this);
        }
    }

    json() {
        return {
            msgType: 'chat',
            roomId: this.room.roomId,
            avatarSrc: '',
            name: '',
            text: this.text,
            timeStamp: this.time
                ? this.time.getTime()
                : '',
            continued: this.continued,
            temp: false
        };
    }

    xport() {
        return JSON.stringify({
            attrs: this.json()
        });
    }
}

module.exports = ChatEntry;