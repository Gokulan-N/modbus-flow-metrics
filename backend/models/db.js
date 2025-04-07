
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const logger = require('../utils/logger');

// Database file path
const dbPath = process.env.DB_PATH || path.join(__dirname, '../db.sqlite3');

// Create db instance
const db = new sqlite3.Database(dbPath);

// Promisify db operations
db.runAsync = promisify(db.run.bind(db));
db.getAsync = promisify(db.get.bind(db));
db.allAsync = promisify(db.all.bind(db));
db.execAsync = promisify(db.exec.bind(db));

// Initialize database tables
const initializeDatabase = async () => {
  try {
    await createTables();
    await createDefaultUsers();
    await createDefaultSystemSettings();
    return true;
  } catch (err) {
    logger.error('Database initialization failed:', err);
    throw err;
  }
};

const createTables = async () => {
  // Users table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'viewer',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Devices (Modbus connections) table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      port INTEGER NOT NULL,
      slave_id INTEGER NOT NULL,
      protocol TEXT NOT NULL,
      enabled BOOLEAN DEFAULT 0,
      poll_rate INTEGER NOT NULL,
      flow_meter_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Registers table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS registers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      address INTEGER NOT NULL,
      data_type TEXT NOT NULL,
      multiplier REAL DEFAULT 1.0,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
    )
  `);

  // Flow meter data table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS flow_meter_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flow_meter_id INTEGER NOT NULL,
      flow_rate REAL,
      total_flow REAL,
      status TEXT DEFAULT 'normal',
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (flow_meter_id) REFERENCES devices(flow_meter_id)
    )
  `);

  // Alarms table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS alarms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flow_meter_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      high_limit REAL,
      low_limit REAL,
      deadband REAL DEFAULT 0,
      enabled BOOLEAN DEFAULT 1,
      severity TEXT DEFAULT 'low',
      notify_via_email BOOLEAN DEFAULT 0,
      email_recipients TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Alarm events table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS alarm_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alarm_id INTEGER NOT NULL,
      flow_meter_id INTEGER NOT NULL,
      active BOOLEAN DEFAULT 1,
      value REAL NOT NULL,
      message TEXT,
      acknowledged BOOLEAN DEFAULT 0,
      acknowledged_by TEXT,
      acknowledged_at DATETIME,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME,
      FOREIGN KEY (alarm_id) REFERENCES alarms(id),
      FOREIGN KEY (flow_meter_id) REFERENCES devices(flow_meter_id)
    )
  `);

  // Reports table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      start_date DATETIME NOT NULL,
      end_date DATETIME NOT NULL,
      flow_meters TEXT NOT NULL,
      format TEXT NOT NULL,
      status TEXT DEFAULT 'generating',
      download_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // System settings table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data_logging_interval INTEGER DEFAULT 15,
      data_retention_period INTEGER DEFAULT 90,
      alarm_notification_email TEXT,
      backup_schedule TEXT DEFAULT 'daily',
      auto_update BOOLEAN DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  logger.info('Database tables created successfully');
};

const createDefaultUsers = async () => {
  const bcrypt = require('bcrypt');
  
  try {
    // Check if any users exist
    const userCount = await db.getAsync('SELECT COUNT(*) as count FROM users');
    
    if (userCount.count === 0) {
      // Create admin user
      const adminPassword = await bcrypt.hash('admin123', 10);
      await db.runAsync(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        ['admin', adminPassword, 'admin']
      );
      
      // Create viewer user
      const viewerPassword = await bcrypt.hash('viewer123', 10);
      await db.runAsync(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        ['viewer', viewerPassword, 'viewer']
      );
      
      logger.info('Default users created (admin/viewer)');
    }
  } catch (err) {
    logger.error('Error creating default users:', err);
  }
};

const createDefaultSystemSettings = async () => {
  try {
    const settings = await db.getAsync('SELECT id FROM system_settings LIMIT 1');
    
    if (!settings) {
      await db.runAsync(`
        INSERT INTO system_settings 
        (data_logging_interval, data_retention_period, alarm_notification_email, backup_schedule, auto_update) 
        VALUES (?, ?, ?, ?, ?)`,
        [15, 90, 'admin@example.com', 'daily', 1]
      );
      
      logger.info('Default system settings created');
    }
  } catch (err) {
    logger.error('Error creating default system settings:', err);
  }
};

module.exports = {
  db,
  initializeDatabase
};
