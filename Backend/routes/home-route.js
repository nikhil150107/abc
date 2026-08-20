const express = require('express');
const authMiddleware = require('../middleware/auth-middleware');

const router = express.Router();

router.get('/', authMiddleware, (req, res) => {
    res.status(200).json({
        success: true,
        message: "Welcome to the home page!",
        user: req.userInfo
    });
});

module.exports = router;