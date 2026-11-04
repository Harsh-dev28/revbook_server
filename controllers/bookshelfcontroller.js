const mongoose = require('mongoose');
const Bookshelf = require('../models/bookshelf');

const normalizeEntry = (entry) => {
    if (!entry) return null;
    const obj = entry.toObject ? entry.toObject() : { ...entry };
    return {
        ...obj,
        book: obj.bookId
    };
};

class bookshelfcontroller {

    static addbookshelf = async (req, res) => {
        try {
            const { bookId, status } = req.body || {};
            const targetBookId = bookId || req.params?.id;

            if (!targetBookId) {
                return res.status(400).json({
                    success: false,
                    message: "Book id is required"
                });
            }

            if (!mongoose.Types.ObjectId.isValid(targetBookId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid Book id"
                });
            }

            const existing = await Bookshelf.findOne({
                userId: req.user._id,
                bookId: targetBookId,
            }).populate('bookId');

            if (existing) {
                if (status && existing.status !== status) {
                    existing.status = status;
                    await existing.save();
                }
                const normalized = normalizeEntry(existing);
                return res.status(200).json({
                    success: true,
                    message: "Bookshelf entry updated",
                    bookshelf: existing,
                    bookshlef: existing,
                    item: normalized
                });
            }

            const newentry = await Bookshelf.create({
                userId: req.user._id,
                bookId: targetBookId,
                status: status || "Want to read",
            });

            const populated = await Bookshelf.findById(newentry._id).populate('bookId');
            const normalized = normalizeEntry(populated);

            return res.status(201).json({
                success: true,
                message: "Book added to shelf successfully",
                bookshelf: populated,
                bookshlef: populated,
                item: normalized
            });

        } catch (error) {
            console.error("Add bookshelf error:", error);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    };

    static getallbookshelf = async (req, res) => {
        try {
            const { status } = req.query;

            const filter = { userId: req.user._id };
            if (status && status !== 'all') filter.status = status;

            const foundbookshelf = await Bookshelf.find(filter)
                .populate('bookId')
                .sort({ createdAt: -1 });

            const normalizedList = foundbookshelf.map(normalizeEntry);

            return res.status(200).json({
                success: true,
                count: foundbookshelf.length,
                Bookshelf: normalizedList,
                bookshelf: normalizedList,
                bookshlef: normalizedList
            });

        } catch (error) {
            console.error("Get bookshelf error:", error);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    };

    static getbookshelfbyid = async (req, res) => {
        try {
            if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                return res.status(400).json({ success: false, message: "Invalid id" });
            }

            const foundentry = await Bookshelf.findById(req.params.id).populate('bookId');

            if (!foundentry) {
                return res.status(404).json({
                    success: false,
                    message: "Bookshelf entry not found"
                });
            }

            if (foundentry.userId.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: "Not authorized to view this entry"
                });
            }

            return res.status(200).json({
                success: true,
                bookshelf: normalizeEntry(foundentry),
                bookshlef: normalizeEntry(foundentry)
            });

        } catch (error) {
            console.error("Get bookshelf by id error:", error);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    };

    static updatebookshelf = async (req, res) => {
        try {
            const { status } = req.body;

            if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                return res.status(400).json({ success: false, message: "Invalid bookshelf id" });
            }

            const foundentry = await Bookshelf.findById(req.params.id).populate('bookId');

            if (!foundentry) {
                return res.status(404).json({
                    success: false,
                    message: "Bookshelf entry not found"
                });
            }

            if (foundentry.userId.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: "Not authorized to update this entry"
                });
            }

            if (status) foundentry.status = status;

            await foundentry.save();

            const normalized = normalizeEntry(foundentry);

            return res.status(200).json({
                success: true,
                message: "Bookshelf entry updated",
                bookshelf: foundentry,
                bookshlef: foundentry,
                item: normalized
            });

        } catch (error) {
            console.error("Update bookshelf error:", error);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    };

    static deletebookshelf = async (req, res) => {
        try {
            if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                return res.status(400).json({ success: false, message: "Invalid bookshelf id" });
            }

            const foundentry = await Bookshelf.findById(req.params.id);

            if (!foundentry) {
                return res.status(404).json({
                    success: false,
                    message: "Bookshelf entry not found"
                });
            }

            if (foundentry.userId.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: "Not authorized to delete this entry"
                });
            }

            await Bookshelf.findByIdAndDelete(req.params.id);

            return res.status(200).json({
                success: true,
                message: "Removed from bookshelf"
            });

        } catch (error) {
            console.error("Delete bookshelf error:", error);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    };

}

module.exports = bookshelfcontroller;
