const path = require('path');
const fs = require('fs-extra-promise');
const md = require('minota-shared/md');
const moment = require('moment');
const uuid = require('uuid/v1');

// function getProtocol(url) {
//   return url.split('://')[0];
// }

function getPath(url) {
  const raw = url.split('://')[1];
  return raw.match(/^\/[a-zA-Z]:/) ? raw.slice(1) : raw;
}

class FileStorage {
  constructor({ url }) {
    if (!url) {
      throw new Error('FileStorage constructor: should be path to storage');
    }
    if (!url.match(/^file:\/\//)) {
      throw new Error('FileStorage constructor: not a file url');
    }
    this.url = new URL(url);
  }

  // get(params) {
  //   // Empty params -> get note
  //   if (!params || !Object.keys(params).length) {
  //     return this.getNote();
  //   }
  //
  //   // // Note by id
  //   // if (params.id) {
  //   //   return this.getNoteById(params.id);
  //   // }
  //
  //   const e = new Error('No proper params specified');
  //   e.status = 400;
  //   e.statusText = 'Bad request';
  //   return Promise.reject(e);
  // }

  // post(params) {
  //   // Validate
  //   const notes = params.notes.map((paramNote) => {
  //     const note = paramNote;
  //     if (!note.config.id || note.config.id === 'new') {
  //       note.config.id = uuid();
  //     }
  //     note.config.date = note.config.date || new Date().toISOString(); // date
  //     return note;
  //   });
  //
  //   // Save notes
  //   return Promise.all(notes.map(note => fs.outputFileAsync(
  //     `${this.path}/content/${note.config.id}`,
  //     md.stringify([note]),
  //   ))).then(() => fs.outputFileAsync(
  //     `${this.path}/last`,
  //     `${notes.slice(-1)[0].config.id}`,
  //   )).then(() => Promise.resolve(notes));
  // }

  // put(params) {
  //   const notes = [];
  //   return Promise.all(params.notes.map(update => this
  //     .getNoteById(update.config.id)
  //     .then((note) => {
  //       if (update.content) {
  //         /* eslint no-param-reassign: off */
  //         note.content = update.content;
  //       }
  //       // Save note back
  //       return fs.outputFileAsync(
  //         `${this.path}/content/${note.config.id}`,
  //         md.stringify([note]),
  //       ).then(() => {
  //         notes.push(note);
  //       });
  //     }))).then(() => notes);
  // }

  // delete(params) {
  //   if (params.id) {
  //     return fs
  //       .removeAsync(`${this.path}/content/${params.id}`)
  //       .then(() => `Note ${params.id} deleted`);
  //   }
  //   if (params.notes) {
  //     return Promise
  //       .all(params.notes.map(id => fs.removeAsync(`${this.path}/content/${id}`)))
  //       .then(() => `Notes ${params.notes.join('; ')} deleted`);
  //   }
  //   const error = new Error('No id and no notes');
  //   error.status = 400;
  //   error.statusText = 'Bad Request';
  //   return Promise.reject(error);
  // }

  //
  // Protected methods to actually work with stuff
  //

  get path() {
    return path.resolve(this.url.pathname);
  }

  // 1. Single Note Level

  getNote() {
    // get './note' from the path.
    // if it not exist, return an error
    return fs.readFileAsync(`${this.path}/note`, 'utf8')
      .then(content => md.parse(content)[0])
      .catch(error => {
        if (error.code === 'ENOENT') {
          return Promise.reject(Object.assign(new Error('Note not found'), {
            status: 404
          }));
        } else {
          return Promise.reject(error);
        }
      });
  }

  postNote(note) {
    // Simply return posted note back
    return fs.outputFileAsync(`${this.path}/note`, md.stringify(note))
      .then(() => Promise.resolve(note));
  }

  // 2. Multiple Notes Level

  getNotes() {
    return fs.readdirAsync(`${this.path}/notes/`)
      .then(filenameList => Promise
        .all(filenameList.map(filename => fs
          .readFileAsync(`${this.path}/notes/${filename}`, 'utf8')
          .then(content => md.parse(content)))))
      .then(nestedList => nestedList.reduce((notes, item) => notes.concat(item), []))
      .catch(error => {
        if (error.code === 'ENOENT' && error.syscall === 'scandir') {
          return Promise.resolve([])
        } else {
          return Promise.reject(error);
        }
      });
  }

  postNotes(notes) {
    return Promise.all(notes.map(note => fs.outputFileAsync(
      `${this.path}/notes/${note.config.id}`,
      md.stringify([note])
    ))).then(() => Promise.resolve(notes));
  }

  // getNoteById(id) {
  //   return fs
  //     .readFileAsync(`${this.path}/content/${id}`, 'utf-8')
  //     .then(content => md.parse(content)[0])
  //     .catch((error) => {
  //       if (error.code === 'ENOENT') {
  //         const e = new Error(`Note with id ${id} not found`);
  //         e.status = 404;
  //         e.statusText = 'Not Found';
  //         return Promise.reject(e);
  //       }
  //       return JSON.stringify(error.cause);
  //     });
  // }
}

module.exports = FileStorage;
