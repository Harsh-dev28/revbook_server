const express = require('express');
const router = express.Router();
const user = require("../controllers/usercontroller");
const author = require("../controllers/authorcontroller");
const book = require("../controllers/bookcontroller");
const bookshelf = require("../controllers/bookshelfcontroller");
const favourite = require('../controllers/favouritecontroller');
const review = require('../controllers/reviewcontroller');
const blog = require('../controllers/blogcontroller');
const ai = require('../controllers/aicontroller');
const isuser = require("../middleware/isuser");
const isauthor = require("../middleware/isauthor");
const ratelimit = require('express-rate-limit');

// AI: AI routes rate limit - 30 requests per 10 minutes per IP
const aiLimiter = ratelimit({
    windowMs: 10 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many AI requests, please try again in a few minutes" },
});

// ================= USER ROUTES =================
router.post('/registeruser', user.registeruser);
router.post('/loginuser', user.loginuser);
router.get('/getuser', isuser, user.getuser);
router.get('/user/profile/:id', isuser, user.getuserbyid);
router.put('/user/updateuser/:id', isuser, user.updateuser);
router.put('/changeuserpassword/:id', isuser, user.changeuserpassword);
router.get('/logoutuser', user.logoutuser);
router.delete('/deleteuser/:id', isuser, user.deleteuser);

// ================= AUTHOR ROUTES =================
router.post('/registerauthor', author.registerauthor);
router.post('/author/login', author.loginauthor);
router.get('/author/getprofile/:id', isauthor, author.getauthorprofile);
router.get('/author/getprofile', isauthor, author.getauthorprofile);
router.put('/author/updateprofile', isauthor, author.updateauthorprofile);
router.put('/author/updateauthor/:id', isauthor, author.updateauthorprofile);
router.put('/changepassword/:id', isauthor, author.changeauthorpasssword);
router.get('/author/logout', author.logoutauthor);
router.delete('/deleteauthor/:id', isauthor, author.deleteauthor);

// ================= BOOK ROUTES =================
router.get("/getallbooks", book.getallbooks);
router.get("/author/mybooks", isauthor, book.getmybooks);
router.get("/getbookbyid/:id", book.getbookbyid);
router.get("/searchbooks", book.searchbook);
router.post("/addbook", isauthor, book.addbook);
router.post("/author/addbook", isauthor, book.addbook);
router.put("/updatebook/:id", isauthor, book.updatebook);
router.put("/author/updatebook/:id", isauthor, book.updatebook);
router.delete("/deletebook/:id", isauthor, book.deletebook);
router.delete("/author/deletebook/:id", isauthor, book.deletebook);

// ================= BOOKSHELF ROUTES =================
router.get("/getbookshelf", isuser, bookshelf.getallbookshelf);
router.get("/bookshelf", isuser, bookshelf.getallbookshelf);
router.post("/addbookshelf", isuser, bookshelf.addbookshelf);
router.post("/bookshelf", isuser, bookshelf.addbookshelf);
router.get("/getbookshelfbyid/:id", isuser, bookshelf.getbookshelfbyid);
router.put("/updatebookshelf/:id", isuser, bookshelf.updatebookshelf);
router.put("/bookshelf/:id", isuser, bookshelf.updatebookshelf);
router.delete("/deletebookshelf/:id", isuser, bookshelf.deletebookshelf);
router.delete("/bookshelf/:id", isuser, bookshelf.deletebookshelf);

// ================= REVIEW ROUTES =================
router.post("/addreviews", isuser, review.writereview);
router.get("/reviews/book/:bookId", review.getreviewforbook);
router.get("/reviewbybookid/:bookId", review.getreviewforbook);
router.get("/myreviews", isuser, review.getmyreviews);
router.put("/updatereview/:id", isuser, review.updatereview);
router.delete("/deletereview/:id", isuser, review.deletereview);
router.post("/reviews/:reviewId/like", isuser, review.toggleLikeReview);
router.get("/author/bookreviews", isauthor, review.getAuthorBookReviews);
router.delete("/author/review/:id", isauthor, review.deleteAuthorReview);

// ================= FAVOURITE ROUTES =================
router.get('/getfavorites', isuser, favourite.getFavorites);
router.post('/addfavbook', isuser, favourite.addFavorite);
router.post('/addtofavorite/:id', isuser, favourite.addFavorite);
router.post('/removefromfavorite/:id', isuser, favourite.removeFavorite);
router.delete('/removefromfavorite/:id', isuser, favourite.removeFavorite);
router.delete('/removebook/:id', isuser, favourite.removeFavorite);

// ================= BLOG ROUTES =================
router.post("/writeblog", isuser, blog.writeblog);
router.post("/createblog", isuser, blog.writeblog);
router.get("/getallblog", blog.getallblog);
router.get("/getmyblogs", isuser, blog.getmyblogs);
router.get("/getblogbyid/:id", blog.getblogbyid);
router.put("/updateblog/:id", isuser, blog.updateblog);
router.put("/editblog/:id", isuser, blog.updateblog);
router.put("/likeblog/:id", isuser, blog.likeblog);
router.delete("/deleteblog/:id", isuser, blog.deleteblog);

// ================= AI ROUTES =================
router.get("/reviewsummary/:bookId", aiLimiter, ai.reviewsummary);
router.get("/blogsummary/:id", aiLimiter, ai.blogsummary);
router.post("/ai/blogdraft", isuser, aiLimiter, ai.blogdraft);
router.get("/recommendations", isuser, aiLimiter, ai.recommendations);
router.get("/similarbooks/:bookId", aiLimiter, ai.similarbooks);
router.post("/ai/suggestbygenre", aiLimiter, ai.suggestbygenre);
router.get("/ai/suggestbygenre", aiLimiter, ai.suggestbygenre);

module.exports = router;
