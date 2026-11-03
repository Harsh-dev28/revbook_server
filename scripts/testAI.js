require('dotenv').config();
const ai = require('../services/aiservices');

(async () => {
    const digest = await ai.generateReviewDigest({
        title: 'The Glass Horizon',
        author: 'Aarav Mehta',
        reviewsText:
            '1. (5/5) Gripping mystery, loved the coastal setting.\n' +
            '2. (4/5) Great atmosphere but slow start.\n' +
            '3. (2/5) Too slow, ending felt rushed.',
    });
    console.log('DIGEST:', digest);

    const recs = await ai.recommendBooks({
        profile: { favouriteGenres: ['Fantasy'], readTitles: ['Paper Cities'] },
        candidates: [
            { id: '1', title: 'Midnight Archive', author: 'Riya Kapoor', genre: ['Fantasy'], averageRating: 4.2 },
            { id: '2', title: 'Orbit of Strangers', author: 'Neha Verma', genre: ['Sci-Fi'], averageRating: 4.0 },
            { id: '3', title: 'The Last Chapter', author: 'Meera Nair', genre: ['Fiction', 'Fantasy'], averageRating: 4.3 },
        ],
    });
    console.log('RECS:', recs);

    const draft = await ai.generateBlogContent({
        mode: 'draft',
        title: 'Why I love slow-burn mysteries',
        outline: 'atmosphere; characters; the ending',
    });
    console.log('DRAFT:', draft);
})().catch((e) => console.error('FAILED:', e.message));