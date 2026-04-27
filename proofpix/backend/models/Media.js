// ============================================================
// models/Media.js
// Mongoose schema for uploaded media files
// ============================================================

const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  // Original filename from user's device
  originalName: {
    type: String,
    required: true
  },

  // Stored filename on disk (UUID-based)
  filename: {
    type: String,
    required: true
  },

  // SHA-256 hash of the watermarked file content
  hash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // MIME type (image/jpeg, video/mp4, etc.)
  mimeType: {
    type: String,
    required: true
  },

  // File size in bytes
  size: {
    type: Number,
    required: true
  },

  // File type category
  fileType: {
    type: String,
    enum: ['image', 'video'],
    required: true
  },

  // Reference to owner
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Owner name (stored for quick access on verify page)
  ownerName: {
    type: String,
    required: true
  },

  // Secure share URL path
  shareUrl: {
    type: String
  },

  // Duplicate upload attempts logged here
  duplicateAttempts: {
    type: Number,
    default: 0
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Media', mediaSchema);
