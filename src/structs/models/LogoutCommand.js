class LogoutCommand {
    constructor(attrs) {

    }

    json() {
        return {
            msgType: 'command',
            command: 'logout'
        };
    }

    xport() {
        return JSON.stringify({
            attrs: this.json()
        });
    }
}

module.exports = LogoutCommand;