
const express = require('express');
const { db } = require('../models/db');
const { isAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get all devices
router.get('/', async (req, res) => {
  try {
    const devices = await db.allAsync(`
      SELECT 
        d.*,
        (SELECT COUNT(*) FROM registers WHERE device_id = d.id) AS register_count
      FROM devices d
      ORDER BY d.name
    `);
    
    res.json({ devices });
  } catch (err) {
    logger.error('Error fetching devices:', err);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

// Get device by ID with registers
router.get('/:id', async (req, res) => {
  try {
    const deviceId = req.params.id;
    
    const device = await db.getAsync('SELECT * FROM devices WHERE id = ?', [deviceId]);
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    const registers = await db.allAsync('SELECT * FROM registers WHERE device_id = ?', [deviceId]);
    
    res.json({
      device,
      registers
    });
  } catch (err) {
    logger.error(`Error fetching device ${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to fetch device' });
  }
});

// Create a new device
router.post('/', isAdmin, async (req, res) => {
  try {
    const {
      name,
      ipAddress,
      port,
      slaveId,
      protocol,
      enabled,
      pollRate,
      flowMeterId,
      registers
    } = req.body;
    
    // Validate required fields
    if (!name || !ipAddress || !port || !slaveId || !protocol || !pollRate || !flowMeterId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Insert device
    const result = await db.runAsync(`
      INSERT INTO devices 
      (name, ip_address, port, slave_id, protocol, enabled, poll_rate, flow_meter_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [name, ipAddress, port, slaveId, protocol, enabled ? 1 : 0, pollRate, flowMeterId]);
    
    const deviceId = result.lastID;
    
    // Insert registers if provided
    if (registers && registers.length > 0) {
      const registerInserts = registers.map(register => {
        return db.runAsync(`
          INSERT INTO registers
          (device_id, type, address, data_type, multiplier, description)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [deviceId, register.type, register.address, register.dataType, 
            register.multiplier || 1.0, register.description || '']);
      });
      
      await Promise.all(registerInserts);
    }
    
    // Fetch the newly created device with registers
    const device = await db.getAsync('SELECT * FROM devices WHERE id = ?', [deviceId]);
    const deviceRegisters = await db.allAsync('SELECT * FROM registers WHERE device_id = ?', [deviceId]);
    
    res.status(201).json({
      device,
      registers: deviceRegisters
    });
  } catch (err) {
    logger.error('Error creating device:', err);
    res.status(500).json({ error: 'Failed to create device' });
  }
});

// Update a device
router.put('/:id', isAdmin, async (req, res) => {
  try {
    const deviceId = req.params.id;
    const {
      name,
      ipAddress,
      port,
      slaveId,
      protocol,
      enabled,
      pollRate,
      flowMeterId
    } = req.body;
    
    // Check if device exists
    const existingDevice = await db.getAsync('SELECT id FROM devices WHERE id = ?', [deviceId]);
    if (!existingDevice) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    // Update device
    await db.runAsync(`
      UPDATE devices
      SET name = ?, ip_address = ?, port = ?, slave_id = ?, protocol = ?, 
          enabled = ?, poll_rate = ?, flow_meter_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [name, ipAddress, port, slaveId, protocol, enabled ? 1 : 0, pollRate, flowMeterId, deviceId]);
    
    // Get updated device
    const updatedDevice = await db.getAsync('SELECT * FROM devices WHERE id = ?', [deviceId]);
    
    res.json({ device: updatedDevice });
  } catch (err) {
    logger.error(`Error updating device ${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to update device' });
  }
});

// Delete a device
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const deviceId = req.params.id;
    
    // Check if device exists
    const existingDevice = await db.getAsync('SELECT id FROM devices WHERE id = ?', [deviceId]);
    if (!existingDevice) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    // Delete device (registers will be deleted via CASCADE)
    await db.runAsync('DELETE FROM devices WHERE id = ?', [deviceId]);
    
    res.json({ message: 'Device deleted successfully' });
  } catch (err) {
    logger.error(`Error deleting device ${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to delete device' });
  }
});

// Add a register to a device
router.post('/:deviceId/registers', isAdmin, async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    const { type, address, dataType, multiplier, description } = req.body;
    
    // Check if device exists
    const existingDevice = await db.getAsync('SELECT id FROM devices WHERE id = ?', [deviceId]);
    if (!existingDevice) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    // Insert register
    const result = await db.runAsync(`
      INSERT INTO registers
      (device_id, type, address, data_type, multiplier, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [deviceId, type, address, dataType, multiplier || 1.0, description || '']);
    
    const registerId = result.lastID;
    
    // Get newly created register
    const register = await db.getAsync('SELECT * FROM registers WHERE id = ?', [registerId]);
    
    res.status(201).json({ register });
  } catch (err) {
    logger.error(`Error adding register to device ${req.params.deviceId}:`, err);
    res.status(500).json({ error: 'Failed to add register' });
  }
});

// Update a register
router.put('/:deviceId/registers/:registerId', isAdmin, async (req, res) => {
  try {
    const { deviceId, registerId } = req.params;
    const { type, address, dataType, multiplier, description } = req.body;
    
    // Check if register exists
    const existingRegister = await db.getAsync(
      'SELECT id FROM registers WHERE id = ? AND device_id = ?', 
      [registerId, deviceId]
    );
    
    if (!existingRegister) {
      return res.status(404).json({ error: 'Register not found' });
    }
    
    // Update register
    await db.runAsync(`
      UPDATE registers
      SET type = ?, address = ?, data_type = ?, multiplier = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND device_id = ?
    `, [type, address, dataType, multiplier || 1.0, description || '', registerId, deviceId]);
    
    // Get updated register
    const updatedRegister = await db.getAsync('SELECT * FROM registers WHERE id = ?', [registerId]);
    
    res.json({ register: updatedRegister });
  } catch (err) {
    logger.error(`Error updating register ${req.params.registerId}:`, err);
    res.status(500).json({ error: 'Failed to update register' });
  }
});

// Delete a register
router.delete('/:deviceId/registers/:registerId', isAdmin, async (req, res) => {
  try {
    const { deviceId, registerId } = req.params;
    
    // Check if register exists
    const existingRegister = await db.getAsync(
      'SELECT id FROM registers WHERE id = ? AND device_id = ?', 
      [registerId, deviceId]
    );
    
    if (!existingRegister) {
      return res.status(404).json({ error: 'Register not found' });
    }
    
    // Delete register
    await db.runAsync('DELETE FROM registers WHERE id = ? AND device_id = ?', [registerId, deviceId]);
    
    res.json({ message: 'Register deleted successfully' });
  } catch (err) {
    logger.error(`Error deleting register ${req.params.registerId}:`, err);
    res.status(500).json({ error: 'Failed to delete register' });
  }
});

// Connect to device (enable polling)
router.post('/:id/connect', async (req, res) => {
  try {
    const deviceId = req.params.id;
    
    // Check if device exists
    const device = await db.getAsync('SELECT * FROM devices WHERE id = ?', [deviceId]);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    // Update device to enabled
    await db.runAsync(
      'UPDATE devices SET enabled = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
      [deviceId]
    );
    
    res.json({ 
      message: 'Device connected successfully',
      deviceId: device.id,
      flowMeterId: device.flow_meter_id
    });
  } catch (err) {
    logger.error(`Error connecting device ${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to connect device' });
  }
});

// Disconnect device (disable polling)
router.post('/:id/disconnect', async (req, res) => {
  try {
    const deviceId = req.params.id;
    
    // Check if device exists
    const device = await db.getAsync('SELECT * FROM devices WHERE id = ?', [deviceId]);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    // Update device to disabled
    await db.runAsync(
      'UPDATE devices SET enabled = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
      [deviceId]
    );
    
    res.json({ 
      message: 'Device disconnected successfully',
      deviceId: device.id,
      flowMeterId: device.flow_meter_id
    });
  } catch (err) {
    logger.error(`Error disconnecting device ${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to disconnect device' });
  }
});

module.exports = router;
