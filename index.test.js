const fs = require('fs-extra-promise');
const { assert } = require('chai');
const storage = require('./index');

describe('Storage', () => {
  it('should exist', () => {
    assert.isOk(storage);
  });

  it('should return appropriate storage if specified config', () => {
    const config = {
      type: 'file',
      file: {
        path: 'my-path'
      }
    };
    const customStorage = storage.config(config);
    assert.equal(customStorage.type, 'file');
  });

  describe('File', () => {
    afterEach(() => {
      fs.removeSync('test-path/content');
      fs.outputFileSync('test-path/content/initial');
    });

    it('should throw error without path', () => {
      const config = {
        type: 'file',
        file: {
          path: ''
        }
      };
      try {
        const customStorage = storage.config(config);
      } catch (error) {
        assert.isOk(error);
      }
    });

    it('should show "Not Found" error', (done) => {
      const config = {
        type: 'file',
        file: {
          path: 'test-path'
        }
      };
      fs.removeSync('test-path/content/123')
      storage
        .config(config)
        .searchNoteById('123')
        .catch((error) => {
          assert.equal(error.status, 404);
          assert.equal(error.statusText, 'Not Found');
          done();
        });
    });

    it('should put(update) notes', (done) => {
      const config = {
        type: 'file',
        file: {
          path: 'test-path'
        }
      };
      const note = {
        config: {id: '123'},
        content: 'My content'
      };
      const update = {
        config: {id: '123'},
        content: 'Updated content'
      }
      const fileStorage = storage.config(config);
      fileStorage
        .post({ notes: [note] })
        .then((result) => {
          assert.equal(result[0].content, note.content);
          return fileStorage.put({ notes: [update]})
        })
        .then((result) => {
          assert.equal(result[0].content, update.content);
          done();
        });
    });
  });

});
