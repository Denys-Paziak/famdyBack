const jwt = require('jsonwebtoken');
const secretKey = 'denis';

function authenticateToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).send('Token not provided');

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = decoded;
        next();
    });
}

module.exports = authenticateToken; 