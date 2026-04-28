const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  createTask,
  getAllTasks,
  getMyTasks,
  completeTask,
  uploadTaskDocument,
  reviewTask,
  updateTaskStatus,
  deleteTask,
  getTaskStats,
} = require('../controllers/taskController');
const { uploadTaskDocument: uploadMiddleware } = require('../middleware/uploadMiddleware');

// Employee routes
router.get('/my', protect, getMyTasks);
router.put('/:id/complete', protect, completeTask);
router.put('/:id/upload-document', protect, uploadMiddleware, uploadTaskDocument);

// Admin routes
router.get('/stats', protect, adminOnly, getTaskStats);
router.get('/', protect, adminOnly, getAllTasks);
router.post('/', protect, adminOnly, createTask);
router.put('/:id/review', protect, adminOnly, reviewTask);
router.put('/:id/status', protect, adminOnly, updateTaskStatus);
router.delete('/:id', protect, adminOnly, deleteTask);

module.exports = router;
