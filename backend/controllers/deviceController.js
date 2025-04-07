
const { db } = require('../models/db');
const logger = require('../utils/logger');
const { 
  addDeviceToPolling, 
  removeDeviceFromPolling 
} = require('../services/pollingService');
const net = require('net');

// Function to validate IP address
const isValidIpOrHostname = (address) => {
  // Check if it's a valid IPv4 address
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  if (ipv4Regex.test(address)) {
    const parts = address.split('.');
    return parts.every(part => parseInt(part, 10) >= 0 && parseInt(part, 10) <= 255);
  }
  
  // Check if it might be a hostname
  const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
  return hostnameRegex.test(address);
};

// Function to validate port
const isValidPort = (port) => {
  const portNum = parseInt(port, 10);
  return !isNaN(portNum) && portNum >= 1 && portNum <= 65535;
};

// Function to validate poll rate
const isValidPollRate = (rate) => {
  const rateNum = parseInt(rate, 10);
  return !isNaN(rateNum) && rateNum >= 1000; // Minimum 1000ms (1 second)
};

// Get all devices
exports.getAllDevices = async (req, res) => {
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
};

// Get device by ID with registers
exports.getDeviceById = async (req, res) => {
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
};

// Create a new device
exports.createDevice = async (req, res) => {
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
    
    // Validate IP address or hostname
    if (!isValidIpOrHostname(ipAddress)) {
      return res.status(400).json({ error: 'Invalid IP address or hostname' });
    }
    
    // Validate port
    if (!isValidPort(port)) {
      return res.status(400).json({ error: 'Invalid port number. Must be between 1 and 65535' });
    }
    
    // Validate poll rate
    if (!isValidPollRate(pollRate)) {
      return res.status(400).json({ error: 'Invalid poll rate. Must be at least 1000ms' });
    }

    // Validate protocol
    if (!['tcp', 'rtu', 'rtuovertcp'].includes(protocol.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid protocol. Must be one of: tcp, rtu, rtuovertcp' });
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
    
    // If device is enabled, start polling
    if (enabled) {
      await addDeviceToPolling(deviceId);
    }
    
    res.status(201).json({
      device,
      registers: deviceRegisters
    });
  } catch (err) {
    logger.error('Error creating device:', err);
    res.status(500).json({ error: 'Failed to create device' });
  }
};

// Update a device
exports.updateDevice = async (req, res) => {
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
    const existingDevice = await db.getAsync('SELECT id, enabled FROM devices WHERE id = ?', [deviceId]);
    if (!existingDevice) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    // Validate IP address or hostname
    if (!isValidIpOrHostname(ipAddress)) {
      return res.status(400).json({ error: 'Invalid IP address or hostname' });
    }
    
    // Validate port
    if (!isValidPort(port)) {
      return res.status(400).json({ error: 'Invalid port number. Must be between 1 and 65535' });
    }
    
    // Validate poll rate
    if (!isValidPollRate(pollRate)) {
      return res.status(400).json({ error: 'Invalid poll rate. Must be at least 1000ms' });
    }

    // Validate protocol
    if (!['tcp', 'rtu', 'rtuovertcp'].includes(protocol.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid protocol. Must be one of: tcp, rtu, rtuovertcp' });
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
    
    // If device enabled status changed, update polling
    if (existingDevice.enabled !== (enabled ? 1 : 0)) {
      if (enabled) {
        // Start polling if newly enabled
        await addDeviceToPolling(deviceId);
      } else {
        // Stop polling if newly disabled
        removeDeviceFromPolling(deviceId);
      }
    }
    
    res.json({ device: updatedDevice });
  } catch (err) {
    logger.error(`Error updating device ${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to update device' });
  }
};

// Delete a device
exports.deleteDevice = async (req, res) => {
  try {
    const deviceId = req.params.id;
    
    // Check if device exists
    const existingDevice = await db.getAsync('SELECT id FROM devices WHERE id = ?', [deviceId]);
    if (!existingDevice) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    // Stop polling if device is being polled
    removeDeviceFromPolling(deviceId);
    
    // Delete device (registers will be deleted via CASCADE)
    await db.runAsync('DELETE FROM devices WHERE id = ?', [deviceId]);
    
    res.json({ message: 'Device deleted successfully' });
  } catch (err) {
    logger.error(`Error deleting device ${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to delete device' });
  }
};

// Add a register to a device
exports.addRegister = async (req, res) => {
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
};

// Update a register
exports.updateRegister = async (req, res) => {
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
};

// Delete a register
exports.deleteRegister = async (req, res) => {
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
};

// Connect to device (enable polling)
exports.connectDevice = async (req, res) => {
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
    
    // Start polling immediately
    const success = await addDeviceToPolling(deviceId);
    if (!success) {
      return res.status(500).json({ error: 'Failed to start polling for device' });
    }
    
    res.json({ 
      message: 'Device connected successfully',
      deviceId: device.id,
      flowMeterId: device.flow_meter_id
    });
  } catch (err) {
    logger.error(`Error connecting device ${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to connect device' });
  }
};

// Disconnect device (disable polling)
exports.disconnectDevice = async (req, res) => {
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
    
    // Stop polling immediately
    removeDeviceFromPolling(deviceId);
    
    res.json({ 
      message: 'Device disconnected successfully',
      deviceId: device.id,
      flowMeterId: device.flow_meter_id
    });
  } catch (err) {
    logger.error(`Error disconnecting device ${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to disconnect device' });
  }
};
