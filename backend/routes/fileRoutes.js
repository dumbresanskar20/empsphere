const express = require('express');
const router = express.Router();
const uploadGridFS = require('../middleware/gridfsUpload');
const {
  uploadFile,
  getAllFiles,
  getFile,
  deleteFile
} = require('../controllers/fileController');

// POST /api/upload
router.post('/upload', uploadGridFS.single('file'), uploadFile);

// GET /api/files
router.get('/files', getAllFiles);

// GET /api/files/:filename
router.get('/files/:filename', getFile);

// DELETE /api/files/:id
router.delete('/files/:id', deleteFile);

module.exports = router;
