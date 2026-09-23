import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'crm-production-grade-super-secret-key-2025',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  jwtExpiresIn: '7d',
};
