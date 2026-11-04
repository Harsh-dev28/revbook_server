const express = require('express');
const dotenv = require('dotenv');
const fileUpload = require('express-fileupload');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');

dotenv.config();

const connectdb = require('./config/connectdb');
const web = require('./routes/web');

const app = express();

// Trust proxy for Render reverse proxy (ensures secure cookies & accurate client IP for rate limiting)
app.set('trust proxy', 1);

connectdb();

const allowedOrigins = [
    'https://revboook.netlify.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    process.env.CLIENT_URL,
    process.env.FRONTEND_URL,
].filter(Boolean).map((u) => u.replace(/\/+$/, ''));

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const cleanOrigin = origin.replace(/\/+$/, '');
        if (
            allowedOrigins.includes(cleanOrigin) ||
            cleanOrigin.endsWith('.netlify.app') ||
            cleanOrigin.includes('localhost') ||
            cleanOrigin.includes('127.0.0.1') ||
            process.env.NODE_ENV !== 'production'
        ) {
            return callback(null, true);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
    fileUpload({
        useTempFiles: true,
        tempFileDir: path.join(__dirname, 'tmp')
    })
);

// Health check endpoint for Render monitoring
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'RevBook API' });
});

app.use('/api', web);
app.use('/', web);

const PORT = process.env.PORT || 9000;

app.listen(PORT, () => {
    console.log(`Server is running on PORT ${PORT}`);
});
