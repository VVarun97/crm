import { createApp } from './app';
import { config } from './config';

const app = createApp();

app.listen(config.port, () => {
  console.log(`🚀 CRM & Operations Server is running on port ${config.port}`);
  console.log(`📡 Health Check: http://localhost:${config.port}/api/health`);
  console.log(`🌍 Environment: ${config.nodeEnv}`);
});
