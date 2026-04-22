const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const storage = new GridFsStorage({
  url: process.env.MONGO_URI,
  options: { serverSelectionTimeoutMS: 5000 },
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      // Validate file type
      const allowedFileTypes = /jpeg|jpg|png|gif|webp/;
      const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedFileTypes.test(file.mimetype);

      if (!extname || !mimetype) {
        return reject(new Error('Only image files are allowed!'));
      }

      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads',
          metadata: {
            originalName: file.originalname,
            uploadDate: new Date(),
          }
        };
        resolve(fileInfo);
      });
    });
  }
});

const uploadGridFS = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

module.exports = uploadGridFS;
