const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({


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
        type: String
    }

});

const Message = mongoose.model('Message', MessageSchema);

module.exports = Message