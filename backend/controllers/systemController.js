
const { db } = require('../models/db');
const logger = require('../utils/logger');
const { changeBackupSchedule } = require('../services/backupService');

// Get system settings
exports.getSystemSettings = async (req, res) => {
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
};

// Update system settings
exports.updateSystemSettings = async (req, res) => {
  try {
    const {
      dataLoggingInterval,
      dataRetentionPeriod,
      alarmNotificationEmail,
      backupSchedule,
      autoUpdate,
      dataDbType
    } = req.body;
    
    // Validate backup schedule
    if (backupSchedule && !['daily', 'weekly'].includes(backupSchedule)) {
      return res.status(400).json({ error: 'Invalid backup schedule. Must be "daily" or "weekly"' });
    }

    // Validate data DB type
    if (dataDbType && !['sqlite', 'mysql'].includes(dataDbType)) {
      return res.status(400).json({ error: 'Invalid database type. Must be "sqlite" or "mysql"' });
    }
    
    // Get current settings
    const currentSettings = await db.getAsync('SELECT id, backup_schedule FROM system_settings LIMIT 1');
    
    if (currentSettings) {
      // Update existing settings
      await db.runAsync(`
        UPDATE system_settings
        SET data_logging_interval = ?,
            data_retention_period = ?,
            alarm_notification_email = ?,
            backup_schedule = ?,
            auto_update = ?,
            data_db_type = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        dataLoggingInterval,
        dataRetentionPeriod,
        alarmNotificationEmail,
        backupSchedule,
        autoUpdate ? 1 : 0,
        dataDbType || 'sqlite',
        currentSettings.id
      ]);
      
      // Apply backup schedule change immediately if it changed
      if (backupSchedule && backupSchedule !== currentSettings.backup_schedule) {
        try {
          await changeBackupSchedule(backupSchedule);
          logger.info(`Backup schedule changed to ${backupSchedule}`);
        } catch (scheduleErr) {
          logger.error('Error changing backup schedule:', scheduleErr);
          return res.status(400).json({ error: `Failed to update backup schedule: ${scheduleErr.message}` });
        }
      }
    } else {
      // Create settings if they don't exist
      await db.runAsync(`
        INSERT INTO system_settings
        (data_logging_interval, data_retention_period, alarm_notification_email, backup_schedule, auto_update, data_db_type)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        dataLoggingInterval,
        dataRetentionPeriod,
        alarmNotificationEmail,
        backupSchedule,
        autoUpdate ? 1 : 0,
        dataDbType || 'sqlite'
      ]);
      
      // Apply initial backup schedule
      if (backupSchedule) {
        try {
          await changeBackupSchedule(backupSchedule);
        } catch (scheduleErr) {
          logger.error('Error setting initial backup schedule:', scheduleErr);
        }
      }
    }
    
    // Get updated settings
    const updatedSettings = await db.getAsync('SELECT * FROM system_settings LIMIT 1');
    
    res.json({ settings: updatedSettings });
  } catch (err) {
    logger.error('Error updating system settings:', err);
    res.status(500).json({ error: 'Failed to update system settings' });
  }
};

// Get system status
exports.getSystemStatus = async (req, res) => {
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

    // Check MySQL connectivity if configured
    let mysqlStatus = 'not configured';
    const settings = await db.getAsync('SELECT data_db_type FROM system_settings LIMIT 1');
    if (settings && settings.data_db_type === 'mysql') {
      const { isMySqlConnected } = require('../models/mysqlDb');
      mysqlStatus = await isMySqlConnected() ? 'connected' : 'disconnected';
    }
    
    res.json({
      status: 'running',
      uptime: process.uptime(),
      connectedDevices: connectedDevicesCount ? connectedDevicesCount.count : 0,
      activeAlarms: activeAlarmsCount ? activeAlarmsCount.count : 0,
      dbStats,
      latestDataTimestamp: latestDataTimestamp ? latestDataTimestamp.timestamp : null,
      serverTime: new Date().toISOString(),
      mysqlStatus
    });
  } catch (err) {
    logger.error('Error getting system status:', err);
    res.status(500).json({ error: 'Failed to get system status' });
  }
};
