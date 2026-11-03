const mongoose = require('mongoose');

const userschema = new mongoose.Schema({

    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    profileimage: {
        type: String,
        required: true,
    },
    profileimage_id: {
        type: String,
        default: "",
    },
    bio: {
        type: String,
        required: true,
        default: "",
    },
    favouritegenere: {
        type: String,
        required: true,
        // enum: ["Self Help", "Fictional", "Non-Fictional", "Fantasy", "Sci-Fi"],
    }

}, { timestamps: true })

module.exports = mongoose.model("user", userschema)