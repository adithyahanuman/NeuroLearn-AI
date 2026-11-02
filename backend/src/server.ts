import { app } from './app';
import { config } from './config';
import { logger } from './lib/logger';
import { pool } from './db/pool';

const server = app.listen(config.PORT, () => {
  logger.info(`🚀 NeuroLearn AI Backend running on port ${config.PORT} [${config.NODE_ENV}]`);
  logger.info(`   Target ML Service: ${config.ML_SERVICE_URL}`);
  logger.info(`   CORS Allowed Origin: ${config.CORS_ORIGIN}`);
});

const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Gracefully shutting down...`);
  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await pool.end();
      logger.info('PostgreSQL pool drained.');
      process.exit(0);
    } catch (err: any) {
      logger.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error('Forcefully terminating server after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
