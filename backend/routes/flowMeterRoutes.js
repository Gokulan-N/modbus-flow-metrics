
const express = require('express');
const { db } = require('../models/db');
const logger = require('../utils/logger');
const { isAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all flow meter data (latest readings)
router.get('/', async (req, res) => {
  try {
    // Get the latest reading for each flow meter
    const flowMeters = await db.allAsync(`
      WITH LatestReadings AS (
        SELECT 
          flow_meter_id,
          MAX(timestamp) as latest_timestamp
        FROM flow_meter_data
        GROUP BY flow_meter_id
      )
      SELECT 
        d.id,
        d.name,
        d.flow_meter_id,
        d.enabled,
        fmd.flow_rate AS value,
        COALESCE(
          (SELECT unit FROM registers WHERE device_id = d.id AND type = 'flowRate' LIMIT 1),
          'L/min'
        ) AS unit,
        fmd.total_flow AS total_flow,
        fmd.status,
        fmd.timestamp AS last_update
      FROM devices d
      JOIN flow_meter_data fmd ON d.flow_meter_id = fmd.flow_meter_id
      JOIN LatestReadings lr ON fmd.flow_meter_id = lr.flow_meter_id AND fmd.timestamp = lr.latest_timestamp
      ORDER BY d.name
    `);
    
    // Inject today's consumption data (in a real system, this would be calculated from historical data)
    const flowMetersWithConsumption = await Promise.all(flowMeters.map(async (meter) => {
      // Get today's consumption (simplified calculation for this implementation)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const todayConsumption = await db.getAsync(`
        SELECT SUM(flow_rate) * 0.06 AS today_consumption
        FROM flow_meter_data
        WHERE flow_meter_id = ? AND timestamp >= ?
      `, [meter.flow_meter_id, todayStart.toISOString()]);
      
      // Get history data for today (for charts)
      const historyData = await db.allAsync(`
        SELECT timestamp, flow_rate AS value
        FROM flow_meter_data
        WHERE flow_meter_id = ? AND timestamp >= ?
        ORDER BY timestamp ASC
      `, [meter.flow_meter_id, todayStart.toISOString()]);
      
      return {
        ...meter,
        historyData: historyData || [],
        todayConsumption: todayConsumption?.today_consumption || 0
      };
    }));
    
    res.json({ flowMeters: flowMetersWithConsumption });
  } catch (err) {
    logger.error('Error fetching flow meter data:', err);
    res.status(500).json({ error: 'Failed to fetch flow meter data' });
  }
});

// Get specific flow meter with its data
router.get('/:id', async (req, res) => {
  try {
    const flowMeterId = req.params.id;
    
    // Get the device/flow meter info
    const device = await db.getAsync(`
      SELECT * FROM devices 
      WHERE flow_meter_id = ?
    `, [flowMeterId]);
    
    if (!device) {
      return res.status(404).json({ error: 'Flow meter not found' });
    }
    
    // Get the latest reading
    const latestReading = await db.getAsync(`
      SELECT * FROM flow_meter_data
      WHERE flow_meter_id = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `, [flowMeterId]);
    
    // Get history data (last 24 hours by default)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const historyData = await db.allAsync(`
      SELECT timestamp, flow_rate AS value
      FROM flow_meter_data
      WHERE flow_meter_id = ? AND timestamp >= ?
      ORDER BY timestamp ASC
    `, [flowMeterId, yesterday.toISOString()]);
    
    res.json({
      id: device.flow_meter_id,
      name: device.name,
      value: latestReading?.flow_rate || 0,
      unit: 'L/min', // this would come from register configuration in a full implementation
      totalFlow: latestReading?.total_flow || 0,
      status: latestReading?.status || 'normal',
      lastUpdate: latestReading?.timestamp || new Date().toISOString(),
      historyData: historyData || [],
      configuration: device
    });
  } catch (err) {
    logger.error(`Error fetching flow meter ${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to fetch flow meter data' });
  }
});

// Get history data for a specific flow meter
router.get('/:id/history', async (req, res) => {
  try {
    const flowMeterId = req.params.id;
    const { timeframe, startDate, endDate } = req.query;
    
    let startTime;
    let endTime = new Date();
    
    // Determine the time range based on the requested timeframe
    switch (timeframe) {
      case '24h':
        startTime = new Date();
        startTime.setDate(startTime.getDate() - 1);
        break;
      case '7d':
        startTime = new Date();
        startTime.setDate(startTime.getDate() - 7);
        break;
      case '30d':
        startTime = new Date();
        startTime.setDate(startTime.getDate() - 30);
        break;
      case 'custom':
        if (startDate) {
          startTime = new Date(startDate);
        } else {
          startTime = new Date();
          startTime.setDate(startTime.getDate() - 1);
        }
        
        if (endDate) {
          endTime = new Date(endDate);
        }
        break;
      default:
        // Default to 24 hours
        startTime = new Date();
        startTime.setDate(startTime.getDate() - 1);
    }
    
    // Query for the appropriate time range
    const historyData = await db.allAsync(`
      SELECT 
        timestamp,
        flow_rate AS value,
        total_flow
      FROM flow_meter_data
      WHERE flow_meter_id = ? AND timestamp BETWEEN ? AND ?
      ORDER BY timestamp ASC
    `, [flowMeterId, startTime.toISOString(), endTime.toISOString()]);
    
    res.json({
      flowMeterId,
      timeframe: timeframe || '24h',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      historyData
    });
  } catch (err) {
    logger.error(`Error fetching history data for flow meter ${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to fetch history data' });
  }
});

// Get consumption data for a specific flow meter
router.get('/:id/consumption', async (req, res) => {
  try {
    const flowMeterId = req.params.id;
    const { period } = req.query; // daily, weekly, monthly
    
    let groupBy;
    let startDate;
    const endDate = new Date();
    
    // Determine the time period and grouping
    switch (period) {
      case 'weekly':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        groupBy = "strftime('%Y-%m-%d', timestamp)";
        break;
      case 'monthly':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        groupBy = "strftime('%Y-%m-%d', timestamp)";
        break;
      case 'yearly':
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        groupBy = "strftime('%Y-%m', timestamp)";
        break;
      case 'daily':
      default:
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        groupBy = "strftime('%H', timestamp)";
        break;
    }
    
    // Query for consumption data
    const consumptionData = await db.allAsync(`
      SELECT
        ${groupBy} AS period,
        SUM(flow_rate) * 0.06 AS consumption
      FROM flow_meter_data
      WHERE flow_meter_id = ? AND timestamp BETWEEN ? AND ?
      GROUP BY ${groupBy}
      ORDER BY period
    `, [flowMeterId, startDate.toISOString(), endDate.toISOString()]);
    
    res.json({
      flowMeterId,
      period: period || 'daily',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      consumptionData
    });
  } catch (err) {
    logger.error(`Error fetching consumption data for flow meter ${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to fetch consumption data' });
  }
});

module.exports = router;
