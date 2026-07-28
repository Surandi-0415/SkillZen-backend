// backend/models/MeetGreetQuestion.js
//
// Pre-built "meet & greet" (warm-up) questions.
// These are seeded once into MongoDB and served instantly at the start of an
// interview so the candidate is never left staring at a blank wall while the
// AI generates the real, job-specific questions in the background.

const mongoose = require("mongoose");

const meetGreetQuestionSchema = new mongoose.Schema(
  {
    // The warm-up question text shown to the candidate.
    question: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },

    // Optional grouping so we can later filter (e.g. "intro", "motivation").
    category: {
      type: String,
      default: "general",
      trim: true
    },

    // Higher = more likely to be shown first when we sort. Purely optional.
    order: {
      type: Number,
      default: 0
    },

    // Lets an admin disable a question without deleting it.
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    // Fixed collection name so the mongoimport / docker seed data lines up.
    collection: "meetgreetquestions"
  }
);

module.exports = mongoose.model("MeetGreetQuestion", meetGreetQuestionSchema);
