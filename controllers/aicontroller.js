const mongoose = require('mongoose');
const Book = require('../models/book');
const Review = require('../models/review');
const Blog = require('../models/blog');
const Bookshelf = require('../models/bookshelf');
const Favourite = require('../models/favourite');
const ai = require('../services/aiservices');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

/* ---------- chhota in-memory cache (server restart par saaf ho jata hai) ---------- */

const cache = new Map();

const getCached = (key) => {
    const hit = cache.get(key);
    if (!hit) return null;
    if (hit.expires < Date.now()) {
        cache.delete(key);
        return null;
    }
    return hit.value;
};

const setCached = (key, value, ttlMs) => {
    if (cache.size > 500) cache.clear();
    cache.set(key, { value, expires: Date.now() + ttlMs });
};

/* ---------- helpers ---------- */

const sendAIError = (res, error, label) => {
    console.error(`${label} error:`, error.message);

    if (error instanceof ai.AIInputError) {
        return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(503).json({
        success: false,
        message: 'AI feature is unavailable right now',
    });
};

const parseDigest = (text) => {
    try {
        const data = JSON.parse(text);
        return data && data.consensus ? data : null;
    } catch (err) {
        return null; // purana ya galat cache, dobara banega
    }
};

const toCandidate = (b) => ({
    id: b._id.toString(),
    title: b.title,
    author: b.author,
    genre: b.genre,
    averageRating: b.averageRating,
    description: b.description,
});

// shortlist: pehle same genre ki books, phir top-rated se bharo (kul 40 tak)
const buildShortlist = async ({ genres, excludeIds }) => {
    const genreList = [].concat(genres || []).filter(Boolean);
    const rank = { averageRating: -1, reviewsCount: -1 };

    const matched = genreList.length
        ? await Book.find({ _id: { $nin: excludeIds }, genre: { $in: genreList } })
            .sort(rank)
            .limit(25)
            .lean()
        : [];

    const usedIds = [...excludeIds, ...matched.map((b) => b._id)];

    const rest = await Book.find({ _id: { $nin: usedIds } })
        .sort(rank)
        .limit(40 - matched.length)
        .lean();

    return [...matched, ...rest];
};

class aicontroller {

    // 1. GET /reviewsummary/:bookId (public)
    static reviewsummary = async (req, res) => {
        try {
            const { bookId } = req.params;

            if (!isValidId(bookId)) {
                return res.status(400).json({ success: false, message: 'Invalid book id' });
            }

            const book = await Book.findById(bookId);
            if (!book) {
                return res.status(404).json({ success: false, message: 'Book not found' });
            }

            const total = await Review.countDocuments({ book: bookId });

            if (total < 1) {
                return res.status(200).json({
                    success: true,
                    digest: null,
                    message: 'No reviews yet for a summary',
                });
            }
            // review add, edit ya delete hua ho toh cache purana maano
            const latest = await Review.findOne({ book: bookId })
                .sort({ updatedAt: -1 })
                .select('updatedAt');

            const stored = parseDigest(book.aiSummary);

            const isFresh =
                stored &&
                book.aiSummaryCount === total &&
                book.aiSummaryAt &&
                book.aiSummaryAt >= latest.updatedAt;

            if (isFresh) {
                return res.status(200).json({ success: true, digest: stored, cached: true });
            }

            try {
                const reviews = await Review.find({ book: bookId })
                    .select('rating reviewText')
                    .sort({ createdAt: -1 })
                    .limit(50);

                const reviewsText = reviews
                    .map((r, i) => `${i + 1}. (${r.rating}/5) ${r.reviewText.slice(0, 500)}`)
                    .join('\n');

                const digest = await ai.generateReviewDigest({
                    title: book.title,
                    author: book.author,
                    reviewsText,
                    reviewCount: total,
                });

                await Book.updateOne(
                    { _id: bookId },
                    {
                        $set: {
                            aiSummary: JSON.stringify(digest),
                            aiSummaryCount: total,
                            aiSummaryAt: new Date(),
                        },
                    }
                );

                return res.status(200).json({ success: true, digest, cached: false });

            } catch (aiError) {
                // AI fail hua, par purana digest hai toh wahi dikha do
                if (stored) {
                    return res.status(200).json({ success: true, digest: stored, cached: true, stale: true });
                }
                throw aiError;
            }

        } catch (error) {
            return sendAIError(res, error, 'Review digest');
        }
    };

    // 2. GET /blogsummary/:id (public, sirf published blog)
    static blogsummary = async (req, res) => {
        try {
            if (!isValidId(req.params.id)) {
                return res.status(400).json({ success: false, message: 'Invalid blog id' });
            }

            const blog = await Blog.findOne({ _id: req.params.id, status: 'published' })
                .populate('book', 'title');

            if (!blog) {
                return res.status(404).json({ success: false, message: 'Blog not found' });
            }

            if (blog.aiSummary) {
                return res.status(200).json({ success: true, summary: blog.aiSummary, cached: true });
            }

            try {
                const summary = await ai.summarizeBlog({
                    title: blog.title,
                    content: blog.content,
                    bookTitle: blog.book?.title,
                });

                await Blog.updateOne({ _id: blog._id }, { $set: { aiSummary: summary } });

                return res.status(200).json({ success: true, summary, cached: false });
            } catch (aiErr) {
                console.warn('AI blog summary error, providing graceful digest:', aiErr.message);
                const fallbackSummary = (blog.content || '')
                    .split('\n')
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .slice(0, 2)
                    .join(' ')
                    .slice(0, 240) + '...';

                return res.status(200).json({
                    success: true,
                    summary: fallbackSummary || 'A thoughtful reading reflection and exploration.',
                    cached: false,
                    fallback: true,
                });
            }

        } catch (error) {
            return sendAIError(res, error, 'Blog summary');
        }
    };

    // 3. POST /ai/blogdraft (isuser)
    // body: { mode: "draft" | "enhance", title, outline, draft, bookId, readingContext }
    static blogdraft = async (req, res) => {
        try {
            const { mode = 'draft', title, outline, draft, bookId, readingContext } = req.body || {};

            let book = null;

            if (bookId) {
                if (!isValidId(bookId)) {
                    return res.status(400).json({ success: false, message: 'Invalid book id' });
                }

                book = await Book.findById(bookId).select('title author genre').lean();

                if (!book) {
                    return res.status(404).json({ success: false, message: 'Book not found' });
                }
            }

            const text = await ai.generateBlogContent({
                mode,
                title,
                outline,
                draft,
                readingContext,
                book,
            });

            return res.status(200).json({ success: true, text });

        } catch (error) {
            return sendAIError(res, error, 'Blog draft');
        }
    };

    // 4. GET /recommendations (isuser)
    static recommendations = async (req, res) => {
        try {
            const uid = req.user._id;
            const cacheKey = `rec:${uid}`;

            const hit = getCached(cacheKey);
            if (hit) {
                return res.status(200).json(hit);
            }

            // jo shelf, favourites ya reviews mein hai, wo dubara suggest nahi hogi
            const [shelf, favs, reviewed] = await Promise.all([
                Bookshelf.find({ userId: uid }).select('bookId').lean(),
                Favourite.find({ user: uid }).select('book').lean(),
                Review.find({ user: uid }).select('book').lean(),
            ]);

            const excludeSet = new Set([
                ...shelf.map((s) => s.bookId.toString()),
                ...favs.map((f) => f.book.toString()),
                ...reviewed.map((r) => r.book.toString()),
            ]);
            const excludeIds = [...excludeSet].map((id) => new mongoose.Types.ObjectId(id));

            const readBooks = await Book.find({ _id: { $in: excludeIds } })
                .select('title')
                .limit(30)
                .lean();

            const pool = await buildShortlist({
                genres: req.user.favouritegenere,
                excludeIds,
            });

            if (pool.length === 0) {
                return res.status(200).json({ success: true, source: 'none', recommendations: [] });
            }

            let source = 'ai';
            let recommendations;

            try {
                const picks = await ai.recommendBooks({
                    profile: {
                        favouriteGenres: [req.user.favouritegenere],
                        readTitles: readBooks.map((b) => b.title),
                    },
                    candidates: pool.map(toCandidate),
                    limit: 6,
                });

                const byId = new Map(pool.map((b) => [b._id.toString(), b]));

                recommendations = picks
                    .map((p) => ({ book: byId.get(p.bookId), reasoning: p.reasoning }))
                    .filter((r) => r.book);

                if (recommendations.length === 0) {
                    throw new Error('No valid picks from AI');
                }

            } catch (aiError) {
                console.error('Recommendations AI error:', aiError.message);
                source = 'fallback';
                recommendations = pool.slice(0, 6).map((b) => ({ book: b, reasoning: null }));
            }

            const payload = { success: true, source, recommendations };

            if (source === 'ai') {
                setCached(cacheKey, payload, 10 * 60 * 1000); // 10 minute
            }

            return res.status(200).json(payload);

        } catch (error) {
            console.error('Recommendations error:', error);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    };

    // 5. GET /similarbooks/:bookId (public)
    static similarbooks = async (req, res) => {
        try {
            const { bookId } = req.params;

            if (!isValidId(bookId)) {
                return res.status(400).json({ success: false, message: 'Invalid book id' });
            }

            const book = await Book.findById(bookId).lean();
            if (!book) {
                return res.status(404).json({ success: false, message: 'Book not found' });
            }

            const cacheKey = `sim:${bookId}`;
            const hit = getCached(cacheKey);
            if (hit) {
                return res.status(200).json(hit);
            }

            const pool = await buildShortlist({
                genres: book.genre,
                excludeIds: [book._id],
            });

            if (pool.length === 0) {
                return res.status(200).json({ success: true, source: 'none', similar: [] });
            }

            let source = 'ai';
            let similar;

            try {
                const picks = await ai.findSimilarBooks({
                    book: {
                        id: book._id.toString(),
                        title: book.title,
                        author: book.author,
                        genre: book.genre,
                        description: book.description,
                    },
                    candidates: pool.map(toCandidate),
                    limit: 5,
                });

                const byId = new Map(pool.map((b) => [b._id.toString(), b]));

                similar = picks
                    .map((p) => ({ book: byId.get(p.bookId), reasoning: p.reasoning }))
                    .filter((r) => r.book);

                if (similar.length === 0) {
                    throw new Error('No valid picks from AI');
                }

            } catch (aiError) {
                console.error('Similar books AI error:', aiError.message);
                source = 'fallback';
                similar = pool.slice(0, 5).map((b) => ({ book: b, reasoning: null }));
            }

            const payload = { success: true, source, similar };

            if (source === 'ai') {
                setCached(cacheKey, payload, 60 * 60 * 1000); // 1 ghanta
            }

            return res.status(200).json(payload);

        } catch (error) {
            console.error('Similar books error:', error);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    };


    // 6. POST & GET /ai/suggestbygenre (public)
    static suggestbygenre = async (req, res) => {
        try {
            const body = req.method === 'POST' ? req.body : req.query;
            const { genre, preference } = body || {};

            if (!genre && !preference) {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide a genre or reading preference',
                });
            }

            const cleanGenre = String(genre || '').trim().slice(0, 50);
            const cleanPref = String(preference || '').trim().slice(0, 200);

            const pool = await buildShortlist({
                genres: cleanGenre ? [cleanGenre] : [],
                excludeIds: [],
            });

            if (pool.length === 0) {
                return res.status(200).json({ success: true, source: 'none', suggestions: [] });
            }

            let source = 'ai';
            let suggestions;

            try {
                const picks = await ai.recommendBooks({
                    profile: {
                        favouriteGenres: cleanGenre ? [cleanGenre] : [cleanPref],
                        readTitles: cleanPref ? [`Reader preference: ${cleanPref}`] : [],
                    },
                    candidates: pool.map(toCandidate),
                    limit: 6,
                });

                const byId = new Map(pool.map((b) => [b._id.toString(), b]));

                suggestions = picks
                    .map((p) => ({ book: byId.get(p.bookId), reasoning: p.reasoning }))
                    .filter((r) => r.book);

                if (suggestions.length === 0) {
                    throw new Error('No valid picks from AI');
                }
            } catch (aiError) {
                console.error('Suggest by genre AI error:', aiError.message);
                source = 'fallback';
                suggestions = pool.slice(0, 6).map((b) => ({
                    book: b,
                    reasoning: cleanGenre
                        ? `Top-rated ${cleanGenre} pick from our library`
                        : 'Recommended popular title from our catalog',
                }));
            }

            return res.status(200).json({ success: true, source, suggestions });
        } catch (error) {
            console.error('Suggest by genre error:', error);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    };

}

module.exports = aicontroller;