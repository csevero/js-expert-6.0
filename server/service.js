import fsPromises from 'fs/promises';
import fs from 'fs';
import config from './config.js';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { PassThrough, Writable } from 'stream';
import Throttle from 'throttle';
import childProcess from 'child_process';
import { logger } from './util.js';
import streamsPromises from 'stream/promises';
import { once } from 'events';

const {
  dir: { publicDirectory },
  constants: { fallbackBitRate, englishConversation, bitRateDivisor },
} = config;

export class Service {
  constructor() {
    this.clientStreams = new Map();
    this.currentSong = englishConversation;
    this.currentBitRate = 0;
    this.throttleTransform = {};
    this.currentReadable = {};
  }

  createClientStream() {
    const id = randomUUID();
    const clientStream = new PassThrough();
    this.clientStreams.set(id, clientStream);

    return {
      id,
      clientStream,
    };
  }

  removeClientStream(id) {
    this.clientStreams.delete(id);
  }

  //function that start with _ are privates
  _executeSoxCommand(args) {
    //the childProcess lib will allow to run commands on our machine via nodejs
    return childProcess.spawn('sox', args);
  }

  async getBitRate(song) {
    try {
      const args = ['--i', '-B', song];

      //here we send args to execute command on machine
      const {
        stderr, //errors of command
        stdout, //log of command
        // stdin //send arguments by stream
      } = this._executeSoxCommand(args);

      //using the once to just run the map below when the stderr and stdout are be readable (VERY GOOD!)
      await Promise.all([once(stderr, 'readable'), once(stdout, 'readable')]);

      //map all possible results, that can be stdout(success) or stderr(error) and reading yours stream
      const [success, error] = [stdout, stderr].map(stream => stream.read());
      //if execution command not work we return a promise and reject it to be sent to our catch

      if (error) return await Promise.reject(error);

      //if execution command work we return our success converted to string, removing all possibles spaces with trim(), and replacing the 'k' by 000
      return success.toString().trim().replace(/k/, '000');
    } catch (error) {
      logger.error(`Deu ruim no bitrate: ${error}`);
      return fallbackBitRate;
    }
  }

  broadCast() {
    return new Writable({
      write: (chunk, enc, cb) => {
        for (const [id, stream] of this.clientStreams) {
          //if client disconnect of browser we don't want send more data for him
          if (stream.writableEnded) {
            this.clientStreams.delete(id);
            continue;
          }

          stream.write(chunk);
        }

        cb();
      },
    });
  }

  async startStreaming() {
    logger.info(`starting with ${this.currentSong}`);
    const bitRate = this.currentBitRate = (await this.getBitRate(this.currentSong)) / bitRateDivisor;

    //the throttle will be control the sound flow, the sequence and how it will showed to browser
    const throttleTransform = this.throttleTransform = new Throttle(bitRate);

    //here we are reading our file
    const songReadable = this.currentReadable = this.createFileStream(
      this.currentSong,
    );

    //here we are using the pipeline to show the audio to client, the first parameter is our song, the second parameter is the throttle that will be control the bit rate that is send to browser doesn't permitting send all data at once, and the third parameter is our broadcast that will show the audio to final client
    return streamsPromises.pipeline(songReadable, throttleTransform, this.broadCast());
  }

  stopStreaming() {
    //if a client doesn't have a active transmission the throttleTransform will be null, so we use first throttleTransform? to check if it is true and after we use end?.() to check if the end exists, if yes we run it, if no we just return
    this.throttleTransform?.end?.();
  }

  createFileStream(filename) {
    return fs.createReadStream(filename);
  }

  async getFileInfo(file) {
    // fullFilePath = home/index.js
    const fullFilePath = join(publicDirectory, file);

    // check if file exists
    await fsPromises.access(fullFilePath);

    // get the file extension
    const fileType = extname(fullFilePath);

    return {
      type: fileType,
      name: fullFilePath,
    };
  }

  async getFileStream(file) {
    const { name, type } = await this.getFileInfo(file);

    return {
      stream: this.createFileStream(name),
      type,
    };
  }
}
