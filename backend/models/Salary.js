const mongoose = require('mongoose');

const salarySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    employeeId: { type: String, required: true },
    employeeName: { type: String },
    month: { type: String }, // e.g. "2024-04"
    basic: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 }, // Total deductions
    leaveDeductions: { type: Number, default: 0 }, // Auto-calculated from excess leaves
    penaltyDeductions: { type: Number, default: 0 }, // From overdue tasks
    netSalary: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    deductionBreakdown: [
      {
        reason: { type: String },
        amount: { type: Number },
        type: { type: String, enum: ['leave', 'penalty', 'manual'], default: 'manual' },
      },
    ],
  },
  { timestamps: true }
);

// Auto calculate netSalary before save
salarySchema.pre('save', function (next) {
  this.deductions = (this.leaveDeductions || 0) + (this.penaltyDeductions || 0);
  this.netSalary = (this.basic || 0) + (this.bonus || 0) - (this.deductions || 0);
  next();
});

module.exports = mongoose.model('Salary', salarySchema);
