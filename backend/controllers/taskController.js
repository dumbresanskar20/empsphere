const Task = require('../models/Task');
const User = require('../models/User');
const Salary = require('../models/Salary');
const Notification = require('../models/Notification');
const { uploadToGridFS } = require('../utils/gridfsHelper');

// @desc    Create a new task and assign to employee
// @route   POST /api/tasks
// @access  Private/Admin
const createTask = async (req, res) => {
  try {
    const { title, description, assignedEmployee, dueDate, penaltyAmount } = req.body;

    if (!title || !assignedEmployee || !dueDate) {
      return res.status(400).json({ message: 'Title, assigned employee, and due date are required' });
    }

    // Verify employee exists and is approved
    const employee = await User.findById(assignedEmployee);
    if (!employee || employee.role !== 'employee') {
      return res.status(404).json({ message: 'Employee not found' });
    }
    if (employee.status !== 'approved') {
      return res.status(400).json({ message: 'Cannot assign task to unapproved employee' });
    }

    const task = await Task.create({
      title,
      description: description || '',
      assignedEmployee,
      dueDate: new Date(dueDate),
      penaltyAmount: Number(penaltyAmount) || 0,
      status: 'pending',
    });

    // Create notification for the employee
    await Notification.create({
      userId: assignedEmployee,
      type: 'task_assigned',
      title: 'New Task Assigned',
      message: `You have been assigned a new task: "${title}". Due by ${new Date(dueDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}.`,
      relatedId: task._id,
    });

    const populated = await Task.findById(task._id).populate('assignedEmployee', 'name email employeeId');
    res.status(201).json(populated);
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get all tasks (admin)
// @route   GET /api/tasks
// @access  Private/Admin
const getAllTasks = async (req, res) => {
  try {
    const tasks = await Task.find()
      .populate('assignedEmployee', 'name email employeeId')
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get tasks for the logged-in employee
// @route   GET /api/tasks/my
// @access  Private/Employee
const getMyTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ assignedEmployee: req.user._id }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Mark task as completed (employee)
// @route   PUT /api/tasks/:id/complete
// @access  Private/Employee
const completeTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Ensure the task belongs to the logged-in employee
    if (task.assignedEmployee.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only complete your own tasks' });
    }

    if (task.status === 'completed') {
      return res.status(400).json({ message: 'Task is already completed' });
    }

    task.status = 'completed';
    task.completedAt = new Date();
    await task.save();

    // Notify all admins about task completion
    const admins = await User.find({ role: 'admin' });
    const employee = await User.findById(req.user._id).select('name employeeId');

    for (const admin of admins) {
      await Notification.create({
        userId: admin._id,
        type: 'task_completed',
        title: 'Task Completed',
        message: `${employee.name} (${employee.employeeId}) has completed the task: "${task.title}".`,
        relatedId: task._id,
      });
    }

    res.json({ message: 'Task marked as completed', task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Upload task document (employee)
// @route   PUT /api/tasks/:id/upload-document
// @access  Private/Employee
const uploadTaskDocument = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (task.assignedEmployee.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only upload documents for your own tasks' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    const uploadedFile = await uploadToGridFS(req.file.buffer, req.file.originalname, req.file.mimetype, {
      type: 'task_document',
      taskId: task._id.toString(),
    });

    task.documentPath = uploadedFile.path;
    task.documentFilename = uploadedFile.filename;
    task.documentOriginalName = req.file.originalname;
    task.adminDecision = undefined; // Clear previous decision so admin can review the new doc
    await task.save();

    // Notify admins
    const admins = await User.find({ role: 'admin' });
    const employee = await User.findById(req.user._id).select('name employeeId');
    for (const admin of admins) {
      await Notification.create({
        userId: admin._id,
        type: 'task_completed',
        title: 'Task Document Uploaded',
        message: `${employee.name} (${employee.employeeId}) uploaded a document for task: "${task.title}".`,
        relatedId: task._id,
      });
    }

    res.json({ message: 'Task document uploaded successfully', task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Admin reviews task — marks complete or not_complete (LOCKED after)
// @route   PUT /api/tasks/:id/review
// @access  Private/Admin
const reviewTask = async (req, res) => {
  try {
    const { decision } = req.body;
    if (!['complete', 'not_complete'].includes(decision)) {
      return res.status(400).json({ message: 'Decision must be "complete" or "not_complete"' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (task.isLocked) {
      return res.status(403).json({ message: 'This task decision has already been taken and cannot be modified.' });
    }

    task.adminDecision = decision;
    if (decision === 'complete') {
      task.isLocked = true;
      task.status = 'completed';
      task.completedAt = new Date();
    } else {
      task.isLocked = false;
      task.status = 'pending';
      task.documentPath = '';
      task.documentFilename = '';
    }
    await task.save();

    // Notify employee
    const employee = await User.findById(task.assignedEmployee).select('name employeeId');
    if (employee) {
      await Notification.create({
        userId: task.assignedEmployee,
        type: 'general',
        title: `Task ${decision === 'complete' ? 'Approved' : 'Not Approved'}`,
        message: `Admin has marked your task "${task.title}" as ${decision === 'complete' ? 'complete' : 'not complete'}.`,
        relatedId: task._id,
      });
    }

    res.json({ message: `Task marked as ${decision} and locked`, task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Update task status (admin) — legacy, still useful but respects lock
// @route   PUT /api/tasks/:id/status
// @access  Private/Admin
const updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'completed', 'overdue'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.isLocked) {
      return res.status(403).json({ message: 'This task decision is locked and cannot be modified.' });
    }

    task.status = status;
    if (status === 'completed') {
      task.completedAt = new Date();
    }
    await task.save();

    res.json({ message: 'Task status updated', task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Delete a task (admin)
// @route   DELETE /api/tasks/:id
// @access  Private/Admin
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    await task.deleteOne();
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get task stats
// @route   GET /api/tasks/stats
// @access  Private/Admin
const getTaskStats = async (req, res) => {
  try {
    const total = await Task.countDocuments();
    const pending = await Task.countDocuments({ status: 'pending' });
    const completed = await Task.countDocuments({ status: 'completed' });
    const overdue = await Task.countDocuments({ status: 'overdue' });

    res.json({ total, pending, completed, overdue });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createTask,
  getAllTasks,
  getMyTasks,
  completeTask,
  uploadTaskDocument,
  reviewTask,
  updateTaskStatus,
  deleteTask,
  getTaskStats,
};
