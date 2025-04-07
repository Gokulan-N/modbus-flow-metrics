
const fs = require('fs');
const path = require('path');
const { triggerManualBackup, changeBackupSchedule } = require('../services/backupService');
const logger = require('../utils/logger');

const backupDir = path.join(__dirname, '../backups');

// Get all backup files
exports.getAllBackups = async (req, res) => {
  try {
    if (!fs.existsSync(backupDir)) {
      return res.json({ backups: [] });
    }
    
    const files = fs.readdirSync(backupDir);
    
    // Get file details
    const backups = files.map(file => {
      const filePath = path.join(backupDir, file);
      const stats = fs.statSync(filePath);
      
      return {
        filename: file,
        type: path.extname(file).slice(1),
        size: stats.size,
        created: stats.birthtime
      };
    });
    
    // Sort by creation date (newest first)
    backups.sort((a, b) => new Date(b.created) - new Date(a.created));
    
    res.json({ backups });
  } catch (err) {
    logger.error('Error getting backups:', err);
    res.status(500).json({ error: 'Failed to get backups' });
  }
};

// Trigger a manual backup
exports.createBackup = async (req, res) => {
  try {
    const result = await triggerManualBackup();
    res.json({
      message: 'Backup created successfully',
      timestamp: result.timestamp
    });
  } catch (err) {
    logger.error('Error triggering backup:', err);
    res.status(500).json({ error: 'Failed to create backup' });
  }
};

// Download a specific backup file
exports.downloadBackup = async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(backupDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }
    
    res.download(filePath);
  } catch (err) {
    logger.error(`Error downloading backup ${req.params.filename}:`, err);
    res.status(500).json({ error: 'Failed to download backup' });
  }
};

// Delete a backup file
exports.deleteBackup = async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(backupDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }
    
    fs.unlinkSync(filePath);
    
    res.json({ message: 'Backup deleted successfully' });
  } catch (err) {
    logger.error(`Error deleting backup ${req.params.filename}:`, err);
    res.status(500).json({ error: 'Failed to delete backup' });
  }
};

// Update backup schedule
exports.updateBackupSchedule = async (req, res) => {
  try {
    const { schedule } = req.body;
    
    if (!schedule || !['daily', 'weekly'].includes(schedule)) {
      return res.status(400).json({ error: 'Invalid schedule. Must be "daily" or "weekly"' });
    }
    
    await changeBackupSchedule(schedule);
    
    // Update in database too
    const { db } = require('../models/db');
    await db.runAsync(
      'UPDATE system_settings SET backup_schedule = ?, updated_at = CURRENT_TIMESTAMP',
      [schedule]
    );
    
    res.json({
      message: 'Backup schedule updated successfully',
      schedule
    });
  } catch (err) {
    logger.error('Error updating backup schedule:', err);
    res.status(500).json({ error: 'Failed to update backup schedule' });
  }
};
