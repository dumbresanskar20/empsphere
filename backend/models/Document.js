const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    documentType: {
      type: String,
      required: [true, 'Document type is required'],
    },
    filePath: { type: String },
    originalName: { type: String },
    fileSize: { type: Number },
    mimeType: { type: String },
    fileData: { type: Buffer },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Document', documentSchema);
