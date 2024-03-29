import config from './config.js';
import { Controller } from './controller.js';
import { logger } from './util.js';
const {
  location,
  pages: { homeHTML, controllerHTML },
  constants: { CONTENT_TYPE },
} = config;
import { once } from 'events';

const controller = new Controller();

async function routes(request, response) {
  const { method, url } = request;

  if (method === 'GET' && url === '/') {
    response.writeHead(302, {
      Location: location.home,
    });

    return response.end();
  }

  if (method === 'GET' && url === '/home') {
    const { stream } = await controller.getFileStream(homeHTML);

    // the default response type is text/html
    // response.writeHead(200, {"Content-Type": "text/html"})
    return stream.pipe(response);
  }

  if (method === 'GET' && url === '/controller') {
    const { stream } = await controller.getFileStream(controllerHTML);

    // the default response type is text/html
    // response.writeHead(200, {"Content-Type": "text/html"})
    return stream.pipe(response);
  }

  //for some reason when the browser request a file of the server, the browser store the file in cache, it's not make sense to us, so we use some like ?id=123 in front of our url and the browser doesn't be store our file
  if (method === 'GET' && url.includes('/stream')) {
    const { stream, onClose } = controller.createClientStream();

    //when the browser is closed or lost connection with backend we removing the stream
    request.once('close', onClose);

    response.writeHead(200, {
      'Content-Type': 'audio/mpeg',
      'Accept-Rages': 'bytes',
    });

    return stream.pipe(response);
  }

  if (method === 'POST' && url === '/controller') {
    const data = await once(request, 'data');
    const item = JSON.parse(data);
    const result = await controller.handleCommand(item);

    return response.end(JSON.stringify(result));
  }

  //files
  if (method === 'GET') {
    const { stream, type } = await controller.getFileStream(url);

    const contentType = CONTENT_TYPE[type];

    if (contentType) {
      response.writeHead(200, { 'Content-Type': contentType });
    }
    return stream.pipe(response);
  }

  response.writeHead(404);
  return response.end();
}

function handlerError(error, response) {
  // ENOENT - file not found¡
  if (error.message.includes('ENOENT')) {
    logger.warn(`asset not found ${error.stack}`);
    response.writeHead(404);
    return response.end();
  }

  logger.error(`caught error on API ${error.stack}`);
  response.writeHead(500);
  return response.end();
}

// by default the handler function doesn't handle with async promises
export function handler(request, response) {
  return routes(request, response).catch(error =>
    handlerError(error, response),
  );
}
