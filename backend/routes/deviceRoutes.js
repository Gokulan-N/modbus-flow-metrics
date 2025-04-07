
const express = require('express');
const { isAdmin } = require('../middleware/auth');
const deviceController = require('../controllers/deviceController');

const router = express.Router();

// Get all devices
router.get('/', deviceController.getAllDevices);

// Get device by ID with registers
router.get('/:id', deviceController.getDeviceById);

// Create a new device (admin only)
router.post('/', isAdmin, deviceController.createDevice);

// Update a device (admin only)
router.put('/:id', isAdmin, deviceController.updateDevice);

// Delete a device (admin only)
router.delete('/:id', isAdmin, deviceController.deleteDevice);

// Add a register to a device (admin only)
router.post('/:deviceId/registers', isAdmin, deviceController.addRegister);

// Update a register (admin only)
router.put('/:deviceId/registers/:registerId', isAdmin, deviceController.updateRegister);

// Delete a register (admin only)
router.delete('/:deviceId/registers/:registerId', isAdmin, deviceController.deleteRegister);

// Connect to device (enable polling)
router.post('/:id/connect', deviceController.connectDevice);

// Disconnect device (disable polling)
router.post('/:id/disconnect', deviceController.disconnectDevice);

module.exports = router;
