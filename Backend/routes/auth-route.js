const express = require('express');
const { RegisterUser, VerifyOTP, ResendOTP, LoginUser, ForgotPassword, ResetPassword } = require('../controllers/auth-controller');

const router = express.Router();

router.post('/register', RegisterUser);
router.post('/verify-otp', VerifyOTP);
router.post('/resend-otp', ResendOTP);
router.post('/login', LoginUser);
router.post('/forgot-password', ForgotPassword);
router.post('/reset-password', ResetPassword);

module.exports = router;