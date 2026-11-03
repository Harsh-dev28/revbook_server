const Bookshelf = require('../models/bookshelf');

class bookshelfcontroller {

    static addbookshelf = async (req, res) => {
        try {

            const { bookId, status } = req.body || {};

            if (!bookId) {
                return res.status(400).json({
                    success: false,
                    message: "Book id is required"
                });
            }

            const existing = await Bookshelf.findOne({
                userId: req.user._id,
                bookId,
            });

            if (existing) {
                return res.status(409).json({
                    success: false,
                    message: "Book already added to your shelf"
                });
            }

            const newentry = await Bookshelf.create({
                userId: req.user._id,
                bookId,
                status: status || "Want to read",
            });

            return res.status(201).json({
                success: true,
                message: "Book addedd successfully",
                bookshlef: newentry
            });

        } catch (error) {
            console.log(error)
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            })
        }
    };

    static getallbookshelf = async (req, res) => {
        try {

            const { status } = req.query;

            const filter = { userId: req.user._id };
            if (status) filter.status = status;

            const foundbookshelf = await Bookshelf.find(filter)
                .populate('bookId')
                .sort({ createdAt: -1 });

            return res.status(200).json({
                success: true,
                count: foundbookshelf.length,
                bookshlef: foundbookshelf
            });

        } catch (error) {
            console.log(error)
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            })
        }
    };

    static getbookshelfbyid = async (req, res) => {
        try {
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
                bookshelf: foundentry
            });

        } catch (error) {
            console.log(error);
            if (error.kind === "ObjectId") {
                return res.status(400).json({ success: false, message: "Invalid id" });
            }
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    };

    static updatebookshelf = async (req, res) => {
        try {
            const { status } = req.body;

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
                    message: "Not authorized to update this entry"
                });
            }

            if (status) foundentry.status = status;

            await foundentry.save();

            return res.status(200).json({
                success: true,
                message: "Bookshelf entry updated",
                bookshelf: foundentry
            });

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    };

    static deletebookshelf = async (req, res) => {
        try {
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
            console.log(error);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    };
    
};

module.exports = bookshelfcontroller;