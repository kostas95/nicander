const mongoose = require('mongoose');
const NotificationSchema = new mongoose.Schema({

    status: {
        type: String,
        required: false
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    content: {
        type: String,
        required: false
    },
    user_id: {
        type: String,
        required: false
    },
    href: {
        type: String,
        required: false
    }

});

const Notification = mongoose.model('Notification', NotificationSchema);

module.exports = Notification