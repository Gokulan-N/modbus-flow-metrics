
const express = require('express');
const { db } = require('../models/db');
const logger = require('../utils/logger');
const { isAdmin } = require('../middleware/auth');

const router = express.Router();

// Get system settings
router.get('/settings', async (req, res) => {
  try {
    const settings = await db.getAsync('SELECT * FROM system_settings LIMIT 1');
    
    if (!settings) {
      return res.status(404).json({ error: 'System settings not found' });
    }
    
    res.json({ settings });
  } catch (err) {
    logger.error('Error fetching system settings:', err);
    res.status(500).json({ error: 'Failed to fetch system settings' });
  }
});

// Update system settings
router.put('/settings', isAdmin, async (req, res) => {
  try {
    const {
      dataLoggingInterval,
      dataRetentionPeriod,
      alarmNotificationEmail,
      backupSchedule,
      autoUpdate
    } = req.body;
    
    // Get current settings
    const currentSettings = await db.getAsync('SELECT id FROM system_settings LIMIT 1');
    
    if (currentSettings) {
      // Update existing settings
      await db.runAsync(`
        UPDATE system_settings
        SET data_logging_interval = ?,
            data_retention_period = ?,
            alarm_notification_email = ?,
            backup_schedule = ?,
            auto_update = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        dataLoggingInterval,
        dataRetentionPeriod,
        alarmNotificationEmail,
        backupSchedule,
        autoUpdate ? 1 : 0,
        currentSettings.id
      ]);
    } else {
      // Create settings if they don't exist
      await db.runAsync(`
        INSERT INTO system_settings
        (data_logging_interval, data_retention_period, alarm_notification_email, backup_schedule, auto_update)
        VALUES (?, ?, ?, ?, ?)
      `, [
        dataLoggingInterval,
        dataRetentionPeriod,
        alarmNotificationEmail,
        backupSchedule,
        autoUpdate ? 1 : 0
      ]);
    }
    
    // Get updated settings
    const updatedSettings = await db.getAsync('SELECT * FROM system_settings LIMIT 1');
    
    res.json({ settings: updatedSettings });
  } catch (err) {
    logger.error('Error updating system settings:', err);
    res.status(500).json({ error: 'Failed to update system settings' });
  }
});

// Get system status
router.get('/status', async (req, res) => {
  try {
    // Count connected devices
    const connectedDevicesCount = await db.getAsync(`
      SELECT COUNT(*) AS count FROM devices WHERE enabled = 1
    `);
    
    // Count active alarms
    const activeAlarmsCount = await db.getAsync(`
      SELECT COUNT(*) AS count FROM alarm_events WHERE active = 1
    `);
    
    // Get DB stats
    const dbStats = await db.getAsync(`
      SELECT
        (SELECT COUNT(*) FROM devices) AS device_count,
        (SELECT COUNT(*) FROM alarms) AS alarm_count,
        (SELECT COUNT(*) FROM reports) AS report_count,
        (SELECT COUNT(*) FROM flow_meter_data) AS data_point_count
    `);
    
    // Get latest data timestamp
    const latestDataTimestamp = await db.getAsync(`
      SELECT MAX(timestamp) AS timestamp FROM flow_meter_data
    `);
    
    res.json({
      status: 'running',
      uptime: process.uptime(),
      connectedDevices: connectedDevicesCount ? connectedDevicesCount.count : 0,
      activeAlarms: activeAlarmsCount ? activeAlarmsCount.count : 0,
      dbStats,
      latestDataTimestamp: latestDataTimestamp ? latestDataTimestamp.timestamp : null,
      serverTime: new Date().toISOString()
    });
  } catch (err) {
    logger.error('Error getting system status:', err);
    res.status(500).json({ error: 'Failed to get system status' });
  }
});

module.exports = router;
