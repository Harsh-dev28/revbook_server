const mongoose = require('mongoose');

const connectdb = async () => {
    try {
        await mongoose.connect(process.env.MONOGO_URL);
        console.log("Mongodb connected");
    } catch (error) {
        console.log(error)
        process.exit(1)
    }
}

module.exports = connectdb