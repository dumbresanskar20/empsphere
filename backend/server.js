const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  credentials: true,
}));
app.use(express.json());
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
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    message: err.message || 'Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Admin Panel: http://localhost:${PORT}/admin.html`);
  console.log(`👤 Employee Panel: http://localhost:${PORT}/employee.html`);
});
