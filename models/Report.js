const mongoose = require('mongoose');
const ReportSchema = new mongoose.Schema({

    user_id: {
        type: String,
        required: false
    },
    reason: {
        type: String,
        required: false
    },
    reporting_user: {
        type: String,
        required: false
    }
});

const Report = mongoose.model('Report', ReportSchema);

module.exports = Report