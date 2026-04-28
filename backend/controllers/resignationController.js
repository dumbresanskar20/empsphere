const Resignation = require('../models/Resignation');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { uploadToGridFS } = require('../utils/gridfsHelper');

// @desc    Submit resignation (employee)
// @route   POST /api/resignations
// @access  Private/Employee
const submitResignation = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ message: 'Resignation reason is required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check if already has a pending/approved resignation
    const existing = await Resignation.findOne({
      userId: req.user._id,
      status: { $in: ['pending', 'approved'] },
      noticeCancelled: false,
      isCompleted: false,
    });

    if (existing) {
      return res.status(400).json({ message: 'You already have an active resignation request.' });
    }

    let letterInfo = {};
    if (req.file) {
      const uploadedFile = await uploadToGridFS(req.file.buffer, req.file.originalname, req.file.mimetype, {
        type: 'resignation_letter',
        employeeId: user.employeeId,
      });
      letterInfo = {
        letterPath: uploadedFile.path,
        letterFilename: uploadedFile.filename,
      };
    }

    const resignation = await Resignation.create({
      userId: req.user._id,
      employeeId: user.employeeId,
      employeeName: user.name,
      reason,
      ...letterInfo,
    });

    // Update user status
    user.resignationStatus = 'pending';
    await user.save({ validateBeforeSave: false });

    // Notify admins
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await Notification.create({
        userId: admin._id,
        type: 'general',
        title: 'New Resignation Request',
        message: `${user.name} (${user.employeeId}) has submitted a resignation.`,
        relatedId: resignation._id,
      });
    }

    res.status(201).json({ message: 'Resignation submitted successfully', resignation });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get my resignation status (employee)
// @route   GET /api/resignations/my
// @access  Private/Employee
const getMyResignation = async (req, res) => {
  try {
    const resignations = await Resignation.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(resignations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get all resignations (admin)
// @route   GET /api/resignations
// @access  Private/Admin
const getAllResignations = async (req, res) => {
  try {
    const resignations = await Resignation.find()
      .populate('userId', 'name email employeeId department')
      .sort({ createdAt: -1 });
    res.json(resignations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Approve resignation (admin) — starts 30-day notice period
// @route   PUT /api/resignations/:id/approve
// @access  Private/Admin
const approveResignation = async (req, res) => {
  try {
    const resignation = await Resignation.findById(req.params.id);
    if (!resignation) return res.status(404).json({ message: 'Resignation not found' });

    if (resignation.status !== 'pending') {
      return res.status(400).json({ message: 'Resignation has already been processed' });
    }

    const now = new Date();
    const noticePeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    resignation.status = 'approved';
    resignation.approvedAt = now;
    resignation.noticePeriodEnd = noticePeriodEnd;
    await resignation.save();

    // Update user status
    await User.findByIdAndUpdate(resignation.userId, { resignationStatus: 'in_notice' });

    // Notify employee
    await Notification.create({
      userId: resignation.userId,
      type: 'general',
      title: 'Resignation Approved',
      message: `Your resignation has been approved. Notice period ends on ${noticePeriodEnd.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}.`,
      relatedId: resignation._id,
    });

    res.json({
      message: 'Resignation approved. 30-day notice period started.',
      resignation,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Reject resignation (admin)
// @route   PUT /api/resignations/:id/reject
// @access  Private/Admin
const rejectResignation = async (req, res) => {
  try {
    const resignation = await Resignation.findById(req.params.id);
    if (!resignation) return res.status(404).json({ message: 'Resignation not found' });

    if (resignation.status !== 'pending') {
      return res.status(400).json({ message: 'Resignation has already been processed' });
    }

    resignation.status = 'rejected';
    await resignation.save();

    await User.findByIdAndUpdate(resignation.userId, { resignationStatus: 'none' });

    await Notification.create({
      userId: resignation.userId,
      type: 'general',
      title: 'Resignation Rejected',
      message: 'Your resignation request has been rejected by admin.',
      relatedId: resignation._id,
    });

    res.json({ message: 'Resignation rejected', resignation });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Cancel notice period (admin or employee)
// @route   PUT /api/resignations/:id/cancel-notice
// @access  Private
const cancelNoticePeriod = async (req, res) => {
  try {
    const resignation = await Resignation.findById(req.params.id);
    if (!resignation) return res.status(404).json({ message: 'Resignation not found' });

    if (resignation.status !== 'approved' || resignation.noticeCancelled || resignation.isCompleted) {
      return res.status(400).json({ message: 'Notice period cannot be cancelled in current state' });
    }

    // Determine who is cancelling
    const cancelledBy = req.user.role === 'admin' ? 'admin' : 'employee';

    // If employee, verify they own this resignation
    if (cancelledBy === 'employee' && resignation.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    resignation.noticeCancelled = true;
    resignation.cancelledBy = cancelledBy;
    resignation.cancelledAt = new Date();
    await resignation.save();

    // Employee remains active
    await User.findByIdAndUpdate(resignation.userId, { resignationStatus: 'none' });

    // Notify
    const notifyUserId = cancelledBy === 'admin' ? resignation.userId : (await User.findOne({ role: 'admin' }))?._id;
    if (notifyUserId) {
      await Notification.create({
        userId: notifyUserId,
        type: 'general',
        title: 'Notice Period Cancelled',
        message: `Notice period for ${resignation.employeeName} (${resignation.employeeId}) has been cancelled by ${cancelledBy}. Employee remains active.`,
        relatedId: resignation._id,
      });
    }

    res.json({ message: 'Notice period cancelled. Employee remains active.', resignation });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  submitResignation,
  getMyResignation,
  getAllResignations,
  approveResignation,
  rejectResignation,
  cancelNoticePeriod,
};
