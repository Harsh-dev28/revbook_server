const mongoose = require('mongoose');

const likeschema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'user'
    },
    reviewId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Review'
    }
}, { timestamps: true });

// ek user ek review ko sirf ek baar like kar sakta hai
likeschema.index({ userId: 1, reviewId: 1 }, { unique: true });

// ek review ke likes jaldi gin-ne ke liye
likeschema.index({ reviewId: 1 });

module.exports = mongoose.model('Like', likeschema);
