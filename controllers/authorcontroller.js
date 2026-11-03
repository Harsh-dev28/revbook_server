const admin = require('../models/author');
const cloudinary = require('../config/cloudinary');
const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken');
const fs = require('fs');

class authorcontroller {

    static registerauthor = async (req, res) => {

        try {
            const { name, email, password } = req.body;

            if (!name || !email || !password) {
                res.status(400).json({
                    success: false,
                    message: "All fields are required"
                });
            }

            const adminexist = await admin.findOne({ email });

            if (adminexist) {
                res.status(400).json({
                    success: false,
                    message: "Admin already exist"
                })
            }

            // --- Cloudinary photo upload (added) ---
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
            // --- end addition ---

            const hashedPassword = await bcrypt.hash(password, 10);

            const result = await admin.create({
                name,
                email,
                password: hashedPassword,
                profileImage: uploadedImage.secure_url,       // added
                profileImage_id: uploadedImage.public_id,     // added
            });

            res.status(201).json({
                success: true,
                message: "Admin Created successfully"
            })
        } catch (error) {

            console.log(error)

            res.status(500).json({
                suucess: false,
                message: "Internal server error"
            })
        }


    };

    static loginauthor = async (req, res) => {

        try {
            const { email, password } = req.body;

            const adminexist = await admin.findOne({ email });

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
                { expiresIn: "1d" }
            );

            const cookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 24 * 60 * 60 * 1000
            };
            res.cookie("token", token, cookieOptions);
            res.cookie("author_token", token, cookieOptions);

            return res.status(200).json({
                success: true,
                message: "Logged in Successfully",
                token,
                admin: {
                    _id: adminexist._id,
                    name: adminexist.name,
                    email: adminexist.email
                }
            });

        } catch (error) {
            console.log(error)

            res.status(500).json({
                success: false,
                message: "Internal Server Error"
            });
        }
    };

    static logoutauthor = async (req, res) => {

        try {
            res.clearCookie("token");
            res.clearCookie("author_token");

            return res.status(201).json({
                success: true,
                message: "Logout Successfully done"
            })
        } catch (error) {

            console.log(error)

            return res.status(500).josn({
                success: false,
                messgae: "Internal server error"
            })
        }
    };

    static getauthorprofile = async (req, res) => {
        try {

            const adminData = await admin
                .findById(req.admin._id)
                .select("-password");

            if (!adminData) {
                return res.status(404).json({
                    success: false,
                    message: "Admin not found"
                });
            }

            res.status(200).json({
                success: true,
                admin: adminData
            });

        } catch (error) {

            console.log(error);

            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    };

    static updateauthorprofile = async (req, res) => {
        try {
            const { name, email } = req.body || {};

            const adminexist = await admin.findById(req.admin._id);

            if (!adminexist) {
                return res.status(404).json({
                    success: false,
                    message: "Admin not found"
                });
            }

            adminexist.name = name || adminexist.name;
            adminexist.email = email || adminexist.email;

            await adminexist.save();

            return res.status(200).json({
                success: true,
                message: "Admin updated successfully"
            });

        } catch (error) {
            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Internal Server Error"
            });
        }
    };

    static changeauthorpasssword = async (req, res) => {

        try {

            const { oldpassword, newpassword, confirmpassword } = req.body;

            const adminexist = await admin.findById(
                req.admin._id
            ).select("+password");

            if (!adminexist) {
                return res.status(404).json({
                    success: false,
                    message: "admin not found"
                });
            }

            const ispasswordvalid = await bcrypt.compare(
                oldpassword,
                adminexist.password
            );

            if (!ispasswordvalid) {
                return res.status(400).json({
                    success: false,
                    message: "password is incorrect"
                });
            }

            if (newpassword !== confirmpassword) {
                return res.status(400).json({
                    success: false,
                    message: "New Password don't match"
                })
            }

            adminexist.password = await bcrypt.hash(
                newpassword,
                10
            );

            await adminexist.save();

            res.status(201).json({
                success: true,
                message: "Password updated successfully"
            });


        } catch (error) {
            console.log(error)
            return res.status(500).json({
                success: false,
                message: "Internal Server Error"
            })

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

            // author ki profile image Cloudinary se hatao
            if (adminexist.profileImage_id) {
                await cloudinary.uploader.destroy(adminexist.profileImage_id);
            }

            await admin.findByIdAndDelete(req.admin._id);

            res.clearCookie("token");
            res.clearCookie("author_token");

            return res.status(200).json({
                success: true,
                message: "Author deleted successfully"
            });

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                success: false,
                message: "Internal Server Error"
            });
        }
    };

}

module.exports = authorcontroller;