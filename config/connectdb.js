const mongoose = require('mongoose');

const connectdb = async () => {
    try {
        const mongoUri = process.env.MONGO_URL || process.env.MONOGO_URL || process.env.MONGODB_URI;
        if (!mongoUri) {
            console.error("MongoDB URI is not defined in environment variables (MONGO_URL / MONODB_URI / MONOGO_URL)");
            process.exit(1);
        }
        await mongoose.connect(mongoUri);
        console.log("Mongodb connected successfully");
    } catch (error) {
        console.error("Mongodb connection error:", error);
        process.exit(1);
    }
};

module.exports = connectdb;
