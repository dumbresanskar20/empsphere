const mongoose = require('mongoose');

let gfs;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Initialize GridFSBucket
    gfs = new mongoose.mongo.GridFSBucket(conn.connection.db, {
      bucketName: 'uploads'
    });
    
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    console.error('⚠️ NOTE: Please make sure to replace <db_password> in backend/.env with your actual MongoDB password.');
  }
};

const getGfs = () => gfs;

module.exports = { connectDB, getGfs };
