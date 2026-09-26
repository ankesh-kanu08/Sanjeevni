import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';

import connectDB from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import setupSockets from './sockets/index.js';
import './models/index.js';

// Routes
import authRoutes from './routes/auth.js';
import patientRoutes from './routes/patients.js';
import hospitalRoutes from './routes/hospital.js';
import checkinRoutes from './routes/checkins.js';
import vitalsRoutes from './routes/vitals.js';
import riskRoutes from './routes/risk.js';
import workerRoutes from './routes/worker.js';
import doctorRoutes from './routes/doctor.js';
import adminRoutes from './routes/admin.js';
import aiRoutes from './routes/ai.js';
import voiceCheckinRoutes from './routes/voiceCheckins.js';

// Connect to MongoDB
connectDB();

const app = express();
const httpServer = createServer(app);

// CORS configuration for local and cloud production
const configuredOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((url) => url.trim().replace(/\/+$/, ''))
  : [];

const defaultOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://localhost:5000'
];

const allowedOrigins = [...new Set([...defaultOrigins, ...configuredOrigins])];

const isOriginAllowed = (origin) => {
  // Allow requests without an origin (curl, mobile apps, server-to-server)
  if (!origin) return true;
  if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) return true;
  // Allow Vercel preview deployment origins if vercel.app is configured
  if (allowedOrigins.some((o) => o.includes('vercel.app')) && origin.endsWith('.vercel.app')) return true;
  return false;
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from unauthorized origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Setup Socket.IO with matching CORS
export const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Socket origin ${origin} not allowed by CORS`));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});
setupSockets(io);

// Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('dev'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // limit each IP to 1000 requests per windowMs
});
app.use(limiter);

// Root & Health Check Endpoints
app.get('/', (req, res) => {
  res.json({
    service: 'Sanjeevani Backend API',
    status: 'running',
    health: '/health'
  });
});

app.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const statusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  const isHealthy = dbState === 1 || dbState === 2;
  res.status(isHealthy ? 200 : 503).json({
    status: dbState === 1 ? 'ok' : 'degraded',
    service: 'sanjeevani-backend',
    database: statusMap[dbState] || 'unknown',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/hospital', hospitalRoutes);
app.use('/api/patients', checkinRoutes); // /api/patients/:id/checkins
app.use('/api/patients', vitalsRoutes); // /api/patients/:id/vitals
app.use('/api/patients', riskRoutes); // /api/patients/:id/risk-assessment
app.use('/api/worker', workerRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/voice-checkins', voiceCheckinRoutes);

// Error Handler Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

httpServer.listen(PORT, HOST, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT} (host: ${HOST})`);
});
