const EventEmitter = require('events').EventEmitter;

class InitQuery extends EventEmitter {
    json() {
        return {
            msgType: 'command',
            command: 'initquery'
        };
    }

    xport() {
        return JSON.stringify({
            attrs: this.json()
        });
    }
}

module.exports = InitQuery;