# Seeding the "Meet & Greet" Warm-up Questions

This folder contains the pre-built warm-up questions that are shown to the
candidate **instantly** at the start of an interview (while the AI generates the
real, job-specific questions in the background).

- **Data file:** `meet_greet_questions.json` (10 questions, `--jsonArray` format)
- **Target DB / collection:** `interview` / `meetgreetquestions`
- **Model:** `backend/models/MeetGreetQuestion.js`

You only need to seed **once**. All methods below are **idempotent** (safe to run
repeatedly — they upsert by the unique `question` text, so no duplicates).

---

## Option A — Node seed script (recommended, no extra tools)

From `backend/backend`:

```bash
npm install          # if you haven't already
node seed/seedMeetGreet.js
```

It reads `MONGO_URI` from `backend/backend/.env`
(default `mongodb://localhost:27017/interview`) and prints how many questions
were inserted/updated.

---

## Option B — Docker (no local MongoDB installed)

A ready-to-use `docker-compose.yml` lives in the **project root**. It starts
MongoDB **and** auto-seeds these questions:

```bash
# from the project root (D:/surandi/SkillZen)
docker compose up -d
```

- MongoDB → `localhost:27017`
- The `mongo-seed` one-shot container imports `meet_greet_questions.json`
  automatically, then exits.
- Optional DB browser (mongo-express) → http://localhost:8081 (admin / admin)

To stop and wipe everything:

```bash
docker compose down -v
```

---

## Option C — `mongoimport` directly (you already have MongoDB)

```bash
mongoimport \
  --uri "mongodb://localhost:27017/interview" \
  --collection meetgreetquestions \
  --jsonArray \
  --mode upsert \
  --upsertFields question \
  --file meet_greet_questions.json
```

On Windows PowerShell (single line):

```powershell
mongoimport --uri "mongodb://localhost:27017/interview" --collection meetgreetquestions --jsonArray --mode upsert --upsertFields question --file meet_greet_questions.json
```

---

## Option D — `mongosh` paste-in

```javascript
use interview
db.meetgreetquestions.createIndex({ question: 1 }, { unique: true })
// then paste the array from meet_greet_questions.json:
db.meetgreetquestions.insertMany([ /* ...contents of meet_greet_questions.json... */ ])
```

---

## Verify

```javascript
// in mongosh
use interview
db.meetgreetquestions.countDocuments()          // -> 10
db.meetgreetquestions.aggregate([{ $sample: { size: 3 } }])  // 3 random ones
```

Or hit the API (backend running on port 5000):

```bash
curl "http://localhost:5000/api/interviews/meet-greet?count=3"
```

Expected shape:

```json
{
  "success": true,
  "total": 3,
  "questions": ["...", "...", "..."],
  "items": [ { "question": "...", "category": "intro", ... } ]
}
```
