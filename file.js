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
    if (params.id) {
      return this.searchNotesById(params.id);
    }
    return Promise.reject(new Error('Storage.get: no params specified'));
  }

  post(params) {
    // Validate
    const notes = params.notes.map((paramNote) => {
      const note = paramNote;
      if (!note.config.id || note.config.id === 'new') {
        note.config.id = uuid()
      }
      note.config.date = note.config.date || new Date().toISOString(); // date
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

  delete(params) {
    if (params.id) {
      return fs.removeAsync(`${this.path}/content/${params.id}`)
        .then(() => {
          return `Note ${params.id} deleted`
        });
    } else if (params.notes) {
      return Promise.all(params.notes.map(note => {
        return fs.removeAsync(`${this.path}/content/${note.config.id}`);
      })).then(() => {
        return `Note (s) ${params.notes.map(note => note.config.id).join('; ')} deleted`;
      });
    }
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

  searchNotesById(id) {
    return fs.readFileAsync(`${this.path}/content/${id}`, 'utf-8')
      .then(content => md.parse(content));
  }
}

module.exports = FileStorage;
