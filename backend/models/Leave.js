const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    employeeId: { type: String, required: true },
    employeeName: { type: String },
    leaveType: {
      type: String,
      enum: ['sick', 'casual', 'annual', 'maternity', 'other'],
      default: 'casual',
    },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    adminComment: { type: String, default: '' },
    prescriptionPath: { type: String },
    prescriptionFilename: { type: String },
    isLocked: { type: Boolean, default: false }, // Lock after admin decision
  },
  { timestamps: true }
);

// Virtual for days count
leaveSchema.virtual('days').get(function () {
  const diff = (this.toDate - this.fromDate) / (1000 * 60 * 60 * 24);
  return Math.ceil(diff) + 1;
});

module.exports = mongoose.model('Leave', leaveSchema);
