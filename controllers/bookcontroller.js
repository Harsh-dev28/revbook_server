const Book = require('../models/book');
const cloudinary = require("../config/cloudinary")

class bookcontroller {

    static addbook = async (req, res) => {
        try {
            const {
                title,
                author,
                description,
                genre,
                pageCount,
                publishedDate,
                isbn
            } = req.body;

            if (!title || !author) {
                return res.status(400).json({
                    success: false,
                    message: "Title and author name are required"
                });
            }

            let coverImage = "";
            let cover_id = "";

            if (req.files && req.files.coverImage) {
                const uploadImage = await cloudinary.uploader.upload(
                    req.files.coverImage.tempFilePath,
                    { folder: "revbook/books" }
                );

                coverImage = uploadImage.secure_url;
                cover_id = uploadImage.public_id;
            }

            const newbook = await Book.create({
                title,
                author,
                description,
                genre: Array.isArray(genre)
                    ? genre
                    : (genre ? genre.split(",").map(g => g.trim()) : []),
                pageCount,
                publishedDate,
                isbn,
                coverImage,
                cover_id,
                // FIX: ye route isauthor ke peeche hai, isliye req.admin set hota hai (req.user nahi)
                addedBy: req.admin._id
            });

            return res.status(201).json({
                success: true,
                message: "Book uploaded successfully",
                book: newbook
            });

        } catch (error) {
            console.error("Add book error:", error);

            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    };

    static getallbooks = async (req, res) => {
        try {

            // FIX: req.params ki jagah req.query (URL ke ?genre=..&page=.. wale values yahin aate hain)
            // FIX: genere ko genre kiya (schema mein field ka naam genre hai)
            const { genre, search, page = 1, limit = 12 } = req.query;

            const filter = {};

            if (genre) filter.genre = genre;
            if (search) {
                filter.$or = [
                    { title: { $regex: search, $options: "i" } },
                    { author: { $regex: search, $options: "i" } },
                ]
            }

            // FIX: findOne se sirf ek book aati thi, find kiya. sort mein created ko createdAt kiya
            const foundbooks = await Book.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(Number(limit));

            const total = await Book.countDocuments(filter);

            return res.status(200).json({
                success: true,
                message: "Book fetched successfully",
                count: foundbooks.length,
                total,
                page: Number(page),
                totalPages: Math.ceil(total / limit),
                books: foundbooks
            })

        } catch (error) {
            console.log(error)
            return res.status(500).json({
                success: false,
                message: "Inetrnal server error"
            })

        }
    };

    static getbookbyid = async (req, res) => {
        try {

            const foundbooks = await Book.findById(req.params.id);

            if (!foundbooks) {
                return res.status(404).json({
                    success: false,
                    message: "Book not found"
                });
            }

            return res.status(200).json({
                success: true,
                message: "book fetched successfully",
                book: foundbooks
            });

        } catch (error) {
            console.log(error)
            // FIX: yahan book: foundbooks tha, jo try ke bahar defined nahi hai (ReferenceError se response hi nahi jata tha)
            return res.status(500).json({
                success: false,
                message: "Inetrnal server error"
            })

        }
    };

    static updatebook = async (req, res) => {
        try {

            const foundbook = await Book.findById(req.params.id);

            if (!foundbook) {
                return res.status(404).json({
                    success: false,
                    message: "Book not found"
                });
            }

            const { title, author, description, genre, pageCount, publishedDate, isbn } = req.body;

            if (title) foundbook.title = title;
            if (author) foundbook.author = author;
            if (description) foundbook.description = description;
            if (genre) foundbook.genre = Array.isArray(genre) ? genre : genre.split(",").map(g => g.trim());
            if (pageCount) foundbook.pageCount = pageCount;
            if (publishedDate) foundbook.publishedDate = publishedDate;
            if (isbn) foundbook.isbn = isbn;

            if (req.files && req.files.coverImage) {
                // FIX: foundbooks.coverImage_id nahi, foundbook.cover_id (variable aur schema field dono galat the)
                if (foundbook.cover_id) {
                    await cloudinary.uploader.destroy(foundbook.cover_id);
                }
                const uploadImage = await cloudinary.uploader.upload(
                    // FIX: tempFilesPath ko tempFilePath kiya
                    req.files.coverImage.tempFilePath,
                    { folder: "revbook/books" }
                );
                foundbook.coverImage = uploadImage.secure_url;
                foundbook.cover_id = uploadImage.public_id;
            }

            await foundbook.save();

            return res.status(200).json({
                success: true,
                message: "Book updated successfuile",
                book: foundbook
            });

        } catch (error) {
            console.log(error)
            return res.status(500).json({
                success: false,
                message: "Inetrnal server error"
            })

        }
    };

    static deletebook = async (req, res) => {
        try {

            const foundbooks = await Book.findById(req.params.id);

            if (!foundbooks) {
                return res.status(404).json({
                    success: false,
                    message: "Book not found"
                });
            }

            // FIX: schema mein field cover_id hai, coverImage_id nahi (isliye Cloudinary se image kabhi hatti nahi thi)
            if (foundbooks.cover_id) {
                await cloudinary.uploader.destroy(foundbooks.cover_id)
            }

            await Book.findByIdAndDelete(req.params.id);

            return res.status(200).json({
                success: true,
                message: "Book deleted successsfully"
            });

        } catch (error) {
            console.log(error)
            return res.status(500).json({
                success: false,
                message: "Inetrnal server error"
            })

        }
    };

    static searchbook = async (req, res) => {
        try {
            const { q } = req.query;

            if (!q || q.trim() === "") {
                return res.status(400).json({
                    success: false,
                    message: "Search query is required"
                });
            }

            // special characters (jaise ( ) [ ] *) se regex crash na ho
            const safeq = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

            const foundbooks = await Book.find({
                $or: [
                    { title: { $regex: safeq, $options: "i" } },
                    { author: { $regex: safeq, $options: "i" } },
                    { genre: { $regex: safeq, $options: "i" } },
                ]
            }).sort({ createdAt: -1 });

            return res.status(200).json({
                success: true,
                count: foundbooks.length,
                books: foundbooks
            });

        } catch (error) {
            console.log(error)
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    };

    // AI: GET /author/mybooks (isauthor) - author ki apni jodi hui books (author dashboard ke liye)
    static getmybooks = async (req, res) => {
        try {
            const books = await Book.find({ $or: [{ addedBy: req.admin._id }, { author: req.admin.name }] })
                .sort({ createdAt: -1 });

            return res.status(200).json({
                success: true,
                count: books.length,
                books
            });

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    };

}

module.exports = bookcontroller;