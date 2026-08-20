const User = require('../models/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendOTPEmail } = require('../helper/emailHelper');

// Generate a 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Register User (sends OTP to email)
const RegisterUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if user already exists
        const checkuserexist = await User.findOne({ $or: [{ username }, { email }] });

        if (checkuserexist) {
            return res.status(400).json({
                success: false,
                message: "Same Username or email exist, Try something new!"
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt);

        // Generate OTP
        const otp = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        const createnewUser = new User({
            username,
            email,
            password: hashPassword,
            role: 'user',
            isVerified: false,
            otp,
            otpExpires
        });

        await createnewUser.save();

        // Send OTP email
        await sendOTPEmail(email, otp);

        if (createnewUser) {
            res.status(201).json({
                success: true,
                message: "User created successfully! OTP sent to your email for verification."
            });
        } else {
            res.status(400).json({
                success: false,
                message: "Unable to register User, please try again"
            });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Some error occur, please try again"
        });
    }
};

// Verify OTP
const VerifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User not found, please register first"
            });
        }

        if (user.isVerified) {
            return res.status(400).json({
                success: false,
                message: "User is already verified"
            });
        }

        if (user.otp !== otp) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP, please try again"
            });
        }

        if (user.otpExpires < Date.now()) {
            return res.status(400).json({
                success: false,
                message: "OTP has expired, please request a new one"
            });
        }

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        res.status(200).json({
            success: true,
            message: "Email verified successfully! You can now login."
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Some error occur, please try again"
        });
    }
};

// Resend OTP
const ResendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User not found, please register first"
            });
        }

        if (user.isVerified) {
            return res.status(400).json({
                success: false,
                message: "User is already verified"
            });
        }

        // Generate new OTP
        const otp = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        user.otp = otp;
        user.otpExpires = otpExpires;
        await user.save();

        // Send OTP email
        await sendOTPEmail(email, otp);

        res.status(200).json({
            success: true,
            message: "New OTP sent to your email!"
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Some error occur, please try again"
        });
    }
};

// Login User
const LoginUser = async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username });

        // Check if user exists
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid Username, please try again"
            });
        }

        // Check if user is verified
        if (!user.isVerified) {
            return res.status(400).json({
                success: false,
                message: "Please verify your email first"
            });
        }

        // Check password
        const isPasswordMatch = await bcrypt.compare(password, user.password);

        if (!isPasswordMatch) {
            return res.status(400).json({
                success: false,
                message: "Invalid Password, please try again"
            });
        }

        const accessToken = jwt.sign({
            userId: user._id,
            username: user.username,
            email: user.email,
            role: user.role
        }, process.env.JWT_SECRET_KEY, {
            expiresIn: '30m'
        });

        res.status(200).json({
            success: true,
            message: "Login Successfully!",
            accessToken,
            user: {
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Some error occur, please try again"
        });
    }
};

// Forgot Password (sends OTP to email)
const ForgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User not found with this email"
            });
        }

        // Generate OTP for password reset
        const otp = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        user.otp = otp;
        user.otpExpires = otpExpires;
        await user.save();

        // Send OTP email
        await sendOTPEmail(email, otp);

        res.status(200).json({
            success: true,
            message: "OTP sent to your email for password reset!"
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Some error occur, please try again"
        });
    }
};

// Reset Password
const ResetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User not found"
            });
        }

        if (user.otp !== otp) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP, please try again"
            });
        }

        if (user.otpExpires < Date.now()) {
            return res.status(400).json({
                success: false,
                message: "OTP has expired, please request a new one"
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashPassword;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        res.status(200).json({
            success: true,
            message: "Password reset successfully! You can now login."
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Some error occur, please try again"
        });
    }
};

module.exports = { RegisterUser, VerifyOTP, ResendOTP, LoginUser, ForgotPassword, ResetPassword };