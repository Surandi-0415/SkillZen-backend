// backend/services/pythonBridge.js

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class PythonBridge {
  constructor() {
    this.pythonPath = process.env.PYTHON_PATH || 'python';
    this.projectRoot = path.join(__dirname, '..');
    this.uploadsDir = path.join(this.projectRoot, 'uploads');
    
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  runPythonScript(scriptPath, args = []) {
    return new Promise((resolve, reject) => {
      const fullScriptPath = path.join(this.projectRoot, scriptPath);
      
      if (!fs.existsSync(fullScriptPath)) {
        reject(new Error(`Python script not found: ${fullScriptPath}`));
        return;
      }

      const pythonProcess = spawn(this.pythonPath, [fullScriptPath, ...args]);

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        console.log('Python stderr:', data.toString());
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python script exited with code ${code}: ${stderr}`));
        } else {
          try {
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (e) {
            resolve({ output: stdout, error: stderr });
          }
        }
      });

      pythonProcess.on('error', (err) => {
        reject(new Error(`Failed to start Python process: ${err.message}`));
      });
    });
  }

  async analyzeInterview(videoPath, jd, question) {
    try {
      const scriptPath = path.join('utils', 'analysis_runner.py');
      const args = [videoPath, jd, question];
      const result = await this.runPythonScript(scriptPath, args);
      return result;
    } catch (error) {
      console.error('Python analysis error:', error.message);
      // Return fallback result
      return {
        transcript: "Unable to transcribe audio.",
        content_score: 5.0,
        content_explanation: "Analysis temporarily unavailable.",
        combined_confidence_score: 0.5,
        overall_confidence_level: "Moderate",
        overall_emotion: "neutral",
        behaviour_consistency: "Unknown",
        performance_summary: "Analysis in progress.",
        recommendations: ["Please try again later."],
        facial_analysis: {},
        speech_analysis: {}
      };
    }
  }

  async generateQuestions(jd, duration = 30) {
    try {
      const scriptPath = path.join('utils', 'question_runner.py');
      const args = [jd, duration.toString()];
      const result = await this.runPythonScript(scriptPath, args);
      return result;
    } catch (error) {
      console.error('Question generation error:', error);
      throw error;
    }
  }

  async generateFeedback(jd, qaList) {
    try {
      const scriptPath = path.join('utils', 'feedback_runner.py');
      const args = [jd, JSON.stringify(qaList)];
      const result = await this.runPythonScript(scriptPath, args);
      return result;
    } catch (error) {
      console.error('Feedback generation error:', error);
      throw error;
    }
  }
}

module.exports = new PythonBridge();