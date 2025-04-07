
const express = require('express');
const { db } = require('../models/db');
const logger = require('../utils/logger');
const { isAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all alarms
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT a.*, d.name as flow_meter_name
      FROM alarms a
      JOIN devices d ON a.flow_meter_id = d.flow_meter_id
    `;
    
    const params = [];
    
    if (status === 'active') {
      query += `
        WHERE EXISTS (
          SELECT 1 FROM alarm_events 
          WHERE alarm_id = a.id AND active = 1
        )
      `;
    }
    
    query += ' ORDER BY a.severity DESC, a.name';
    
    const alarms = await db.allAsync(query, params);
    
    // For each alarm, get the latest event if there is one
    const alarmsWithEvents = await Promise.all(alarms.map(async (alarm) => {
      const latestEvent = await db.getAsync(`
        SELECT * FROM alarm_events
        WHERE alarm_id = ?
        ORDER BY started_at DESC
        LIMIT 1
      `, [alarm.id]);
      
      return {
        ...alarm,
        latestEvent: latestEvent || null
      };
    }));
    
    res.json({ alarms: alarmsWithEvents });
  } catch (err) {
    logger.error('Error fetching alarms:', err);
    res.status(500).json({ error: 'Failed to fetch alarms' });
  }
});

// Get a specific alarm
router.get('/:id', async (req, res) => {
  try {
    const alarmId = req.params.id;
    
    const alarm = await db.getAsync(`
      SELECT a.*, d.name as flow_meter_name
      FROM alarms a
      JOIN devices d ON a.flow_meter_id = d.flow_meter_id
      WHERE a.id = ?
    `, [alarmId]);
    
    if (!alarm) {
      return res.status(404).json({ error: 'Alarm not found' });
    }
    
    // Get events for this alarm
    const events = await db.allAsync(`
      SELECT * FROM alarm_events
      WHERE alarm_id = ?
      ORDER BY started_at DESC
      LIMIT 100
    `, [alarmId]);
    
    res.json({
      alarm,
      events
    });
  } catch (err) {
    logger.error(`Error fetching alarm ${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to fetch alarm' });
  }
});

// Create a new alarm
router.post('/', isAdmin, async (req, res) => {
  try {
    const {
      flowMeterId,
      name,
      highLimit,
      lowLimit,
      deadband,
      enabled,
      severity,
      notifyViaEmail,
      emailRecipients
    } = req.body;
    
    // Validate required fields
    if (!flowMeterId || !name || (highLimit === undefined && lowLimit === undefined)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if flow meter exists
    const flowMeter = await db.getAsync('SELECT * FROM devices WHERE flow_meter_id = ?', [flowMeterId]);
    if (!flowMeter) {
      return res.status(404).json({ error: 'Flow meter not found' });
    }
    
    // Insert alarm
    const result = await db.runAsync(`
      INSERT INTO alarms
      (flow_meter_id, name, high_limit, low_limit, deadband, enabled, severity, notify_via_email, email_recipients)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      flowMeterId,
      name,
      highLimit,
      lowLimit,
      deadband || 0,
      enabled ? 1 : 0,
      severity || 'low',
      notifyViaEmail ? 1 : 0,
      emailRecipients || ''
    ]);
    
    const alarmId = result.lastID;
    
    // Get the newly created alarm
    const alarm = await db.getAsync(`
      SELECT a.*, d.name as flow_meter_name
      FROM alarms a
      JOIN devices d ON a.flow_meter_id = d.flow_meter_id
      WHERE a.id = ?
    `, [alarmId]);
    
    res.status(201).json({ alarm });
  } catch (err) {
    logger.error('Error creating alarm:', err);
    res.status(500).json({ error: 'Failed to create alarm' });
  }
});

// Update an alarm
router.put('/:id', isAdmin, async (req, res) => {
  try {
    const alarmId = req.params.id;
    const {
      name,
      highLimit,
      lowLimit,
      deadband,
      enabled,
      severity,
      notifyViaEmail,
      emailRecipients
    } = req.body;
    
    // Check if alarm exists
    const existingAlarm = await db.getAsync('SELECT id FROM alarms WHERE id = ?', [alarmId]);
    if (!existingAlarm) {
      return res.status(404).json({ error: 'Alarm not found' });
    }
    
    // Update alarm
    await db.runAsync(`
      UPDATE alarms
      SET name = ?, high_limit = ?, low_limit = ?, deadband = ?,
          enabled = ?, severity = ?, notify_via_email = ?, email_recipients = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      name,
      highLimit,
      lowLimit,
      deadband || 0,
      enabled ? 1 : 0,
      severity || 'low',
      notifyViaEmail ? 1 : 0,
      emailRecipients || '',
      alarmId
    ]);
    
    // Get updated alarm
    const updatedAlarm = await db.getAsync(`
      SELECT a.*, d.name as flow_meter_name
      FROM alarms a
      JOIN devices d ON a.flow_meter_id = d.flow_meter_id
      WHERE a.id = ?
    `, [alarmId]);
    
    res.json({ alarm: updatedAlarm });
  } catch (err) {
    logger.error(`Error updating alarm ${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to update alarm' });
  }
});

// Delete an alarm
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const alarmId = req.params.id;
    
    // Check if alarm exists
    const existingAlarm = await db.getAsync('SELECT id FROM alarms WHERE id = ?', [alarmId]);
    if (!existingAlarm) {
      return res.status(404).json({ error: 'Alarm not found' });
    }
    
    // Delete alarm
    await db.runAsync('DELETE FROM alarms WHERE id = ?', [alarmId]);
    
    res.json({ message: 'Alarm deleted successfully' });
  } catch (err) {
    logger.error(`Error deleting alarm ${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to delete alarm' });
  }
});

// Acknowledge an alarm event
router.post('/events/:eventId/acknowledge', async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const { acknowledgedBy } = req.body;
    
    // Check if event exists
    const event = await db.getAsync('SELECT * FROM alarm_events WHERE id = ?', [eventId]);
    if (!event) {
      return res.status(404).json({ error: 'Alarm event not found' });
    }
    
    // Check if already acknowledged
    if (event.acknowledged) {
      return res.status(400).json({ error: 'Alarm event already acknowledged' });
    }
    
    // Acknowledge the alarm event
    await db.runAsync(`
      UPDATE alarm_events
      SET acknowledged = 1, acknowledged_by = ?, acknowledged_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [acknowledgedBy || req.user.username, eventId]);
    
    // Get updated event
    const updatedEvent = await db.getAsync('SELECT * FROM alarm_events WHERE id = ?', [eventId]);
    
    res.json({ event: updatedEvent });
  } catch (err) {
    logger.error(`Error acknowledging alarm event ${req.params.eventId}:`, err);
    res.status(500).json({ error: 'Failed to acknowledge alarm event' });
  }
});

// Get alarm events
router.get('/events', async (req, res) => {
  try {
    const { active, flowMeterId, startDate, endDate, limit } = req.query;
    const queryParams = [];
    
    let query = `
      SELECT e.*, a.name as alarm_name, d.name as flow_meter_name
      FROM alarm_events e
      JOIN alarms a ON e.alarm_id = a.id
      JOIN devices d ON e.flow_meter_id = d.flow_meter_id
      WHERE 1=1
    `;
    
    if (active !== undefined) {
      query += ` AND e.active = ?`;
      queryParams.push(active === 'true' ? 1 : 0);
    }
    
    if (flowMeterId) {
      query += ` AND e.flow_meter_id = ?`;
      queryParams.push(flowMeterId);
    }
    
    if (startDate) {
      query += ` AND e.started_at >= ?`;
      queryParams.push(new Date(startDate).toISOString());
    }
    
    if (endDate) {
      query += ` AND e.started_at <= ?`;
      queryParams.push(new Date(endDate).toISOString());
    }
    
    query += ` ORDER BY e.started_at DESC`;
    
    if (limit) {
      query += ` LIMIT ?`;
      queryParams.push(parseInt(limit));
    } else {
      query += ` LIMIT 100`; // Default limit
    }
    
    const events = await db.allAsync(query, queryParams);
    
    res.json({ events });
  } catch (err) {
    logger.error('Error fetching alarm events:', err);
    res.status(500).json({ error: 'Failed to fetch alarm events' });
  }
});

module.exports = router;
