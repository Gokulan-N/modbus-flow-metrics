
const express = require('express');
const flowMeterController = require('../controllers/flowMeterController');

const router = express.Router();

// Get all flow meter data (latest readings)
router.get('/', flowMeterController.getAllFlowMeters);

// Get specific flow meter with its data
router.get('/:id', flowMeterController.getFlowMeterById);

// Get history data for a specific flow meter
router.get('/:id/history', flowMeterController.getFlowMeterHistory);

// Get consumption data for a specific flow meter
router.get('/:id/consumption', flowMeterController.getFlowMeterConsumption);

module.exports = router;
