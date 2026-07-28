

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { protect } = require("../middleware/authMiddleware");



const {
  saveInterviewResult,
  getInterviewHistory,
  getInterviewById,
  processAnswer,
  getInterviewAnalytics,
  generateFeedback,
  getMeetGreetQuestions
} = require("../controllers/interviewController");



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


router.post(
  "/process-answer",
  protect,
  upload.single('video'),
  processAnswer
);

// Get random meet & greet (warm-up) questions.
// Public reference data (no user context needed) so the interview can start
// instantly. Declared before "/:id" so it is not swallowed by that param route.
router.get(
  "/meet-greet",
  getMeetGreetQuestions
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