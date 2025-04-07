
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const http = require('http');
const { initializeDatabase } = require('./models/db');
const { initializeMySql, closeMySql } = require('./models/mysqlDb');
const { setupPollingService, stopPollingService } = require('./services/pollingService');
const { initializeBackupScheduler } = require('./services/backupService');
const authRoutes = require('./routes/authRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const flowMeterRoutes = require('./routes/flowMeterRoutes');
const alarmRoutes = require('./routes/alarmRoutes');
const reportRoutes = require('./routes/reportRoutes');
const systemRoutes = require('./routes/systemRoutes');
const backupRoutes = require('./routes/backupRoutes');
const { authenticateToken } = require('./middleware/auth');
const { handleWebSocketConnections } = require('./services/websocketService');
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Ensure critical directories exist
const dirsToCreate = ['./logs', './backups', './reports'];
dirsToCreate.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', authenticateToken, deviceRoutes);
app.use('/api/flowmeters', authenticateToken, flowMeterRoutes);
app.use('/api/alarms', authenticateToken, alarmRoutes);
app.use('/api/reports', authenticateToken, reportRoutes);
app.use('/api/system', authenticateToken, systemRoutes);
app.use('/api/backups', authenticateToken, backupRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize database
initializeDatabase()
  .then(() => {
    logger.info('SQLite database initialized successfully');
    
    // Try to initialize MySQL if configured
    return initializeMySql();
  })
  .then(() => {
    // Setup WebSocket for real-time updates
    handleWebSocketConnections(wss);
    
    // Start polling service
    setupPollingService(wss);
    
    // Initialize backup scheduler
    initializeBackupScheduler();
    
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    logger.error('Failed to initialize database:', err);
    process.exit(1);
  });

// Handle graceful shutdown for both SIGINT and SIGTERM
const gracefulShutdown = async () => {
  logger.info('Shutting down gracefully...');
  
  // Stop polling
  stopPollingService();
  
  // Close MySQL connection if using it
  await closeMySql();
  
  // Wait a moment for connections to close
  setTimeout(() => {
    logger.info('Shutdown complete');
    process.exit(0);
  }, 1000);
};

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', gracefulShutdown);

// Handle SIGTERM (service stop)
process.on('SIGTERM', gracefulShutdown);
