const EventEmitter = require('events').EventEmitter;

class Status extends EventEmitter {
    constructor(message, status) {
        super();
        this.message = message;
        this.state = status;
    }

    json() {
        return {
            msgType: 'command',
            command: 'setstatus',
            statusMessage: this.message,
            statusState: this.state
        };
    }

    xport() {
        return JSON.stringify({
            attrs: this.json()
        });
    }
}

module.exports = Status;