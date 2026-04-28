const cron = require('node-cron');
const Task = require('../models/Task');
const User = require('../models/User');
const Salary = require('../models/Salary');
const Notification = require('../models/Notification');
const Resignation = require('../models/Resignation');
const Leave = require('../models/Leave');
const Attendance = require('../models/Attendance');

/**
 * Cron Job 1: Runs every hour to check for overdue tasks
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
      } else {
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
                salaryRecord.penaltyDeductions = (salaryRecord.penaltyDeductions || 0) + task.penaltyAmount;
                salaryRecord.deductionBreakdown = salaryRecord.deductionBreakdown || [];
                salaryRecord.deductionBreakdown.push({
                  reason: `Overdue task: "${task.title}"`,
                  amount: task.penaltyAmount,
                  type: 'penalty',
                });
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
                  penaltyDeductions: task.penaltyAmount,
                  deductionBreakdown: [{
                    reason: `Overdue task: "${task.title}"`,
                    amount: task.penaltyAmount,
                    type: 'penalty',
                  }],
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
      }
    } catch (err) {
      console.error('❌ [CRON] Error checking overdue tasks:', err);
    }
  });

  console.log('🕐 Overdue task cron job scheduled (runs every hour).');

  /**
   * Cron Job 2: Runs daily at midnight IST to check notice period completion
   * - If notice period has ended and not cancelled, auto-delete employee
   */
  cron.schedule('30 18 * * *', async () => {
    // 18:30 UTC = midnight IST
    console.log('⏰ [CRON] Checking for completed notice periods...');

    try {
      const now = new Date();

      const expiredNotices = await Resignation.find({
        status: 'approved',
        noticeCancelled: false,
        isCompleted: false,
        noticePeriodEnd: { $lte: now },
      });

      if (expiredNotices.length === 0) {
        console.log('✅ [CRON] No expired notice periods found.');
        return;
      }

      console.log(`⚠️ [CRON] Found ${expiredNotices.length} expired notice period(s).`);

      for (const resignation of expiredNotices) {
        try {
          // Mark resignation as completed
          resignation.isCompleted = true;
          await resignation.save();

          // Delete employee and all related data
          const emp = await User.findById(resignation.userId);
          if (emp) {
            await Leave.deleteMany({ userId: emp._id });
            await Salary.deleteMany({ userId: emp._id });
            await Task.deleteMany({ assignedEmployee: emp._id });
            await Attendance.deleteMany({ employeeId: emp._id });
            await Notification.deleteMany({ userId: emp._id });
            await emp.deleteOne();

            console.log(`🗑️ [CRON] Employee ${resignation.employeeName} (${resignation.employeeId}) auto-deleted after notice period completion.`);

            // Notify admins
            const admins = await User.find({ role: 'admin' });
            for (const admin of admins) {
              await Notification.create({
                userId: admin._id,
                type: 'general',
                title: 'Employee Auto-Removed',
                message: `${resignation.employeeName} (${resignation.employeeId}) has been automatically removed after completing the notice period.`,
              });
            }
          }
        } catch (innerErr) {
          console.error(`❌ [CRON] Error processing resignation ${resignation._id}:`, innerErr);
        }
      }
    } catch (err) {
      console.error('❌ [CRON] Error checking notice periods:', err);
    }
  });

  console.log('🕐 Notice period cron job scheduled (runs daily at midnight IST).');
};

module.exports = { startOverdueTaskCron };
