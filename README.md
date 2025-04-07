
# FlexiFlow Monitoring System

A comprehensive flow meter monitoring system with local backend and frontend components.

## Features

- Real-time monitoring of flow meter devices via Modbus
- Interactive dashboard with meter status and readings
- Historical trend analysis
- Alarms and notifications
- Report generation
- Device configuration and management
- WebSocket support for live updates

## Project Structure

```
project-root/
├── backend/             # Node.js and Express backend
│   ├── routes/          # API routes
│   ├── controllers/     # Business logic
│   ├── services/        # Services for Modbus, etc.
│   ├── models/          # Database models
│   ├── db.sqlite3       # SQLite database
│   └── index.js         # Entry point
├── frontend/            # React/TypeScript frontend
│   ├── src/             # Source code
│   │   ├── components/  # UI components
│   │   ├── pages/       # Application pages
│   │   ├── context/     # React context
│   │   └── ...
│   └── ...
└── package.json         # Project configuration
```

## Installation

### Backend

1. Navigate to the backend directory:
```
cd backend
```

2. Install dependencies:
```
npm install
```

3. Start the server in development mode:
```
npm run dev
```

### Frontend

1. Navigate to the frontend directory:
```
cd <frontend-directory>
```

2. Install dependencies:
```
npm install
```

3. Start the development server:
```
npm run dev
```

## Usage

1. Access the frontend at http://localhost:5173 (or your configured port)
2. Login with the default credentials:
   - Username: `admin`
   - Password: `admin123`
3. Configure your Modbus devices in the Configuration page
4. Connect to devices to start monitoring

## API Documentation

The backend provides a comprehensive API for managing flow meters, alarms, reports, and system settings. See `backend/README.md` for details.

## Backend Technology Stack

- Node.js
- Express.js
- SQLite (for data storage)
- modbus-serial (for Modbus communication)
- WebSocket (for real-time updates)

## Frontend Technology Stack

- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Recharts (for charting)

## License

This project is licensed under the MIT License.
