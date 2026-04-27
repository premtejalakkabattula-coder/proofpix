// ============================================================
// routes/files.js
// POST   /api/files/upload     — Upload & protect a file
// GET    /api/files/view/:hash — View file by hash (public)
// GET    /api/files/my-files   — Get current user's files
// DELETE /api/files/:id        — Delete a file
// ============================================================

const express = require('express');
const path = require('path');
const fs = require('fs');
const Media = require('../models/Media');
const { protect } = require('../middleware/auth');
const upload = require('../utils/multerConfig');
const { processMedia } = require('../utils/mediaProcessor');

const router = express.Router();

// ─── POST /api/files/upload ───────────────────────────────────
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const file = req.file;
    const ownerName = req.user.name;

    // Process: apply watermark + generate hash
    const { hash, fileType } = await processMedia(file, ownerName);

    // ─── Duplicate detection ──────────────────────────────────
    const existing = await Media.findOne({ hash });
    if (existing) {
      // Log duplicate attempt
      existing.duplicateAttempts += 1;
      await existing.save();
      console.log(`⚠️  DUPLICATE DETECTED: Hash ${hash} already registered by ${existing.ownerName}`);

      // Clean up the newly uploaded duplicate file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      return res.status(409).json({
        error: 'Duplicate detected.',
        message: 'This file (or an identical copy) is already registered in ProofPix.',
        existingOwner: existing.ownerName,
        registeredAt: existing.createdAt,
        shareUrl: `/view/${existing.hash}`
      });
    }

    // ─── Save metadata to database ────────────────────────────
    const media = await Media.create({
      originalName: file.originalname,
      filename: file.filename,
      hash,
      mimeType: file.mimetype,
      size: file.size,
      fileType,
      userId: req.user._id,
      ownerName,
      shareUrl: `/view/${hash}`
    });

    res.status(201).json({
      message: 'File uploaded and protected successfully!',
      media: {
        id: media._id,
        originalName: media.originalName,
        hash: media.hash,
        fileType: media.fileType,
        size: media.size,
        shareUrl: media.shareUrl,
        createdAt: media.createdAt
      }
    });

  } catch (err) {
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message || 'Upload failed.' });
  }
});

// ─── GET /api/files/view/:hash ────────────────────────────────
// Public route — anyone with the link can view
router.get('/view/:hash', async (req, res) => {
  try {
    const { hash } = req.params;

    const media = await Media.findOne({ hash });
    if (!media) {
      return res.status(404).json({ error: 'File not found. This content is not registered in ProofPix.' });
    }

    // Build the file path
    const filePath = path.join(__dirname, '../uploads', media.filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on server.' });
    }

    // Return metadata + stream file
    res.set({
      'Content-Type': media.mimeType,
      'Content-Disposition': `inline; filename="${media.filename}"`,
      'X-ProofPix-Owner': media.ownerName,
      'X-ProofPix-Hash': media.hash,
      'X-ProofPix-Verified': 'true'
    });

    fs.createReadStream(filePath).pipe(res);

  } catch (err) {
    console.error('View error:', err);
    res.status(500).json({ error: 'Failed to retrieve file.' });
  }
});

// ─── GET /api/files/view-meta/:hash ──────────────────────────
// Returns metadata for the view page (not the file itself)
router.get('/view-meta/:hash', async (req, res) => {
  try {
    const media = await Media.findOne({ hash: req.params.hash });
    if (!media) {
      return res.status(404).json({ error: 'Not found.' });
    }
    res.json({
      originalName: media.originalName,
      ownerName: media.ownerName,
      fileType: media.fileType,
      mimeType: media.mimeType,
      size: media.size,
      createdAt: media.createdAt,
      hash: media.hash
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── GET /api/files/my-files ─────────────────────────────────
router.get('/my-files', protect, async (req, res) => {
  try {
    const files = await Media.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .select('-__v');

    res.json({ files });
  } catch (err) {
    console.error('My files error:', err);
    res.status(500).json({ error: 'Failed to fetch files.' });
  }
});

// ─── DELETE /api/files/:id ────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const media = await Media.findOne({ _id: req.params.id, userId: req.user._id });

    if (!media) {
      return res.status(404).json({ error: 'File not found or you do not have permission to delete it.' });
    }

    // Delete physical file
    const filePath = path.join(__dirname, '../uploads', media.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete database record
    await Media.deleteOne({ _id: media._id });

    res.json({ message: 'File deleted successfully.' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Failed to delete file.' });
  }
});

module.exports = router;
