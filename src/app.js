import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/authRoutes.js';
import membershipRoutes from './routes/membershipRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// MIDDLEWARE
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
})); // Security
app.use(cors());   // Cross-Origin Resource Sharing
app.use(morgan('dev')); // Logging
app.use(express.json()); // Body Parsing
app.use(express.urlencoded({ extended: true }));

// STATIC FILES (Uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/membership', membershipRoutes);
app.use('/api/payment', paymentRoutes);

// BASIC ROUTE
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to ABHM MP Suite API',
        status: 'Operational',
        version: '1.0.0'
    });
});

// GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
    });
});

export default app;
