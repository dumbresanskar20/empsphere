const multer = require('multer');
const path = require('path');

// Use memory storage to handle the file buffer manually
// This avoids dependency conflicts with Mongoose 8 and GridFS
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|zip|rar/;
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed. Supported: images, PDF, Word, Excel, TXT, ZIP'), false);
  }
};

const imageFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed for profile photo'), false);
  }
};

exports.uploadDocuments = multer({
  storage: storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
}).array('documents', 10);

exports.uploadProfile = multer({
  storage: storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
}).single('profileImage');

exports.uploadPrescription = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
}).single('prescription');

// Task document upload by employee
exports.uploadTaskDocument = multer({
  storage: storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
}).single('taskDocument');

// Resignation letter upload
exports.uploadResignationLetter = multer({
  storage: storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
}).single('resignationLetter');
