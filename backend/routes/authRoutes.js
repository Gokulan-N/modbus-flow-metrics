
const express = require('express');
const { isAdmin } = require('../middleware/auth');
const authController = require('../controllers/authController');

const router = express.Router();

// Login route
router.post('/login', authController.login);

// Get current user info
router.get('/me', authController.getCurrentUser);

// Create new user (admin only)
router.post('/users', isAdmin, authController.createUser);

// Get all users (admin only)
router.get('/users', isAdmin, authController.getAllUsers);

// Delete a user (admin only)
router.delete('/users/:id', isAdmin, authController.deleteUser);

module.exports = router;
