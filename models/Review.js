const mongoose = require('mongoose');
const ReviewSchema = new mongoose.Schema({

    comment: {
        type: String,
        required: false
    },
    rating: {
        type: Number,
        required: false
    },
    patient: {
        id: {
            type: String,
            required: false
        },
        name: {
            type: String,
            required: false
        },
        surname: {
            type: String,
            required: false
        }
    },
    doctor: {
        id: {
            type: String,
            required: false
        },
        name: {
            type: String,
            required: false
        },
        surname: {
            type: String,
            required: false
        }
    },
    appointment_id: {
        type: String,
        required: false
    },
    date: {
        type: Date,
        default: Date.now
    }

});

const Review = mongoose.model('Review', ReviewSchema);

module.exports = Review