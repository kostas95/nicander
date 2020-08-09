const mongoose = require('mongoose');
var Message = require('./Message');

const ChatSchema = new mongoose.Schema({
    User1: {
        name: {
            type: String,
            required: true
        },

        id:{
            type: String,
            required: true
        }
    },
    
    User2:{
        name: {
            type: String,
            required: true
        },

        id:{
            type: String,
            required: true
        }
    },
    
    Messages: [ {
        // _id: 1111,
        timestamp:{
            type: Date//,
            //required: true
        },

        sentByUser: {
            type: String
        },

        sentByUser_id: {
            type: String
        },

        sentToUser: {
            type: String
        },

        sentToUser_id: {
            type: String
        },

        body: {
            type: String//,
            //required: true 
        }
    } ]
    
});

const Chat = mongoose.model('Chat', ChatSchema);

module.exports = Chat