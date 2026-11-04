const admin = require('../models/author');
const cloudinary = require('../config/cloudinary');
const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken');
const { cookieOptions, clearCookieOptions } = require('../config/cookie');

class authorcontroller {

    static registerauthor = async (req, res) => {
        try {
            const { name, email, password } = req.body;

            if (!name || !email || !password) {
                return res.status(400).json({
                    success: false,
                    message: "All fields are required"
                });
            }

            const normalizedEmail = email.trim().toLowerCase();
            const adminexist = await admin.findOne({ email: normalizedEmail });

            if (adminexist) {
                return res.status(409).json({
                    success: false,
                    message: "Admin already exists"
                });
            }

            if (!req.files || !req.files.profileImage) {
                return res.status(400).json({
                    success: false,
                    message: "Profile image is required"
                });
            }

            const uploadedImage = await cloudinary.uploader.upload(
                req.files.profileImage.tempFilePath,
                { folder: "revbook/authors" }
            );

            const hashedPassword = await bcrypt.hash(password, 10);

            const result = await admin.create({
                name: name.trim(),
                email: normalizedEmail,
                password: hashedPassword,
                profileImage: uploadedImage.secure_url,
                profileImage_id: uploadedImage.public_id,
            });

            return res.status(201).json({
                success: true,
                message: "Admin created successfully"
            });

        } catch (error) {
            console.error("Register author error:", error);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    };

    static loginauthor = async (req, res) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: "Email and password are required"
                });
            }

            const normalizedEmail = email.trim().toLowerCase();
            const adminexist = await admin.findOne({ email: normalizedEmail });

            if (!adminexist) {
                return res.status(404).json({
                    success: false,
                    message: "Admin not found"
                });
            }

            const checkpassword = await bcrypt.compare(
                password,
                adminexist.password
            );

            if (!checkpassword) {
                return res.status(400).json({
                    success: false,
                    message: "Password is incorrect"
                });
            }

            const token = jwt.sign(
                { id: adminexist._id },
                process.env.JWT_SECRET,
                { expiresIn: "7d" }
            );

            res.cookie("token", token, cookieOptions);
            res.cookie("author_token", token, cookieOptions);

            return res.status(200).json({
                success: true,
                message: "Logged in successfully",
                token,
                admin: {
                    _id: adminexist._id,
                    name: adminexist.name,
                    email: adminexist.email,
                    profileImage: adminexist.profileImage
                }
            });

        } catch (error) {
            console.error("Login author error:", error);
            return res.status(500).json({
                success: false,
                message: "Internal Server Error"
            });
        }
    };

    static logoutauthor = async (req, res) => {
        try {
            res.clearCookie("token", clearCookieOptions);
            res.clearCookie("author_token", clearCookieOptions);

            return res.status(200).json({
                success: true,
                message: "Logout successfully done"
            });
        } catch (error) {
            console.error("Logout author error:", error);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    };

    static getauthorprofile = async (req, res) => {
        try {
            const authorId = req.params?.id || req.admin?._id;
            const adminData = await admin
                .findById(authorId)
                .select("-password");

            if (!adminData) {
                return res.status(404).json({
                    success: false,
                    message: "Admin not found"
                });
            }

            return res.status(200).json({
                success: true,
                admin: adminData
            });

        } catch (error) {
            console.error("Get author profile error:", error);
            return res.status(500).json({
                success: false,
                message: error.message || "Internal server error"
            });
        }
    };

    static updateauthorprofile = async (req, res) => {
        try {
            const authorId = req.admin?._id || req.params?.id;
            const { name, email, oldPassword, newPassword } = req.body || {};

            const adminexist = await admin.findById(authorId);

            if (!adminexist) {
                return res.status(404).json({
                    success: false,
                    message: "Admin not found"
                });
            }

            if (email && email.trim().toLowerCase() !== adminexist.email) {
                const normalizedEmail = email.trim().toLowerCase();
                const emailtaken = await admin.findOne({ email: normalizedEmail });

                if (emailtaken && emailtaken._id.toString() !== adminexist._id.toString()) {
                    return res.status(409).json({
                        success: false,
                        message: "Email already in use"
                    });
                }
                adminexist.email = normalizedEmail;
            }

            if (name) adminexist.name = name.trim();

            if (oldPassword && newPassword) {
                const isPasswordValid = await bcrypt.compare(oldPassword, adminexist.password);
                if (!isPasswordValid) {
                    return res.status(400).json({
                        success: false,
                        message: "Current password is incorrect"
                    });
                }
                adminexist.password = await bcrypt.hash(newPassword, 10);
            }

            if (req.files && req.files.profileImage) {
                if (adminexist.profileImage_id) {
                    await cloudinary.uploader.destroy(adminexist.profileImage_id);
                }
                const uploaded = await cloudinary.uploader.upload(
                    req.files.profileImage.tempFilePath,
                    { folder: "revbook/authors" }
                );
                adminexist.profileImage = uploaded.secure_url;
                adminexist.profileImage_id = uploaded.public_id;
            }

            await adminexist.save();

            const adminData = adminexist.toObject();
            delete adminData.password;

            return res.status(200).json({
                success: true,
                message: "Author updated successfully",
                admin: adminData
            });

        } catch (error) {
            console.error("Update author profile error:", error);
            return res.status(500).json({
                success: false,
                message: "Internal Server Error"
            });
        }
    };

    static changeauthorpasssword = async (req, res) => {
        try {
            const { oldpassword, newpassword, confirmpassword } = req.body;

            const adminexist = await admin.findById(req.admin._id);

            if (!adminexist) {
                return res.status(404).json({
                    success: false,
                    message: "Admin not found"
                });
            }

            const ispasswordvalid = await bcrypt.compare(
                oldpassword,
                adminexist.password
            );

            if (!ispasswordvalid) {
                return res.status(400).json({
                    success: false,
                    message: "Current password is incorrect"
                });
            }

            if (newpassword !== confirmpassword) {
                return res.status(400).json({
                    success: false,
                    message: "New passwords do not match"
                });
            }

            adminexist.password = await bcrypt.hash(newpassword, 10);
            await adminexist.save();

            return res.status(200).json({
                success: true,
                message: "Password updated successfully"
            });

        } catch (error) {
            console.error("Change author password error:", error);
            return res.status(500).json({
                success: false,
                message: "Internal Server Error"
            });
        }
    };

    static deleteauthor = async (req, res) => {
        try {
            const adminexist = await admin.findById(req.admin._id);

            if (!adminexist) {
                return res.status(404).json({
                    success: false,
                    message: "Admin not found"
                });
            }

            if (adminexist.profileImage_id) {
                await cloudinary.uploader.destroy(adminexist.profileImage_id);
            }

            await admin.findByIdAndDelete(req.admin._id);

            res.clearCookie("token", clearCookieOptions);
            res.clearCookie("author_token", clearCookieOptions);

            return res.status(200).json({
                success: true,
                message: "Author deleted successfully"
            });

        } catch (error) {
            console.error("Delete author error:", error);
            return res.status(500).json({
                success: false,
                message: "Internal Server Error"
            });
        }
    };

}

module.exports = authorcontroller;
