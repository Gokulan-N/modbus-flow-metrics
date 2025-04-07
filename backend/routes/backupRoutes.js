
const express = require('express');
const { isAdmin } = require('../middleware/auth');
const backupController = require('../controllers/backupController');

const router = express.Router();

// Get all backup files
router.get('/', isAdmin, backupController.getAllBackups);

// Trigger a manual backup
router.post('/', isAdmin, backupController.createBackup);

// Download a specific backup file
router.get('/:filename', isAdmin, backupController.downloadBackup);

// Delete a backup file
router.delete('/:filename', isAdmin, backupController.deleteBackup);

// Update backup schedule
router.put('/schedule', isAdmin, backupController.updateBackupSchedule);

module.exports = router;
