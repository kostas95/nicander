const mongoose = require('mongoose');
const AppointmentSchema = new mongoose.Schema({

    type: {
        type: String,
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
        },
        specialty: {
            type: String,
            required: false
        },
        status: {
            type: String,
            default: 'offline',
            required: false
        },
        timesConnected: {
            default: 0,
            type: Number,
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
        status: {
            type: String,
            default: 'offline',
            required: false
        },
        timesConnected: {
            default: 0,
            type: Number,
            required: false
        }
    },
    timestamp: {
        type: String,
        required: false
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
    files: {
        type: String,
        required: false
    },
    date: {
        type: Date,
        default: Date.now
    }

});

const Appointment = mongoose.model('Appointment', AppointmentSchema);

module.exports = Appointment