// ============================================================
// ProofPix - server.js
// Main entry point for the Express backend
// ============================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const fileRoutes = require('./routes/files');
const verifyRoutes = require('./routes/verify');

const app = express();
const PORT = process.env.PORT || 5001;

const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

// ─── Middleware ───────────────────────────────────────────────
const corsOptions = {
  origin: (origin, callback) => callback(null, true),
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Static Files (Frontend) ─────────────────────────────────
// Serve the frontend from the /frontend folder
app.use(express.static(path.join(__dirname, '../frontend')));

// ─── API Routes ───────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/verify', verifyRoutes);

// ─── Serve uploaded files via hash (secure route) ────────────
// Direct /uploads access is blocked — only /view/:hash works
app.use('/uploads', (req, res) => {
  res.status(403).json({ error: 'Direct file access is not allowed. Use /view/:hash instead.' });
});

// ─── Frontend Page Routing ────────────────────────────────────
// All non-API routes serve the frontend (SPA-style)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ─── MongoDB Connection ───────────────────────────────────────
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/proofpix')
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`🚀 ProofPix server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
