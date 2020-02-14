module.exports = {
    // Main export
    Client: require('./client/Client'),
    
    // Structures
    Session: require('./client/Session'),
    Chat: require('./structs/Chat'),
    ChatUser: require('./structs/ChatUser'),
    ClientUser: require('./structs/ClientUser'),
    Collection: require('./structs/Collection'),
    Message: require('./structs/Message'),
    Room: require('./structs/Room'),
    Socket: require('./structs/Socket'),
    User: require('./structs/User'),

    // Models
    ChatEntry: require('./structs/models/ChatEntry'),
    InitQuery: require('./structs/models/InitQuery'),
    InlineAlert: require('./structs/models/InlineAlert'),
    LogoutCommand: require('./structs/models/LogoutCommand'),
    Status: require('./structs/models/Status'),

    // Handy stuff for the sake of completion
    HTTPClient: require('./http/HTTPClient')
};