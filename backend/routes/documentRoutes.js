const express = require('express');
const router = express.Router();
const { uploadDocument, getDocuments, deleteDocument, viewDocument } = require('../controllers/documentController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { uploadDocuments } = require('../middleware/uploadMiddleware');

router.post('/', protect, uploadDocuments, uploadDocument);
router.get('/:employeeId', protect, getDocuments);
router.delete('/:id', protect, adminOnly, deleteDocument);
router.get('/view/:id', viewDocument);

module.exports = router;
