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

connectdb();

app.use(cors({
    origin: ['https://revboook.netlify.app'],
    credentials: true
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

app.use('/api', web);
app.use('/', web);

const PORT = process.env.PORT || 9000;

app.listen(PORT, () => {
    console.log(`Server is running on PORT ${PORT}`);
});