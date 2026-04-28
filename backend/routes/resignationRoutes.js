const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  submitResignation,
  getMyResignation,
  getAllResignations,
  approveResignation,
  rejectResignation,
  cancelNoticePeriod,
} = require('../controllers/resignationController');
const { uploadResignationLetter } = require('../middleware/uploadMiddleware');

// Employee routes
router.post('/', protect, uploadResignationLetter, submitResignation);
router.get('/my', protect, getMyResignation);

// Shared — cancel notice (admin or employee)
router.put('/:id/cancel-notice', protect, cancelNoticePeriod);

// Admin routes
router.get('/', protect, adminOnly, getAllResignations);
router.put('/:id/approve', protect, adminOnly, approveResignation);
router.put('/:id/reject', protect, adminOnly, rejectResignation);

module.exports = router;
