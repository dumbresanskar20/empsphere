const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    assignedEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigned employee is required'],
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'overdue'],
      default: 'pending',
    },
    penaltyAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isPenaltyApplied: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
    },
    adminNotified: {
      type: Boolean,
      default: false,
    },
    // Task document upload by employee
    documentPath: {
      type: String,
      default: '',
    },
    documentFilename: {
      type: String,
      default: '',
    },
    documentOriginalName: {
      type: String,
      default: '',
    },
    // Admin review — locked once decided
    adminDecision: {
      type: String,
      enum: ['complete', 'not_complete', ''],
      default: '',
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for efficient queries
taskSchema.index({ assignedEmployee: 1, status: 1 });
taskSchema.index({ dueDate: 1, status: 1 });

module.exports = mongoose.model('Task', taskSchema);
