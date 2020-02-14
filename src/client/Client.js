const EventEmitter = require('events').EventEmitter;
const Session = require('./Session');
const HTTPClient = require('../http/HTTPClient');
const Collection = require('../structs/Collection');
const Chat = require('../structs/Chat');
const ClientUser = require('../structs/ClientUser');

class Client extends EventEmitter {
    constructor(options) {
        super(options);
        this.http = new HTTPClient();
        this.session = new Session(this.http);
        this.options = {
            acceptPrivate: true,
            autoreconnect: true,
            ...options
        };
        this.chats = new Collection();
        this.rooms = new Collection();
        this.user = new ClientUser(options.username);

        options.chats.forEach(this.add.bind(this));

        if (options.username && options.password) {
            this.login(options.username, options.password);
        }

        if (options.password) {
            delete this.options.password;
        }
    }

    async login(user, pass) {
        const session = await this.session.login(user, pass);
        if (!session) return;

        this.user = new ClientUser(user, this);

        const promises = [
            this.user.fetchPrivateBlocks(),
            ...this.chats.array().map(chat => chat.connect())
        ];
        await Promise.all(promises);

        this.emit('ready', this);
    }

    logout() {
        this.session.logout();
    }

    connect(...wikis) {
        return Promise.all(wikis.map(this.add.bind(this)));
    }
    
    add(wiki) {
        const chat = new Chat(wiki, this);
        this.chats.set(wiki, chat);
        this.relay(chat, 'join');
        this.relay(chat, 'leave');
        this.relay(chat, 'message');
        this.relay(chat, 'message.private');
        this.relay(chat, 'kick');
        this.relay(chat, 'ban');
        this.relay(chat, 'unban');
        this.relay(chat, 'updateUser');
        this.relay(chat, 'room');
        this.relay(chat, 'room.main');
        this.relay(chat, 'room.private');
    }

    relay(emitter, type) {
        emitter.on(type, this.emit.bind(this, type));
    }
}


module.exports = Client;