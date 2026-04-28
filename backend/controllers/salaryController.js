const Salary = require('../models/Salary');
const User = require('../models/User');
const Leave = require('../models/Leave');
const Task = require('../models/Task');

// Helper: Calculate leave deductions for a user in a given year
const calculateLeaveDeductions = async (userId) => {
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(Date.UTC(currentYear, 0, 1));
  const endOfYear = new Date(Date.UTC(currentYear + 1, 0, 1));

  const approvedLeaves = await Leave.find({
    userId,
    status: 'approved',
    fromDate: { $gte: startOfYear, $lt: endOfYear },
  });

  let totalApprovedDays = 0;
  for (const l of approvedLeaves) {
    const diff = (l.toDate - l.fromDate) / (1000 * 60 * 60 * 24);
    totalApprovedDays += Math.ceil(diff) + 1;
  }

  const annualLimit = 5;
  const excessDays = Math.max(0, totalApprovedDays - annualLimit);
  const leaveDeduction = excessDays * 500; // ₹500 per extra day

  return { totalApprovedDays, excessDays, leaveDeduction };
};

// Helper: Calculate penalty deductions for a user in a given month
const calculatePenaltyDeductions = async (userId, month) => {
  const [year, mon] = month.split('-').map(Number);
  const start = new Date(Date.UTC(year, mon - 1, 1));
  const end = new Date(Date.UTC(year, mon, 1));

  const overdueTasks = await Task.find({
    assignedEmployee: userId,
    status: 'overdue',
    isPenaltyApplied: true,
    updatedAt: { $gte: start, $lt: end },
  });

  let penaltyTotal = 0;
  const breakdown = [];
  for (const t of overdueTasks) {
    if (t.penaltyAmount > 0) {
      penaltyTotal += t.penaltyAmount;
      breakdown.push({
        reason: `Overdue task: "${t.title}"`,
        amount: t.penaltyAmount,
        type: 'penalty',
      });
    }
  }

  return { penaltyTotal, breakdown };
};

// @desc    Generate/update salary with auto-calculated deductions (admin)
// @route   POST /api/salaries
// @access  Private/Admin
const addOrUpdateSalary = async (req, res) => {
  try {
    const { userId, basic, bonus, month, notes } = req.body;
    if (!userId || !basic) {
      return res.status(400).json({ message: 'User and basic salary are required' });
    }

    const emp = await User.findById(userId).select('name employeeId');
    if (!emp) return res.status(404).json({ message: 'Employee not found' });

    const currentMonth = month || new Date().toISOString().slice(0, 7);

    // Auto-calculate leave deductions
    const { excessDays, leaveDeduction } = await calculateLeaveDeductions(userId);

    // Auto-calculate penalty deductions for this month
    const { penaltyTotal, breakdown: penaltyBreakdown } = await calculatePenaltyDeductions(userId, currentMonth);

    // Build deduction breakdown
    const deductionBreakdown = [];
    if (leaveDeduction > 0) {
      deductionBreakdown.push({
        reason: `Excess leave: ${excessDays} day(s) beyond annual limit of 5 (₹500/day)`,
        amount: leaveDeduction,
        type: 'leave',
      });
    }
    deductionBreakdown.push(...penaltyBreakdown);

    // Check if salary record exists for this month
    let salary = await Salary.findOne({ userId, month: currentMonth });

    if (salary) {
      salary.basic = Number(basic) || 0;
      salary.bonus = Number(bonus) || 0;
      salary.leaveDeductions = leaveDeduction;
      salary.penaltyDeductions = penaltyTotal;
      salary.deductionBreakdown = deductionBreakdown;
      salary.notes = notes || '';
      salary.employeeName = emp.name;
      await salary.save();
    } else {
      salary = await Salary.create({
        userId,
        employeeId: emp.employeeId,
        employeeName: emp.name,
        month: currentMonth,
        basic: Number(basic) || 0,
        bonus: Number(bonus) || 0,
        leaveDeductions: leaveDeduction,
        penaltyDeductions: penaltyTotal,
        deductionBreakdown,
        notes: notes || '',
      });
    }

    res.status(201).json(salary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get all salaries (admin)
// @route   GET /api/salaries
// @access  Private/Admin
const getAllSalaries = async (req, res) => {
  try {
    const salaries = await Salary.find().sort({ createdAt: -1 });
    res.json(salaries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get my salary records (employee)
// @route   GET /api/salaries/my
// @access  Private/Employee
const getMySalaries = async (req, res) => {
  try {
    const salaries = await Salary.find({ userId: req.user._id }).sort({ month: -1 });
    res.json(salaries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get my salary stats (employee)
// @route   GET /api/salaries/my/stats
// @access  Private/Employee
const getMySalaryStats = async (req, res) => {
  try {
    const salaries = await Salary.find({ userId: req.user._id }).sort({ month: 1 });
    const totalBasic = salaries.reduce((a, s) => a + s.basic, 0);
    const totalBonus = salaries.reduce((a, s) => a + s.bonus, 0);
    const totalDeductions = salaries.reduce((a, s) => a + s.deductions, 0);
    const totalNet = salaries.reduce((a, s) => a + s.netSalary, 0);

    res.json({ totalBasic, totalBonus, totalDeductions, totalNet, salaries });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get salary slip details for a specific record
// @route   GET /api/salaries/:id/slip
// @access  Private
const getSalarySlip = async (req, res) => {
  try {
    const salary = await Salary.findById(req.params.id);
    if (!salary) return res.status(404).json({ message: 'Salary record not found' });

    // Authorization: admin can view any, employee can view own
    if (req.user.role !== 'admin' && salary.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this salary slip' });
    }

    res.json({
      employeeId: salary.employeeId,
      employeeName: salary.employeeName,
      month: salary.month,
      basic: salary.basic,
      bonus: salary.bonus,
      leaveDeductions: salary.leaveDeductions,
      penaltyDeductions: salary.penaltyDeductions,
      totalDeductions: salary.deductions,
      netSalary: salary.netSalary,
      deductionBreakdown: salary.deductionBreakdown,
      notes: salary.notes,
      generatedAt: salary.updatedAt,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Download salary slip as .txt
// @route   GET /api/salaries/:id/download
// @access  Private
const downloadSalarySlip = async (req, res) => {
  try {
    const salary = await Salary.findById(req.params.id);
    if (!salary) return res.status(404).json({ message: 'Salary record not found' });

    if (req.user.role !== 'admin' && salary.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const line = '═'.repeat(50);
    const divider = '─'.repeat(50);
    let slip = '';
    slip += `${line}\n`;
    slip += `           EMPSPHERE — SALARY SLIP\n`;
    slip += `${line}\n\n`;
    slip += `Employee Name  : ${salary.employeeName}\n`;
    slip += `Employee ID    : ${salary.employeeId}\n`;
    slip += `Month          : ${salary.month}\n`;
    slip += `Generated      : ${new Date(salary.updatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n\n`;
    slip += `${divider}\n`;
    slip += `EARNINGS\n`;
    slip += `${divider}\n`;
    slip += `  Basic Salary          : ₹${salary.basic.toLocaleString('en-IN')}\n`;
    slip += `  Bonus                 : ₹${salary.bonus.toLocaleString('en-IN')}\n`;
    slip += `  Gross Earnings        : ₹${(salary.basic + salary.bonus).toLocaleString('en-IN')}\n\n`;
    slip += `${divider}\n`;
    slip += `DEDUCTIONS\n`;
    slip += `${divider}\n`;
    slip += `  Leave Deductions      : ₹${(salary.leaveDeductions || 0).toLocaleString('en-IN')}\n`;
    slip += `  Penalty Deductions    : ₹${(salary.penaltyDeductions || 0).toLocaleString('en-IN')}\n`;

    if (salary.deductionBreakdown && salary.deductionBreakdown.length > 0) {
      slip += `\n  Breakdown:\n`;
      salary.deductionBreakdown.forEach((d, i) => {
        slip += `    ${i + 1}. ${d.reason} — ₹${d.amount.toLocaleString('en-IN')}\n`;
      });
    }

    slip += `\n  Total Deductions      : ₹${salary.deductions.toLocaleString('en-IN')}\n\n`;
    slip += `${line}\n`;
    slip += `  NET SALARY            : ₹${salary.netSalary.toLocaleString('en-IN')}\n`;
    slip += `${line}\n\n`;
    slip += `Note: ${salary.notes || 'N/A'}\n`;
    slip += `\nThis is a system-generated salary slip from EmpSphere.\n`;

    const filename = `Salary_Slip_${salary.employeeId}_${salary.month}.txt`;
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(slip);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  addOrUpdateSalary,
  getAllSalaries,
  getMySalaries,
  getMySalaryStats,
  getSalarySlip,
  downloadSalarySlip,
};
