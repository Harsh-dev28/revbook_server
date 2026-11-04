const mongoose = require('mongoose');
const Favourite = require('../models/favourite');
const Book = require('../models/book');

class FavoriteController {

    static addFavorite = async (req, res) => {
        try {
            const bookId = req.body?.bookId || req.params?.id || req.params?.bookId;

            if (!bookId) {
                return res.status(400).json({
                    success: false,
                    message: "Book ID is required."
                });
            }

            if (!mongoose.Types.ObjectId.isValid(bookId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid Book ID."
                });
            }

            const book = await Book.findById(bookId);

            if (!book) {
                return res.status(404).json({
                    success: false,
                    message: "Book not found."
                });
            }

            const userId = req.user?._id || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized."
                });
            }

            const existingFavorite = await Favourite.findOne({
                user: userId,
                book: bookId
            });

            if (existingFavorite) {
                return res.status(200).json({
                    success: true,
                    message: "Book already exists in favorites.",
                    favorite: existingFavorite,
                    fav: existingFavorite
                });
            }

            const favorite = await Favourite.create({
                user: userId,
                book: bookId
            });

            return res.status(201).json({
                success: true,
                message: "Book added to favorites successfully.",
                favorite,
                fav: favorite
            });

        } catch (error) {
            console.error("Add favorite error:", error);
            return res.status(500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }
    };

    static removeFavorite = async (req, res) => {
        try {
            const userId = req.user?._id || req.user?.id;
            const targetId = req.params?.id || req.body?.bookId || req.body?.id;

            if (!targetId) {
                return res.status(400).json({
                    success: false,
                    message: "Favorite ID or Book ID is required"
                });
            }

            const query = { user: userId };
            if (mongoose.Types.ObjectId.isValid(targetId)) {
                query.$or = [{ _id: targetId }, { book: targetId }];
            } else {
                return res.status(400).json({
                    success: false,
                    message: "Invalid ID format"
                });
            }

            const favorite = await Favourite.findOne(query);

            if (!favorite) {
                return res.status(200).json({
                    success: true,
                    message: "Favorite already removed or not found"
                });
            }

            await favorite.deleteOne();

            return res.status(200).json({
                success: true,
                message: "Removed from favorites"
            });

        } catch (error) {
            console.error("Remove favorite error:", error);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    };

    static getFavorites = async (req, res) => {
        try {
            const userId = req.user?._id || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "User not authenticated"
                });
            }

            const favorites = await Favourite.find({
                user: userId
            }).populate("book");

            return res.status(200).json({
                success: true,
                message: "Favorite Books",
                Favorites: favorites,
                favorites
            });
        } catch (error) {
            console.error("Get favorites error:", error);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    };
}

module.exports = FavoriteController;
