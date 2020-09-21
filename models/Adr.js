const mongoose = require('mongoose');
const AdrSchema = new mongoose.Schema({

    name: {
        type: String,
        required: false
    },
    surname: {
        type: String,
        required: false
    },
    gender: {
        type: String,
        required: false
    },
    dob: {
        type: String,
        required: false
    },
    reason: {
        type: String,
        required: false
    },
    advised_by: {
        type: String,
        required: false
    },
    address: {
        type: String,
        required: false
    },
    telephone: {
        type: String,
        required: false
    },
    email: {
        type: String,
        required: false
    },
    medicines: [
        {
            name: {
                type: String,
                required: false
            },
            quantity: {
                type: String,
                required: false
            },
            expiry_date: {
                type: String,
                required: false
            },
            date_start: {
                type: String,
                required: false
            },
            date_stop: {
                type: String,
                required: false
            },
            dosage: {
                type: String,
                required: false
            }
        }
    ],
    side_effect_start: {
        type: String,
        required: false
    },
    side_effect_end: {
        type: String,
        required: false
    },
    side_effect_continuing: {
        type: String,
        required: false
    },
    side_effect_severity: {
        type: String,
        required: false
    },
    side_effect_description: {
        type: String,
        required: false
    },
    date: {
        type: Date,
        default: Date.now
    }

});

const Adr = mongoose.model('Adr', AdrSchema);

module.exports = Adr