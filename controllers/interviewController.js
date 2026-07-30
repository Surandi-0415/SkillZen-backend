// backend/controllers/interviewController.js

const InterviewResult = require("../models/InterviewResult");
const MeetGreetQuestion = require("../models/MeetGreetQuestion");
const fs = require("fs");
const path = require("path");

const PYTHON_API = process.env.PYTHON_API_URL || "http://localhost:8000";

// ============================================================
// GET MEET & GREET (WARM-UP) QUESTIONS
// ============================================================
// Returns a small set of pre-built warm-up questions, chosen at random,
// so the candidate can start answering instantly while the AI generates the
// real, job-specific questions in the background.

exports.getMeetGreetQuestions = async (req, res) => {
  try {
    // How many warm-up questions to show. Defaults to 3, capped at 10.
    const requested = parseInt(req.query.count, 10);
    const count = Math.min(
      Number.isNaN(requested) || requested < 1 ? 3 : requested,
      10
    );

    // Randomly pick `count` active questions using an aggregation $sample.
    const questions = await MeetGreetQuestion.aggregate([
      { $match: { active: true } },
      { $sample: { size: count } }
    ]);

    // Return just the question strings (what the interview UI consumes),
    // plus the raw docs in case the client wants metadata.
    res.json({
      success: true,
      total: questions.length,
      questions: questions.map((q) => q.question),
      items: questions
    });
  } catch (error) {
    console.error(" GET MEET & GREET ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// ============================================================
// SAVE INTERVIEW RESULT
// ============================================================

exports.saveInterviewResult = async (req, res) => {
  try {
    const { jobDescription, answers, report } = req.body;

    if (!jobDescription || !answers || !report) {
      return res.status(400).json({
        message: "Missing required fields"
      });
    }

    const avgScore = answers.reduce(
      (acc, curr) => acc + Number(curr.content_score || 0), 0
    ) / answers.length;

    const result = await InterviewResult.create({
      user: req.user._id,
      jobDescription,
      answers,
      report,
      overallScore: avgScore.toFixed(1),
      status: "completed"
    });

    res.status(201).json(result);

  } catch (error) {
    console.error(" SAVE INTERVIEW ERROR:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// ============================================================
// GET INTERVIEW HISTORY
// ============================================================

exports.getInterviewHistory = async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    
    const results = await InterviewResult.find({
      user: req.user._id
    })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await InterviewResult.countDocuments({
      user: req.user._id
    });

    res.json({
      success: true,
      data: results,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error(" GET HISTORY ERROR:", error);
    res.status(500).json({
      message: "Server error"
    });
  }
};

// ============================================================
// GET INTERVIEW BY ID
// ============================================================

exports.getInterviewById = async (req, res) => {
  try {
    const result = await InterviewResult.findById(req.params.id);

    if (!result) {
      return res.status(404).json({
        message: "Interview not found"
      });
    }

    if (result.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Not authorized to view this interview"
      });
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error(" GET INTERVIEW ERROR:", error);
    res.status(500).json({
      message: "Server error"
    });
  }
};

// ============================================================
// HELPER FUNCTIONS FOR AI ANALYSIS
// ============================================================

const mapConfidenceLevel = (level) => {
  if (!level) return "Unknown";
  const normalized = level.trim().toLowerCase();
  if (normalized === 'high') return 'High';
  if (normalized === 'moderate') return 'Moderate';
  if (normalized === 'low') return 'Low';
  if (normalized === 'excellent') return 'Excellent';
  if (normalized === 'fair') return 'Fair';
  return 'Unknown';
};

const calculateConsistency = (facialLevel, speechEmotion) => {
  const fl = (facialLevel || '').toLowerCase();
  const se = (speechEmotion || '').toLowerCase();
  if (fl === 'high' && se === 'confident') return 'High';
  if (fl === 'moderate' && se === 'clear') return 'High';
  if (fl === 'low' && se === 'nervous') return 'High';
  if (['high', 'moderate'].includes(fl) && ['confident', 'clear'].includes(se)) return 'Medium';
  return 'Low';
};

const generateRecommendations = (facialLevel, speechEmotion, consistency, score) => {
  const recommendations = [];
  const fl = (facialLevel || '').toLowerCase();
  const se = (speechEmotion || '').toLowerCase();
  
  if (score < 0.4) {
    recommendations.push("Practice building confidence through mock interviews and preparation.");
  } else if (score < 0.6) {
    recommendations.push("Continue practicing interview skills to build more consistent confidence.");
  }
  
  if (fl === 'low') {
    recommendations.push("Practice maintaining eye contact and relaxed facial expressions during interviews.");
    recommendations.push("Record yourself answering questions and review your facial expressions.");
  } else if (fl === 'moderate') {
    recommendations.push("Work on reducing nervous facial habits like frowning or excessive blinking.");
  } else if (fl === 'high') {
    recommendations.push("Your facial confidence is strong. Keep practicing to maintain this level.");
  }
  
  if (se === 'nervous') {
    recommendations.push("Practice deep breathing exercises before speaking to reduce vocal tension.");
    recommendations.push("Work on speaking at a steady, moderate pace with clear articulation.");
  } else if (se === 'confident') {
    recommendations.push("Your vocal delivery is confident. Continue using this strong speaking style.");
  } else if (se === 'clear') {
    recommendations.push("Your speech clarity is good. Add more vocal variety to sound even more confident.");
  }
  
  if (consistency === 'Low') {
    recommendations.push("Your facial expressions and voice are sending different signals. Practice aligning your non-verbal cues.");
  }
  
  if (recommendations.length === 0) {
    recommendations.push("Continue practicing your interview skills to maintain and improve your performance.");
    recommendations.push("Regular mock interviews with feedback will help you improve over time.");
  }
  
  return recommendations;
};

// ============================================================
// PROCESS ANSWER (with video)
// ============================================================

exports.processAnswer = async (req, res) => {
  console.log(" processAnswer called");
  console.log("Body:", req.body);
  console.log("File:", req.file);

  const videoFile = req.file;

  try {
    const { jd, question, jobTitle, company } = req.body;

    if (!jd || !question || !videoFile) {
      return res.status(400).json({
        message: "Missing required fields: jd, question, or video"
      });
    }

    // Call Python backend to perform video analysis using fetch and FormData
    console.log(` Sending video for model evaluation to Python backend at: ${PYTHON_API}/submit-answer`);
    const formData = new FormData();
    formData.append('jd', jd);
    formData.append('question', question);

    const fileBuffer = fs.readFileSync(videoFile.path);
    const fileBlob = new Blob([fileBuffer], { type: videoFile.mimetype });
    formData.append('video', fileBlob, videoFile.originalname);

    const pythonResponse = await fetch(`${PYTHON_API}/submit-answer`, {
      method: "POST",
      body: formData
    });

    if (!pythonResponse.ok) {
      const errorText = await pythonResponse.text();
      throw new Error(`Python analysis server failed: ${pythonResponse.status} - ${errorText}`);
    }

    const analysisResult = await pythonResponse.json();
    console.log("📥 Received model analysis results:", JSON.stringify(analysisResult, null, 2));

    // Extract values and handle mapping
    const transcript = analysisResult.transcript || "";
    const contentScore = analysisResult.content_score !== undefined ? parseFloat(analysisResult.content_score) : 5.0;
    const explanation = analysisResult.explanation || "Analysis completed.";
    
    // Map facial analysis, scaling emotional states to percentages
    const rawFacial = analysisResult.facial_analysis || {};
    const facialLevel = rawFacial.overall_confidence_level || analysisResult.facial_level || 'unknown';
    const facialStates = rawFacial.emotional_states || {};
    const facial_analysis = {
      confidence_score: rawFacial.average_confidence !== undefined ? parseFloat(rawFacial.average_confidence) : (analysisResult.facial_confidence !== undefined ? parseFloat(analysisResult.facial_confidence) : 0.5),
      confidence_level: mapConfidenceLevel(facialLevel),
      trend: rawFacial.confidence_trend || analysisResult.confidence_trend || 'stable',
      emotional_states: {
        confident: (facialStates.confident || 0) * 100,
        neutral: (facialStates.neutral || 0) * 100,
        nervous: (facialStates.nervous || 0) * 100,
        volatility: facialStates.volatility || 0
      },
      frames_analyzed: rawFacial.frames_analyzed || 0
    };

    // Map speech analysis
    const rawSpeech = analysisResult.speech_analysis || {};
    const speechEmotion = rawSpeech.predicted_emotion || analysisResult.speech_emotion || 'unknown';
    const speech_analysis = {
      predicted_emotion: speechEmotion,
      confidence_score: rawSpeech.confidence_score !== undefined ? parseFloat(rawSpeech.confidence_score) : (analysisResult.speech_confidence !== undefined ? parseFloat(analysisResult.speech_confidence) : 0.5),
      emotion_scores: {
        confident: rawSpeech.emotion_scores?.confident || 0,
        clear: rawSpeech.emotion_scores?.clear || 0,
        nervous: rawSpeech.emotion_scores?.nervous || 0
      }
    };

    // Combined confidence metrics
    const combinedConfidence = analysisResult.combined_confidence !== undefined ? parseFloat(analysisResult.combined_confidence) : (analysisResult.confidence !== undefined ? parseFloat(analysisResult.confidence) : 0.5);
    const mappedConfidenceLevel = mapConfidenceLevel(facialLevel);
    const consistency = calculateConsistency(facialLevel, speechEmotion);
    const recommendations = generateRecommendations(facialLevel, speechEmotion, consistency, combinedConfidence);

    // NOTE: This endpoint is intentionally STATELESS — it only performs the
    // per-answer analysis and returns it. It does NOT write to MongoDB.
    //
    // Why: the frontend now submits answers asynchronously and CONCURRENTLY
    // (the candidate advances immediately while analysis runs in the
    // background). A per-answer read-modify-write on a shared InterviewResult
    // document would race and corrupt data. The complete interview is persisted
    // exactly once at the end via POST /api/interviews/save, so no data is lost.
    const answerEntry = {
      question: question,
      answer: transcript,
      transcript: transcript,
      content_score: contentScore,
      explanation: explanation,
      confidence: mappedConfidenceLevel,
      facial_analysis: facial_analysis,
      speech_analysis: speech_analysis,
      combined_confidence: combinedConfidence,
      overall_emotion: speechEmotion,
      behaviour_consistency: consistency,
      recommendations: recommendations,
      timestamp: new Date()
    };

    // Return the response structured to match the React frontend destructured properties exactly
    res.status(200).json({
      success: true,
      transcript: answerEntry.transcript,
      content_score: answerEntry.content_score,
      explanation: answerEntry.explanation,
      confidence_level: answerEntry.confidence,
      combined_confidence: answerEntry.combined_confidence,
      speech_emotion: answerEntry.overall_emotion,
      facial_analysis: answerEntry.facial_analysis,
      speech_analysis: answerEntry.speech_analysis,
      recommendations: answerEntry.recommendations
    });
  } catch (error) {
    console.error(" PROCESS ANSWER ERROR:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  } finally {
    if (videoFile && fs.existsSync(videoFile.path)) {
      try {
        fs.unlinkSync(videoFile.path);
        console.log(` Cleaned up Node temp file: ${videoFile.path}`);
      } catch (err) {
        console.error(`Failed to clean up temp file: ${err.message}`);
      }
    }
  }
};

// ============================================================
// GET INTERVIEW ANALYTICS
// ============================================================

exports.getInterviewAnalytics = async (req, res) => {
  try {
    const results = await InterviewResult.find({
      user: req.user._id
    }).sort({ createdAt: -1 });

    const totalInterviews = results.length;
    const avgScore = results.reduce(
      (sum, r) => sum + (r.overallScore || 0), 0
    ) / (totalInterviews || 1);

    const confidenceLevels = {
      Excellent: 0,
      High: 0,
      Moderate: 0,
      Fair: 0,
      Low: 0,
      Unknown: 0
    };

    results.forEach(r => {
      const level = r.overallAnalysis?.overall_confidence_level || 'Unknown';
      if (confidenceLevels[level] !== undefined) {
        confidenceLevels[level]++;
      }
    });

    res.json({
      success: true,
      totalInterviews,
      averageScore: parseFloat(avgScore.toFixed(1)),
      confidenceLevels,
      recentInterviews: results.slice(0, 5)
    });

  } catch (error) {
    console.error(" ANALYTICS ERROR:", error);
    res.status(500).json({
      message: "Server error"
    });
  }
};

// ============================================================
// GENERATE FEEDBACK
// ============================================================

exports.generateFeedback = async (req, res) => {
  try {
    const { interviewId } = req.params;
    
    const interview = await InterviewResult.findById(interviewId);
    
    if (!interview) {
      return res.status(404).json({
        message: "Interview not found"
      });
    }
    
    // Call Python backend to generate feedback report.
    // Forward the full per-answer analysis (content + facial + speech) so the
    // Python side can build the four-section report (answer / facial / speech /
    // combined overall). Previously facial_analysis and speech_analysis were
    // dropped here, which left the facial and speech sections with no data.
    const qaList = interview.answers.map(ans => ({
      question: ans.question,
      answer: ans.answer || ans.transcript || '',
      content_score: ans.content_score,
      confidence: ans.confidence,
      explanation: ans.explanation,
      facial_analysis: ans.facial_analysis || {},
      speech_analysis: ans.speech_analysis || {},
      combined_confidence: ans.combined_confidence || 0,
      overall_emotion: ans.overall_emotion || 'unknown'
    }));

    console.log(` Sending generate-feedback request to Python backend for interview: ${interviewId}`);
    
    const pythonResponse = await fetch(`${PYTHON_API}/generate-feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        jd: interview.jobDescription,
        qa_list: qaList,
        // Header details for the feedback report (candidate / position / company).
        candidate: req.user?.name || "",
        position: interview.jobTitle || "",
        company: interview.company || ""
      })
    });

    if (!pythonResponse.ok) {
      const errorText = await pythonResponse.text();
      throw new Error(`Python generate-feedback failed: ${pythonResponse.status} - ${errorText}`);
    }

    const feedbackResult = await pythonResponse.json();
    const report = feedbackResult.report || "Unable to generate feedback at this time.";
    
    interview.report = report;
    await interview.save();
    
    res.json({
      success: true,
      report: report
    });
    
  } catch (error) {
    console.error(" FEEDBACK ERROR:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};