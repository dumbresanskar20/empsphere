const Document = require('../models/Document');
const path = require('path');
const fs = require('fs');

// @desc    Upload a document
// @route   POST /api/documents
// @access  Private
const uploadDocument = async (req, res, next) => {
  try {
    const file = req.files && req.files[0] ? req.files[0] : req.file;
    if (!file) {
      res.status(400);
      throw new Error('No file uploaded');
    }

    const { employeeId, documentType } = req.body;

    if (!employeeId || !documentType) {
      res.status(400);
      throw new Error('Employee ID and document type are required');
    }

    const document = await Document.create({
      employeeId,
      documentType,
      filePath: file.path,
      originalName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      fileData: fs.readFileSync(file.path)
    });

    res.status(201).json(document);
  } catch (err) {
    next(err);
  }
};

// @desc    Get documents for an employee
// @route   GET /api/documents/:employeeId
// @access  Private
const getDocuments = async (req, res, next) => {
  try {
    const documents = await Document.find({ employeeId: req.params.employeeId }).populate(
      'employeeId',
      'name email'
    );
    res.json(documents);
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a document
// @route   DELETE /api/documents/:id
// @access  Private/Admin
const deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      res.status(404);
      throw new Error('Document not found');
    }

    // Remove file from disk
    const filePath = path.join(__dirname, '..', 'uploads', document.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await document.deleteOne();
    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// @desc    View a document directly from DB
// @route   GET /api/documents/view/:id
// @access  Private
const viewDocument = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document || !document.fileData) {
      res.status(404);
      throw new Error('Document not found in database');
    }

    res.set('Content-Type', document.mimeType);
    res.set('Content-Disposition', `inline; filename="${document.originalName}"`);
    res.send(document.fileData);
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadDocument, getDocuments, deleteDocument, viewDocument };
