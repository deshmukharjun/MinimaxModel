# Minimax AI - Image to Video Generator

A beautiful, modern web application for generating videos from images using the Minimax AI API. Built with React, Tailwind CSS, and Express.js.

## Features

- 🎨 **Beautiful Modern UI** - Clean, minimal design with Tailwind CSS
- 🖼️ **Image Upload** - Upload images or use URLs
- 🎬 **Multiple Models** - Support for various Minimax AI models
- 📊 **Real-time Status** - Live updates on video generation progress
- 📚 **History** - View and manage your generated videos
- 🎯 **Responsive Design** - Works on desktop and mobile devices

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file in the root directory:

```env
MINIMAX_API_KEY=your_api_key_here
PORT=3000
```

### 3. Build React App

```bash
npm run build
```

This will build the React app and output it to the `public` directory.

### 4. Start the Server

```bash
npm start
```

The server will run on `http://localhost:3000`

## Development

For development with hot reload, you can run Vite dev server separately:

```bash
# Terminal 1: Start backend
npm start

# Terminal 2: Start Vite dev server (for React hot reload)
npm run dev
```

Then access the app at `http://localhost:5173` (Vite will proxy API requests to the backend).

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── VideoGenerator.jsx  # Main video generation form
│   │   └── History.jsx          # History view component
│   ├── utils/
│   │   └── history.js           # History management utilities
│   ├── App.jsx                  # Main app component
│   ├── main.jsx                 # React entry point
│   └── index.css                # Tailwind CSS styles
├── public/                      # Static files and React build output
├── server.js                    # Express backend server
├── vite.config.js              # Vite configuration
├── tailwind.config.js          # Tailwind CSS configuration
└── package.json
```

## API Endpoints

- `POST /api/video-generation` - Create a new video generation task
- `GET /api/video-generation/:taskId` - Check task status
- `GET /api/video-file/:fileId` - Get video download URL
- `POST /api/video-generation/callback` - Callback endpoint for Minimax status updates

## History Feature

The history feature stores generated videos in browser localStorage. Each entry includes:
- Task ID
- Model used
- Prompt/description
- Image preview
- Video URL
- Dimensions
- Creation timestamp

History is automatically saved when a video is successfully generated.

## Technologies

- **React 18** - UI framework
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **Express.js** - Backend server
- **Axios** - HTTP client

## License

MIT
