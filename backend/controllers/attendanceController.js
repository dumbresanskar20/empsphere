const Attendance = require('../models/Attendance');
const User = require('../models/User');

// Helper: Get start and end of a day in UTC for Asia/Kolkata
const getDayBoundsUTC = (dateInput) => {
  // Create a date string in IST (Asia/Kolkata is UTC+5:30)
  const now = dateInput || new Date();
  // Get current date in IST
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  const year = istDate.getUTCFullYear();
  const month = istDate.getUTCMonth();
  const day = istDate.getUTCDate();

  // Start of day in IST = midnight IST = 18:30 previous day UTC
  const startIST = new Date(Date.UTC(year, month, day) - istOffset);
  const endIST = new Date(startIST.getTime() + 24 * 60 * 60 * 1000);
  return { start: startIST, end: endIST, dateLabel: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` };
};

// Helper: Format UTC date to IST string
const formatToIST = (date) => {
  if (!date) return null;
  return new Date(date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
};

// @desc    Sign in with face verification (employee)
// @route   POST /api/attendance/sign-in
// @access  Private/Employee
const signIn = async (req, res) => {
  try {
    const { start, end, dateLabel } = getDayBoundsUTC();

    // Check if already signed in today
    const existing = await Attendance.findOne({
      employeeId: req.user._id,
      date: { $gte: start, $lt: end },
    });

    if (existing) {
      return res.status(400).json({
        message: 'Already signed in for today',
        attendance: {
          ...existing.toObject(),
          checkInTimeIST: formatToIST(existing.checkInTime),
          checkOutTimeIST: formatToIST(existing.checkOutTime),
        },
      });
    }

    const { faceVerified } = req.body;

    const attendance = await Attendance.create({
      employeeId: req.user._id,
      date: start, // Store the start of the IST day as UTC Date
      status: 'present',
      checkInTime: new Date(), // Current UTC time
      faceVerified: faceVerified || false,
    });

    res.status(201).json({
      message: 'Signed in successfully',
      attendance: {
        ...attendance.toObject(),
        checkInTimeIST: formatToIST(attendance.checkInTime),
      },
    });
  } catch (err) {
    console.error('Sign-in error:', err);
    res.status(500).json({ message: err.message });
  }
};

// @desc    Sign out with face verification (employee)
// @route   POST /api/attendance/sign-out
// @access  Private/Employee
const signOut = async (req, res) => {
  try {
    const { start, end } = getDayBoundsUTC();

    const attendance = await Attendance.findOne({
      employeeId: req.user._id,
      date: { $gte: start, $lt: end },
    });

    if (!attendance) {
      return res.status(400).json({ message: 'You have not signed in today. Please sign in first.' });
    }

    if (attendance.checkOutTime) {
      return res.status(400).json({
        message: 'Already signed out for today',
        attendance: {
          ...attendance.toObject(),
          checkInTimeIST: formatToIST(attendance.checkInTime),
          checkOutTimeIST: formatToIST(attendance.checkOutTime),
        },
      });
    }

    const { faceVerified } = req.body;

    attendance.checkOutTime = new Date(); // Current UTC time
    attendance.signOutFaceVerified = faceVerified || false;
    await attendance.save();

    res.json({
      message: 'Signed out successfully',
      attendance: {
        ...attendance.toObject(),
        checkInTimeIST: formatToIST(attendance.checkInTime),
        checkOutTimeIST: formatToIST(attendance.checkOutTime),
      },
    });
  } catch (err) {
    console.error('Sign-out error:', err);
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get my attendance history (employee)
// @route   GET /api/attendance/my
// @access  Private/Employee
const getMyAttendance = async (req, res) => {
  try {
    const records = await Attendance.find({ employeeId: req.user._id })
      .sort({ date: -1 })
      .limit(60);

    const attendance = records.map((r) => ({
      ...r.toObject(),
      checkInTimeIST: formatToIST(r.checkInTime),
      checkOutTimeIST: formatToIST(r.checkOutTime),
      dateIST: formatToIST(r.date),
    }));

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
    const { start, end } = getDayBoundsUTC();
    const attendance = await Attendance.findOne({
      employeeId: req.user._id,
      date: { $gte: start, $lt: end },
    });

    if (attendance) {
      res.json({
        signedIn: true,
        signedOut: !!attendance.checkOutTime,
        attendance: {
          ...attendance.toObject(),
          checkInTimeIST: formatToIST(attendance.checkInTime),
          checkOutTimeIST: formatToIST(attendance.checkOutTime),
        },
      });
    } else {
      res.json({ signedIn: false, signedOut: false, attendance: null });
    }
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
      // Parse the date string as IST day and find UTC bounds
      const d = new Date(date + 'T00:00:00+05:30');
      const end = new Date(d.getTime() + 24 * 60 * 60 * 1000);
      filter.date = { $gte: d, $lt: end };
    }

    const records = await Attendance.find(filter)
      .populate('employeeId', 'name email employeeId department')
      .sort({ date: -1, createdAt: -1 });

    const attendance = records.map((r) => ({
      ...r.toObject(),
      checkInTimeIST: formatToIST(r.checkInTime),
      checkOutTimeIST: formatToIST(r.checkOutTime),
      dateIST: formatToIST(r.date),
    }));

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
    let dayBounds;
    if (req.query.date) {
      const d = new Date(req.query.date + 'T00:00:00+05:30');
      const end = new Date(d.getTime() + 24 * 60 * 60 * 1000);
      dayBounds = { start: d, end, dateLabel: req.query.date };
    } else {
      dayBounds = getDayBoundsUTC();
    }

    const totalEmployees = await User.countDocuments({ role: 'employee', status: 'approved' });

    const present = await Attendance.find({
      date: { $gte: dayBounds.start, $lt: dayBounds.end },
      status: 'present',
    }).populate('employeeId', 'name email employeeId department');

    const presentIds = present.map((a) => a.employeeId?._id?.toString()).filter(Boolean);

    const absentEmployees = await User.find({
      role: 'employee',
      status: 'approved',
      _id: { $nin: presentIds },
    }).select('name email employeeId department');

    // Add IST formatting
    const presentFormatted = present.map((r) => ({
      ...r.toObject(),
      checkInTimeIST: formatToIST(r.checkInTime),
      checkOutTimeIST: formatToIST(r.checkOutTime),
    }));

    res.json({
      date: dayBounds.dateLabel,
      totalEmployees,
      presentCount: present.length,
      absentCount: absentEmployees.length,
      present: presentFormatted,
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
    const { start, end, dateLabel } = getDayBoundsUTC();
    const totalEmployees = await User.countDocuments({ role: 'employee', status: 'approved' });
    const presentToday = await Attendance.countDocuments({
      date: { $gte: start, $lt: end },
      status: 'present',
    });

    // Last 7 days trend
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const db = getDayBoundsUTC(d);
      const count = await Attendance.countDocuments({
        date: { $gte: db.start, $lt: db.end },
        status: 'present',
      });
      trend.push({ date: db.dateLabel, present: count, total: totalEmployees });
    }

    res.json({
      today: {
        date: dateLabel,
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
  signIn,
  signOut,
  getMyAttendance,
  checkTodayAttendance,
  getAllAttendance,
  getDailyAttendance,
  getAttendanceStats,
  storeFaceDescriptor,
  getFaceDescriptor,
};
