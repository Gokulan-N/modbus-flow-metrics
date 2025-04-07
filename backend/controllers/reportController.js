
const fs = require('fs');
const path = require('path');
const { db } = require('../models/db');
const logger = require('../utils/logger');

const reportsDir = path.join(__dirname, '../reports');

// Ensure reports directory exists
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// Get all reports
exports.getAllReports = async (req, res) => {
  try {
    const reports = await db.allAsync(`
      SELECT * FROM reports
      ORDER BY created_at DESC
    `);
    
    res.json({ reports });
  } catch (err) {
    logger.error('Error fetching reports:', err);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

// Get a specific report
exports.getReportById = async (req, res) => {
  try {
    const reportId = req.params.id;
    
    const report = await db.getAsync('SELECT * FROM reports WHERE id = ?', [reportId]);
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    res.json({ report });
  } catch (err) {
    logger.error(`Error fetching report ${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
};

// Generate a new report
exports.generateReport = async (req, res) => {
  try {
    const {
      name,
      startDate,
      endDate,
      flowMeters,
      format
    } = req.body;
    
    // Validate required fields
    if (!name || !startDate || !endDate || !flowMeters || !format) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Insert report
    const result = await db.runAsync(`
      INSERT INTO reports
      (name, start_date, end_date, flow_meters, format, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      name,
      new Date(startDate).toISOString(),
      new Date(endDate).toISOString(),
      Array.isArray(flowMeters) ? JSON.stringify(flowMeters) : flowMeters,
      format,
      'generating'
    ]);
    
    const reportId = result.lastID;
    
    // Generate the report asynchronously
    generateReportData(reportId).then(() => {
      logger.info(`Report ${reportId} generated successfully`);
    }).catch(err => {
      logger.error(`Error generating report ${reportId}:`, err);
      updateReportStatus(reportId, 'error');
    });
    
    res.status(201).json({ 
      report: {
        id: reportId,
        name,
        startDate,
        endDate,
        flowMeters: Array.isArray(flowMeters) ? flowMeters : JSON.parse(flowMeters),
        format,
        status: 'generating',
        createdAt: new Date().toISOString()
      }
    });
  } catch (err) {
    logger.error('Error creating report:', err);
    res.status(500).json({ error: 'Failed to create report' });
  }
};

// Download a report
exports.downloadReport = async (req, res) => {
  try {
    const reportId = req.params.id;
    
    const report = await db.getAsync('SELECT * FROM reports WHERE id = ?', [reportId]);
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    if (report.status !== 'complete') {
      return res.status(400).json({ error: 'Report is not ready for download' });
    }
    
    const format = req.query.format || report.format || 'json';
    const reportFilePath = path.join(reportsDir, `report_${reportId}.${format.toLowerCase()}`);
    
    if (!fs.existsSync(reportFilePath)) {
      return res.status(404).json({ error: 'Report file not found' });
    }
    
    res.download(reportFilePath, `${report.name.replace(/\s+/g, '_')}.${format.toLowerCase()}`);
  } catch (err) {
    logger.error(`Error downloading report ${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to download report' });
  }
};

// Delete a report
exports.deleteReport = async (req, res) => {
  try {
    const reportId = req.params.id;
    
    // Check if report exists
    const report = await db.getAsync('SELECT * FROM reports WHERE id = ?', [reportId]);
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // Delete report from database
    await db.runAsync('DELETE FROM reports WHERE id = ?', [reportId]);
    
    // Delete report file if exists
    const formats = ['json', 'csv'];
    for (const format of formats) {
      const reportFilePath = path.join(reportsDir, `report_${reportId}.${format}`);
      if (fs.existsSync(reportFilePath)) {
        fs.unlinkSync(reportFilePath);
      }
    }
    
    res.json({ message: 'Report deleted successfully' });
  } catch (err) {
    logger.error(`Error deleting report ${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to delete report' });
  }
};

// Generate report internally
async function generateReportData(reportId) {
  try {
    // Get report information
    const report = await db.getAsync('SELECT * FROM reports WHERE id = ?', [reportId]);
    
    if (!report) {
      throw new Error(`Report ${reportId} not found`);
    }
    
    // Extract flow meter IDs
    const flowMeterIds = Array.isArray(report.flow_meters) 
      ? report.flow_meters 
      : JSON.parse(report.flow_meters);
    
    // Query data based on format
    let data;
    switch (report.format) {
      case 'summary':
        data = await generateSummaryReport(flowMeterIds, report.start_date, report.end_date);
        break;
      case 'hourly':
        data = await generateHourlyReport(flowMeterIds, report.start_date, report.end_date);
        break;
      case 'raw':
      default:
        data = await generateRawReport(flowMeterIds, report.start_date, report.end_date);
        break;
    }
    
    // Write to JSON file
    const jsonFilePath = path.join(reportsDir, `report_${reportId}.json`);
    fs.writeFileSync(jsonFilePath, JSON.stringify(data, null, 2));
    
    // Write to CSV file
    const csvFilePath = path.join(reportsDir, `report_${reportId}.csv`);
    writeDataToCsv(data, csvFilePath);
    
    // Update report status
    await updateReportStatus(reportId, 'complete', jsonFilePath);
    
    return true;
  } catch (err) {
    logger.error(`Error generating report ${reportId}:`, err);
    await updateReportStatus(reportId, 'error');
    throw err;
  }
}

// Generate summary report
async function generateSummaryReport(flowMeterIds, startDate, endDate) {
  const flowMeters = [];
  
  for (const flowMeterId of flowMeterIds) {
    // Get flow meter info
    const device = await db.getAsync(`
      SELECT * FROM devices 
      WHERE flow_meter_id = ?
    `, [flowMeterId]);
    
    // Calculate summary metrics
    const summary = await db.getAsync(`
      SELECT 
        flow_meter_id,
        MIN(flow_rate) AS min_flow_rate,
        MAX(flow_rate) AS max_flow_rate,
        AVG(flow_rate) AS avg_flow_rate,
        MAX(total_flow) - MIN(total_flow) AS total_consumption,
        MIN(timestamp) AS first_reading,
        MAX(timestamp) AS last_reading,
        COUNT(*) AS reading_count
      FROM flow_meter_data
      WHERE flow_meter_id = ? AND timestamp BETWEEN ? AND ?
    `, [flowMeterId, startDate, endDate]);
    
    flowMeters.push({
      id: device.flow_meter_id,
      name: device.name,
      summary: summary || { 
        min_flow_rate: 0, 
        max_flow_rate: 0, 
        avg_flow_rate: 0, 
        total_consumption: 0,
        reading_count: 0
      }
    });
  }
  
  return {
    type: 'summary',
    startDate,
    endDate,
    generatedAt: new Date().toISOString(),
    flowMeters
  };
}

// Generate hourly report
async function generateHourlyReport(flowMeterIds, startDate, endDate) {
  const flowMeters = [];
  
  for (const flowMeterId of flowMeterIds) {
    // Get flow meter info
    const device = await db.getAsync(`
      SELECT * FROM devices 
      WHERE flow_meter_id = ?
    `, [flowMeterId]);
    
    // Get hourly data
    const hourlyData = await db.allAsync(`
      SELECT 
        strftime('%Y-%m-%d %H:00:00', timestamp) AS hour,
        AVG(flow_rate) AS avg_flow_rate,
        MAX(total_flow) - MIN(total_flow) AS hourly_consumption,
        COUNT(*) AS reading_count
      FROM flow_meter_data
      WHERE flow_meter_id = ? AND timestamp BETWEEN ? AND ?
      GROUP BY strftime('%Y-%m-%d %H', timestamp)
      ORDER BY hour
    `, [flowMeterId, startDate, endDate]);
    
    flowMeters.push({
      id: device.flow_meter_id,
      name: device.name,
      hourlyData: hourlyData || []
    });
  }
  
  return {
    type: 'hourly',
    startDate,
    endDate,
    generatedAt: new Date().toISOString(),
    flowMeters
  };
}

// Generate raw report
async function generateRawReport(flowMeterIds, startDate, endDate) {
  const flowMeters = [];
  
  for (const flowMeterId of flowMeterIds) {
    // Get flow meter info
    const device = await db.getAsync(`
      SELECT * FROM devices 
      WHERE flow_meter_id = ?
    `, [flowMeterId]);
    
    // Get raw data
    const rawData = await db.allAsync(`
      SELECT 
        timestamp,
        flow_rate,
        total_flow,
        status
      FROM flow_meter_data
      WHERE flow_meter_id = ? AND timestamp BETWEEN ? AND ?
      ORDER BY timestamp
    `, [flowMeterId, startDate, endDate]);
    
    flowMeters.push({
      id: device.flow_meter_id,
      name: device.name,
      rawData: rawData || []
    });
  }
  
  return {
    type: 'raw',
    startDate,
    endDate,
    generatedAt: new Date().toISOString(),
    flowMeters
  };
}

// Update report status in database
async function updateReportStatus(reportId, status, downloadUrl = null) {
  try {
    await db.runAsync(
      'UPDATE reports SET status = ?, download_url = ? WHERE id = ?',
      [status, downloadUrl, reportId]
    );
  } catch (err) {
    logger.error(`Error updating report ${reportId} status:`, err);
  }
}

// Helper to write data to CSV
function writeDataToCsv(data, filePath) {
  try {
    let csvContent = '';
    
    if (data.type === 'summary') {
      // Header for summary report
      csvContent = 'Flow Meter ID,Name,Min Flow Rate,Max Flow Rate,Avg Flow Rate,Total Consumption,First Reading,Last Reading,Reading Count\n';
      
      // Data rows
      data.flowMeters.forEach(meter => {
        csvContent += `${meter.id},${meter.name},${meter.summary.min_flow_rate},${meter.summary.max_flow_rate},${meter.summary.avg_flow_rate},${meter.summary.total_consumption},${meter.summary.first_reading},${meter.summary.last_reading},${meter.summary.reading_count}\n`;
      });
    } else if (data.type === 'hourly') {
      // For hourly data, include hour columns
      csvContent = 'Flow Meter ID,Name,Hour,Avg Flow Rate,Hourly Consumption,Reading Count\n';
      
      data.flowMeters.forEach(meter => {
        meter.hourlyData.forEach(hour => {
          csvContent += `${meter.id},${meter.name},${hour.hour},${hour.avg_flow_rate},${hour.hourly_consumption},${hour.reading_count}\n`;
        });
      });
    } else {
      // Raw data format
      csvContent = 'Flow Meter ID,Name,Timestamp,Flow Rate,Total Flow,Status\n';
      
      data.flowMeters.forEach(meter => {
        meter.rawData.forEach(reading => {
          csvContent += `${meter.id},${meter.name},${reading.timestamp},${reading.flow_rate},${reading.total_flow},${reading.status}\n`;
        });
      });
    }
    
    fs.writeFileSync(filePath, csvContent);
  } catch (err) {
    logger.error(`Error writing CSV file:`, err);
    throw err;
  }
}

module.exports = {
  getAllReports,
  getReportById,
  generateReport,
  downloadReport,
  deleteReport
};
