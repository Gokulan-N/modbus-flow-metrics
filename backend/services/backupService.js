const fs = require('fs');
const path = require('path');
const { db } = require('../models/db');
const logger = require('../utils/logger');

// Create backup directory if it doesn't exist
const backupDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Schedule configuration
let backupInterval = null;
const scheduleMap = {
  'daily': 24 * 60 * 60 * 1000, // 24 hours
  'weekly': 7 * 24 * 60 * 60 * 1000, // 7 days
};

// Initialize backup scheduler
const initializeBackupScheduler = async () => {
  try {
    // Get backup settings from database
    const settings = await db.getAsync('SELECT backup_schedule FROM system_settings LIMIT 1');
    
    const schedule = settings?.backup_schedule || 'daily';
    setupBackupInterval(schedule);
    
    logger.info(`Backup service initialized with ${schedule} schedule`);
  } catch (err) {
    logger.error('Failed to initialize backup scheduler:', err);
  }
};

// Set up backup interval based on schedule
const setupBackupInterval = (schedule) => {
  // Clear existing interval if any
  if (backupInterval) {
    clearInterval(backupInterval);
  }
  
  const intervalMs = scheduleMap[schedule] || scheduleMap['daily'];
  
  // Schedule next backup
  backupInterval = setInterval(async () => {
    try {
      await performBackup();
    } catch (err) {
      logger.error('Scheduled backup failed:', err);
    }
  }, intervalMs);
  
  // Also run an immediate backup when service starts
  performBackup().catch(err => {
    logger.error('Initial backup failed:', err);
  });
};

// Change the backup schedule
const changeBackupSchedule = async (schedule) => {
  if (!scheduleMap[schedule]) {
    throw new Error(`Invalid backup schedule: ${schedule}`);
  }
  
  setupBackupInterval(schedule);
  logger.info(`Backup schedule changed to ${schedule}`);
};

// Perform a full backup
const performBackup = async () => {
  try {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    
    // Export flow meter data
    const flowMeterData = await db.allAsync(`
      SELECT * FROM flow_meter_data
      ORDER BY timestamp DESC
      LIMIT 10000
    `);
    
    // Export alarms and alarm events
    const alarms = await db.allAsync('SELECT * FROM alarms');
    const alarmEvents = await db.allAsync(`
      SELECT * FROM alarm_events
      ORDER BY started_at DESC
      LIMIT 5000
    `);
    
    // Export device configurations
    const devices = await db.allAsync('SELECT * FROM devices');
    const registers = await db.allAsync('SELECT * FROM registers');
    
    // Create combined export data
    const exportData = {
      timestamp,
      devices,
      registers,
      flowMeterData,
      alarms,
      alarmEvents
    };
    
    // Write JSON backup
    const jsonFilePath = path.join(backupDir, `backup_${timestamp}.json`);
    fs.writeFileSync(jsonFilePath, JSON.stringify(exportData, null, 2));
    
    // Write CSV backups (separate files for different data types)
    writeDataToCsv(flowMeterData, path.join(backupDir, `flow_meter_data_${timestamp}.csv`));
    writeDataToCsv(alarmEvents, path.join(backupDir, `alarm_events_${timestamp}.csv`));
    
    logger.info(`Backup completed successfully. Files saved to ${backupDir}`);
    
    // Clean up old backups
    cleanUpOldBackups();
    
    return {
      timestamp,
      jsonFilePath,
      backupDir
    };
  } catch (err) {
    logger.error('Backup failed:', err);
    throw err;
  }
};

// Write data to CSV file
const writeDataToCsv = (data, filePath) => {
  try {
    if (!data || data.length === 0) {
      fs.writeFileSync(filePath, '');
      return;
    }
    
    // Create header row
    const headers = Object.keys(data[0]).join(',');
    
    // Create data rows
    const rows = data.map(item => {
      return Object.values(item).map(value => {
        // Handle strings with commas by enclosing in quotes
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value;
      }).join(',');
    });
    
    // Combine headers and rows
    const csvContent = [headers, ...rows].join('\n');
    
    // Write to file
    fs.writeFileSync(filePath, csvContent);
  } catch (err) {
    logger.error(`Error writing CSV file ${filePath}:`, err);
  }
};

// Clean up old backup files
const cleanUpOldBackups = () => {
  try {
    const files = fs.readdirSync(backupDir);
    
    // Get file stats with creation time
    const fileStats = files.map(file => {
      const filePath = path.join(backupDir, file);
      const stats = fs.statSync(filePath);
      return {
        file,
        path: filePath,
        createdAt: stats.birthtime
      };
    });
    
    // Sort files by creation time (newest first)
    fileStats.sort((a, b) => b.createdAt - a.createdAt);
    
    // Keep only the latest 10 of each type
    const jsonFiles = fileStats.filter(f => f.file.endsWith('.json'));
    const flowDataFiles = fileStats.filter(f => f.file.includes('flow_meter_data'));
    const alarmFiles = fileStats.filter(f => f.file.includes('alarm_events'));
    
    // Delete excess files
    [...jsonFiles.slice(10), ...flowDataFiles.slice(10), ...alarmFiles.slice(10)]
      .forEach(file => {
        fs.unlinkSync(file.path);
        logger.info(`Deleted old backup file: ${file.file}`);
      });
  } catch (err) {
    logger.error('Error cleaning up old backups:', err);
  }
};

// Manual backup trigger (for API endpoint)
const triggerManualBackup = async () => {
  try {
    const result = await performBackup();
    return {
      success: true,
      timestamp: result.timestamp,
      backupDir: result.backupDir
    };
  } catch (err) {
    logger.error('Manual backup failed:', err);
    throw err;
  }
};

module.exports = {
  initializeBackupScheduler,
  changeBackupSchedule,
  triggerManualBackup,
  performBackup
};
