const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({



    date: {
        type: Date,
        default: Date.now
    },

    message: {
        type: String
    },

    name: {
        type: String
    },

    surname: {
        type: String
    },

    email: {
        type: String
    },

    status: {
        type: String,
        default: 'unread'
    },

    replies: [{
        body: {
            type: String
        },
        sender: {
            type: String
        },
        date: {
            type: Date,
            default: Date.now
        }
    }]

});

const Message = mongoose.model('Message', MessageSchema);

module.exports = Message