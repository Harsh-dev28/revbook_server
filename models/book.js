const mongoose = require('mongoose');

const bookschema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    author: {
        type: String,
        required: [true, 'Author name is required'],
        trim: true,
    },
    description: {
        type: String,
        trim: true,
        maxlength: [3000, 'Description cannot exceed 3000 characters'],
    },
    coverImage: {
        type: String, // Cloudinary URL
        default: '',
    },
    cover_id: {
        type: String,
        default: '',
    },
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
    },
    genre: [
        {
            type: String,
            trim: true,
        },
    ],
    pageCount: {
        type: Number,
        min: 1,
    },
    publishedDate: {
        type: String,
    },
    isbn: {
        type: String,
        trim: true,
        unique: true,
        sparse: true,
    },

    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
    },
    reviewsCount: {
        type: Number,
        default: 0,
    },
    aiSummary: {
        type: String,
        default: '',
    },
    aiSummaryCount: {
        type: Number,
        default: 0,
    },
    aiSummaryAt: {
        type: Date,
    },

}, { timestamps: true });

module.exports = mongoose.model("book", bookschema)