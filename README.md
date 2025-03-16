# LiveStream - WebRTC Streaming App

A simple one-to-many livestreaming application built with React, TypeScript, and WebRTC. This application allows users to create and watch livestreams in real-time.

## Features

- Create livestreams with webcam and microphone
- Watch livestreams in real-time
- See active streams on the homepage
- View count for each stream
- Real-time communication using WebRTC and Socket.IO

## Technologies Used

- React + TypeScript
- Vite
- Socket.IO for signaling
- WebRTC for peer-to-peer streaming
- TailwindCSS for styling
- Express for the backend server

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/livestream-app.git
cd livestream-app
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory with the following content:
```
VITE_SERVER_URL=http://localhost:3000
```

### Running the Application

1. Start the development server:
```bash
npm run dev
```

2. In a separate terminal, start the backend server:
```bash
npm run server
```

3. Open your browser and navigate to `http://localhost:5173`

### Building for Production

1. Build the frontend:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

## Usage

1. Enter a username to join
2. Create a new stream or watch an existing stream
3. When creating a stream, allow access to your camera and microphone
4. Share the stream URL with others to let them watch

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [WebRTC](https://webrtc.org/)
- [Socket.IO](https://socket.io/)
- [React](https://reactjs.org/)
- [TailwindCSS](https://tailwindcss.com/)
