
const mysql = require('mysql2/promise');
const logger = require('../utils/logger');
require('dotenv').config();

// MySQL connection pool
let pool = null;

/**
 * Initialize MySQL connection pool
 */
const initializeMySql = async () => {
  try {
    // Only create pool if environment variables are set
    if (process.env.MYSQL_HOST && process.env.MYSQL_USER && 
        process.env.MYSQL_PASS && process.env.MYSQL_DB_NAME) {
      
      pool = mysql.createPool({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASS,
        database: process.env.MYSQL_DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
      
      // Test the connection
      const connection = await pool.getConnection();
      connection.release();
      logger.info('MySQL connection established successfully');
      
      // Initialize tables
      await createMySqlTables();
      return true;
    } else {
      logger.warn('MySQL configuration incomplete. Using SQLite for data storage.');
      return false;
    }
  } catch (err) {
    logger.error('MySQL initialization error:', err);
    pool = null;
    return false;
  }
};

/**
 * Create necessary tables in MySQL
 */
const createMySqlTables = async () => {
  if (!pool) return false;
  
  try {
    // Flow meter data table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS flow_meter_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        flow_meter_id INT NOT NULL,
        flow_rate FLOAT,
        total_flow FLOAT,
        status VARCHAR(20) DEFAULT 'normal',
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_flow_meter_id (flow_meter_id),
        INDEX idx_timestamp (timestamp)
      )
    `);

    // Alarm events table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS alarm_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        alarm_id INT NOT NULL,
        flow_meter_id INT NOT NULL,
        active BOOLEAN DEFAULT 1,
        value FLOAT NOT NULL,
        message TEXT,
        acknowledged BOOLEAN DEFAULT 0,
        acknowledged_by VARCHAR(50),
        acknowledged_at TIMESTAMP NULL,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP NULL,
        INDEX idx_alarm_id (alarm_id),
        INDEX idx_flow_meter_id (flow_meter_id),
        INDEX idx_active (active)
      )
    `);

    logger.info('MySQL tables initialized successfully');
    return true;
  } catch (err) {
    logger.error('Error creating MySQL tables:', err);
    return false;
  }
};

/**
 * Check if MySQL is connected
 */
const isMySqlConnected = async () => {
  if (!pool) return false;
  
  try {
    const connection = await pool.getConnection();
    connection.release();
    return true;
  } catch (err) {
    logger.error('MySQL connection check failed:', err);
    return false;
  }
};

/**
 * Insert flow meter data into MySQL database
 */
const insertFlowMeterData = async (flowMeterId, flowRate, totalFlow, status) => {
  if (!pool) return false;
  
  try {
    const [result] = await pool.query(`
      INSERT INTO flow_meter_data
      (flow_meter_id, flow_rate, total_flow, status)
      VALUES (?, ?, ?, ?)
    `, [flowMeterId, flowRate, totalFlow, status]);
    
    return result.insertId;
  } catch (err) {
    logger.error(`MySQL error inserting flow meter data for ${flowMeterId}:`, err);
    return false;
  }
};

/**
 * Get flow meter data from MySQL database
 */
const getFlowMeterData = async (flowMeterId, startTime, endTime) => {
  if (!pool) return [];
  
  try {
    const [rows] = await pool.query(`
      SELECT 
        flow_meter_id,
        flow_rate,
        total_flow,
        status,
        timestamp
      FROM flow_meter_data
      WHERE flow_meter_id = ? AND timestamp BETWEEN ? AND ?
      ORDER BY timestamp ASC
    `, [flowMeterId, startTime.toISOString(), endTime.toISOString()]);
    
    return rows;
  } catch (err) {
    logger.error(`MySQL error fetching flow meter data for ${flowMeterId}:`, err);
    return [];
  }
};

/**
 * Get latest flow meter reading for each flow meter
 */
const getLatestFlowMeterReadings = async () => {
  if (!pool) return [];
  
  try {
    const [rows] = await pool.query(`
      WITH LatestReadings AS (
        SELECT 
          flow_meter_id,
          MAX(timestamp) as latest_timestamp
        FROM flow_meter_data
        GROUP BY flow_meter_id
      )
      SELECT 
        fmd.*
      FROM flow_meter_data fmd
      JOIN LatestReadings lr ON fmd.flow_meter_id = lr.flow_meter_id AND fmd.timestamp = lr.latest_timestamp
    `);
    
    return rows;
  } catch (err) {
    logger.error('MySQL error fetching latest flow meter readings:', err);
    return [];
  }
};

/**
 * Insert alarm event into MySQL database
 */
const insertAlarmEvent = async (alarmId, flowMeterId, active, value, message) => {
  if (!pool) return false;
  
  try {
    const [result] = await pool.query(`
      INSERT INTO alarm_events
      (alarm_id, flow_meter_id, active, value, message)
      VALUES (?, ?, ?, ?, ?)
    `, [alarmId, flowMeterId, active ? 1 : 0, value, message]);
    
    return result.insertId;
  } catch (err) {
    logger.error(`MySQL error inserting alarm event for alarm ${alarmId}:`, err);
    return false;
  }
};

/**
 * Get alarm events from MySQL database
 */
const getAlarmEvents = async (active = null, limit = 100) => {
  if (!pool) return [];
  
  try {
    let query = `
      SELECT * FROM alarm_events
      ORDER BY started_at DESC
      LIMIT ?
    `;
    let params = [limit];
    
    if (active !== null) {
      query = `
        SELECT * FROM alarm_events
        WHERE active = ?
        ORDER BY started_at DESC
        LIMIT ?
      `;
      params = [active ? 1 : 0, limit];
    }
    
    const [rows] = await pool.query(query, params);
    return rows;
  } catch (err) {
    logger.error('MySQL error fetching alarm events:', err);
    return [];
  }
};

/**
 * Acknowledge an alarm event in MySQL database
 */
const acknowledgeAlarmEvent = async (eventId, username) => {
  if (!pool) return false;
  
  try {
    const [result] = await pool.query(`
      UPDATE alarm_events
      SET acknowledged = 1, acknowledged_by = ?, acknowledged_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [username, eventId]);
    
    return result.affectedRows > 0;
  } catch (err) {
    logger.error(`MySQL error acknowledging alarm event ${eventId}:`, err);
    return false;
  }
};

/**
 * Clean up old data based on retention period
 */
const cleanupOldData = async (retentionDays) => {
  if (!pool) return false;
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    // Delete old flow meter data
    await pool.query(`
      DELETE FROM flow_meter_data
      WHERE timestamp < ?
    `, [cutoffDate]);
    
    // Delete old inactive alarm events
    await pool.query(`
      DELETE FROM alarm_events
      WHERE active = 0 AND started_at < ?
    `, [cutoffDate]);
    
    return true;
  } catch (err) {
    logger.error('MySQL error cleaning up old data:', err);
    return false;
  }
};

/**
 * Close MySQL connection pool
 */
const closeMySql = async () => {
  if (pool) {
    try {
      await pool.end();
      logger.info('MySQL connection pool closed');
      return true;
    } catch (err) {
      logger.error('Error closing MySQL connection pool:', err);
      return false;
    }
  }
  return true;
};

// Export functions
module.exports = {
  initializeMySql,
  isMySqlConnected,
  insertFlowMeterData,
  getFlowMeterData,
  getLatestFlowMeterReadings,
  insertAlarmEvent,
  getAlarmEvents,
  acknowledgeAlarmEvent,
  cleanupOldData,
  closeMySql
};
