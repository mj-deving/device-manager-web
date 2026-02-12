# Device Manager Web

Web dashboard for device management. Consumes the same REST API as Project 2 (device-manager).

## Project 3 - Learning Goals

Build modern web skills:
- Vanilla JavaScript (no frameworks - understand fundamentals)
- Bootstrap 5 responsive design
- REST API consumption with Fetch API
- Dynamic DOM manipulation
- Client-side state management
- Responsive/mobile-first design
- Data visualization (Chart.js)

## Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **UI Framework:** Bootstrap 5
- **Charts:** Chart.js
- **API:** REST (consumes device-manager-server)
- **Backend:** Static files served by nginx

## Features

- **Dashboard:** Statistics cards, charts, overview
- **Devices List:** Table with search, filter, sort, pagination
- **Device Details:** Modal with full information and logs
- **CRUD:** Create, Edit, Delete devices via forms
- **Real-time Updates:** Auto-refresh every 30 seconds
- **Responsive Design:** Works on desktop, tablet, mobile
- **Toast Notifications:** User feedback for actions
- **Keyboard Shortcuts:** N=New, /=Search, Esc=Close

## Quick Start

### Prerequisites
- Modern web browser
- nginx serving static files
- device-manager-server running on localhost:8080 or remote VPS

### Local Development

1. Serve files with Python:
```bash
python3 -m http.server 8000
```

2. Open browser:
```
http://localhost:8000
```

3. Update API endpoint in config (if needed)

### Production Deployment

Copy files to `/var/www/portfolio`:
```bash
cp -r * /var/www/portfolio/
```

nginx will serve and proxy API calls to `/api/`.

## Project Structure

```
device-manager-web/
├── index.html                 # Main dashboard
├── css/
│   ├── style.css             # Custom styles
│   └── responsive.css        # Mobile/tablet styles
├── js/
│   ├── app.js               # Main app logic
│   ├── api.js               # API service
│   ├── ui.js                # UI components
│   ├── utils.js             # Helper functions
│   └── config.js            # Configuration
├── assets/
│   ├── icons/
│   ├── fonts/
│   └── images/
└── README.md
```

## API Integration

Communicates with device-manager-server:

```
GET  /api/v1/devices              - List devices
POST /api/v1/devices              - Create device
GET  /api/v1/devices/{id}         - Get device
PUT  /api/v1/devices/{id}         - Update device
DELETE /api/v1/devices/{id}       - Delete device
GET  /api/v1/devices/{id}/logs    - Device logs
GET  /api/v1/stats                - Statistics
```

## Configuration

Edit `js/config.js` to change API endpoint:

```javascript
const CONFIG = {
    API_BASE_URL: 'http://localhost:8080',  // Development
    // API_BASE_URL: 'https://yourdomain.com',  // Production
    REFRESH_INTERVAL: 30000,  // 30 seconds
};
```

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: iOS Safari 12+, Chrome Mobile

## Next Steps

After this project:
- ✓ Vanilla JavaScript mastery
- ✓ Bootstrap responsive design
- ✓ REST API consumption
- ✓ Modern web development fundamentals
- ✓ Ready for Project 4 (advanced architecture)
