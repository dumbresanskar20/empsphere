const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./config/db');
const { startOverdueTaskCron } = require('./utils/cronJobs');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' })); // Increased for face descriptors
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/leaves', require('./routes/leaveRoutes'));
app.use('/api/salaries', require('./routes/salaryRoutes'));
app.use('/api/employee', require('./routes/employeeRoutes'));
app.use('/api/departments', require('./routes/departmentRoutes'));
app.use('/api/documents', require('./routes/documentRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/resignations', require('./routes/resignationRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api', require('./routes/fileRoutes')); // GridFS routes (/api/upload, /api/files)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Employee Management API is running 🚀' });
});

// Serve frontend for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🔴 Server Error:', err);
  
  // Handle Multer errors specifically
  if (err instanceof require('multer').MulterError) {
    return res.status(400).json({ message: `Upload Error: ${err.message}` });
  }

  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    message: err.message || 'Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

// ─── Start Server ONLY after DB connects ────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1. Connect to MongoDB FIRST (will exit if fails)
    await connectDB();

    // 2. Start cron jobs AFTER DB is ready
    startOverdueTaskCron();

    // 3. Start listening ONLY after DB is connected
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Admin Panel: http://localhost:${PORT}/admin.html`);
      console.log(`👤 Employee Panel: http://localhost:${PORT}/employee.html`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
