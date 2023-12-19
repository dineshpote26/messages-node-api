const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    let decodeToken;
    const authHeader = req.get('Authorization');
    if (!authHeader) {
        const error = new Error('Not authenticated.');
        error.statusCode = 401;
        throw error;
    }
    const token = authHeader.split(' ')[1];
    try {
        decodeToken = jwt.verify(token, process.env.SECRET_PUBLIC_KEY)
    } catch (err) {
        err.statusCode = 500;
        throw err;
    }

    if (!decodeToken) {
        const error = new Error('Not authenticated.');
        error.statusCode = 401;
        throw error;
    }
    req.userId = decodeToken.userId;
    next();
}