const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({

    name: {
        type: String,
        required: false
    },
    surname: {
        type: String,
        required: false
    },
    email: {
        type: String,
        required: false
    },
    telephone: {
        type: String,
        required: false
    },
    str_num: {
        type: String,
        required: false
    },
    password: {
        type: String,
        required: false
    },
    specialty: {
        type: String,
        required: false
    },
    type: {
        type: String,
        required: false
    },
    authorized: {
        type: Boolean,
        required: false
    },
    gender: {
        type: String,
        required: false
    },
    dd: {
        type: String,
        required: false
    },
    mm: {
        type: String,
        required: false
    },
    yy: {
        type: String,
        required: false
    },
    location: {
        type: String,
        required: false
    },
    post_code: {
        type: String,
        required: false
    },
    description: {
        type: String,
        required: false
    },
    specialization: [{
        type: String,
        required: false
    }],
    cv: [{
        year_from: {
            type: Number,
            required: false
        },
        year_to: {
            type: Number,
            required: false
        },
        job: {
            type: String,
            required: false
        },
    }],
    schedule: {
        Monday: [String],
        Tuesday: [String],
        Wednesday: [String],
        Thursday: [String],
        Friday: [String],
        Saturday: [String],
        Sunday: [String]
    },
    languages: [{
        type: String,
        required: false
    }],
    website: {
        type: String,
        required: false
    },
    reviews: [{
        comment: {
            type: String,
            required: false
        },
        rating: {
            type: Number,
            required: false
        }
    }],
    banned: {
        type: Boolean,
        default: false,
        required: false
    },
    date: {
        type: Date,
        default: Date.now
    }
});

const User = mongoose.model('User', UserSchema);

module.exports = User