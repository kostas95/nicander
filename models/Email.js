const mongoose = require('mongoose');

const EmailSchema = new mongoose.Schema({



    date: {
        type: Date,
        default: Date.now
    },

    subject: {
        type: String
    },

    body: {
        type: String
    },

    sender: {
        type: String
    },

    receivers: {
        type: String
    }

});

const Email = mongoose.model('Email', EmailSchema);

module.exports = Email