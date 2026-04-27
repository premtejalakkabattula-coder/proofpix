// ============================================================
// utils/multerConfig.js
// Multer setup for file uploads with validation
// ============================================================

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ─── Storage configuration ────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // UUID-based filename to prevent collisions and hide originals
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${randomUUID()}${ext}`;
    cb(null, uniqueName);
  }
});

// ─── File type filter ─────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/mov',
    'video/avi',
    'video/mkv',
    'video/webm'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true); // Accept the file
  } else {
    cb(new Error('Invalid file type. Only images and videos are allowed.'), false);
  }
};

// ─── Export multer instance ───────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max
  }
});

module.exports = upload;
