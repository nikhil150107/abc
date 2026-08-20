const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const istoken = authHeader && authHeader.split(" ")[1];

    if (!istoken) {
        return res.status(401).json({
            success: false,
            message: "Token not found, please try to login again!"
        });
    }

    try {
        const decodedinfo = jwt.verify(istoken, process.env.JWT_SECRET_KEY);

        req.userInfo = decodedinfo;
        next();
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Access Denied, No token is provided to you!"
        });
    }
};

module.exports = authMiddleware;