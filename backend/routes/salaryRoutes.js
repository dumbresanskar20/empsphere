const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  addOrUpdateSalary,
  getAllSalaries,
  getMySalaries,
  getMySalaryStats,
  getSalarySlip,
  downloadSalarySlip,
} = require('../controllers/salaryController');

// Employee
router.get('/my', protect, getMySalaries);
router.get('/my/stats', protect, getMySalaryStats);

// Shared (both admin and employee can access their own)
router.get('/:id/slip', protect, getSalarySlip);
router.get('/:id/download', protect, downloadSalarySlip);

// Admin
router.get('/', protect, adminOnly, getAllSalaries);
router.post('/', protect, adminOnly, addOrUpdateSalary);

module.exports = router;
