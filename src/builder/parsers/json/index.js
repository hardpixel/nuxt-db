export default class Json {
  constructor(options = {}) {
    this.options = Object(options)
  }

  toJSON(file) {
    return JSON.parse(file, this.options.reviver)
  }
}
