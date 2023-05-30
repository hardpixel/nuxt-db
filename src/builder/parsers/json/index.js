import destr from 'destr'

export default class Json {
  constructor(options = {}) {
    this.options = Object(options)
  }

  toJSON(file) {
    return destr(file, { ...this.options, strict: true })
  }
}
