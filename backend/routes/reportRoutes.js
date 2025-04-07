
const express = require('express');
const { isAdmin } = require('../middleware/auth');
const reportController = require('../controllers/reportController');

const router = express.Router();

// Get all reports
router.get('/', reportController.getAllReports);

// Get a specific report
router.get('/:id', reportController.getReportById);

// Generate a new report
router.post('/', reportController.generateReport);

// Download a report
router.get('/:id/download', reportController.downloadReport);

// Delete a report (admin only)
router.delete('/:id', isAdmin, reportController.deleteReport);

module.exports = router;
