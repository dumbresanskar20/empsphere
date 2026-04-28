const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  signIn,
  signOut,
  getMyAttendance,
  checkTodayAttendance,
  getAllAttendance,
  getDailyAttendance,
  getAttendanceStats,
  storeFaceDescriptor,
  getFaceDescriptor,
} = require('../controllers/attendanceController');

// Employee routes
router.post('/sign-in', protect, signIn);
router.post('/sign-out', protect, signOut);
router.get('/my', protect, getMyAttendance);
router.get('/today', protect, checkTodayAttendance);
router.put('/face-descriptor', protect, storeFaceDescriptor);
router.get('/face-descriptor', protect, getFaceDescriptor);

// Admin routes
router.get('/stats', protect, adminOnly, getAttendanceStats);
router.get('/daily', protect, adminOnly, getDailyAttendance);
router.get('/', protect, adminOnly, getAllAttendance);

module.exports = router;
