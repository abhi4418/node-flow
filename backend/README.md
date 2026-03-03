# Backend - Visual Node Editor API

Express.js server with Trigger.dev for background task processing.

## Prerequisites

- Node.js 18+
- FFmpeg installed on your system (for image/video processing)
- API keys for:
  - [Google Gemini](https://aistudio.google.com/apikey) - Free tier available
  - [Trigger.dev](https://trigger.dev) - Background task execution
  - [Transloadit](https://transloadit.com/c/signup/) - File upload processing

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` with your API keys.

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Start Trigger.dev (in a separate terminal):**
   ```bash
   npm run trigger:dev
   ```
   Follow the prompts to connect to your Trigger.dev project.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/tasks/llm` | Trigger Gemini LLM task |
| POST | `/api/tasks/crop` | Trigger image crop task |
| POST | `/api/tasks/extract-frame` | Trigger video frame extraction |
| GET | `/api/tasks/:taskId/status` | Get task status/result |
| GET | `/api/transloadit/signature` | Get Transloadit upload signature |
| GET | `/api/transloadit/signature/image` | Get image-specific upload signature |
| GET | `/api/transloadit/signature/video` | Get video-specific upload signature |

## Trigger.dev Tasks

- **run-gemini-llm**: Executes Google Gemini API with multimodal support
- **crop-image**: Crops images using FFmpeg (percentage-based parameters)
- **extract-video-frame**: Extracts a single frame from video at timestamp

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3001) |
| `NODE_ENV` | Environment (development/production) |
| `FRONTEND_URL` | CORS origin (default: http://localhost:5173) |
| `TRIGGER_SECRET_KEY` | Trigger.dev secret key |
| `GOOGLE_GEMINI_API_KEY` | Google AI Studio API key |
| `TRANSLOADIT_AUTH_KEY` | Transloadit auth key |
| `TRANSLOADIT_AUTH_SECRET` | Transloadit auth secret |
