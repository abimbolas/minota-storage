const FileStorage = require('./file');

const StorageTypes = {
  file: FileStorage,
};

const storage = {
  config(config) {
    return new StorageTypes[config.type](config[config.type]);
  },
};

module.exports = storage;
