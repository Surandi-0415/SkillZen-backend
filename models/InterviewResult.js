const mongoose = require("mongoose");

// NEW: Detailed answer schema with AI analysis
const answerSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
  },
  answer: {
    type: String,
    default: ""
  },
  transcript: {
    type: String,
    default: ""
  },
  content_score: {
    type: Number,
    min: 0,
    max: 10,
    default: 0
  },
  confidence: {
    type: String,
    enum: ["Excellent", "High", "Moderate", "Fair", "Low", "Unknown"],
    default: "Unknown"
  },
  explanation: {
    type: String,
    default: ""
  },
  
  // NEW: Facial analysis results
  facial_analysis: {
    confidence_score: { type: Number, default: 0 },
    confidence_level: { type: String, default: "Unknown" },
    trend: { type: String, default: "stable" },
    emotional_states: {
      confident: { type: Number, default: 0 },
      neutral: { type: Number, default: 0 },
      nervous: { type: Number, default: 0 },
      volatility: { type: Number, default: 0 }
    },
    frames_analyzed: { type: Number, default: 0 }
  },
  
  // NEW: Speech analysis results
  speech_analysis: {
    predicted_emotion: { type: String, default: "unknown" },
    confidence_score: { type: Number, default: 0 },
    emotion_scores: {
      confident: { type: Number, default: 0 },
      clear: { type: Number, default: 0 },
      nervous: { type: Number, default: 0 }
    }
  },
  
  // NEW: Combined analysis
  combined_confidence: { type: Number, default: 0 },
  overall_emotion: { type: String, default: "Unknown" },
  behaviour_consistency: { 
    type: String, 
    enum: ["High", "Medium", "Low", "Unknown"],
    default: "Unknown"
  },
  recommendations: [String],
  
  // NEW: Video metadata
  video_metadata: {
    duration: { type: Number, default: 0 },
    file_size: { type: Number, default: 0 },
    format: { type: String, default: "webm" }
  },
  
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// NEW: Overall analysis summary
const overallAnalysisSchema = new mongoose.Schema({
  combined_confidence_score: { type: Number, default: 0 },
  overall_confidence_level: { 
    type: String, 
    enum: ["Excellent", "High", "Moderate", "Fair", "Low", "Unknown"],
    default: "Unknown"
  },
  overall_emotion: { type: String, default: "Unknown" },
  behaviour_consistency: { 
    type: String, 
    enum: ["High", "Medium", "Low", "Unknown"],
    default: "Unknown"
  },
  recommendations: [String],
  performance_summary: { type: String, default: "" },
  strengths: [String],
  areas_for_improvement: [String]
});

const interviewResultSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    jobDescription: {
      type: String,
      required: true
    },
    jobTitle: {
      type: String,
      default: ""
    },
    company: {
      type: String,
      default: ""
    },
    
    // Interview details
    duration: {
      type: Number,
      default: 0
    },
    questionsCount: {
      type: Number,
      default: 0
    },
    
    // Scores
    overallScore: {
      type: Number,
      default: 0
    },
    contentScore: {
      type: Number,
      default: 0
    },
    confidenceScore: {
      type: Number,
      default: 0
    },
    
    // NEW: Overall analysis
    overallAnalysis: overallAnalysisSchema,
    
    // Answers array
    answers: [answerSchema],
    
    // Generated report
    report: {
      type: String,
      default: ""
    },
    
    // Status
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending"
    },
    
    // NEW: Interview metadata
    metadata: {
      startedAt: { type: Date, default: Date.now },
      completedAt: { type: Date },
      deviceInfo: {
        browser: { type: String },
        os: { type: String },
        camera_available: { type: Boolean, default: false },
        microphone_available: { type: Boolean, default: false }
      }
    }
  },
  {
    timestamps: true
  }
);

// NEW: Indexes for faster queries
interviewResultSchema.index({ user: 1, createdAt: -1 });
interviewResultSchema.index({ status: 1 });
interviewResultSchema.index({ overallScore: 1 });

module.exports = mongoose.model("InterviewResult", interviewResultSchema);