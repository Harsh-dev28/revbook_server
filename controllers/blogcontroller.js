const mongoose = require('mongoose');
const Blog = require('../models/blog');
const jwt = require('jsonwebtoken');
const Book = require('../models/book');

const parsetags = (tags) => {
    // FIX: .Split ko .split kiya (capital S se TypeError aata tha)
    const list = Array.isArray(tags) ? tags : (tags ? String(tags).split(',') : []);
    return list.map((t) => String(t).trim().toLowerCase()).filter(Boolean);
};

const getoptionaluserId = (req) => {
    try {
        const token = req.cookies?.token;
        // FIX: condition ulti thi (token hone par null de deta tha)
        if (!token) return null;
        return jwt.verify(token, process.env.JWT_SECRET).id;
    } catch (error) {
        return null;
    }
};

const withLikeCount = (blog) => {
    const { likes = [], ...rest } = blog;
    return { ...rest, likesCount: likes.length };
};

class blogcontroller {

    static writeblog = async (req, res) => {
        try {

            const { title, content, book, tags, status } = req.body || {};

            if (!title?.trim() || !content?.trim() || !book) {
                return res.status(400).json({
                    success: false,
                    message: "Title, content and book are required"
                });
            }

            if (!mongoose.Types.ObjectId.isValid(book)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid book id"
                });
            }

            const foundbook = await Book.findById(book);

            if (!foundbook) {
                return res.status(404).json({
                    success: false,
                    message: "Book not found"
                });
            }

            if (status && !['draft', 'published'].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Status must be draft or published"
                });
            }

            // same user + same book + same title (case-insensitive) ka blog pehle se hai ya nahi
            const blogexist = await Blog.findOne({
                user: req.user._id,
                book,
                title: title.trim(),
            }).collation({ locale: 'en', strength: 2 });

            if (blogexist) {
                return res.status(409).json({
                    success: false,
                    message: "You have already written a blog with this title for this book"
                });
            }

            const newblog = await Blog.create({
                title: title.trim(),
                content: content.trim(),
                user: req.user._id,
                book,
                tags: parsetags(tags),
                status: status || 'draft'
            });

            return res.status(201).json({
                success: true,
                message: "Blog has been written successfully"
            });

        } catch (error) {
            console.log(error)
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            })
        }
    };

    static getallblog = async (req, res) => {
        try {
            const { book, tag, page = 1, limit = 20 } = req.query;

            const filter = { status: 'published' };

            if (book) {
                if (!mongoose.Types.ObjectId.isValid(book)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid book ID'
                    });
                }

                filter.book = book;
            }

            if (tag?.trim()) {
                filter.tags = tag.trim().toLowerCase();
            }

            const pagenum = Math.max(parseInt(page, 10) || 1, 1);
            const limitNum = Math.min(
                Math.max(parseInt(limit, 10) || 20, 1),
                50
            );

            const [foundblogs, total] = await Promise.all([
                Blog.find(filter)
                    .populate('user', 'name profileimage')
                    .populate('book', 'title coverImage author')
                    .sort({ createdAt: -1 })
                    .skip((pagenum - 1) * limitNum)
                    .limit(limitNum)
                    .lean(),

                Blog.countDocuments(filter)
            ]);

            return res.status(200).json({
                success: true,
                message: 'Blogs fetched successfully',
                total,
                page: pagenum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum),
                blogs: foundblogs.map(withLikeCount)
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    };

    static getmyblogs = async (req, res) => {
        try {

            const { status } = req.query;

            const filter = { user: req.user._id };
            if (status === 'draft' || status === 'published') filter.status = status;

            const foundblogs = await Blog.find(filter)
                .populate('book', 'title coverImage author')
                .sort({ createdAt: -1 })
                .lean();

            return res.status(200).json({
                success: true,
                message: "Your all blogs",
                count: foundblogs.length,
                blogs: foundblogs.map(withLikeCount)
            });

        } catch (error) {
            console.log(error)
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            })
        }
    };

    static getblogbyid = async (req, res) => {
        try {

            if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid Blog id"
                });
            }

            const foundblog = await Blog.findById(req.params.id)
                .populate('user', 'name profileimage bio')
                .populate('book', 'title coverImage author');

            if (!foundblog) {
                return res.status(404).json({
                    success: false,
                    message: "Blog not found"
                });
            }

            const currentUserId = getoptionaluserId(req);
            const isOwner = currentUserId && foundblog.user._id.toString() === currentUserId.toString();

            if (foundblog.status !== 'published' && !isOwner) {
                return res.status(404).json({
                    success: false,
                    message: "Blog not found"
                });
            }

            const isLiked = currentUserId
                ? foundblog.likes.some((id) => id.toString() === currentUserId.toString())
                : false;

            return res.status(200).json({
                success: true,
                message: "Blog fetched successfully",
                blog: { ...withLikeCount(foundblog.toObject()), isLiked, isMine: Boolean(isOwner) }
            });

        } catch (error) {
            console.log(error)
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            })
        }
    };

    static updateblog = async (req, res) => {
        try {

            if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid vlog Id"
                })
            }

            const foundblog = await Blog.findById(req.params.id);

            if (!foundblog) {
                return res.status(404).json({
                    success: false,
                    message: "Blog not found"
                });
            }

            if (foundblog.user.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: "Not authorised to update the blog"
                })
            }

            const { title, content, book, tags, status } = req.body || {};

            // AI: title ya content badalne par purana AI summary hata do, taaki nayi baar naya ban sake
            // (pehle ye reset save ke baad tha, isliye database mein kabhi save hi nahi hota tha)
            if (title?.trim()) {
                foundblog.title = title.trim();
                foundblog.aiSummary = '';
            }
            if (content?.trim()) {
                foundblog.content = content.trim();
                foundblog.aiSummary = '';
            }

            if (book) {
                if (!mongoose.Types.ObjectId.isValid(book)) {
                    return res.status(400).json({ success: false, message: "Invalid book id" });
                }
                const foundbook = await Book.findById(book);
                if (!foundbook) {
                    return res.status(404).json({ success: false, message: "Book not found" });
                }
                foundblog.book = book;
            }

            // FIX: parseTags ko parsetags kiya (upar helper isi naam se hai, warna ReferenceError aata tha)
            if (tags !== undefined) foundblog.tags = parsetags(tags);

            if (status) {
                if (!['draft', 'published'].includes(status)) {
                    return res.status(400).json({ success: false, message: "Status must be draft or published" });
                }
                foundblog.status = status;
            }

            await foundblog.save();

            return res.status(200).json({
                success: true,
                message: "Blog updated successfully",
                blog: foundblog
            });

        } catch (error) {
            console.log(error)
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            })
        }
    };

    static likeblog = async (req, res) => {
        try {

            if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                return res.status(400).json({
                    success: false,
                    message: "Blog id isn't valid"
                });
            }

            const foundblog = await Blog.findOne({ _id: req.params.id, status: "published" });

            if (!foundblog) {
                return res.status(404).json({
                    success: false,
                    message: "Blog doesn't exist"
                });
            }

            const alreadyliked = foundblog.likes.some(
                (id) => id.toString() === req.user._id.toString()
            );

            // $addToSet ek user ki id do baar nahi jaane deta, $pull hatata hai
            const updated = await Blog.findByIdAndUpdate(
                foundblog._id,
                alreadyliked
                    ? { $pull: { likes: req.user._id } }
                    : { $addToSet: { likes: req.user._id } },
                { new: true }
            );

            const likesCount = updated.likes.length;

            // saved count ko bhi sync rakho
            await Blog.updateOne({ _id: updated._id }, { $set: { likesCount } });

            return res.status(200).json({
                success: true,
                message: alreadyliked ? "Blog unliked" : "Blog liked",
                isLiked: !alreadyliked,
                likesCount
            });

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    };

    static deleteblog = async (req, res) => {
        try {

            if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid blog id"
                });
            }

            const foundblog = await Blog.findById(req.params.id);

            if (!foundblog) {
                return res.status(404).json({
                    success: false,
                    message: "Blog does not exist"
                })
            }

            if (foundblog.user.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: "Not authorised to delete blog"
                })
            }

            await Blog.findByIdAndDelete(req.params.id);

            return res.status(200).json({
                // FIX: success response mein success: false tha, true kiya
                success: true,
                message: "Blog deleted successfully"
            });

        } catch (error) {
            console.log(error)
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            })
        }
    };

};

module.exports = blogcontroller