const User = require('../models/User');

// @desc    Get all employees
// @route   GET /api/admin/employees
// @access  Private/Admin
const getAllEmployees = async (req, res) => {
  try {
    const employees = await User.find({ role: 'employee' })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get single employee
// @route   GET /api/admin/employees/:id
// @access  Private/Admin
const getEmployeeById = async (req, res) => {
  try {
    const emp = await User.findById(req.params.id).select('-password');
    if (!emp || emp.role !== 'employee') {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.json(emp);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Approve or reject employee
// @route   PUT /api/admin/employees/:id/status
// @access  Private/Admin
const updateEmployeeStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const emp = await User.findById(req.params.id);
    if (!emp || emp.role !== 'employee') {
      return res.status(404).json({ message: 'Employee not found' });
    }

    emp.status = status;
    await emp.save({ validateBeforeSave: false });

    res.json({ message: `Employee ${status} successfully`, employee: { _id: emp._id, status: emp.status, employeeId: emp.employeeId } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Delete employee
// @route   DELETE /api/admin/employees/:id
// @access  Private/Admin
const deleteEmployee = async (req, res) => {
  try {
    const emp = await User.findById(req.params.id);
    if (!emp || emp.role !== 'employee') {
      return res.status(404).json({ message: 'Employee not found' });
    }
    await emp.deleteOne();
    res.json({ message: 'Employee deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Admin stats for dashboard
// @route   GET /api/admin/stats
// @access  Private/Admin
const getAdminStats = async (req, res) => {
  try {
    const Leave = require('../models/Leave');
    const Salary = require('../models/Salary');
    const Task = require('../models/Task');
    const Attendance = require('../models/Attendance');

    const totalEmployees = await User.countDocuments({ role: 'employee' });
    const approvedCount = await User.countDocuments({ role: 'employee', status: 'approved' });
    const pendingCount = await User.countDocuments({ role: 'employee', status: 'pending' });
    const rejectedCount = await User.countDocuments({ role: 'employee', status: 'rejected' });

    const totalLeaves = await Leave.countDocuments();
    const approvedLeaves = await Leave.countDocuments({ status: 'approved' });
    const pendingLeaves = await Leave.countDocuments({ status: 'pending' });
    const rejectedLeaves = await Leave.countDocuments({ status: 'rejected' });

    // Task stats
    const totalTasks = await Task.countDocuments();
    const pendingTasks = await Task.countDocuments({ status: 'pending' });
    const completedTasks = await Task.countDocuments({ status: 'completed' });
    const overdueTasks = await Task.countDocuments({ status: 'overdue' });

    // Today's attendance
    const today = new Date().toISOString().split('T')[0];
    const presentToday = await Attendance.countDocuments({ date: today, status: 'present' });

    // City distribution
    const cityData = await User.aggregate([
      { $match: { role: 'employee', city: { $ne: null, $ne: '' } } },
      { $group: { _id: '$city', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Monthly join trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const joinTrend = await User.aggregate([
      { $match: { role: 'employee', createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Salary distribution
    const salaryData = await Salary.aggregate([
      {
        $group: {
          _id: '$employeeId',
          employeeName: { $first: '$employeeName' },
          netSalary: { $sum: '$netSalary' },
          basic: { $sum: '$basic' },
          bonus: { $sum: '$bonus' },
          deductions: { $sum: '$deductions' },
        },
      },
      { $sort: { netSalary: -1 } },
      { $limit: 10 },
    ]);

    // Department distribution
    const departmentData = await User.aggregate([
      { $match: { role: 'employee', department: { $ne: null, $ne: '' } } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      employees: { total: totalEmployees, approved: approvedCount, pending: pendingCount, rejected: rejectedCount },
      leaves: { total: totalLeaves, approved: approvedLeaves, pending: pendingLeaves, rejected: rejectedLeaves },
      tasks: { total: totalTasks, pending: pendingTasks, completed: completedTasks, overdue: overdueTasks },
      attendance: { presentToday, totalApproved: approvedCount },
      cityData,
      joinTrend,
      salaryData,
      departmentData,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAllEmployees, getEmployeeById, updateEmployeeStatus, deleteEmployee, getAdminStats };
