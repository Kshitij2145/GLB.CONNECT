import express from "express";
import dotenv from "dotenv";
import cors from 'cors';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import messageRouter from './src/routes/messageRoutes.js';
import userRouter from './src/routes/userRoutes.js';
import batchRouter from './src/routes/batchroute.js';
import jobRouter from './src/routes/jobRoutes.js';
import resourceRouter from './src/routes/resourceRoutes.js';
import { initializeSocket } from './src/sockets/chatSocket.js';
import anonymousMessageRouter from './src/routes/anonymousMessageRoutes.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const prisma = new PrismaClient();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//Attach app to httpServer for socket.io
httpServer.app = app;

// Initialize Socket.io
const io = initializeSocket(httpServer);

// Middleware
app.use(cors({
  origin: [
    process.env.CLIENT_URL || "http://localhost:5173",
    "https://glb-connect.vercel.app",
    "https://glb.connect"
  ],
  credentials: true
}));
app.use(express.json());

// API Routes - MUST come before static file serving
app.use('/api/messages', messageRouter);
app.use('/api/users', userRouter);
app.use('/api/batch', batchRouter);
app.use('/api/jobs', jobRouter);
app.use('/api/resources', resourceRouter);
app.use('/api/anonymous-messages', anonymousMessageRouter);

// Serve static files (for uploaded resources)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!', timestamp: new Date().toISOString() });
});

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/dist')));
  
  // Catch-all route for React app - MUST be last
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist', 'index.html'));
  });
}

const port = process.env.PORT || 5000;

// Test database connection and start server
async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully!');
    
    // Start the server
    httpServer.listen(port, '0.0.0.0', () => {
      const publicUrl = process.env.RAILWAY_PUBLIC_DOMAIN
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/api`
        : `http://localhost:${port}/api`;
      console.log(`🚀 Server is running on port ${port}`);
      console.log(`📊 Database: PostgreSQL (Railway)`);
      console.log(`🔗 API URL: ${publicUrl}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();






