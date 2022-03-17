import { jest, expect, describe, test, beforeEach } from '@jest/globals';
import config from '../../../server/config.js';
import { Controller } from '../../../server/controller.js';
import { handler } from '../../../server/routes.js';
import TestUtil from '../_util/testUtil.js';

const {
  pages,
  location,
  constants: { CONTENT_TYPE },
} = config;

describe('#Routes - test suite for api response', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  test('GET / - should redirect to home page', async () => {
    const params = TestUtil.defaultHandleParams();

    params.request.method = 'GET';
    params.request.url = '/';

    await handler(...params.values());

    expect(params.response.end).toHaveBeenCalled();
    expect(params.response.writeHead).toBeCalledWith(302, {
      Location: location.home,
    });
  });

  test(`GET /home - should response with ${pages.homeHTML} file stream`, async () => {
    const params = TestUtil.defaultHandleParams();

    params.request.method = 'GET';
    params.request.url = '/home';

    const mockFileStream = TestUtil.generateReadableStream(['data']);

    //we use the jest.spyOn to monitoring when our test try to access some file or some function, with this we can create a mocked value to store a 'test' data to our test and dont depending of any file system
    //here we are monitoring the class Controller and the getFileStream method, when it is called we use the mockResolvedValue to mock a value an pass a stream mocked created above
    jest
      .spyOn(Controller.prototype, Controller.prototype.getFileStream.name)
      .mockResolvedValue({ stream: mockFileStream });

    //here we are monitoring when the method .pipe() will be called
    jest.spyOn(mockFileStream, 'pipe').mockReturnValue();

    //the params.values() will be return our request and response mocked methods
    await handler(...params.values());

    expect(mockFileStream.pipe).toHaveBeenCalledWith(params.response);
    expect(Controller.prototype.getFileStream).toBeCalledWith(pages.homeHTML);
  });

  test(`GET /controller - should response with ${pages.controllerHTML} file stream`, async () => {
    const params = TestUtil.defaultHandleParams();

    params.request.method = 'GET';
    params.request.url = '/controller';

    const mockFileStream = TestUtil.generateReadableStream(['data']);

    //for some reason just the first test that use the Controller.prototype.getFileStream.name works, so I need to past the name of function directly here to works
    jest
      .spyOn(Controller.prototype, 'getFileStream')
      .mockResolvedValue({ stream: mockFileStream });

    jest.spyOn(mockFileStream, 'pipe').mockReturnValue();

    await handler(...params.values());

    expect(mockFileStream.pipe).toHaveBeenCalledWith(params.response);
    expect(Controller.prototype.getFileStream).toBeCalledWith(
      pages.controllerHTML,
    );
  });

  test(`GET /index.html - should response with file stream`, async () => {
    const params = TestUtil.defaultHandleParams();

    const filename = '/index.html';
    params.request.method = 'GET';
    params.request.url = filename;

    const mockFileStream = TestUtil.generateReadableStream(['data']);
    const expectedType = '.html';
    jest
      .spyOn(Controller.prototype, 'getFileStream')
      .mockResolvedValue({ stream: mockFileStream, type: expectedType });

    //here we are monitoring when the method .pipe() will be called
    jest.spyOn(mockFileStream, 'pipe').mockReturnValue();

    //the params.values() will be return our request and response mocked methods
    await handler(...params.values());

    expect(mockFileStream.pipe).toHaveBeenCalledWith(params.response);
    expect(Controller.prototype.getFileStream).toBeCalledWith(filename);
    expect(params.response.writeHead).toHaveBeenCalledWith(200, {
      'Content-Type': CONTENT_TYPE[expectedType],
    });
  });

  test(`GET /file.ext - should response with file stream`, async () => {
    const params = TestUtil.defaultHandleParams();

    const filename = '/file.ext';
    params.request.method = 'GET';
    params.request.url = filename;

    const mockFileStream = TestUtil.generateReadableStream(['data']);
    const expectedType = '.ext';
    jest
      .spyOn(Controller.prototype, 'getFileStream')
      .mockResolvedValue({ stream: mockFileStream, type: expectedType });

    //here we are monitoring when the method .pipe() will be called
    jest.spyOn(mockFileStream, 'pipe').mockReturnValue();

    //the params.values() will be return our request and response mocked methods
    await handler(...params.values());

    expect(mockFileStream.pipe).toHaveBeenCalledWith(params.response);
    expect(Controller.prototype.getFileStream).toBeCalledWith(filename);
    expect(params.response.writeHead).not.toHaveBeenCalledWith(200, {
      'Content-Type': CONTENT_TYPE[expectedType],
    });
  });

  test(`POST /unknown - given an inexistent route it should response with 404`, async () => {
    const params = TestUtil.defaultHandleParams();

    params.request.method = 'POST';
    params.request.url = '/unknown';

    await handler(...params.values());

    expect(params.response.writeHead).toHaveBeenCalledWith(404);
    expect(params.response.end).toHaveBeenCalled();
  });

  describe('exceptions', () => {
    test('given inexistent file it should response with 404', async () => {
      const params = TestUtil.defaultHandleParams();

      params.request.method = 'GET';
      params.request.url = '/index.png';

      jest
        .spyOn(Controller.prototype, 'getFileStream')
        .mockRejectedValue(
          new Error('Error: ENOENT: no such file or directory'),
        );

      await handler(...params.values());

      expect(params.response.writeHead).toHaveBeenCalledWith(404);
      expect(params.response.end).toHaveBeenCalled();
    });

    test('give an error it should response with 500', async () => {
      const params = TestUtil.defaultHandleParams();

      params.request.method = 'GET';
      params.request.url = '/index.png';

      jest
        .spyOn(Controller.prototype, 'getFileStream')
        .mockRejectedValue(new Error('Error'));

      await handler(...params.values());

      expect(params.response.writeHead).toHaveBeenCalledWith(500);
      expect(params.response.end).toHaveBeenCalled();
    });
  });
});
