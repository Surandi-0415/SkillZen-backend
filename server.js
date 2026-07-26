// server.js

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const authRoutes = require("./routes/auth");
const interviewRoutes = require("./routes/interviewRoutes");

const app = express();

// ==========================================================
// Middleware
// ==========================================================

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================================
// Routes
// ==========================================================

app.use("/api/auth", authRoutes);
app.use("/api/interviews", interviewRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Interview Analysis Backend",
    version: "3.0.0",
    endpoints: {
      auth: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
        profile: "GET /api/auth/profile",
        updateProfile: "PUT /api/auth/profile"
      },
      interviews: {
        processAnswer: "POST /api/interviews/process-answer",
        saveResult: "POST /api/interviews/save",
        history: "GET /api/interviews/history",
        analytics: "GET /api/interviews/analytics",
        getById: "GET /api/interviews/:id",
        feedback: "POST /api/interviews/:interviewId/feedback"
      }
    }
  });
});

// ==========================================================
// Database Connection
// ==========================================================

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.log("❌ MongoDB connection error:", err));

// ==========================================================
// Start Server
// ==========================================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}`);
});