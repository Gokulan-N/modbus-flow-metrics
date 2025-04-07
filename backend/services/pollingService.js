const ModbusRTU = require('modbus-serial');
const { db, getCurrentDbType } = require('../models/db');
const { 
  insertFlowMeterData, 
  insertAlarmEvent 
} = require('../models/mysqlDb');
const logger = require('../utils/logger');

let isPolling = false;
let pollingIntervals = {};
let modbusClients = {};
let webSocketServer = null;
let autoReconnect = true;

// Initialize the polling service
const setupPollingService = (wss, enableAutoReconnect = false) => {
  webSocketServer = wss;
  autoReconnect = enableAutoReconnect;
  startPollingService();
  
  // Restart polling every hour to prevent any potential memory issues
  setInterval(() => {
    restartPollingService();
  }, 60 * 60 * 1000); // 1 hour
  
  return true;
};

// Start polling service
const startPollingService = async () => {
  if (isPolling) {
    return;
  }
  
  isPolling = true;
  logger.info('Starting polling service...');
  
  try {
    // Get all enabled devices
    const devices = await db.allAsync(`
      SELECT * FROM devices WHERE enabled = 1
    `);
    
    if (!devices || devices.length === 0) {
      logger.info('No enabled devices found for polling');
      return;
    }
    
    // Setup polling for each device
    for (const device of devices) {
      await setupDevicePolling(device);
    }
    
    logger.info(`Polling service started with ${devices.length} devices`);
  } catch (err) {
    logger.error('Error starting polling service:', err);
    isPolling = false;
  }
};

// Stop polling service
const stopPollingService = () => {
  logger.info('Stopping polling service...');
  
  // Clear all polling intervals
  Object.keys(pollingIntervals).forEach(deviceId => {
    clearInterval(pollingIntervals[deviceId]);
    delete pollingIntervals[deviceId];
  });
  
  // Close all modbus connections
  Object.keys(modbusClients).forEach(deviceId => {
    try {
      if (modbusClients[deviceId] && modbusClients[deviceId].isOpen) {
        modbusClients[deviceId].close(() => {
          logger.info(`Closed Modbus connection for device ${deviceId}`);
        });
      }
      delete modbusClients[deviceId];
    } catch (error) {
      logger.error(`Error closing Modbus client for device ${deviceId}:`, error);
    }
  });
  
  isPolling = false;
  logger.info('Polling service stopped');
};

// Restart polling service
const restartPollingService = async () => {
  logger.info('Restarting polling service...');
  stopPollingService();
  setTimeout(startPollingService, 1000);
};

// Add a new device to the polling service
const addDeviceToPolling = async (deviceId) => {
  try {
    // Check if already polling this device
    if (pollingIntervals[deviceId]) {
      logger.info(`Device ${deviceId} is already being polled`);
      return true;
    }
    
    // Get device details
    const device = await db.getAsync('SELECT * FROM devices WHERE id = ?', [deviceId]);
    
    if (!device) {
      logger.error(`Device ${deviceId} not found`);
      return false;
    }
    
    // Validate device enabled status
    if (!device.enabled) {
      logger.warn(`Cannot add device ${deviceId} to polling as it is not enabled`);
      return false;
    }
    
    // Setup polling for this device
    await setupDevicePolling(device);
    logger.info(`Added device ${deviceId} to polling service`);
    return true;
  } catch (err) {
    logger.error(`Error adding device ${deviceId} to polling:`, err);
    return false;
  }
};

// Remove a device from the polling service
const removeDeviceFromPolling = (deviceId) => {
  try {
    // Check if we're polling this device
    if (!pollingIntervals[deviceId]) {
      logger.info(`Device ${deviceId} is not currently being polled`);
      return true;
    }
    
    // Clear polling interval
    clearInterval(pollingIntervals[deviceId]);
    delete pollingIntervals[deviceId];
    
    // Close modbus connection
    if (modbusClients[deviceId] && modbusClients[deviceId].isOpen) {
      modbusClients[deviceId].close(() => {
        logger.info(`Closed Modbus connection for device ${deviceId}`);
      });
    }
    delete modbusClients[deviceId];
    
    logger.info(`Removed device ${deviceId} from polling service`);
    return true;
  } catch (err) {
    logger.error(`Error removing device ${deviceId} from polling:`, err);
    return false;
  }
};

// Setup polling for a specific device
const setupDevicePolling = async (device) => {
  try {
    // Get registers for the device
    const registers = await db.allAsync(`
      SELECT * FROM registers WHERE device_id = ?
    `, [device.id]);
    
    if (!registers || registers.length === 0) {
      logger.warn(`No registers found for device ${device.id}. Skipping...`);
      return;
    }
    
    // Create Modbus client
    const client = new ModbusRTU();
    
    // Function to connect to the device
    const connectToDevice = async () => {
      try {
        // Connect based on protocol
        switch (device.protocol.toLowerCase()) {
          case 'tcp':
            await client.connectTCP(device.ip_address, { port: device.port });
            break;
          case 'rtu':
            // In real implementation, this would connect to a serial port
            logger.warn('RTU protocol not fully implemented in this demo');
            return false;
          case 'rtuovertcp':
            await client.connectTcpRTUBuffered(device.ip_address, { port: device.port });
            break;
          default:
            logger.error(`Unsupported protocol: ${device.protocol}`);
            return false;
        }
        
        // Set the slave ID (unit ID)
        client.setID(device.slave_id);
        logger.info(`Connected to device ${device.id} (${device.name})`);
        return true;
      } catch (err) {
        logger.error(`Error connecting to device ${device.id}:`, err);
        return false;
      }
    };
    
    // Try to connect initially
    const connected = await connectToDevice();
    if (!connected) {
      logger.warn(`Failed to connect to device ${device.id}. Will retry on next poll.`);
    }
    
    // Store the client
    modbusClients[device.id] = client;
    
    // Setup polling interval with auto-reconnect capability
    pollingIntervals[device.id] = setInterval(async () => {
      try {
        if (!client.isOpen) {
          if (autoReconnect) {
            logger.info(`Attempting to reconnect to device ${device.id}...`);
            await connectToDevice();
          } else {
            logger.warn(`Device ${device.id} connection is closed. Skipping poll.`);
            return;
          }
        }
        
        // Poll the device if connected
        if (client.isOpen) {
          await pollDevice(device, registers, client);
        }
      } catch (err) {
        logger.error(`Error during polling cycle for device ${device.id}:`, err);
        // Close connection if there's an error, it will be reopened on next cycle
        if (client.isOpen) {
          try {
            client.close();
          } catch (closeErr) {
            logger.error(`Error closing client for device ${device.id}:`, closeErr);
          }
        }
      }
    }, device.poll_rate);
    
    logger.info(`Polling started for device ${device.id} (${device.name}) every ${device.poll_rate}ms`);
  } catch (err) {
    logger.error(`Error setting up polling for device ${device.id}:`, err);
  }
};

// Poll a device and process its data
const pollDevice = async (device, registers, client) => {
  try {
    let flowRate = null;
    let totalFlow = null;
    
    // Poll each register
    for (const register of registers) {
      try {
        const value = await readRegister(client, register);
        
        // Map register type to data property
        if (register.type === 'flowRate') {
          flowRate = value;
        } else if (register.type === 'totalFlow') {
          totalFlow = value;
        }
      } catch (regErr) {
        logger.error(`Error reading register ${register.id} (${register.type}):`, regErr);
      }
    }
    
    // If we have valid data, store it
    if (flowRate !== null || totalFlow !== null) {
      await storeFlowMeterData(device.flow_meter_id, flowRate, totalFlow);
      
      // Check alarms
      await checkAlarms(device.flow_meter_id, flowRate);
      
      // Broadcast updated data to connected clients
      broadcastUpdate(device.flow_meter_id, flowRate, totalFlow);
    }
  } catch (err) {
    logger.error(`Error polling device ${device.id}:`, err);
    throw err; // Rethrow to trigger reconnection process
  }
};

// Read a register value from the Modbus device
const readRegister = async (client, register) => {
  try {
    let result;
    
    // Read holding or input register based on register type
    // For this implementation, we'll read holding registers for all types
    result = await client.readHoldingRegisters(register.address, getRegisterLength(register.data_type));
    
    // Parse the result based on data type
    const value = parseRegisterValue(result.buffer, register.data_type) * register.multiplier;
    
    return value;
  } catch (err) {
    throw new Error(`Failed to read register ${register.address}: ${err.message}`);
  }
};

// Get the number of registers to read based on data type
const getRegisterLength = (dataType) => {
  switch (dataType.toLowerCase()) {
    case 'int16':
    case 'uint16':
      return 1;
    case 'int32':
    case 'uint32':
    case 'float32':
      return 2;
    case 'float64':
      return 4;
    default:
      return 2;
  }
};

// Parse register value based on data type
const parseRegisterValue = (buffer, dataType) => {
  switch (dataType.toLowerCase()) {
    case 'int16':
      return buffer.readInt16BE(0);
    case 'uint16':
      return buffer.readUInt16BE(0);
    case 'int32':
      return buffer.readInt32BE(0);
    case 'uint32':
      return buffer.readUInt32BE(0);
    case 'float32':
      return buffer.readFloatBE(0);
    case 'float64':
      return buffer.readDoubleBE(0);
    default:
      return buffer.readFloatBE(0);
  }
};

// Store flow meter data in the database
const storeFlowMeterData = async (flowMeterId, flowRate, totalFlow) => {
  try {
    // Default status is 'normal'
    let status = 'normal';
    
    // Determine status based on flow rate
    if (flowRate !== null) {
      if (flowRate === 0) {
        status = 'warning'; // No flow
      } else if (flowRate < 0) {
        status = 'error'; // Negative flow (error condition)
      }
    }
    
    // Get current database type
    const dataDbType = await getCurrentDbType();
    
    // Store data in the appropriate database
    if (dataDbType === 'mysql') {
      // Insert into MySQL
      await insertFlowMeterData(flowMeterId, flowRate, totalFlow, status);
    } else {
      // Insert into SQLite
      await db.runAsync(`
        INSERT INTO flow_meter_data
        (flow_meter_id, flow_rate, total_flow, status)
        VALUES (?, ?, ?, ?)
      `, [flowMeterId, flowRate, totalFlow, status]);
    }
    
    // Clean up old data based on retention policy (in a production system)
    cleanupOldData();
  } catch (err) {
    logger.error(`Error storing flow meter data for flow meter ${flowMeterId}:`, err);
  }
};

// Check for alarm conditions
const checkAlarms = async (flowMeterId, flowRate) => {
  if (flowRate === null) return;
  
  try {
    // Get all enabled alarms for this flow meter
    const alarms = await db.allAsync(`
      SELECT * FROM alarms
      WHERE flow_meter_id = ? AND enabled = 1
    `, [flowMeterId]);
    
    for (const alarm of alarms) {
      // Check high limit
      if (alarm.high_limit !== null && flowRate >= alarm.high_limit) {
        await triggerAlarm(alarm, flowMeterId, flowRate, `High limit exceeded: ${flowRate} >= ${alarm.high_limit}`);
      } 
      // Check low limit
      else if (alarm.low_limit !== null && flowRate <= alarm.low_limit) {
        await triggerAlarm(alarm, flowMeterId, flowRate, `Low limit exceeded: ${flowRate} <= ${alarm.low_limit}`);
      }
      // Check if we need to clear an active alarm (considering deadband)
      else {
        await clearAlarmIfNeeded(alarm, flowMeterId, flowRate);
      }
    }
  } catch (err) {
    logger.error(`Error checking alarms for flow meter ${flowMeterId}:`, err);
  }
};

// Helper function to get active alarm event
const getActiveAlarmEvent = async (alarmId, flowMeterId) => {
  return await db.getAsync(`
    SELECT * FROM alarm_events
    WHERE alarm_id = ? AND flow_meter_id = ? AND active = 1
  `, [alarmId, flowMeterId]);
};

// Trigger an alarm condition
const triggerAlarm = async (alarm, flowMeterId, value, message) => {
  try {
    // Check if there's already an active alarm for this condition
    const activeAlarm = await getActiveAlarmEvent(alarm.id, flowMeterId);
    
    if (activeAlarm) {
      // Alarm already active, no need to create a new one
      return;
    }
    
    // Get current database type
    const dataDbType = await getCurrentDbType();
    
    // Create new alarm event in the appropriate database
    if (dataDbType === 'mysql') {
      // Insert into MySQL
      await insertAlarmEvent(alarm.id, flowMeterId, true, value, message);
    } else {
      // Insert into SQLite
      await db.runAsync(`
        INSERT INTO alarm_events
        (alarm_id, flow_meter_id, active, value, message)
        VALUES (?, ?, 1, ?, ?)
      `, [alarm.id, flowMeterId, value, message]);
    }
    
    logger.info(`Alarm triggered: ${alarm.name} - ${message}`);
    
    // If email notifications are enabled, would send email here
    if (alarm.notify_via_email) {
      // sendAlarmEmail(alarm, message);
      logger.info(`Would send email for alarm: ${alarm.name} to ${alarm.email_recipients}`);
    }
  } catch (err) {
    logger.error(`Error triggering alarm ${alarm.id}:`, err);
  }
};

// Clear an alarm if conditions are no longer met (considering deadband)
const clearAlarmIfNeeded = async (alarm, flowMeterId, value) => {
  try {
    // Get active alarm for this condition
    const activeAlarm = await getActiveAlarmEvent(alarm.id, flowMeterId);
    
    if (!activeAlarm) {
      // No active alarm to clear
      return;
    }
    
    let shouldClear = false;
    
    // Check high limit with deadband
    if (alarm.high_limit !== null && value < (alarm.high_limit - alarm.deadband)) {
      shouldClear = true;
    }
    
    // Check low limit with deadband
    if (alarm.low_limit !== null && value > (alarm.low_limit + alarm.deadband)) {
      shouldClear = true;
    }
    
    if (shouldClear) {
      // Get current database type
      const dataDbType = await getCurrentDbType();
      
      if (dataDbType === 'mysql') {
        // In MySQL, we would update the alarm event differently
        // For simplicity, just update the SQLite version here
      }
      
      // Update alarm event to inactive in SQLite
      await db.runAsync(`
        UPDATE alarm_events
        SET active = 0, ended_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [activeAlarm.id]);
      
      logger.info(`Alarm cleared: ${alarm.name}`);
    }
  } catch (err) {
    logger.error(`Error clearing alarm ${alarm.id}:`, err);
  }
};

// Clean up old data based on retention policy
const cleanupOldData = async () => {
  try {
    // Get retention period from system settings
    const settings = await db.getAsync('SELECT data_retention_period, data_db_type FROM system_settings LIMIT 1');
    
    if (settings && settings.data_retention_period) {
      const retentionDays = settings.data_retention_period;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      // Delete old data from SQLite
      await db.runAsync(`
        DELETE FROM flow_meter_data
        WHERE timestamp < ?
      `, [cutoffDate.toISOString()]);
      
      // If using MySQL, clean up MySQL data too
      if (settings.data_db_type === 'mysql') {
        const { cleanupOldData: cleanupMySqlData } = require('../models/mysqlDb');
        await cleanupMySqlData(retentionDays);
      }
    }
  } catch (err) {
    logger.error('Error cleaning up old data:', err);
  }
};

// Broadcast updates to WebSocket clients
const broadcastUpdate = (flowMeterId, flowRate, totalFlow) => {
  if (!webSocketServer) return;
  
  const updateData = {
    type: 'flowMeterUpdate',
    data: {
      flowMeterId,
      flowRate,
      totalFlow,
      timestamp: new Date().toISOString()
    }
  };
  
  webSocketServer.clients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(JSON.stringify(updateData));
    }
  });
};

module.exports = {
  setupPollingService,
  startPollingService,
  stopPollingService,
  restartPollingService,
  addDeviceToPolling,
  removeDeviceFromPolling
};
