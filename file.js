const path = require('path');
const fs = require('fs-extra-promise');
const md = require('minota-shared/md');
const moment = require('moment');
const uuid = require('uuid/v1');

class FileStorage {
  constructor({ url }) {
    if (!url) {
      throw new Error('FileStorage constructor: should be path to storage');
    }
    if (!url.match(/^file:\/\//)) {
      throw new Error('FileStorage constructor: not a file url');
    }
    this.protocol = url.split('://')[0];
    this.path = path.resolve(url.replace(':///', '://').split('://')[1]);
  }

  get(params) {
    if (params.last === true) {
      return this.getLast();
    }
    if (params.last === 'day') {
      return this.getLastDay();
    }
    if (params.notes === 'all') {
      return this.getAllNotes();
    }
    if (params.topics === 'all') {
      return this.getAllTopics();
    }
    if (params.searchBy === 'topic') {
      return this.searchNotesByTopic(params.topic);
    }
    if (params.id) {
      return this.searchNoteById(params.id);
    }
    return Promise.reject(new Error('Storage.get: no params specified'));
  }

  post(params) {
    // Validate
    const notes = params.notes.map((paramNote) => {
      const note = paramNote;
      if (!note.config.id || note.config.id === 'new') {
        note.config.id = uuid();
      }
      note.config.date = note.config.date || new Date().toISOString(); // date
      return note;
    });

    // Save notes
    return Promise.all(notes.map(note => fs.outputFileAsync(
      `${this.path}/content/${note.config.id}`,
      md.stringify([note]),
    ))).then(() => fs.outputFileAsync(
      `${this.path}/last`,
      `${notes.slice(-1)[0].config.id}`,
    )).then(() => Promise.resolve(notes));
  }

  put(params) {
    const notes = [];
    return Promise.all(params.notes.map(update => this
      .searchNoteById(update.config.id)
      .then((note) => {
        if (update.content) {
          /* eslint no-param-reassign: off */
          note.content = update.content;
        }
        // Save note back
        return fs.outputFileAsync(
          `${this.path}/content/${note.config.id}`,
          md.stringify([note]),
        ).then(() => {
          notes.push(note);
        });
      }))).then(() => notes);
  }

  delete(params) {
    if (params.id) {
      return fs
        .removeAsync(`${this.path}/content/${params.id}`)
        .then(() => `Note ${params.id} deleted`);
    }
    if (params.notes) {
      return Promise
        .all(params.notes.map(note => fs
          .removeAsync(`${this.path}/content/${note.config.id}`)))
        .then(() => `Note (s) ${params.notes.map(note => note.config.id).join('; ')} deleted`);
    }
    const error = new Error('No id and no notes');
    error.status = 400;
    error.statusText = 'Bad Request';
    return Promise.reject(error);
  }

  getLast() {
    return fs.readFileAsync(`${this.path}/last`, 'utf8')
      .then(id => fs.readFileAsync(`${this.path}/content/${id}`, 'utf8'))
      .then(raw => md.parse(raw));
  }

  getLastDay() {
    return this.getAllNotes().then((notes) => {
      const lastDay = moment(notes[notes.length - 1].config.date).format('l');
      return notes.filter(note => moment(note.config.date).format('l') === lastDay);
    });
  }

  getAllTopics() {
    /* eslint array-callback-return: off */
    return this.getAllNotes().then(notes => notes.reduce((topics, note) => {
      if (topics.indexOf(note.config.topic) === -1) {
        topics.push(note.config.topic);
      }
      return topics;
    }, []));
  }

  getAllNotes() {
    return fs.readdirAsync(`${this.path}/content/`)
      .then(filenameList => Promise
        .all(filenameList.map(filename => fs
          .readFileAsync(`${this.path}/content/${filename}`, 'utf8')
          .then(content => md.parse(content)))))
      .then(nestedList => nestedList.reduce((notes, item) => notes.concat(item), []));
  }

  searchNotesByTopic(topic) {
    return this.getAllNotes().then(
      notes => notes.filter(
        note => note.config.topic.toLowerCase().match(topic.toLowerCase()),
      ),
    );
  }

  searchNoteById(id) {
    return fs
      .readFileAsync(`${this.path}/content/${id}`, 'utf-8')
      .then(content => md.parse(content)[0])
      .catch((error) => {
        if (error.code === 'ENOENT') {
          const e = new Error(`Note with id ${id} not found`);
          e.status = 404;
          e.statusText = 'Not Found';
          return Promise.reject(e);
        }
        return JSON.stringify(error.cause);
      });
  }
}

module.exports = FileStorage;
