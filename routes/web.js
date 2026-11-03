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

// AI: AI routes par limit, ek IP se 10 minute mein 20 requests
// (pehle ratelimit import tha par kahin use nahi hua tha)
const aiLimiter = ratelimit({
    windowMs: 10 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many AI requests, try again later" },
});

//user route 
router.post('/registeruser', user.registeruser);
router.post('/loginuser', user.loginuser);
router.get('/getuser', isuser, user.getuser);
router.get('/user/profile/:id', isuser, user.getuserbyid);
router.put('/user/updateuser/:id', isuser, user.updateuser);
router.put('/changeuserpassword/:id', isuser, user.changeuserpassword);
router.get('/logoutuser', user.logoutuser);
router.delete('/deleteuser/:id', isuser, user.deleteuser);

//author route
router.post('/registerauthor', author.registerauthor);
router.post('/author/login', author.loginauthor);
router.get('/author/getprofile/:id', isauthor, author.getauthorprofile);
router.put('/author/updateauthor/:id', isauthor, author.updateauthorprofile);
router.put('/changepassword/:id', isauthor, author.changeauthorpasssword);
router.get('/author/logout', author.logoutauthor);
router.delete('/deleteauthor/:id', isauthor, author.deleteauthor);

//book route
// FIX: getallbooks ka route tha hi nahi, isliye catalog ki list koi nahi la sakta tha
router.get("/getallbooks", book.getallbooks);
// FIX: ye pehle book.getallbooks se juda tha, ab author ki apni books wale method se
router.get("/author/mybooks", isauthor, book.getmybooks);
router.get("/getbookbyid/:id", book.getbookbyid);
router.get("/searchbooks", book.searchbook);
// Sirf Author
router.post("/addbook", isauthor, book.addbook);
router.put("/updatebook/:id", isauthor, book.updatebook);
router.delete("/deletebook/:id", isauthor, book.deletebook);

//bookshelf route
router.post("/addbookshelf", isuser, bookshelf.addbookshelf);
router.get("/getbookshelf", isuser, bookshelf.getallbookshelf);
// FIX: shlef ko shelf kiya (spelling), controller ke method naam same hain
router.get("/getbookshelfbyid/:id", isuser, bookshelf.getbookshelfbyid);
router.put("/updatebookshelf/:id", isuser, bookshelf.updatebookshelf);
router.delete("/deletebookshelf/:id", isuser, bookshelf.deletebookshelf);

// review route
router.post("/addreviews", isuser, review.writereview);
router.get("/reviews/book/:bookId", review.getreviewforbook);
router.get("/myreviews", isuser, review.getmyreviews);
router.put("/updatereview/:id", isuser, review.updatereview);
router.delete("/deletereview/:id", isuser, review.deletereview);
router.post("/reviews/:reviewId/like", isuser, review.toggleLikeReview);
router.get("/author/bookreviews", isauthor, review.getAuthorBookReviews);
router.delete("/author/review/:id", isauthor, review.deleteAuthorReview);

// favourite route
router.post('/addfavbook', isuser, favourite.addFavorite);
router.get('/getfavorites', isuser, favourite.getFavorites);
router.delete('/removebook/:id', isuser, favourite.removeFavorite);

// blog route
router.post("/writeblog", isuser, blog.writeblog);
router.get("/getallblog", blog.getallblog);
router.get("/getmyblogs", isuser, blog.getmyblogs);
router.get("/getblogbyid/:id", blog.getblogbyid);
router.put("/updateblog/:id", isuser, blog.updateblog);
router.put("/likeblog/:id", isuser, blog.likeblog);
router.delete("/deleteblog/:id", isuser, blog.deleteblog);

// AI: ai route
router.get("/reviewsummary/:bookId", aiLimiter, ai.reviewsummary);
router.get("/blogsummary/:id", aiLimiter, ai.blogsummary);
router.post("/ai/blogdraft", isuser, aiLimiter, ai.blogdraft);
router.get("/recommendations", isuser, aiLimiter, ai.recommendations);
router.get("/similarbooks/:bookId", aiLimiter, ai.similarbooks);
router.post("/ai/suggestbygenre", aiLimiter, ai.suggestbygenre);
router.get("/ai/suggestbygenre", aiLimiter, ai.suggestbygenre);

module.exports = router;