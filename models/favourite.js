const mongoose = require("mongoose")

const favoriteSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    book: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "book",
        required: true
    },
}, { timestamps: true });

favoriteSchema.index({ user: 1, book: 1 }, { unique: true }); // prevents adding same book twice

module.exports = mongoose.model("favorite", favoriteSchema)