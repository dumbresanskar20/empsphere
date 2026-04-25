const Attendance = require('../models/Attendance');
const User = require('../models/User');

// @desc    Mark attendance (employee - face verified)
// @route   POST /api/attendance/mark
// @access  Private/Employee
const markAttendance = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Check if already marked today
    const existing = await Attendance.findOne({
      employeeId: req.user._id,
      date: today,
    });

    if (existing) {
      return res.status(400).json({
        message: 'Attendance already marked for today',
        attendance: existing,
      });
    }

    const { faceVerified } = req.body;

    const attendance = await Attendance.create({
      employeeId: req.user._id,
      date: today,
      status: 'present',
      checkInTime: new Date(),
      faceVerified: faceVerified || false,
    });

    res.status(201).json({
      message: 'Attendance marked successfully',
      attendance,
    });
  } catch (err) {
    console.error('Attendance error:', err);
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get my attendance history (employee)
// @route   GET /api/attendance/my
// @access  Private/Employee
const getMyAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.find({ employeeId: req.user._id })
      .sort({ date: -1 })
      .limit(60); // Last 60 records
    res.json(attendance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Check if attendance is already marked today (employee)
// @route   GET /api/attendance/today
// @access  Private/Employee
const checkTodayAttendance = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const attendance = await Attendance.findOne({
      employeeId: req.user._id,
      date: today,
    });
    res.json({
      markedToday: !!attendance,
      attendance: attendance || null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get all attendance records (admin) - with optional date filter
// @route   GET /api/attendance
// @access  Private/Admin
const getAllAttendance = async (req, res) => {
  try {
    const { date } = req.query;
    const filter = {};
    if (date) {
      filter.date = date;
    }

    const attendance = await Attendance.find(filter)
      .populate('employeeId', 'name email employeeId department')
      .sort({ date: -1, createdAt: -1 });

    res.json(attendance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get daily attendance summary (admin)
// @route   GET /api/attendance/daily
// @access  Private/Admin
const getDailyAttendance = async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];

    // Get all approved employees
    const totalEmployees = await User.countDocuments({ role: 'employee', status: 'approved' });

    // Get attendance for the specific date
    const present = await Attendance.find({ date, status: 'present' })
      .populate('employeeId', 'name email employeeId department');

    const presentIds = present.map(a => a.employeeId?._id?.toString()).filter(Boolean);

    // Get absent employees (approved employees who didn't mark attendance)
    const absentEmployees = await User.find({
      role: 'employee',
      status: 'approved',
      _id: { $nin: presentIds },
    }).select('name email employeeId department');

    res.json({
      date,
      totalEmployees,
      presentCount: present.length,
      absentCount: absentEmployees.length,
      present,
      absent: absentEmployees,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get attendance stats (admin)
// @route   GET /api/attendance/stats
// @access  Private/Admin
const getAttendanceStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const totalEmployees = await User.countDocuments({ role: 'employee', status: 'approved' });
    const presentToday = await Attendance.countDocuments({ date: today, status: 'present' });

    // Last 7 days trend
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = await Attendance.countDocuments({ date: dateStr, status: 'present' });
      trend.push({ date: dateStr, present: count, total: totalEmployees });
    }

    res.json({
      today: {
        date: today,
        present: presentToday,
        absent: totalEmployees - presentToday,
        total: totalEmployees,
      },
      trend,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Store face descriptor during signup or profile update
// @route   PUT /api/attendance/face-descriptor
// @access  Private/Employee
const storeFaceDescriptor = async (req, res) => {
  try {
    const { faceDescriptor } = req.body;
    if (!faceDescriptor || !Array.isArray(faceDescriptor)) {
      return res.status(400).json({ message: 'Valid face descriptor array is required' });
    }

    await User.findByIdAndUpdate(req.user._id, {
      faceDescriptor: faceDescriptor,
    });

    res.json({ message: 'Face descriptor stored successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get my face descriptor
// @route   GET /api/attendance/face-descriptor
// @access  Private/Employee
const getFaceDescriptor = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('faceDescriptor');
    res.json({
      hasFaceDescriptor: !!(user.faceDescriptor && user.faceDescriptor.length > 0),
      faceDescriptor: user.faceDescriptor || [],
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  markAttendance,
  getMyAttendance,
  checkTodayAttendance,
  getAllAttendance,
  getDailyAttendance,
  getAttendanceStats,
  storeFaceDescriptor,
  getFaceDescriptor,
};
