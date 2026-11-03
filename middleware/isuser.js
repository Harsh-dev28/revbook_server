const jwt = require("jsonwebtoken");
const User = require('../models/user');

const isuser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || req.headers.Authorization;
        const bearerToken = authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
            ? authHeader.slice(7).trim()
            : null;

        const token = req.cookies?.user_token || req.cookies?.token || bearerToken;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized - User login required"
            });
        }

        const decodedToken = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const userdata = await User
            .findById(decodedToken.id)
            .select("-password");

        if (!userdata) {
            return res.status(401).json({
                success: false,
                message: "User not found or session invalid"
            });
        }

        req.user = userdata;
        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
};

module.exports = isuser;