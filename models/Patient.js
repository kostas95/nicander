const mongoose = require('mongoose');
const PatientSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    date: {
        type: Date
    }
});

const Patient = mongoose.model('Patient', PatientSchema);

module.exports = Patient