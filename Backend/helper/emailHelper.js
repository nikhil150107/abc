const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendOTPEmail = async (email, otp) => {
    console.log(`\n========================================`);
    console.log(`🔑 [AUTH OTP] Target: ${email} | Code: ${otp}`);
    console.log(`========================================\n`);

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log(`[EmailHelper] No SMTP configured. OTP logged to console above.`);
        return;
    }

    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your OTP for Verification',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                    <h2 style="color: #333; text-align: center;">Email Verification</h2>
                    <p style="color: #555; font-size: 16px;">Your One-Time Password (OTP) for verification is:</p>
                    <div style="text-align: center; margin: 20px 0;">
                        <span style="display: inline-block; background: #f0f0f0; padding: 12px 24px; font-size: 24px; font-weight: bold; letter-spacing: 4px; border-radius: 6px; color: #333;">${otp}</span>
                    </div>
                    <p style="color: #777; font-size: 14px;">This OTP is valid for 10 minutes. Do not share it with anyone.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
    } catch (err) {
        console.warn(`[EmailHelper] Failed to send email via SMTP (${err.message}). Use console OTP above.`);
    }
};

module.exports = { sendOTPEmail };