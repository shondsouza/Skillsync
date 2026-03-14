# Evalio - AI-Powered Interview Preparation Platform

Evalio is an intelligent interview preparation platform that uses AI to assess your skills and provide personalized feedback. Upload your resume, get a custom quiz, and discover what you need to improve.

## 🚀 Features

- **Resume Parsing**: Automatically extracts your skills and detects your primary field
- **AI-Generated Quizzes**: Google Gemini creates targeted MCQ questions based on your domain
- **Smart Gap Analysis**: Get detailed feedback on knowledge gaps with curated learning resources
- **Interview Readiness Verdict**: Clear assessment of your preparation level
- **Resource Recommendations**: YouTube videos, documentation, GitHub repos, and courses

## 📁 Project Structure

```
Evalio/
├── client/          # React web application
├── mobile/          # React Native mobile app
└── server/          # Python FastAPI backend
```

## 🛠️ Tech Stack

### Frontend (Web)
- React
- React Router
- Chart.js for visualizations
- Custom dark theme design system

### Backend
- Python FastAPI
- Google Gemini AI
- PDF parsing with pdfplumber

### Mobile
- React Native (Expo)
- TypeScript

## 🏃 Getting Started

### Prerequisites
- Node.js 16+ and npm
- Python 3.8+
- Google Gemini API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Evalio
   ```

2. **Set up the backend**
   ```bash
   cd server
   pip install -r requirements.txt
   # Configure your environment variables (.env)
   python main.py
   ```

3. **Set up the web client**
   ```bash
   cd client
   npm install
   npm start
   ```

4. **Set up the mobile app** (optional)
   ```bash
   cd mobile
   npm install
   npx expo start
   ```

## 📝 Usage

1. Create an account or log in
2. Navigate to the dashboard
3. Enter your target company and role
4. Upload your resume (PDF format)
5. Complete the AI-generated quiz
6. View your results and personalized learning recommendations

## 🎨 Design

Evalio features a premium dark theme with:
- Smooth animations and transitions
- Glass morphism effects
- Gradient accents
- Responsive design for all devices

## 📄 License

This project is for educational purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions, please open an issue on the repository.
