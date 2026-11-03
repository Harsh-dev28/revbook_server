const mongoose = require('mongoose')

const bookshelfschema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    bookId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'book',
        required: true,
    },
    status: {
        type: String,
        required: true,
        default: 'want to read',
    },
}, { timestamps: true });

module.exports = mongoose.model('booksheolf', bookshelfschema);

