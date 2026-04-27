// ============================================================
// middleware/auth.js
// JWT authentication middleware
// ============================================================

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    // Check for token in Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Not authorized. No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

    // Attach user to request (exclude password)
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

module.exports = { protect };
