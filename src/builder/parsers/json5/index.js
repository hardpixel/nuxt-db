import JSON5 from 'json5'

export default class Json5 {
  constructor(options = {}) {
    this.options = Object(options)
  }

  toJSON(file) {
    return JSON5.parse(file, this.options.reviver)
  }
}
