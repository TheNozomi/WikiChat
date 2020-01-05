const User = require('./User');
const Collection = require('./Collection');

class ClientUser extends User {
    constructor(name, client) {
        super(name, client);
        this.blocks = new Collection();
        this.blockedBy = new Collection();
    }

    async fetchPrivateBlocks() {
        const { blockedChatUsers, blockedByChatUsers } = await this.client.http.get('https://dev.fandom.com/index.php', {
            params: {
                action: 'ajax',
                rs: 'ChatAjax',
                method: 'getPrivateBlocks',
                NONCE: Date.now()
            }
        });
        blockedChatUsers.forEach(name => this.blocks.set(name, new User(name, this.client)));
        blockedByChatUsers.forEach(name => this.blockedBy.set(name, new User(name, this.client)));
    }

    blockAllowPrivate(name, dir) {
        return this.client.http.form(`https://doru.fandom.com/index.php`, {
            params: {
                action: 'ajax',
                rs: 'ChatAjax',
                method: 'blockOrBanChat'
            },
            data: {
                userToBan: name,
                token: this.client.session.token,
                dir
            }
        });
    }

    blockPrivate(name) {
        this.blocks.set(name, new User(name, this.client));
        return this.blockAllowPrivate(name, 'add');
    }

    unblockPrivate(name) {
        this.blocks.delete(name);
        return this.blockAllowPrivate(name, 'add');
    }
}

module.exports = ClientUser;