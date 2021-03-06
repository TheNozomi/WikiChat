const EventEmitter = require('events').EventEmitter;
const Collection = require('./Collection');
const MediaWikiMessageCollection = require('./MediaWikiMessageCollection');
const Socket = require('./Socket');
const Room = require('./Room');

class Chat extends EventEmitter {
    constructor(wiki, client) {
        super();
        this.client = client;
        if (typeof wiki === 'string') {
            this.name = wiki;
            this.lang = '';
            this.interwiki = this.name;
        } else {
            this.lang = (!wiki.lang || wiki.lang === 'en') ? '' : wiki.lang;
            this.name = this.lang ? `${wiki.lang}.${wiki.name}` : wiki.name;
            this.interwiki = wiki.name;
        }
        this.url = `https://${this.interwiki}.fandom.com${this.lang ? `/${this.lang}` : ''}`;

        this.mwMessages = new MediaWikiMessageCollection();
        this.wgVariables = new Collection();

        this.room = null;
        this.privates = new Collection();
        
        this.allowed = null;
        this.blocked = null;
        this.banned = null;
        
        // Connection variables
        this.roomId = null;
        this.wikiId = null;
        this.port = null;
        this.host = null;
        this.key = null;
    }

    getPath(path) {
        return `${this.url}/${path}`;
    }

    get(path, options) {
        return this.client.http.get(this.getPath(path), options);
    }

    addRoom(room, users) {
        this.relay(room, 'join');
        this.relay(room, 'leave');
        this.relay(room, 'message');
        this.relay(room, 'kick');
        this.relay(room, 'ban');
        this.relay(room, 'unban');
        this.relay(room, 'updateUser');
        if (room.isPrivate) {
            const others = users.filter(name => name != this.client.user.name);
            this.privates.set(room.roomId, room);
            if (others.length === 1) {
                this.room.chat.privates.set(others[0], room);
            }
            room.connect();
            this.emit('room.private', room);
        } else {
            if (this.room) {
                console.log('Connected to a main room, but main room already exists!');
                return;
            } else {
                this.room = room;
                this.emit('room.main', room);
            }
        }
        this.emit('room', room);
    }

    relay(emitter, type) {
        emitter.on(type, this.emit.bind(this, type));
    }

    async connect() {
        this.addRoom(new Room(null, this));

        await Promise.all([
            this.getSelfInfo(),
            this.getChatInfo(),
            this.getWikiInfo(),
            this.getMessages(),
        ]);
        if (this.allowed) {
            await this.room.connect();
        } else {
            // TODO: Branch into different error classes
            if (this.banned) {
                throw new Error('Cannot connect to chat: Banned from chat');
            }
            if (this.blocked) {
                throw new Error('Cannot connect to chat: Blocked from the wiki');
            }
        }
    }

    async getSelfInfo() {
        const [
            ban,
            profile
        ] = await Promise.all([
            this.get(`wikia.php`, {
                params: {
                    controller: 'ChatBanListSpecial',
                    method: 'axShowUsers',
                    username: this.client.session.name,
                    format: 'json'
                }
            }),
            this.get(`wikia.php`, {
                params: {
                    controller: 'UserProfilePage',
                    method: 'renderUserIdentityBox',
                    title: 'User:' + this.client.session.name,
                    format: 'json',
                    uselang: 'en'
                }
            })
        ]);
        this.banned = !!ban.aaData;
        this.blocked = !!profile.isBlocked;
        this.allowed = !this.banned && !this.blocked;
    }

    async getChatInfo() {
        const data = await this.get('wikia.php', {
            params: {
                controller: 'Chat',
                format: 'json'
            }
        });
        this.room.isPrivate = false;
        this.room.roomId = Number(data.roomId);
        this.roomId = Number(data.roomId);
        this.key = data.chatkey;
        this.port = data.chatServerPort;
        this.host = data.chatServerHost;
        
        const match = data.globalVariablesScript.match(/mw\.config\.set\(([\s\S]+)\);\s*}<\/script>/);
        if (match) {
            const obj = JSON.parse(this.sanitizeJson(match[1]));
            this.wgVariables.setAll(obj);
        }
    }

    async getWikiInfo() {
        const { query } = await this.get('api.php', {
            params: {
                action: 'query',
                meta: 'siteinfo',
                siprop: 'wikidesc',
                format: 'json'
            }
        });

        this.wikiId = query.wikidesc.id;
    }

    async getMessages() {
        const { query } = await this.get(`api.php`, {
            params: {
                action: 'query',
                meta: 'allmessages',
                ammessages: [
                    'chat-user-joined',
                    'chat-user-parted',
                    'chat-welcome-message',
                    'chat-user-was-kicked',
                    'chat-you-were-kicked',
                    'chat-user-was-banned',
                    'chat-you-were-banned',
                    'chat-user-was-unbanned',
                    'chat-you-were-unbanned'
                ].join('|'),
                format: 'json'
            }
        });
        query.allmessages.forEach((kv) => this.mwMessages.set(kv.name, kv['*']));
    }

    sanitizeJson(string) {
        return string
            .replace(/\\'/g, "'")                       // http://stackoverflow.com/questions/6096601 - names with ' r for tards
            .replace(/\\x([0-9a-f]{2})/g, '\\u00$1')    // http://stackoverflow.com/questions/21085673
            // https://stackoverflow.com/a/27725393
            .replace(/\\n/g, "\\n")
            .replace(/\\'/g, "\\'")
            .replace(/\\"/g, '\\"')
            .replace(/\\&/g, "\\&")
            .replace(/\\r/g, "\\r")
            .replace(/\\t/g, "\\t")
            .replace(/\\b/g, "\\b")
            .replace(/\\f/g, "\\f")
            .replace(/[\u0000-\u0019]+/g,""); 
    }

}

module.exports = Chat;