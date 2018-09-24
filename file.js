const fs = require('fs-extra-promise');
const md = require('minota-shared/md');
const moment = require('moment');
const uuid = require('uuid/v1');

class FileStorage {
  constructor({ path }) {
    if (!path) {
      throw new Error('FileStorage constructor: should be path to storage');
    }
    this.type = 'file';
    this.path = path;
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
    return Promise.reject(new Error('Storage.get: no params specified'));
  }

  post(params) {
    const notes = params.notes.map((paramNote) => {
      const note = paramNote;
      note.config.id = note.config.id || uuid();
      return note;
    });

    // Save notes
    notes.forEach((note) => {
      fs.outputFileAsync(
        `${this.path}/content/${note.config.id}`,
        md.stringify([note]),
      );
    });

    // Save pointer to last note
    fs.outputFileAsync(
      `${this.path}/last`,
      `${notes.slice(-1)[0].config.id}`,
    );

    return new Promise((resolve) => {
      resolve(notes);
    });
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
}

module.exports = FileStorage;
