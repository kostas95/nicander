const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({

    timestamp: {
        type: Date,
        default: Date.now
    },

    title: {
        type: String
    },

    content: {
        type: String
    },

    author: {
        type: String
    }

});

const Post = mongoose.model('Post', PostSchema);

module.exports = Post