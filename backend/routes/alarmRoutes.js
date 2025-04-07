
const express = require('express');
const { isAdmin } = require('../middleware/auth');
const alarmController = require('../controllers/alarmController');

const router = express.Router();

// Get all alarms
router.get('/', alarmController.getAllAlarms);

// Get a specific alarm
router.get('/:id', alarmController.getAlarmById);

// Create a new alarm (admin only)
router.post('/', isAdmin, alarmController.createAlarm);

// Update an alarm (admin only)
router.put('/:id', isAdmin, alarmController.updateAlarm);

// Delete an alarm (admin only)
router.delete('/:id', isAdmin, alarmController.deleteAlarm);

// Acknowledge an alarm event (admin only)
router.post('/events/:eventId/acknowledge', isAdmin, alarmController.acknowledgeAlarmEvent);

// Get alarm events
router.get('/events', alarmController.getAlarmEvents);

module.exports = router;
