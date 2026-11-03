const mongoose = require('mongoose');

const reviewschema = new mongoose.Schema({

    book: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'book',
        required: true
    },

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },

    rating: {
        type: Number,
        required: true,
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating must be at most 5']
    },

    reviewText: {
        type: String,
        required: true,
        trim: true,
        maxlength: [1000, 'Review cannot exceed 1000 characters']
    },
}, { timestamps: true });

reviewschema.index({ user: 1, book: 1 }, { unique: true });

reviewschema.index({ book: 1, createdAt: -1 });

module.exports = mongoose.models.Review || mongoose.model('Review', reviewschema);