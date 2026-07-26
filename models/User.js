// backend/models/User.js

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"]
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [6, "Password must be at least 6 characters"]
  },
  role: {
    type: String,
    enum: ["Candidate", "Admin", "Interviewer"],
    default: "Candidate"
  },
  profile: {
    skills: [String],
    experience: Number,
    education: String,
    bio: String
  },
  stats: {
    totalInterviews: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    bestScore: { type: Number, default: 0 },
    improvementTrend: {
      type: String,
      enum: ["improving", "declining", "stable"],
      default: "stable"
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date
});

// ============================================================
// Hash password explicitly in the controller to avoid middleware issues
// ============================================================

UserSchema.methods.hashPassword = function() {
  if (!this.password) {
    throw new Error("Password is required");
  }

  const salt = bcrypt.genSaltSync(10);
  this.password = bcrypt.hashSync(this.password, salt);
};

// ============================================================
// COMPARE PASSWORD - Using async/await
// ============================================================

UserSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error("Password comparison failed");
  }
};

module.exports = mongoose.model("User", UserSchema);