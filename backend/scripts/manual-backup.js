
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { performBackup } = require('../services/backupService');

console.log('Starting manual backup...');

performBackup()
  .then(result => {
    console.log(`Backup completed successfully. Files saved to ${result.backupDir}`);
    process.exit(0);
  })
  .catch(err => {
    console.error('Backup failed:', err);
    process.exit(1);
  });
