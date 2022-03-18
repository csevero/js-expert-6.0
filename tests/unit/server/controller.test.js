import { jest, expect, describe, test, beforeEach } from '@jest/globals';
import config from '../../../server/config.js';
import { Controller } from '../../../server/controller.js';
import { Service } from '../../../server/service.js';
import TestUtil from '../_util/testUtil.js';

const { pages } = config;

describe('#Controller - test suite for controller', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  test('should be possible to get file stream', async () => {
    const controller = new Controller();
    const mockFileStream = TestUtil.generateReadableStream(['data']);
    const expectType = '.html';

    //mockReturnValue -> used with normal functions
    //mockResolvedValue -> used with promises
    //the const = getFileStream will be the result of mockResolvedValue
    const getFileStream = jest
      .spyOn(Service.prototype, Service.prototype.getFileStream.name)
      .mockResolvedValue({
        stream: mockFileStream,
        type: expectType,
      });

    const controllerFileStream = await controller.getFileStream(pages.homeHTML);

    expect(getFileStream).toBeCalledWith(pages.homeHTML);
    expect(controllerFileStream).toStrictEqual({
      stream: mockFileStream,
      type: expectType,
    });
  });
});
