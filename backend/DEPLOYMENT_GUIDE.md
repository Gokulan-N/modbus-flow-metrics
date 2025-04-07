
# FlexiFlow Monitoring System - Deployment Guide

This guide will help you deploy the FlexiFlow Monitoring System on a Windows machine as a local service.

## System Requirements

- Windows 7 or later (Windows 10/11 recommended)
- Node.js 14.x or later (LTS version recommended)
- Minimum 4GB RAM
- At least 1GB free disk space
- Administrator privileges for service installation

## Installation Steps

### 1. Prerequisites

1. Install Node.js:
   - Download the LTS version from [nodejs.org](https://nodejs.org/)
   - Follow the installation wizard
   - Verify installation by opening Command Prompt and typing:
     ```
     node --version
     npm --version
     ```

### 2. Application Setup

1. Extract the FlexiFlow application package to your desired location (e.g., `C:\FlexiFlow`)

2. Configure the application:
   - Navigate to the extracted folder
   - Copy `.env.example` to `.env`
   - Edit the `.env` file with your preferred settings:
     - `PORT`: The port to run the application on (default: 3000)
     - `JWT_SECRET`: Set a secure random string for token encryption
     - Other settings as needed

3. Install dependencies:
   - Open Command Prompt as Administrator
   - Navigate to the application directory
   - Run:
     ```
     cd backend
     npm install
     ```

### 3. Database Initialization

The application uses SQLite, which will automatically initialize on first run. No separate database installation is required.

### 4. Service Installation

#### Option 1: One-click Installation

1. Open Command Prompt as Administrator
2. Navigate to the application directory
3. Run the service installation script:
   ```
   cd backend
   npm run install-service
   ```

4. The service will automatically start and be configured to start on system boot

#### Option 2: Manual Installation

If you prefer to configure the service manually:

1. Open Command Prompt as Administrator
2. Navigate to the application directory
3. Run:
   ```
   cd backend
   node scripts/install-windows-service.js
   ```

4. Check Windows Services to verify that "FlexiFlow Monitoring System" is installed and running

### 5. Accessing the Application

Once installed, you can access the FlexiFlow system through a web browser:

- **Local access**: http://localhost:3000 (or your configured port)
- **Network access**: http://[your-computer-IP]:3000 (ensure firewall allows access)

Default login credentials:
- Username: admin
- Password: admin123

**IMPORTANT**: Change the default password after first login for security reasons!

## Management Tasks

### Stopping the Service

1. Open Windows Services (services.msc)
2. Find "FlexiFlow Monitoring System"
3. Right-click and select "Stop"

### Uninstalling the Service

1. Open Command Prompt as Administrator
2. Navigate to the application directory
3. Run:
   ```
   cd backend
   npm run uninstall-service
   ```

### Manual Backup

To manually trigger a backup:

1. Open Command Prompt as Administrator
2. Navigate to the application directory
3. Run:
   ```
   cd backend
   npm run backup
   ```

Backups are stored in the `backups` folder within the application directory.

## Troubleshooting

### Service Won't Start

1. Check the logs in the `logs` directory
2. Ensure the `.env` file is properly configured
3. Verify Node.js is properly installed
4. Check if the specified port is already in use

### Database Issues

If database corruption occurs, you can reset it:
1. Stop the service
2. Remove the `db.sqlite3` file
3. Start the service (it will recreate the database)
   
**Note**: This will delete all data. Ensure you have a backup before proceeding.

### Cannot Access Web Interface

1. Check if the service is running
2. Verify the port settings in `.env`
3. Check Windows Firewall settings
4. Try accessing via `http://localhost:[port]` first

## Updating the Application

To update to a new version:

1. Stop the service
2. Back up your data and `.env` file
3. Extract the new version over the existing installation
4. Restore your `.env` file
5. Run `npm install` in the backend directory
6. Start the service

## Support

For additional support or questions, please contact your system administrator or the FlexiFlow support team.
