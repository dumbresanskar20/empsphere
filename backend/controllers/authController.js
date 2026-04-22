const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const bcrypt = require('bcryptjs');
const Document = require('../models/Document');
const fs = require('fs');

// @desc    Employee Signup
// @route   POST /api/auth/signup
// @access  Public
const signup = async (req, res) => {
  try {
    const { name, email, password, phone, city, dob, bloodGroup, department } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'At least one document is required for signup' });
    }

    const documentTypes = req.body.documentTypes;
    const docTypesArray = Array.isArray(documentTypes) ? documentTypes : [documentTypes];

    const documents = req.files.map((file, index) => {
      return {
        filename: file.filename,
        originalName: file.originalname,
        path: `/api/files/${file.filename}`, // GridFS streaming path
        mimetype: file.mimetype,
        docType: docTypesArray[index] || 'Other',
      };
    });

    const user = await User.create({
      name,
      email,
      password,
      phone,
      city,
      dob: dob ? new Date(dob) : undefined,
      bloodGroup,
      department,
      role: 'employee',
      status: 'pending',
      documents,
    });

    res.status(201).json({
      message: 'Account created successfully. Awaiting admin approval.',
      employeeId: user.employeeId,
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: err.message || 'Server error during signup' });
  }
};

// @desc    Login (Admin or Employee)
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Admin hardcoded check
    const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'Admin@gmail.com').toLowerCase();
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AdminPassword123';

    if (email.toLowerCase() === ADMIN_EMAIL) {
      if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ message: 'Invalid admin credentials' });
      }

      // Find or create admin user in DB
      let adminUser = await User.findOne({ email: ADMIN_EMAIL });
      if (!adminUser) {
        adminUser = await User.create({
          name: 'Administrator',
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          role: 'admin',
          status: 'approved',
        });
      }

      const token = generateToken(adminUser._id, 'admin');
      return res.json({
        token,
        role: 'admin',
        name: adminUser.name,
        email: adminUser.email,
        _id: adminUser._id,
      });
    }

    // Employee login
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.status === 'pending') {
      return res.status(403).json({ message: 'Your account is pending admin approval' });
    }

    if (user.status === 'rejected') {
      return res.status(403).json({ message: 'Your account has been rejected. Contact admin.' });
    }

    const token = generateToken(user._id, user.role);
    res.json({
      token,
      role: user.role,
      name: user.name,
      email: user.email,
      _id: user._id,
      employeeId: user.employeeId,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: err.message || 'Server error during login' });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { signup, login, getMe };
