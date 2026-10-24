const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// MIDDLEWARE
// Cors allows localhost, LAN IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x),
app.use(cors({
    origin: function (origin, callback) {
        // No origin = mobile app (Capacitor/native), curl, Postman → allow
        if (!origin) return callback(null, true);

        // Explicit whitelist from .env
        const allowed = [
            process.env.WEB_APP_URL,
            process.env.MOBILE_APP_URL,
        ].filter(Boolean);

        // Allow localhost on any port
        const isLocalhost = /^http:\/\/localhost(:\d+)?$/.test(origin);

        // Allow any private LAN IP
        const isLanIp = /^http:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(origin);

        // Allow Cloudflare Pages and Workers deployments
        const isCloudflarePages = /^https:\/\/.*\.pages\.dev$/.test(origin);
        const isCloudflareWorkers = /^https:\/\/.*\.workers\.dev$/.test(origin);

        if (allowed.includes(origin) || isLocalhost || isLanIp || isCloudflarePages || isCloudflareWorkers) {
            callback(null, true);
        } else {
            console.warn(`⚠️ CORS blocked: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));

app.use(express.json());
app.use(express.json());

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// IMPORT ROUTES
const authController = require('./controllers/authController');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const reportRoutes = require('./routes/reports');
const guestRoutes = require('./routes/guest');
const adminRoutes = require('./routes/admin');
const announcementRoutes = require('./routes/announcements');
const notificationRoutes = require('./routes/notifications');
const healthRoutes = require('./routes/health');
const appointmentRoutes = require('./routes/appointments');
const certificateRoutes = require('./routes/certificates');
const uploadRoutes = require('./routes/uploads');
const wasteRoutes = require('./routes/waste');
const hotlineRoutes = require('./routes/hotlines');

// DIRECT ROUTES

// Admin login
app.post('/api/admin/login', authController.adminLogin);

// Guest report submission
const guestController = require('./controllers/guestController');
app.post('/api/reports/guest', guestController.submitGuestReport);

// USE ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/guest', guestRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/health-center', healthRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/waste-schedule', wasteRoutes);
app.use('/api/hotlines', hotlineRoutes);
const publicRoutes = require('./routes/public');
app.use('/api/public', publicRoutes);

// ROOT
app.get('/', (req, res) => {
    res.json({ message: 'EcoReport Backend is running!' });
});

// ERROR HANDLER
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// START SERVER
// Listen on all network interfaces so phones on the LAN can reach the backend
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log(`✅ EcoReport Backend running on http://localhost:${PORT}`);
    
    // Auto-detect the current LAN IP
    const os = require('os');
    const interfaces = os.networkInterfaces();
    let currentIp = 'localhost';
    
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                currentIp = iface.address;
                break;
            }
        }
    }
    
    console.log(`→ Network: http://${currentIp}:${PORT}`);
});