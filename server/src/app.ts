import express, { Express } from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { apiRateLimiter } from './middleware/rateLimiter';

export const createApp = (): Express => {
  const app = express();

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows flexible integration
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS Configuration
  app.use(
    cors({
      origin: [config.corsOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Body parsers
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Request logger
  if (config.nodeEnv !== 'test') {
    app.use(morgan('dev'));
  }

  // Rate Limiting on API endpoints
  app.use('/api', apiRateLimiter);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'CRM & Operations Management API',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Master API Routes
  app.use('/api', routes);

  // Serve Frontend static assets in production
  const clientDistPath = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    app.get('*', (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  } else {
    // 404 Route Handler for API when client dist is not built
    app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: `Endpoint ${req.method} ${req.baseUrl} does not exist.`,
      });
    });
  }

  // Global Error Handler
  app.use(errorHandler);

  return app;
};

export default createApp;
