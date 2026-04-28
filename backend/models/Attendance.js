const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: Date, // Store as UTC Date object, not string
      required: true,
    },
    status: {
      type: String,
      enum: ['present', 'absent'],
      default: 'present',
    },
    checkInTime: {
      type: Date, // UTC Date object
    },
    checkOutTime: {
      type: Date, // UTC Date object — recorded on sign-out
    },
    faceVerified: {
      type: Boolean,
      default: false,
    },
    signOutFaceVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Ensure one attendance record per employee per day
// We use a compound index; uniqueness is enforced at the controller level
// by checking the date range for the day
attendanceSchema.index({ employeeId: 1, date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
