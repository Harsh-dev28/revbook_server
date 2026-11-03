const mongoose = require('mongoose')

const authorschema = new mongoose.Schema({

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
    profileImage: {
        type: String,
        required: true,
        default: ""
    },
    profileImage_id: {
        type: String,
        default: "",
    }
}, { timestamps: true });

module.exports = mongoose.model("Author", authorschema)
