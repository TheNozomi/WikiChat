const EventEmitter = require('events').EventEmitter;

class Session extends EventEmitter {
    constructor(http) {
        super(http);
        this.http = http;
        this.loggingIn = false;
        this.loggedIn = false;
        this.token = null;
        this.accessToken = null;
        this.refreshToken = null;
        this.userId = null;
        this.name = null;
    }

    async _login(username, password) {
        const loginResult = await this.http.form('https://services.fandom.com/auth/token', {
            data: {
                username: username,
                password: password
            }
        });

        this.accessToken = loginResult.access_token;
        this.refreshToken = loginResult.refresh_token;
        this.userId = loginResult.user_id;
        const tokenResult = await this.http.get('https://community.fandom.com/api.php', {
            params: {
                action: 'query',
                titles: 'TODO:EasterEgg',
                prop: 'info',
                intoken: 'edit',
                format: 'json'
            }
        });

        this.token = tokenResult.query.pages['-1'].edittoken;
        this.name = username;
        return this;
    }

    login(username, password) {
        if (this.loggingIn || this.loggedIn) return;
        this.loggingIn = true;
        return this._login(username, password).then(r => {
            this.loggingIn = false;
            this.loggedIn = true;
            return r;
        }).catch(e => {
            this.loggingIn = false;
            throw e;
        })
    }

    logout() {
        this.token = null;
        this.userId = null;
        this.loggedIn = false;
        this.accessToken = null;
        this.refreshToken = null;
        this.http.jar.removeAllCookiesSync();
    }
}

module.exports = Session;
