import { jest, expect, describe, test, beforeEach } from '@jest/globals';
import { Service } from '../../../server/service.js';
import TestUtil from '../_util/testUtil.js';
import fs from 'fs';
import fsPromises from 'fs/promises';
import config from '../../../server/config';
import path from 'path';

const {
  pages,
  dir: { publicDirectory },
} = config;

describe('#Service - test suite for API service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('createFileStream - should create a file stream and return it', async () => {
    const file = '/index.js';
    const mockFileStream = TestUtil.generateReadableStream(['data']);

    const createReadStream = jest
      .spyOn(fs, fs.createReadStream.name)
      .mockReturnValue(mockFileStream);

    const service = new Service();
    const serviceReturn = service.createFileStream(file);

    expect(createReadStream).toBeCalledWith(file);
    expect(serviceReturn).toStrictEqual(mockFileStream);
  });

  test('getFileInfo - should get file info', async () => {
    const file = pages.homeHTML;
    const expectType = '.html';
    const fullPath = `${publicDirectory}/${file}`;

    jest.spyOn(path, path.join.name).mockResolvedValue(fullPath);

    jest.spyOn(fsPromises, fsPromises.access.name).mockResolvedValue();

    jest.spyOn(path, path.extname.name).mockReturnValue(expectType);

    const service = new Service();
    const serviceReturn = service.getFileInfo(file);

    expect(serviceReturn).resolves.toStrictEqual({
      type: expectType,
      name: fullPath,
    });
  });

  test('getFileStream - should return a file stream and type when given a file', async () => {
    const file = pages.homeHTML;
    const expectType = '.html';

    const mockFileStream = TestUtil.generateReadableStream(['data']);

    jest
      .spyOn(Service.prototype, 'getFileInfo')
      .mockResolvedValue({ stream: mockFileStream, type: expectType });

    jest
      .spyOn(Service.prototype, 'createFileStream')
      .mockReturnValue(mockFileStream);

    const service = new Service();
    const serviceReturn = service.getFileStream(file);

    expect(serviceReturn).resolves.toStrictEqual({
      stream: mockFileStream,
      type: expectType,
    });
  });
});
