# GeminiClass - AI Powered Classroom

An immersive online classroom experience where you learn directly from an advanced AI tutor, powered by Google's Gemini Multimodal Live API.

## Features

- **Real-time AI Professor**: Conversational audio/video interaction with Gemini.
- **Interactive Whiteboard**: Draw, sketch, and ask the AI questions about what you've drawn.
- **Screen Sharing**: Present your screen and get feedback.
- **Smart Classroom**: Hand raising, emoji reactions, and chat functionality.

## 🚀 Deploy to Vercel

You can deploy this project to Vercel in one click.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fgoogle-gemini%2Fgemini-class&env=API_KEY)

### Environment Variables

This application requires a Google Gemini API Key.

1. Get your API key from [Google AI Studio](https://aistudio.google.com/).
2. When deploying to Vercel, add the following environment variable:

| Name | Description |
| :--- | :--- |
| `API_KEY` | Your Google Gemini API Key |

## 🛠️ Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   API_KEY=your_api_key_here
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser.

## Tech Stack

- **Framework**: React + Vite
- **AI**: Google Gemini Multimodal Live API via `@google/genai` SDK
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
