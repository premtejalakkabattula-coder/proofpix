// ============================================================
// routes/verify.js
// POST /api/verify — Upload a file to check if it's registered
// ============================================================

const express = require('express');
const fs = require('fs');
const Media = require('../models/Media');
const upload = require('../utils/multerConfig');
const { generateFileHash } = require('../utils/mediaProcessor');

const router = express.Router();

// ─── POST /api/verify ─────────────────────────────────────────
// Accepts a file, hashes it, and checks DB for a match
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided for verification.' });
    }

    // Generate hash of the uploaded verification file
    const hash = await generateFileHash(req.file.path);

    // Clean up the temporarily uploaded verify file
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    // Search the database
    const media = await Media.findOne({ hash });

    if (media) {
      // ✅ Found — file is registered
      res.json({
        verified: true,
        message: 'This file is registered and verified in ProofPix.',
        result: {
          ownerName: media.ownerName,
          originalName: media.originalName,
          fileType: media.fileType,
          registeredAt: media.createdAt,
          hash: media.hash,
          shareUrl: `/view/${media.hash}`
        }
      });
    } else {
      // ❌ Not found — file is not in ProofPix
      res.json({
        verified: false,
        message: 'This file is NOT registered in ProofPix.',
        hash // Return the hash so user can see it
      });
    }

  } catch (err) {
    // Clean up on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Verify error:', err);
    res.status(500).json({ error: 'Verification failed.' });
  }
});

module.exports = router;
