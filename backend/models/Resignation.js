const mongoose = require('mongoose');

const resignationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    employeeId: {
      type: String,
      required: true,
    },
    employeeName: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      required: [true, 'Resignation reason is required'],
      trim: true,
    },
    letterPath: {
      type: String, // GridFS file path
      default: '',
    },
    letterFilename: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approvedAt: {
      type: Date,
    },
    noticePeriodEnd: {
      type: Date, // 30 days from approvedAt
    },
    noticeCancelled: {
      type: Boolean,
      default: false,
    },
    cancelledBy: {
      type: String,
      enum: ['admin', 'employee', ''],
      default: '',
    },
    cancelledAt: {
      type: Date,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

resignationSchema.index({ userId: 1 });
resignationSchema.index({ status: 1 });

module.exports = mongoose.model('Resignation', resignationSchema);
