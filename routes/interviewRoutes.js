// backend/routes/interviewRoutes.js

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { protect } = require("../middleware/authMiddleware");

// ============================================================
// ✅ Import ALL controllers correctly
// ============================================================

const {
  saveInterviewResult,
  getInterviewHistory,
  getInterviewById,
  processAnswer,
  getInterviewAnalytics,
  generateFeedback
} = require("../controllers/interviewController");

// ============================================================
// Configure multer for video uploads
// ============================================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `video-${uniqueSuffix}.webm`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/webm', 'video/mp4', 'video/ogg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid video format'));
    }
  }
});

// ============================================================
// ✅ Routes - Each handler must be a valid function
// ============================================================

// Process answer with video analysis
router.post(
  "/process-answer",
  protect,
  upload.single('video'),
  processAnswer
);

// Save interview result
router.post(
  "/save",
  protect,
  saveInterviewResult
);

// Generate feedback for interview
router.post(
  "/:interviewId/feedback",
  protect,
  generateFeedback
);

// Get interview history
router.get(
  "/history",
  protect,
  getInterviewHistory
);

// Get interview analytics
router.get(
  "/analytics",
  protect,
  getInterviewAnalytics
);

// Get single interview
router.get(
  "/:id",
  protect,
  getInterviewById
);

module.exports = router;