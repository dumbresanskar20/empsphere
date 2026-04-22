const User = require('../models/User');
const Document = require('../models/Document');
const fs = require('fs');

// @desc    Get my profile (employee)
// @route   GET /api/employee/profile
// @access  Private/Employee
const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Update my profile (employee)
// @route   PUT /api/employee/profile
// @access  Private/Employee
const updateMyProfile = async (req, res) => {
  try {
    const { name, phone, city, dob, bloodGroup, department } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (city) user.city = city;
    if (dob) user.dob = new Date(dob);
    if (bloodGroup) user.bloodGroup = bloodGroup;
    if (department !== undefined) user.department = department;

    await user.save({ validateBeforeSave: false });
    const updated = await User.findById(user._id).select('-password');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Upload profile image (employee)
// @route   PUT /api/employee/profile-image
// @access  Private/Employee
const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const user = await User.findById(req.user._id);
    user.profileImage = `/api/files/${req.file.filename}`;
    await user.save({ validateBeforeSave: false });

    res.json({ profileImage: user.profileImage, message: 'Profile image updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Upload documents (employee after login)
// @route   POST /api/employee/documents
// @access  Private/Employee
const uploadDocuments = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No documents provided' });
    }

    const user = await User.findById(req.user._id);
    const documentTypes = req.body.documentTypes;
    const docTypesArray = Array.isArray(documentTypes) ? documentTypes : [documentTypes];

    const newDocs = req.files.map((file, index) => {
      return {
        filename: file.filename,
        originalName: file.originalname,
        path: `/api/files/${file.filename}`, // GridFS streaming path
        mimetype: file.mimetype,
        docType: docTypesArray[index] || 'Other',
      };
    });

    user.documents.push(...newDocs);
    await user.save({ validateBeforeSave: false });

    res.json({ documents: user.documents, message: 'Documents uploaded successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get my personal stats
// @route   GET /api/employee/stats
// @access  Private/Employee
const getMyStats = async (req, res) => {
  try {
    const Leave = require('../models/Leave');
    const Salary = require('../models/Salary');

    const leaveTotal = await Leave.countDocuments({ userId: req.user._id });
    const leaveApproved = await Leave.countDocuments({ userId: req.user._id, status: 'approved' });
    const leaveRejected = await Leave.countDocuments({ userId: req.user._id, status: 'rejected' });
    const leavePending = await Leave.countDocuments({ userId: req.user._id, status: 'pending' });

    const salaries = await Salary.find({ userId: req.user._id }).sort({ month: 1 }).limit(6);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const leaveTrend = await Leave.aggregate([
      { $match: { userId: req.user._id, createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.json({
      leaves: { total: leaveTotal, approved: leaveApproved, rejected: leaveRejected, pending: leavePending },
      salaries,
      leaveTrend,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getMyProfile, updateMyProfile, uploadProfileImage, uploadDocuments, getMyStats };
