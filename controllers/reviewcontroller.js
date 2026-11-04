const Review = require('../models/review');
const Book = require('../models/book');
const Like = require('../models/like');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const updateBookStats = async (bookId) => {
    const reviews = await Review.find({ book: bookId });

    const avgRating = reviews.length
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    await Book.findByIdAndUpdate(bookId, {
        averageRating: Number(avgRating.toFixed(1)),
        reviewsCount: reviews.length,
    });
};

class reviewcontroller {

    static writereview = async (req, res) => {
        try {
            const { bookId, rating, reviewText } = req.body || {};

            // Validate required fields
            if (
                !bookId ||
                rating === undefined ||
                rating === null ||
                typeof reviewText !== "string" ||
                !reviewText.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Book Id, rating and review text are required"
                });
            }

            // Convert rating to a number
            const numericRating = Number(rating);

            // Validate rating
            if (
                !Number.isFinite(numericRating) ||
                numericRating < 1 ||
                numericRating > 5
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Rating must be between 1 and 5"
                });
            }

            // Find the book
            const book = await Book.findById(bookId);

            if (!book) {
                return res.status(404).json({
                    success: false,
                    message: "Book not found"
                });
            }

            // Check whether the user has already reviewed this book
            const existingReview = await Review.findOne({
                user: req.user._id,
                book: bookId
            });

            if (existingReview) {
                return res.status(409).json({
                    success: false,
                    message: "You have already written a review"
                });
            }

            // Create the review
            const review = await Review.create({
                book: bookId,
                user: req.user._id,
                rating: numericRating,
                reviewText: reviewText.trim()
            });

            // Update book statistics
            await updateBookStats(bookId);

            // Populate review details
            const populatedReview = await Review.findById(review._id)
                .populate("user", "name profileimage bio")
                .populate("book", "title coverImage");

            return res.status(201).json({
                success: true,
                message: "Review added successfully",
                review: populatedReview
            });

        } catch (error) {
            console.log(error)
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            })
        }
    };

    static getreviewforbook = async (req, res) => {
        try {

            const { bookId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(bookId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid book id"
                });
            }

            let currentuserid = null;

            try {
                const authHeader = req.headers.authorization || req.headers.Authorization;
                const bearerToken = authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
                    ? authHeader.slice(7).trim()
                    : null;
                const token = req.cookies?.user_token || req.cookies?.token || bearerToken;
                if (token) {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    currentuserid = decoded.id;
                }
            } catch (error) {
                currentuserid = null;
            }

            const reviews = await Review.find({ book: bookId })
                .populate('user', 'name profileimage bio')
                .sort({ createdAt: -1 });

            let likedReviewIds = [];
            if (currentuserid) {
                const likes = await Like.find({
                    userId: currentuserid,
                    reviewId: { $in: reviews.map((r) => r._id) },
                });
                likedReviewIds = likes.map((l) => l.reviewId.toString());
            }

            const reviewsWithMeta = await Promise.all(
                reviews.map(async (r) => {
                    const likesCount = await Like.countDocuments({ reviewId: r._id });
                    return {
                        ...r.toObject(),
                        likesCount,
                        isLiked: likedReviewIds.includes(r._id.toString()),
                        isMine: currentuserid ? r.user?._id.toString() === currentuserid.toString() : false,
                    };
                })
            );

            return res.status(200).json({
                success: true,
                count: reviewsWithMeta.length,
                reviews: reviewsWithMeta,
            });

        } catch (error) {
            console.log(error)
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            })
        }
    };

    static getmyreviews = async (req, res) => {
        try {

            const reviews = await Review.find({ user: req.user._id })
                .populate('book', 'title coverImage author')
                .populate('user', 'name profileimage bio')
                .sort({ createdAt: -1 });

            // DEBUG: pata lagane ke baad ye 6 lines hata dena
            console.log(
                'myreviews -> logged-in user:', req.user._id.toString(),
                '| mile:', reviews.length,
                '| DB mein kul reviews:', await Review.countDocuments()
            );

            return res.status(200).json({
                success: true,
                message: "Book review fetched successfully",
                count: reviews.length,
                reviews
            });

        } catch (error) {
            console.log(error)
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            })
        }
    };

    static updatereview = async (req, res) => {
        try {
            const { rating, reviewText } = req.body || {};

            const review = await Review.findById(req.params.id);

            if (!review) {
                return res.status(404).json({
                    success: false,
                    message: "Review not found"
                });
            }

            // Get the logged-in user's ID
            const currentUserId = req.user?._id || req.user?.id;

            if (!currentUserId) {
                return res.status(401).json({
                    success: false,
                    message: "Please log in first"
                });
            }

            // Check review ownership
            if (review.user.toString() !== currentUserId.toString()) {
                return res.status(403).json({
                    success: false,
                    message: "You are not authorised to update this review"
                });
            }

            // Validate and update rating
            if (rating !== undefined) {
                const numericRating = Number(rating);

                if (
                    rating === "" ||
                    rating === null ||
                    !Number.isFinite(numericRating) ||
                    numericRating < 1 ||
                    numericRating > 5
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "Rating must be between 1 and 5"
                    });
                }

                review.rating = numericRating;
            }

            // Update review text
            if (reviewText !== undefined) {
                if (
                    typeof reviewText !== "string" ||
                    !reviewText.trim()
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "Review text cannot be empty"
                    });
                }

                review.reviewText = reviewText.trim();
            }

            await review.save();

            await updateBookStats(review.book);

            const updatedReview = await Review.findById(review._id)
                .populate("user", "name profileimage bio")
                .populate("book", "title coverImage");

            return res.status(200).json({
                success: true,
                message: "Review updated successfully",
                review: updatedReview
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    };

    static deletereview = async (req, res) => {
        try {

            const review = await Review.findById(req.params.id);

            if (!review) {
                return res.status(404).json({
                    success: false,
                    message: "Review not found"
                });
            }


            if (review.user.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'You are not authorized to delete this review',
                });
            }

            const bookId = review.book;

            await review.deleteOne();
            await Like.deleteMany({ reviewId: req.params.id });
            await updateBookStats(bookId);

            return res.status(200).json({
                success: true,
                message: "Book Review deleted successfully"
            });

        } catch (error) {
            console.log(error)
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            })
        }
    };

    static toggleLikeReview = async (req, res) => {
        try {
            const { reviewId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(reviewId)) {
                return res.status(400).json({ success: false, message: 'Invalid review id' });
            }

            const review = await Review.findById(reviewId);

            if (!review) {
                return res.status(404).json({ success: false, message: 'Review not found' });
            }

            const existingLike = await Like.findOne({ userId: req.user._id, reviewId });

            let isLiked;
            if (existingLike) {
                await Like.findByIdAndDelete(existingLike._id);
                isLiked = false;
            } else {
                await Like.create({ userId: req.user._id, reviewId });
                isLiked = true;
            }

            const likesCount = await Like.countDocuments({ reviewId });

            return res.status(200).json({
                success: true,
                message: isLiked ? 'Review liked' : 'Review unliked',
                isLiked,
                likesCount,
            });

        } catch (error) {
            console.log(error)
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            })
        }
    };

    // GET /author/bookreviews (isauthor)
    // Author can see all reviews for books they published with strict ownership permissions
    static getAuthorBookReviews = async (req, res) => {
        try {
            if (!req.admin || !req.admin._id) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized: Author credentials required"
                });
            }

            const authorId = req.admin._id;

            // Find all books added/published by this author
            const authorBooks = await Book.find({
                $or: [{ addedBy: authorId }, { author: req.admin.name }]
            }).select('_id title author coverImage averageRating reviewsCount genre publishedDate').lean();

            if (!authorBooks || authorBooks.length === 0) {
                return res.status(200).json({
                    success: true,
                    count: 0,
                    totalReviews: 0,
                    averageRating: 0,
                    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                    books: [],
                    reviews: []
                });
            }

            const bookIds = authorBooks.map(b => b._id);
            const { bookId, rating, search, sortBy = 'newest' } = req.query;

            // Build review query limited to this author's books
            const query = { book: { $in: bookIds } };

            // If author filtered by specific book, enforce strict ownership
            if (bookId && mongoose.Types.ObjectId.isValid(bookId)) {
                const ownsBook = bookIds.some(id => id.toString() === bookId.toString());
                if (!ownsBook) {
                    return res.status(403).json({
                        success: false,
                        message: "Permission denied: You can only view reviews for books you published."
                    });
                }
                query.book = new mongoose.Types.ObjectId(bookId);
            }

            // Star rating filter
            if (rating && !isNaN(rating)) {
                const num = Number(rating);
                if (num >= 1 && num <= 5) {
                    query.rating = num;
                }
            }

            // Search filter in review text
            if (search && search.trim()) {
                query.reviewText = { $regex: search.trim(), $options: 'i' };
            }

            // Sorting
            let sortOptions = { createdAt: -1 };
            if (sortBy === 'oldest') sortOptions = { createdAt: 1 };
            else if (sortBy === 'highest') sortOptions = { rating: -1, createdAt: -1 };
            else if (sortBy === 'lowest') sortOptions = { rating: 1, createdAt: -1 };

            // Fetch reviews
            const reviews = await Review.find(query)
                .populate('user', 'name profileimage bio email')
                .populate('book', 'title author coverImage averageRating reviewsCount genre')
                .sort(sortOptions)
                .lean();

            // Calculate overall analytics across all the author's books
            const allAuthorReviews = await Review.find({ book: { $in: bookIds } }).select('rating').lean();
            const totalReviewsCount = allAuthorReviews.length;
            const avgRating = totalReviewsCount > 0
                ? Number((allAuthorReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviewsCount).toFixed(1))
                : 0;

            const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            allAuthorReviews.forEach(r => {
                if (ratingDistribution[r.rating] !== undefined) {
                    ratingDistribution[r.rating]++;
                }
            });

            return res.status(200).json({
                success: true,
                count: reviews.length,
                totalReviews: totalReviewsCount,
                averageRating: avgRating,
                ratingDistribution,
                books: authorBooks,
                reviews
            });

        } catch (error) {
            console.error("getAuthorBookReviews error:", error);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    };

    // DELETE /author/review/:id (isauthor)
    // Author can moderate/delete an inappropriate review on their published book
    static deleteAuthorReview = async (req, res) => {
        try {
            if (!req.admin || !req.admin._id) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized: Author credentials required"
                });
            }

            const { id } = req.params;
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ success: false, message: "Invalid review ID" });
            }

            const review = await Review.findById(id).populate('book');
            if (!review) {
                return res.status(404).json({ success: false, message: "Review not found" });
            }

            // Verify that this review's book belongs to this author
            const book = review.book;
            const isOwner = book && (
                (book.addedBy && book.addedBy.toString() === req.admin._id.toString()) ||
                book.author === req.admin.name
            );

            if (!isOwner) {
                return res.status(403).json({
                    success: false,
                    message: "Permission denied: You can only moderate reviews on your own published books."
                });
            }

            const bookId = book._id;
            await review.deleteOne();
            await Like.deleteMany({ reviewId: id });
            await updateBookStats(bookId);

            return res.status(200).json({
                success: true,
                message: "Review removed by author successfully"
            });

        } catch (error) {
            console.error("deleteAuthorReview error:", error);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    };

}

module.exports = reviewcontroller