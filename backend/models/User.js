const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      unique: true,
      sparse: true,
    },
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: [true, 'Password is required'], minlength: 6 },
    role: { type: String, enum: ['admin', 'employee'], default: 'employee' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    phone: { type: String, trim: true },
    city: { type: String, trim: true },
    dob: { type: Date },
    bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''] },
    department: { type: String, trim: true, default: '' },
    profileImage: { type: String, default: '' },
    resignationStatus: {
      type: String,
      enum: ['none', 'pending', 'in_notice', 'resigned'],
      default: 'none',
    },
    faceDescriptor: {
      type: [Number], // face-api.js descriptor (128-dimensional Float32Array)
      default: [],
    },
    deductions: [
      {
        amount: { type: Number, required: true },
        reason: { type: String, required: true },
        date: { type: Date, default: Date.now },
        taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
      },
    ],
    documents: [
      {
        documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
        filename: String,
        originalName: String,
        path: String,
        mimetype: String,
        docType: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Auto-generate employeeId for employees
userSchema.pre('save', async function (next) {
  if (this.role === 'employee' && !this.employeeId) {
    const count = await mongoose.model('User').countDocuments({ role: 'employee' });
    const num = count + 1;
    this.employeeId = `EMP${String(num).padStart(3, '0')}`;
    // Ensure uniqueness
    let exists = await mongoose.model('User').findOne({ employeeId: this.employeeId });
    let counter = num;
    while (exists) {
      counter++;
      this.employeeId = `EMP${String(counter).padStart(3, '0')}`;
      exists = await mongoose.model('User').findOne({ employeeId: this.employeeId });
    }
  }
  next();
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
