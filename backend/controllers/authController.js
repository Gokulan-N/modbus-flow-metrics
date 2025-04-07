
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { db } = require('../models/db');
const logger = require('../utils/logger');

// Login controller
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const user = await db.getAsync('SELECT * FROM users WHERE username = ?', [username]);
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }
    
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '24h' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (err) {
    logger.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get current user info
exports.getCurrentUser = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await db.getAsync('SELECT id, username, role FROM users WHERE id = ?', [decoded.id]);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    logger.error('Auth error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new user (admin only)
exports.createUser = async (req, res) => {
  try {
    const { username, password, role } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Validate role
    if (role !== 'admin' && role !== 'viewer') {
      return res.status(400).json({ error: 'Invalid role. Must be "admin" or "viewer"' });
    }
    
    // Check if username already exists
    const existingUser = await db.getAsync('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert new user
    const result = await db.runAsync(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hashedPassword, role]
    );
    
    res.status(201).json({
      user: {
        id: result.lastID,
        username,
        role
      }
    });
  } catch (err) {
    logger.error('Error creating user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all users (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await db.allAsync('SELECT id, username, role, created_at FROM users');
    res.json({ users });
  } catch (err) {
    logger.error('Error getting users:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a user (admin only)
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Don't allow deleting yourself
    if (userId == req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    const user = await db.getAsync('SELECT id FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await db.runAsync('DELETE FROM users WHERE id = ?', [userId]);
    
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    logger.error(`Error deleting user ${req.params.id}:`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
