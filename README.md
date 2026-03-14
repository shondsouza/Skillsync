# Evalio - AI-Powered Interview Preparation Platform

Evalio is an intelligent interview preparation platform that uses AI to assess your skills and provide personalized feedback. Upload your resume, get a custom quiz, and discover what you need to improve.

## Features

- Resume Parsing with automatic skill extraction
- AI-Generated Quizzes using Google Gemini
- Smart Gap Analysis with curated learning resources
- Interview Readiness Verdict
- Resource Recommendations (YouTube, docs, GitHub, courses)

## Project Structure

```
Evalio/
├── client/          # React web application
├── mobile/          # React Native mobile app
└── server/          # Python FastAPI backend
```

## Tech Stack

**Frontend**: React, React Router, Chart.js  
**Backend**: Python FastAPI, Google Gemini AI, pdfplumber  
**Mobile**: React Native (Expo), TypeScript

## Getting Started

### Prerequisites
- Node.js 16+ and npm
- Python 3.8+
- Google Gemini API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/shondsouza/Skillsync.git
cd Evalio
```

2. Set up the backend:
```bash
cd server
pip install -r requirements.txt
python main.py
```

3. Set up the web client:
```bash
cd client
npm install
npm start
```

## Usage

1. Create an account or log in
2. Enter target company and role
3. Upload your resume (PDF)
4. Complete the AI-generated quiz
5. View results and learning recommendations

