
const { db } = require('../models/db');
const logger = require('../utils/logger');
const { initializeMySql } = require('../models/mysqlDb');
const { changeBackupSchedule } = require('../services/backupService');
const fs = require('fs');
const path = require('path');

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
      data_logging_interval,
      data_retention_period,
      alarm_notification_email,
      backup_schedule,
      auto_update,
      data_db_type,
      mysql_host,
      mysql_user,
      mysql_pass,
      mysql_db_name
    } = req.body;
    
    // Validate inputs
    if (data_logging_interval !== undefined && 
        (isNaN(data_logging_interval) || data_logging_interval < 1)) {
      return res.status(400).json({ error: 'Invalid data logging interval' });
    }
    
    if (data_retention_period !== undefined && 
        (isNaN(data_retention_period) || data_retention_period < 1)) {
      return res.status(400).json({ error: 'Invalid data retention period' });
    }
    
    // Update settings
    await db.runAsync(`
      UPDATE system_settings
      SET data_logging_interval = COALESCE(?, data_logging_interval),
          data_retention_period = COALESCE(?, data_retention_period),
          alarm_notification_email = COALESCE(?, alarm_notification_email),
          backup_schedule = COALESCE(?, backup_schedule),
          auto_update = COALESCE(?, auto_update),
          data_db_type = COALESCE(?, data_db_type),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `, [
      data_logging_interval,
      data_retention_period,
      alarm_notification_email,
      backup_schedule,
      auto_update !== undefined ? (auto_update ? 1 : 0) : null,
      data_db_type
    ]);
    
    // If updating MySQL settings, save them to .env file
    if (mysql_host || mysql_user || mysql_pass || mysql_db_name) {
      updateMySqlEnvSettings(mysql_host, mysql_user, mysql_pass, mysql_db_name);
      
      // If database type is MySQL, try to initialize connection
      if (data_db_type === 'mysql') {
        try {
          await initializeMySql();
        } catch (err) {
          logger.error('Failed to initialize MySQL connection:', err);
          // Continue anyway, as the settings have been saved
        }
      }
    }
    
    // If backup schedule changed, update the schedule
    if (backup_schedule) {
      try {
        changeBackupSchedule(backup_schedule);
      } catch (err) {
        logger.error('Failed to update backup schedule:', err);
        return res.status(400).json({ error: `Invalid backup schedule: ${err.message}` });
      }
    }
    
    // Get updated settings
    const updatedSettings = await db.getAsync('SELECT * FROM system_settings LIMIT 1');
    
    res.json({ 
      message: 'System settings updated successfully',
      settings: updatedSettings
    });
  } catch (err) {
    logger.error('Error updating system settings:', err);
    res.status(500).json({ error: 'Failed to update system settings' });
  }
};

// Helper function to update MySQL environment variables
function updateMySqlEnvSettings(host, user, password, dbName) {
  try {
    const envPath = path.join(__dirname, '../.env');
    let envContent = '';
    
    // Read existing .env file if it exists
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Update MySQL settings in env content
    const envVars = {
      MYSQL_HOST: host,
      MYSQL_USER: user,
      MYSQL_PASS: password,
      MYSQL_DB_NAME: dbName
    };
    
    Object.entries(envVars).forEach(([key, value]) => {
      if (value) {
        // Check if variable already exists in file
        const regex = new RegExp(`^${key}=.*`, 'm');
        if (regex.test(envContent)) {
          envContent = envContent.replace(regex, `${key}=${value}`);
        } else {
          // Add new variable
          envContent += `\n${key}=${value}`;
        }
      }
    });
    
    // Write updated content back to .env file
    fs.writeFileSync(envPath, envContent.trim());
    logger.info('Updated MySQL environment variables');
    
  } catch (err) {
    logger.error('Failed to update MySQL environment variables:', err);
    throw err;
  }
}

// Get system status
exports.getSystemStatus = async (req, res) => {
  try {
    const dbType = await db.getAsync('SELECT data_db_type FROM system_settings LIMIT 1');
    
    // Get database status
    let mysqlStatus = 'not_configured';
    if (dbType.data_db_type === 'mysql') {
      const { isMySqlConnected } = require('../models/mysqlDb');
      mysqlStatus = await isMySqlConnected() ? 'connected' : 'error';
    }
    
    // Get polling service status
    const devices = await db.allAsync('SELECT COUNT(*) as total FROM devices');
    const enabledDevices = await db.allAsync('SELECT COUNT(*) as enabled FROM devices WHERE enabled = 1');
    
    // Get disk usage
    const dbSize = fs.existsSync(path.join(__dirname, '../db.sqlite3')) 
      ? (fs.statSync(path.join(__dirname, '../db.sqlite3')).size / (1024 * 1024)).toFixed(2)
      : 0;
    
    // Retrieve logs directory size
    const logsSize = await getDirSizeInMB(path.join(__dirname, '../logs'));
    
    // Get system uptime
    const uptime = process.uptime();
    const uptimeFormatted = formatUptime(uptime);
    
    res.json({
      status: 'running',
      uptime: uptimeFormatted,
      sqlite_status: 'connected',
      mysql_status: mysqlStatus,
      devices: {
        total: devices[0].total,
        enabled: enabledDevices[0].enabled
      },
      disk_usage: {
        database: `${dbSize} MB`,
        logs: `${logsSize} MB`
      },
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (err) {
    logger.error('Error fetching system status:', err);
    res.status(500).json({ error: 'Failed to fetch system status' });
  }
};

// Get log files
exports.getLogFiles = async (req, res) => {
  try {
    const logDir = path.join(__dirname, '../logs');
    
    // Ensure logs directory exists
    if (!fs.existsSync(logDir)) {
      return res.json({ logs: [] });
    }
    
    // Get all log files
    const files = fs.readdirSync(logDir)
      .filter(file => file.endsWith('.log'))
      .map(file => ({
        name: file,
        path: `logs/${file}`,
        size: (fs.statSync(path.join(logDir, file)).size / 1024).toFixed(2) + ' KB',
        modified: fs.statSync(path.join(logDir, file)).mtime
      }));
    
    res.json({ logs: files });
  } catch (err) {
    logger.error('Error fetching log files:', err);
    res.status(500).json({ error: 'Failed to fetch log files' });
  }
};

// Get log content
exports.getLogContent = async (req, res) => {
  try {
    const logName = req.params.name;
    
    // Validate log name to prevent directory traversal
    if (!logName || logName.includes('..') || !logName.endsWith('.log')) {
      return res.status(400).json({ error: 'Invalid log file name' });
    }
    
    const logPath = path.join(__dirname, '../logs', logName);
    
    // Check if file exists
    if (!fs.existsSync(logPath)) {
      return res.status(404).json({ error: 'Log file not found' });
    }
    
    // Get log content (last 1000 lines to prevent memory issues)
    const content = getLastNLines(logPath, 1000);
    
    res.json({ name: logName, content });
  } catch (err) {
    logger.error(`Error fetching log content for ${req.params.name}:`, err);
    res.status(500).json({ error: 'Failed to fetch log content' });
  }
};

// Get the last N lines of a file
function getLastNLines(filePath, n) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  // Get last n lines or all lines if there are fewer than n
  const lastLines = lines.slice(-n);
  
  return lastLines.join('\n');
}

// Helper function to calculate directory size
async function getDirSizeInMB(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      return 0;
    }
    
    let size = 0;
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filepath = path.join(dirPath, file);
      const stat = fs.statSync(filepath);
      
      if (stat.isFile()) {
        size += stat.size;
      } else if (stat.isDirectory()) {
        size += await getDirSizeInMB(filepath);
      }
    }
    
    return (size / (1024 * 1024)).toFixed(2);
  } catch (err) {
    logger.error(`Error calculating directory size for ${dirPath}:`, err);
    return 0;
  }
}

// Format uptime to human-readable string
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  seconds %= 86400;
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  
  return parts.join(', ');
}
