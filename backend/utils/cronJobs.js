const cron = require('node-cron');
const Task = require('../models/Task');
const User = require('../models/User');
const Salary = require('../models/Salary');
const Notification = require('../models/Notification');

/**
 * Cron Job: Runs every hour to check for overdue tasks
 * - Updates status of pending tasks past their due date to 'overdue'
 * - Applies salary penalty if not already applied
 * - Creates notifications for both employee and admin
 */
const startOverdueTaskCron = () => {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    console.log('⏰ [CRON] Checking for overdue tasks...');

    try {
      const now = new Date();

      // Find pending tasks that are past their due date
      const overdueTasks = await Task.find({
        status: 'pending',
        dueDate: { $lt: now },
      });

      if (overdueTasks.length === 0) {
        console.log('✅ [CRON] No overdue tasks found.');
        return;
      }

      console.log(`⚠️ [CRON] Found ${overdueTasks.length} overdue task(s).`);

      for (const task of overdueTasks) {
        // Update status to overdue
        task.status = 'overdue';

        // Apply penalty if not already applied and penaltyAmount > 0
        if (!task.isPenaltyApplied && task.penaltyAmount > 0) {
          const employee = await User.findById(task.assignedEmployee);

          if (employee) {
            // Get current month for salary record
            const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM

            // Find or create salary record for current month
            let salaryRecord = await Salary.findOne({
              userId: employee._id,
              month: currentMonth,
            });

            if (salaryRecord) {
              // Add penalty to existing deductions
              salaryRecord.deductions = (salaryRecord.deductions || 0) + task.penaltyAmount;
              salaryRecord.notes = (salaryRecord.notes || '') +
                `\nPenalty ₹${task.penaltyAmount} for overdue task: "${task.title}"`;
              await salaryRecord.save();
            } else {
              // Create new salary record with the deduction
              salaryRecord = await Salary.create({
                userId: employee._id,
                employeeId: employee.employeeId,
                employeeName: employee.name,
                month: currentMonth,
                basic: 0,
                bonus: 0,
                deductions: task.penaltyAmount,
                notes: `Penalty ₹${task.penaltyAmount} for overdue task: "${task.title}"`,
              });
            }

            task.isPenaltyApplied = true;

            // Notify employee about penalty
            await Notification.create({
              userId: employee._id,
              type: 'penalty_applied',
              title: 'Penalty Applied',
              message: `A penalty of ₹${task.penaltyAmount} has been deducted for overdue task: "${task.title}".`,
              relatedId: task._id,
            });

            // Notify all admins
            const admins = await User.find({ role: 'admin' });
            for (const admin of admins) {
              await Notification.create({
                userId: admin._id,
                type: 'task_overdue',
                title: 'Task Overdue — Penalty Applied',
                message: `Task "${task.title}" assigned to ${employee.name} (${employee.employeeId}) is overdue. Penalty of ₹${task.penaltyAmount} applied.`,
                relatedId: task._id,
              });
            }

            console.log(`💰 [CRON] Penalty ₹${task.penaltyAmount} applied to ${employee.name} for task: "${task.title}"`);
          }
        } else if (!task.isPenaltyApplied && task.penaltyAmount === 0) {
          // Still notify about overdue even without penalty
          const employee = await User.findById(task.assignedEmployee);
          if (employee) {
            await Notification.create({
              userId: employee._id,
              type: 'task_overdue',
              title: 'Task Overdue',
              message: `Your task "${task.title}" is now overdue. Please complete it as soon as possible.`,
              relatedId: task._id,
            });
          }
        }

        await task.save();
        console.log(`📌 [CRON] Task "${task.title}" marked as overdue.`);
      }
    } catch (err) {
      console.error('❌ [CRON] Error checking overdue tasks:', err);
    }
  });

  console.log('🕐 Overdue task cron job scheduled (runs every hour).');
};

module.exports = { startOverdueTaskCron };
