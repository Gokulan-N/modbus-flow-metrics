
const { Service } = require('node-windows');
const path = require('path');

console.log('Installing FlexiFlow Monitoring System as a Windows service...');

// Create a new service object
const svc = new Service({
  name: 'FlexiFlow Monitoring System',
  description: 'Local backend server for industrial flow monitoring',
  script: path.join(__dirname, '..', 'index.js'),
  // Service dependencies
  dependencies: [],
  // Log output files
  logpath: path.join(__dirname, '..', 'logs'),
  // Environment variables
  env: [
    {
      name: 'NODE_ENV',
      value: 'production'
    }
  ]
});

// Listen for service install events
svc.on('install', () => {
  console.log('Service installed successfully');
  console.log('Starting service...');
  svc.start();
});

svc.on('start', () => {
  console.log('Service started successfully');
  console.log('The FlexiFlow Monitoring System is now running as a Windows service');
  console.log('To access the system, open a web browser and navigate to http://localhost:3000');
});

svc.on('error', (err) => {
  console.error('Error installing service:', err);
});

// Install the service
svc.install();
