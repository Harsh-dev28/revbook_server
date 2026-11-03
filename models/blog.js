
const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({

    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true
    },

    content: {
        type: String,
        required: true,
    },

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },

    book: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'book',
        required: true,
    },

    tags: [
        {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
    ],

    status: {
        type: String,
        enum: ['draft', 'published'],
        default: 'draft',
    },

    likes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true,
        },
    ],

    likesCount: {
        type: Number,
        default: 0,
        required: true,
    },

    aiSummary: {
        type: String,
        default: null
    },

}, { timestamps: true });

blogSchema.index({ user: 1, createdAt: -1 });
blogSchema.index({ book: 1 });

module.exports = mongoose.model('Blog', blogSchema);
