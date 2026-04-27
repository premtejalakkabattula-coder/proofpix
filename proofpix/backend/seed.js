require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/proofpix';
const DEFAULT_USER = {
  name: process.env.SEED_NAME || 'ProofPix Admin',
  email: process.env.SEED_EMAIL || 'admin@proofpix.local',
  password: process.env.SEED_PASSWORD || 'Password123'
};

async function seed() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB for seeding');

    const existing = await User.findOne({ email: DEFAULT_USER.email.toLowerCase() });
    if (existing) {
      console.log(`ℹ️  User already exists: ${existing.email}`);
    } else {
      const user = await User.create(DEFAULT_USER);
      console.log(`✅ User created: ${user.email}`);
      console.log('   Use this account to log in from the frontend.');
    }
  } catch (err) {
    console.error('❌ Seed error:', err.message || err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
