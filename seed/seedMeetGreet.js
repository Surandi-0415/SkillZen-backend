// backend/seed/seedMeetGreet.js
//
// Seeds the pre-built "meet & greet" warm-up questions into MongoDB.
//
// Usage (from backend/backend):
//   node seed/seedMeetGreet.js
//
// It is idempotent: running it multiple times will NOT create duplicates
// (it upserts by the unique `question` text). Reads MONGO_URI from .env.

const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load .env from the backend root regardless of where the script is called from.
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const MeetGreetQuestion = require("../models/MeetGreetQuestion");

const DATA_FILE = path.join(__dirname, "meet_greet_questions.json");

async function seed() {
  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/interview";

  console.log(`Connecting to MongoDB at: ${mongoUri}`);
  await mongoose.connect(mongoUri);
  console.log("MongoDB connected.");

  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  const questions = JSON.parse(raw);

  console.log(`Seeding ${questions.length} meet & greet questions...`);

  let inserted = 0;
  let updated = 0;

  for (const q of questions) {
    const res = await MeetGreetQuestion.updateOne(
      { question: q.question },
      { $set: q },
      { upsert: true }
    );
    if (res.upsertedCount && res.upsertedCount > 0) inserted += 1;
    else if (res.modifiedCount && res.modifiedCount > 0) updated += 1;
  }

  const total = await MeetGreetQuestion.countDocuments();

  console.log(`Done. Inserted: ${inserted}, Updated: ${updated}.`);
  console.log(`Total meet & greet questions now in DB: ${total}`);

  await mongoose.disconnect();
  console.log("Disconnected.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  });
