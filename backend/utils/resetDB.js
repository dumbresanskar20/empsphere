const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const resetDB = async () => {
  try {
    console.log('🔄 Connecting to MongoDB to reset...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected.');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    for (const collection of collections) {
      console.log(`🧹 Dropping collection: ${collection.name}`);
      await db.dropCollection(collection.name);
    }

    console.log('✨ Database cleared successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting database:', error.message);
    process.exit(1);
  }
};

resetDB();
