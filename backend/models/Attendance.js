const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: String, // Format: YYYY-MM-DD for easy day-level uniqueness
      required: true,
    },
    status: {
      type: String,
      enum: ['present', 'absent'],
      default: 'present',
    },
    checkInTime: {
      type: Date,
    },
    faceVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Ensure one attendance record per employee per day
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
