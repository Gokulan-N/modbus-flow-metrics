
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    logger.error('Token verification failed:', err);
    res.status(403).json({ error: 'Invalid token' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
};

const isAdminOrViewer = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'viewer')) {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Valid role required.' });
  }
};

module.exports = {
  authenticateToken,
  isAdmin,
  isAdminOrViewer
};
