import { Service } from './service.js';
import { logger } from '../server/util.js';
export class Controller {
  constructor() {
    this.service = new Service();
  }

  async getFileStream(filename) {
    return this.service.getFileStream(filename);
  }

  async handleCommand({ command }) {
    logger.info(`command received: ${command}`);
    const cmd = command.toLowerCase();
    const result = { result: 'ok' };
    if (cmd.includes('start')) {
      this.service.startStreaming();
      return result;
    }

    if (cmd.includes('stop')) {
      this.service.stopStreaming();
      return result;
    }
  }

  createClientStream() {
    const { id, clientStream } = this.service.createClientStream();

    const onClose = () => {
      logger.info(`closing connection of ${id}`);
      this.service.removeClientStream(id);
    };

    return {
      stream: clientStream,
      onClose,
    };
  }
}
