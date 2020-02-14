const EventEmitter = require('events').EventEmitter;
const Collection = require('./Collection');
const Status = require('./models/Status');

class User extends EventEmitter {
    constructor(name, client) {
        super();
        this.client = client;
        this.name = name;
        this.chats = new Collection();
        this.lastMessage = null;
        this.userId = null;
        this.registrationDate = null;
    }

    resolvable() {
        let resolve,
        promise = new Promise(res => resolve = res);

        promise.resolve = resolve;

        return promise;
    }

    async getRegistration() {
        if (this.registrationDate) return await this.registrationDate;
        this.registrationDate = this.resolvable();

        const { query } = await this.client.http.get('https://community.fandom.com/api.php', {
            query: {
                action: 'query',
                list: 'users',
                ususers: this.name,
                usprop: 'registration',
                format: 'json'
            }
        });

        console.log(query);
    }

    parseAvatar(url) {
        return url.replace('.nocookie.net', '.com').replace(/\/scale-to-width-down\/\d+/, '');
    }

    checkDelete(obj, prop, selfProp, compare) {
        if (compare) {
            if (compare(obj[prop], this[selfProp])) {
                delete obj[prop];
            }
        } else if (obj[prop] == this[selfProp]) {
            delete obj[prop];
        }
    }

    update(attrs) {
        const check = this.checkDelete.bind(this, attrs);
        // check('name', 'name');
        check('since', 'since', (cur, old) => !cur || old && cur['0'] * 1000 == old.getTime());
        check('statusMessage', 'status', (cur, old) => cur == old.message);
        check('statusState', 'status', (cur, old) => cur == old.state);
        check('isModerator', 'mod');
        // check('canPromoteModerator', 'admin');
        check('isStaff', 'staff');
        check('groups', 'groups', (cur, old) => cur.sort().join('|') == old.sort().join('|'));
        check('avatarSrc', 'avatar', (cur, old) => this.parseAvatar(cur) == old);
        check('editCount', 'edits');
        // check('privateRoomId', 'privateRoom', (cur, old) => old && old.id == cur);
        delete attrs.name;
        delete attrs.canPromoteModerator;
        delete attrs.isPrivate;
        delete attrs.privateRoomId;
        delete attrs.active;

        const props = Object.getOwnPropertyNames(attrs);
        let i = props.length;

        if (i === 0) return;

        const oldProps = {};

        while (i--) {
            const prop = props[i],
            val = attrs[prop];

            switch (prop) {
                case 'since':
                    if (!val) {
                        console.log('Since changed but value reverted to null');
                        break;
                    }
                    oldProps.since = this.since;
                    this.since = new Date(val[0] * 1000);
                    break;
                case 'statusMessage':
                    oldProps.status = oldProps.status || new Status(null, this.status.state);
                    oldProps.status.message = val;
                    this.status.message = val;
                    break;
                case 'statusState':
                    oldProps.status = oldProps.status || new Status(this.status.message, null);
                    oldProps.status.state = val;
                    this.status.state = val;
                    break;
                case 'isModerator':
                    oldProps.mod = this.mod;
                    this.mod = val;
                    break;
                case 'isStaff':
                    oldProps.staff = this.staff;
                    this.staff = val;
                    break;
                case 'groups':
                    oldProps.groups = this.groups;
                    this.groups = val.sort();
                    break;
                case 'avatarSrc':
                    oldProps.avatar = this.avatar;
                    this.avatar = this.parseAvatar(val);
                    break;
                case 'editCount':
                    oldProps.edits = this.edits;
                    this.edits = val;
                    break;
                default:
                    console.log('Uncaught user attribute change', prop, val);
            }
        }

        this.emit('updateUser', this, oldProps);

        return oldProps;
    }
}

module.exports = User;