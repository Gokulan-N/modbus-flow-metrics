
const { Service } = require('node-windows');
const path = require('path');

console.log('Uninstalling FlexiFlow Monitoring System Windows service...');

// Create a new service object
const svc = new Service({
  name: 'FlexiFlow Monitoring System',
  script: path.join(__dirname, '..', 'index.js'),
});

// Listen for uninstall events
svc.on('uninstall', () => {
  console.log('Service uninstalled successfully');
  process.exit(0);
});

svc.on('error', (err) => {
  console.error('Error uninstalling service:', err);
});

// Uninstall the service
svc.uninstall();
