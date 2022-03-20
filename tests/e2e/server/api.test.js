import { jest, expect, describe, test, beforeEach } from '@jest/globals';
import Server from '../../../server/server.js';
import superTest from 'supertest';
import portFinder from 'portfinder';
import { Transform } from 'stream';
import { setTimeout } from 'timers/promises';

const getAvailablePort = portFinder.getPortPromise;
const RETENTION_DATA_PERIOD = 200;

describe('API E2E Suite Test', () => {
  const commandResponse = JSON.stringify({ result: 'ok' });
  const possibleCommands = {
    start: 'start',
    stop: 'stop',
  };

  function pipeAndReadStreamData(stream, onChunk) {
    const transform = new Transform({
      transform(chunk, enc, cb) {
        onChunk(chunk);

        cb();
      },
    });
    return stream.pipe(transform);
  }

  describe('client workflow', () => {
    //the function getTestServer will allow that our e2e tests be independents, so one test doesn't dirty other, each test is ran in a different port
    async function getTestServer() {
      const getSuperTest = port => superTest(`http://localhost:${port}`);
      //get a available port of our docker container
      const port = await getAvailablePort();

      return new Promise((resolve, reject) => {
        //instancing our server
        const server = Server.listen(port)
          .once('listening', () => {
            //when the server is running, we mount our server url to give to supertest
            const testServer = getSuperTest(port);
            const response = {
              testServer,
              kill() {
                //how to each test we're running a different server, this can be hard to process, so this method will help us to close server after tests
                server.close();
              },
            };

            return resolve(response);
          })
          .on('error', reject);
      });
    }

    function commandSender(testServer) {
      return {
        async send(command) {
          const response = await testServer
            .post('/controller')
            .send({ command });

          expect(response.text).toStrictEqual(commandResponse);
        },
      };
    }

    test('it should not receive data string if the process is not playing', async () => {
      const server = await getTestServer();

      const onChunk = jest.fn();
      pipeAndReadStreamData(server.testServer.get('/stream'), onChunk);

      await setTimeout(RETENTION_DATA_PERIOD);
      server.kill();
      expect(onChunk).not.toHaveBeenCalled();
    });

    test('it should receive data string if the process is playing', async () => {
      const server = await getTestServer();

      const onChunk = jest.fn();
      const { send } = commandSender(server.testServer);
      pipeAndReadStreamData(server.testServer.get('/stream'), onChunk);

      await send(possibleCommands.start);
      await setTimeout(RETENTION_DATA_PERIOD);
      await send(possibleCommands.stop);

      const [[buffer]] = onChunk.mock.calls;

      expect(buffer).toBeInstanceOf(Buffer)
      expect(buffer.length).toBeGreaterThan(1000)
      server.kill();
    });
  });
});
