
const express = require('express');
const { isAdmin } = require('../middleware/auth');
const systemController = require('../controllers/systemController');

const router = express.Router();

// Get system settings
router.get('/settings', systemController.getSystemSettings);

// Update system settings
router.put('/settings', isAdmin, systemController.updateSystemSettings);

// Get system status
router.get('/status', systemController.getSystemStatus);

// Get log files
router.get('/logs', systemController.getLogFiles);

// Get log content
router.get('/logs/:name', systemController.getLogContent);

module.exports = router;
