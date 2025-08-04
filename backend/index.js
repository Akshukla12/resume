const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

app.get('/', (req, res) => {
  res.send('Backend is running!');
});

app.post('/api/analyze', upload.single('resume'), async (req, res) => {
  try {
    const jobDesc = req.body.jobDesc;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No resume file uploaded.' });
    }

    let resumeText = '';

    if (file.mimetype === 'application/pdf') {
      try {
        const data = await pdfParse(file.buffer);
        resumeText = data.text;
      } catch (err) {
        console.error('PDF Parse Error:', err);
        return res.status(400).json({ error: 'Failed to read PDF. Please try another file.' });
      }
    } else if (file.mimetype === 'text/plain') {
      resumeText = file.buffer.toString('utf-8');
    } else {
      return res.status(400).json({ error: 'Unsupported file type.' });
    }

    // Shorten prompt for reliability
    const trimmedResume = resumeText.trim().slice(0, 800);
    const trimmedJobDesc = jobDesc.trim().slice(0, 500);

    const prompt = `
Given the following resume and job description, do the following:
1. Give a match score (percentage) for how well the resume fits the job.
2. Give 1-2 sentences of feedback.
3. Suggest 1-2 improvements.

Resume:
${trimmedResume}

Job Description:
${trimmedJobDesc}

Respond in this JSON format:
{
  "matchScore": "...",
  "feedback": "...",
  "suggestions": ["...", "..."]
}
`;

    // Prepare Gemini API request
    const geminiPayload = {
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ]
    };

    let aiResult;
    try {
      const geminiResponse = await axios.post(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        geminiPayload,
        {
          headers: {
            "Content-Type": "application/json",
            "X-goog-api-key": process.env.GEMINI_API_KEY
          },
          timeout: 120000 // 2 minutes
        }
      );

      // Extract the model's response text
      const text = geminiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      aiResult = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (err) {
      if (err.code === 'ECONNABORTED' || (err.response && err.response.status === 408)) {
        return res.status(500).json({ error: 'Gemini API timed out. Please try again later or with a shorter prompt.' });
      }
      console.error('Gemini API Error:', err.response?.data || err.message);
      return res.status(500).json({ error: 'Error communicating with Gemini API.' });
    }

    if (!aiResult) {
      return res.status(500).json({ error: 'Failed to parse Gemini response.' });
    }

    res.json({
      resumeText: trimmedResume,
      jobDesc: trimmedJobDesc,
      result: aiResult
    });

  } catch (err) {
    console.error('Server Error:', err);
    res.status(500).json({ error: 'Failed to process file.' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});