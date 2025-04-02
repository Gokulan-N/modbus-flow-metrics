
// Flow meter data type
export interface FlowMeter {
  id: number;
  name: string;
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'error';
  lastUpdate: Date;
  historyData: HistoryPoint[];
  totalFlow: number; // Cumulative flow (computed tag)
}

// History data point
export interface HistoryPoint {
  timestamp: Date;
  value: number;
}

// Modbus connection configuration
export interface ModbusConnection {
  id: number;
  name: string;
  ipAddress: string;
  port: number;
  unitId: number;
}

// Modbus configuration type
export interface ModbusConfig {
  connections: ModbusConnection[];
  flowMeters: FlowMeterConfig[];
}

// Flow meter configuration type
export interface FlowMeterConfig {
  id: number;
  name: string;
  connectionId: number; // Reference to the Modbus connection
  registerAddress: number;
  registerType: 'holding' | 'input';
  dataType: 'float' | 'int16' | 'int32' | 'uint16' | 'uint32';
  scaleFactor: number;
  unit: string;
}

// Report type
export interface Report {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  flowMeters: number[]; // IDs of flow meters included in this report
  createdAt: Date;
  status: 'generating' | 'complete' | 'error';
  downloadUrl?: string;
}

// Alarm configuration type
export interface AlarmConfig {
  id: number;
  flowMeterId: number;
  name: string;
  highLimit?: number;
  lowLimit?: number;
  deadband: number; // Prevents alarm from oscillating when value is close to the limit
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  notifyViaEmail: boolean;
  emailRecipients?: string[];
}

// Backend API endpoints (for documentation only)
export interface FlowMeterApiEndpoints {
  getFlowMeters: '/api/flow-meters';
  getFlowMeterById: '/api/flow-meters/:id';
  updateFlowMeter: '/api/flow-meters/:id';
  getFlowMeterHistory: '/api/flow-meters/:id/history';
  getFlowMeterAlarms: '/api/flow-meters/:id/alarms';
  addFlowMeterData: '/api/flow-meters/:id/data';
}

export interface AlarmApiEndpoints {
  getAlarms: '/api/alarms';
  createAlarm: '/api/alarms';
  updateAlarm: '/api/alarms/:id';
  deleteAlarm: '/api/alarms/:id';
  acknowledgeAlarm: '/api/alarms/:id/acknowledge';
}

export interface ReportApiEndpoints {
  getReports: '/api/reports';
  createReport: '/api/reports';
  getReportById: '/api/reports/:id';
  deleteReport: '/api/reports/:id';
}
