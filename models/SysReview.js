const mongoose = require('mongoose');
const SysReviewSchema = new mongoose.Schema({

    vote: {
        type: String,
        required: false
    },
    user_id: {
        type: String,
        required: false
    },
    date: {
        type: Date,
        default: Date.now
    }

});

const SysReview = mongoose.model('SysReview', SysReviewSchema);

module.exports = SysReview