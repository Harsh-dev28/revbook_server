const User = require('../models/user');
const cloudinary = require('../config/cloudinary');
const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken');
const fs = require('fs');

class usercontroller {

    static registeruser = async (req, res) => {
        try {
            const { name, email, password, bio, favouritegenere } = req.body

            if (!name || !email || !password || !bio || !favouritegenere) {
                return res.status(400).json({
                    success: false,
                    message: "All fields are required"
                });
            }

            const userexist = await User.findOne({ email });

            if (userexist) {
                return res.status(409).json({
                    success: false,
                    message: "User already exists"
                });
            }

            if (!req.files || !req.files.profileimage) {
                return res.status(400).json({
                    success: false,
                    message: "Profile image is required"
                });
            }

            const uploadimage = await cloudinary.uploader.upload(
                req.files.profileimage.tempFilePath,
                { folder: "revbook/users" }
            );

            const hashedPassword = await bcrypt.hash(password, 10);

            const user = await User.create({
                name,
                email,
                password: hashedPassword,
                bio: bio || "",
                favouritegenere,
                profileimage: uploadimage.secure_url,
                profileimage_id: uploadimage.public_id,
            });

            const token = jwt.sign(
                { id: user._id },
                process.env.JWT_SECRET,
                { expiresIn: "7d" }
            );

            const cookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 7 * 24 * 60 * 60 * 1000,
            };
            res.cookie("token", token, cookieOptions);
            res.cookie("user_token", token, cookieOptions);

            return res.status(201).json({
                success: true,
                message: "User registered successfully",
                user
            });


        } catch (error) {
            console.log(error);
            return res.status(500).json({
                success: false,
                message: "Internal server error",
                error: error.message
            });
        }
    };

    static getuser = async (req, res) => {
        try {
            const userdata = await User
                .findById(req.user._id)
                .select("-password");

            if (!userdata) {
                return res.status(494).json({
                    success: false,
                    message: "user not found"
                });
            }

            return res.status(200).json({
                success: true,
                user: userdata,
                admin: userdata
            })

        } catch (error) {
            console.log(error)
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }

    };

    static getuserbyid = async (req, res) => {
        try {
            const { id } = req.params;
            const userdata = await User.findById(id).select("-password");

            if (!userdata) {
                return res.status(404).json({
                    success: false,
                    message: "USer not found"
                });
            }

            return res.status(200).json({
                success: true,
                message: "User fetched successfully",
                user: userdata
            });

        } catch (error) {
            console.log(error)
            return res.status(500).json({
                sucess: false,
                message: "Internal server error",
                user: userdata
            })
        }
    };

    static loginuser = async (req, res) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: "Email and password are required"
                });
            }

            const isuserexist = await User.findOne({ email });

            if (!isuserexist) {
                return res.status(404).json({
                    success: false,
                    message: "User doesn't exist"
                });
            }

            const checkpassword = await bcrypt.compare(
                password,
                isuserexist.password
            );

            if (!checkpassword) {
                return res.status(400).json({
                    success: false,
                    message: "Password is incorrect"
                });
            }

            const token = jwt.sign(
                { id: isuserexist._id },
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
            res.cookie("user_token", token, cookieOptions);

            return res.status(200).json({
                success: true,
                message: "Logged in successfully",
                user: {
                    _id: isuserexist._id,
                    name: isuserexist.name,
                    email: isuserexist.email,
                    bio: isuserexist.bio,
                    profileimage: isuserexist.profileimage,
                    favoriteGenres: isuserexist.favoriteGenres
                }
            });

        } catch (error) {
            console.log(error);

            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    };

    static updateuser = async (req, res) => {
        try {

            const { name, email, password, bio, favouritegenere } = req.body;

            const userexist = await User.findById(req.user._id);

            if (!userexist) {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }

            // email badal rahe ho toh check karo ki kisi aur ke paas na ho
            if (email && email !== userexist.email) {
                const emailtaken = await User.findOne({ email });

                if (emailtaken) {
                    return res.status(409).json({
                        success: false,
                        message: "Email already in use"
                    });
                }
                userexist.email = email;
            }

            if (name) userexist.name = name;
            if (bio) userexist.bio = bio;
            if (favouritegenere) userexist.favouritegenere = favouritegenere;

            if (password) {
                userexist.password = await bcrypt.hash(password, 10);
            }

            // optional: nayi profile image aayi toh purani Cloudinary se hatao
            if (req.files && req.files.profileimage) {
                if (userexist.profileimage_id) {
                    await cloudinary.uploader.destroy(userexist.profileimage_id);
                }

                const uploadimage = await cloudinary.uploader.upload(
                    req.files.profileimage.tempFilePath,
                    { folder: "revbook/users" }
                );

                userexist.profileimage = uploadimage.secure_url;
                userexist.profileimage_id = uploadimage.public_id;
            }

            await userexist.save();

            const updateduser = userexist.toObject();
            delete updateduser.password;

            return res.status(200).json({
                success: true,
                message: "User updated successfully",
                user: updateduser
            });

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    };

    static deleteuser = async (req, res) => {
        try {

            const userexist = await User.findById(req.user._id);

            if (!userexist) {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }

            if (userexist.profileimage_id) {
                await cloudinary.uploader.destroy(userexist.profileimage_id);
            }

            await User.findByIdAndDelete(req.user._id);

            res.clearCookie("token");
            res.clearCookie("user_token");

            return res.status(200).json({
                success: true,
                message: "Account deleted successfully"
            });

        } catch (error) {
            console.log(error)
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            })
        }

    };

    static logoutuser = async (req, res) => {
        try {
            res.clearCookie("token");
            res.clearCookie("user_token");

            return res.status(201).json({
                success: true,
                message: "user logout sucxcessfully"
            })

        } catch (error) {
            console.log(error)
            return res.status(500).json({
                success: false,
                message: "Inetrnal server error"
            })
        }

    };

    static changeuserpassword = async (req, res) => {
        try {

            const { oldpassword, newpassword, confirmpassword } = req.body;

            if (!oldpassword || !newpassword || !confirmpassword) {
                return res.status(400).json({
                    success: false,
                    message: "All fields are required"
                });
            }

            const userexist = await User.findById(req.user._id);

            if (!userexist) {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }

            const ispasswordvalid = await bcrypt.compare(
                oldpassword,
                userexist.password
            );

            if (!ispasswordvalid) {
                return res.status(400).json({
                    success: false,
                    message: "Old password is incorrect"
                });
            }

            if (newpassword !== confirmpassword) {
                return res.status(400).json({
                    success: false,
                    message: "New passwords don't match"
                });
            }

            if (oldpassword === newpassword) {
                return res.status(400).json({
                    success: false,
                    message: "New password must be different from old password"
                });
            }

            userexist.password = await bcrypt.hash(newpassword, 10);

            await userexist.save();

            return res.status(200).json({
                success: true,
                message: "Password changed successfully"
            });

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    };

}

module.exports = usercontroller;
