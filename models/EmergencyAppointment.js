const mongoose = require('mongoose');
const EmergencyAppointmentSchema = new mongoose.Schema({

    type: {
        type: String,
        default: 'appointment',
        required: false
    },
    doctor: {
        id: {
            type: String,
            required: false
        },
        socket_id: {
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
        },
        email: {
            type: String,
            required: false
        }
    },
    patient: {
        id: {
            type: String,
            required: false
        },
        socket_id: {
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
        },
        email: {
            type: String,
            required: false
        },
        telephone: {
            type: String,
            required: false
        },
        year: {
            type: String,
            required: false
        },
        day: {
            type: String,
            required: false
        },
        month: {
            type: String,
            required: false
        },
        gender: {
            type: String,
            required: false
        }
    },
    chat: [{
        message: {
            type: String,
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
        from: {
            type: String,
            required: false
        },
        to: {
            type: String,
            required: false
        },
        date: {
            type: String,
            required: false
        },
        time: {
            type: String,
            required: false
        }
    }],
    diagnosis: {
        diagnosis: {
            type: String,
            required: false
        },
        treatment: {
            type: String,
            required: false
        },
        comments: {
            type: String,
            required: false
        },
        date: {
            type: Date,
            default: Date.now
        }
    },
    connectedUsers: {
        type: Number,
        default: 0,
        required: false
    },
    ignored_by: {
        type: String,
        required: false
    },
    registered: {
        type: Boolean,
        required: false
    },
    date: {
        type: Date,
        default: Date.now
    }

});

const EmergencyAppointment = mongoose.model('EmergencyAppointment', EmergencyAppointmentSchema);

module.exports = EmergencyAppointment