const FileStorage = require('./file');

const Storage = {
  file: FileStorage,
};

const storage = {
  config(config) {
    const protocol = config.url.split('://')[0];
    return new Storage[protocol](config);
  },
};

module.exports = storage;
