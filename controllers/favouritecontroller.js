const Favourite = require('../models/favourite');
const Book = require('../models/book');

class FavoriteController {

    static addFavorite = async (req, res) => {
        try {

            // Get bookId safely
            const bookId = req.body?.bookId;

            if (!bookId) {
                return res.status(400).json({
                    success: false,
                    message: "Book ID is required."
                });
            }

            // Check if book exists
            const book = await Book.findById(bookId);

            if (!book) {
                return res.status(404).json({
                    success: false,
                    message: "Book not found."
                });
            }

            // Get logged-in user
            const userId = req.user?._id || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized."
                });
            }

            // Check if already added
            const existingFavorite = await Favourite.findOne({
                user: userId,
                book: bookId
            });

            if (existingFavorite) {
                return res.status(409).json({
                    success: false,
                    message: "Book already exists in favorites."
                });
            }

            // Create favorite
            const favorite = await Favourite.create({
                user: userId,
                book: bookId
            });

            return res.status(201).json({
                success: true,
                message: "Book added to favorites successfully.",
                favorite
            });

        } catch (error) {
            console.error(error);

            return res.status(500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }
    };

    static removeFavorite = async (req, res) => {
        try {
            const userId = req.user._id || req.user.id;
            const favorite = await Favourite.findOne({ _id: req.params.id, user: userId });

            if (!favorite) {
                return res.status(404).json({
                    success: false,
                    message: "Favorite not found or unauthorized"
                });
            }

            await favorite.deleteOne();

            return res.status(200).json({
                success: true,
                message: "Removed from favorites"
            });

        } catch (error) {
            console.log(error);
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

            console.log("Logged-in user ID:", userId);

            const favorites = await Favourite.find({
                user: userId
            }).populate("book");

            console.log("Found favorites:", favorites.length);

            return res.status(200).json({
                success: true,
                message: "Favorite Books",
                Favorites: favorites
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    };
}

module.exports = FavoriteController;