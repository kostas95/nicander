const mongoose = require('mongoose');
const DoctorSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true
    },
    surname: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    telephone: {
        type: String,
        required: true
    },
    str_num: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    specialty: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    authorized: {
        type: Boolean,
        default: false
    },
    date: {
        type: Date
    }
});

const Doctor = mongoose.model('Doctor', DoctorSchema);

module.exports = Doctor