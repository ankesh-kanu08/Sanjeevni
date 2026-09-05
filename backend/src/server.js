import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
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

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const httpServer = createServer(app);

// Setup Socket.IO
export const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST']
  }
});
setupSockets(io);

// Middleware
app.use(helmet());
app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
app.use(express.json());
app.use(morgan('dev'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // limit each IP to 1000 requests per windowMs
});
app.use(limiter);

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/hospital', hospitalRoutes);
app.use('/api/patients', checkinRoutes); // /api/patients/:id/checkins
app.use('/api/patients', vitalsRoutes); // /api/patients/:id/vitals
app.use('/api/patients', riskRoutes); // /api/patients/:id/risk-assessment
app.use('/api/worker', workerRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/admin', adminRoutes);

// Error Handler Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
