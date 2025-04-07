
# FlexiFlow Backend

This is the backend server for the FlexiFlow monitoring system.

## Features

- Modbus device configuration and management
- Real-time data polling from Modbus devices
- Data storage in SQLite database
- Alarm configuration and monitoring
- Report generation
- WebSocket support for real-time updates
- RESTful API for frontend integration

## Getting Started

### Prerequisites

- Node.js 14.x or higher
- npm or yarn

### Installation

1. Clone the repository
2. Navigate to the backend directory
3. Install dependencies:

```bash
npm install
```

### Configuration

Create a `.env` file in the backend directory with the following variables:

```
PORT=3000
JWT_SECRET=your_jwt_secret_key_change_this_in_production
JWT_EXPIRY=24h
DB_PATH=./db.sqlite3
LOG_LEVEL=info
```

### Running the server

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

## API Endpoints

### Authentication

- `POST /api/auth/login` - Login with username and password
- `GET /api/auth/me` - Get current user information

### Devices

- `GET /api/devices` - Get all devices
- `GET /api/devices/:id` - Get a specific device
- `POST /api/devices` - Create a new device
- `PUT /api/devices/:id` - Update a device
- `DELETE /api/devices/:id` - Delete a device
- `POST /api/devices/:id/connect` - Connect to a device
- `POST /api/devices/:id/disconnect` - Disconnect from a device

### Registers

- `POST /api/devices/:deviceId/registers` - Add a register to a device
- `PUT /api/devices/:deviceId/registers/:registerId` - Update a register
- `DELETE /api/devices/:deviceId/registers/:registerId` - Delete a register

### Flow Meters

- `GET /api/flowmeters` - Get all flow meter data
- `GET /api/flowmeters/:id` - Get a specific flow meter
- `GET /api/flowmeters/:id/history` - Get history data for a specific flow meter
- `GET /api/flowmeters/:id/consumption` - Get consumption data for a specific flow meter

### Alarms

- `GET /api/alarms` - Get all alarms
- `GET /api/alarms/:id` - Get a specific alarm
- `POST /api/alarms` - Create a new alarm
- `PUT /api/alarms/:id` - Update an alarm
- `DELETE /api/alarms/:id` - Delete an alarm
- `GET /api/alarms/events` - Get alarm events
- `POST /api/alarms/events/:eventId/acknowledge` - Acknowledge an alarm event

### Reports

- `GET /api/reports` - Get all reports
- `GET /api/reports/:id` - Get a specific report
- `POST /api/reports` - Generate a new report
- `GET /api/reports/:id/download` - Download a report
- `DELETE /api/reports/:id` - Delete a report

### System

- `GET /api/system/settings` - Get system settings
- `PUT /api/system/settings` - Update system settings
- `GET /api/system/status` - Get system status

## WebSocket Interface

Connect to the WebSocket server:

```javascript
const ws = new WebSocket(`ws://localhost:3000?token=${jwtToken}`);
```

Message types:

- `ping` - Check connection
- `subscribe` - Subscribe to a channel
- `getFlowMeters` - Request flow meter data

The server broadcasts real-time updates for flow meter data.
