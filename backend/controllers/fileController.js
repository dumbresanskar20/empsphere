const mongoose = require('mongoose');
const { getGfs } = require('../config/db');

// @desc    Upload document image to GridFS
// @route   POST /api/upload
// @access  Public or Private (depending on implementation)
const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded or invalid file type' });
    }
    res.status(201).json({
      message: 'File uploaded successfully',
      file: req.file
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all uploaded files
// @route   GET /api/files
// @access  Public or Private
const getAllFiles = async (req, res, next) => {
  try {
    const conn = mongoose.connection;
    const files = await conn.db.collection('uploads.files').find().toArray();
    res.json(files);
  } catch (err) {
    next(err);
  }
};

// @desc    Stream a file from GridFS by filename
// @route   GET /api/files/:filename
// @access  Public or Private
const getFile = async (req, res, next) => {
  try {
    const conn = mongoose.connection;
    const file = await conn.db.collection('uploads.files').findOne({ filename: req.params.filename });
    
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    const gfs = getGfs();
    if (!gfs) {
      return res.status(500).json({ message: 'GridFS not initialized' });
    }

    // Set proper content type
    res.set('Content-Type', file.contentType || 'image/jpeg');
    res.set('Content-Disposition', `inline; filename="${file.metadata?.originalName || file.filename}"`);

    // Stream the file
    const readStream = gfs.openDownloadStreamByName(file.filename);
    
    readStream.on('error', (err) => {
      res.status(500).json({ message: 'Error streaming file', error: err.message });
    });

    readStream.pipe(res);
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a file from GridFS
// @route   DELETE /api/files/:id
// @access  Public or Private
const deleteFile = async (req, res, next) => {
  try {
    const gfs = getGfs();
    if (!gfs) {
      return res.status(500).json({ message: 'GridFS not initialized' });
    }
    
    await gfs.delete(new mongoose.Types.ObjectId(req.params.id));
    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadFile,
  getAllFiles,
  getFile,
  deleteFile
};
