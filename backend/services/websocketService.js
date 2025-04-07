const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { db } = require('../models/db');

// Handle WebSocket connections
const handleWebSocketConnections = (wss) => {
  wss.on('connection', (ws, req) => {
    ws.isAlive = true;
    
    // Parse token from query string
    const url = new URL(req.url, 'ws://localhost');
    const token = url.searchParams.get('token');
    
    // Authenticate the connection
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        ws.user = decoded;
        ws.authenticated = true;
        logger.info(`WebSocket authenticated for user: ${decoded.username}`);
      } catch (err) {
        logger.warn('Invalid WebSocket authentication token');
        ws.authenticated = false;
      }
    } else {
      ws.authenticated = false;
    }
    
    // Handle messages
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        
        // Handle different message types
        switch (data.type) {
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
            break;
          
          case 'subscribe':
            handleSubscription(ws, data);
            break;
            
          case 'getFlowMeters':
            if (ws.authenticated) {
              await sendFlowMeterData(ws);
            } else {
              ws.send(JSON.stringify({ type: 'error', message: 'Authentication required' }));
            }
            break;
            
          default:
            logger.debug(`Unknown message type: ${data.type}`);
            break;
        }
      } catch (err) {
        logger.error('Error processing WebSocket message:', err);
      }
    });
    
    // Handle connection close
    ws.on('close', () => {
      logger.info('WebSocket connection closed');
    });
    
    // Send initial connection confirmation
    ws.send(JSON.stringify({ 
      type: 'connected',
      authenticated: ws.authenticated,
      timestamp: new Date().toISOString()
    }));
  });
  
  // Implement ping/pong to keep connections alive and detect dead connections
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);
  
  wss.on('close', () => {
    clearInterval(pingInterval);
  });
};

// Handle subscription requests
const handleSubscription = (ws, data) => {
  if (!ws.authenticated && data.requiresAuth) {
    ws.send(JSON.stringify({ type: 'error', message: 'Authentication required for this subscription' }));
    return;
  }
  
  // Store subscription information in the websocket object
  if (!ws.subscriptions) {
    ws.subscriptions = [];
  }
  
  // Add to subscriptions if not already subscribed
  const existingSubscription = ws.subscriptions.find(s => s.channel === data.channel);
  if (!existingSubscription) {
    ws.subscriptions.push({
      channel: data.channel,
      params: data.params || {}
    });
    
    logger.info(`Client subscribed to ${data.channel}`);
    ws.send(JSON.stringify({ 
      type: 'subscribed', 
      channel: data.channel,
      timestamp: new Date().toISOString()
    }));
  }
};

// Send flow meter data to a client
const sendFlowMeterData = async (ws) => {
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
        fmd.total_flow AS total_flow,
        fmd.status,
        fmd.timestamp AS last_update
      FROM devices d
      LEFT JOIN flow_meter_data fmd ON d.flow_meter_id = fmd.flow_meter_id
      LEFT JOIN LatestReadings lr ON fmd.flow_meter_id = lr.flow_meter_id AND fmd.timestamp = lr.latest_timestamp
      ORDER BY d.name
    `);
    
    ws.send(JSON.stringify({
      type: 'flowMeters',
      data: flowMeters,
      timestamp: new Date().toISOString()
    }));
  } catch (err) {
    logger.error('Error fetching flow meter data for WebSocket:', err);
    ws.send(JSON.stringify({ type: 'error', message: 'Failed to fetch flow meter data' }));
  }
};

module.exports = {
  handleWebSocketConnections
};
