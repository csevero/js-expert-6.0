import config from './config.js';
import Server from './server.js';
import { logger } from './util.js';

Server.listen(config.port).on('listening', () =>
  logger.info(`server running at ${config.port}`),
);
