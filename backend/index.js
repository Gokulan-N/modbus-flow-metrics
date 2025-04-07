
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const http = require('http');
const { initializeDatabase } = require('./models/db');
const { setupPollingService } = require('./services/pollingService');
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
    console.log('Database initialized successfully');
    
    // Setup WebSocket for real-time updates
    handleWebSocketConnections(wss);
    
    // Start polling service
    setupPollingService(wss);
    
    // Initialize backup scheduler
    initializeBackupScheduler();
    
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  // Close database connections, stop polling, etc.
  process.exit(0);
});
