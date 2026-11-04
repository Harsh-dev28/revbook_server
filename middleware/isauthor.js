const jwt = require("jsonwebtoken");
const Admin = require("../models/author");

const auth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || req.headers.Authorization;
        const bearerToken = authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
            ? authHeader.slice(7).trim()
            : null;

        const token = req.cookies?.author_token || req.cookies?.authortoken || req.cookies?.token || bearerToken;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized - Author login required"
            });
        }

        const decodedToken = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const adminData = await Admin
            .findById(decodedToken.id)
            .select("-password");

        if (!adminData) {
            return res.status(401).json({
                success: false,
                message: "Author not found or session invalid"
            });
        }

        req.admin = adminData;
        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired author token"
        });
    }
};

module.exports = auth;
