import xml from 'xml2js'

export default class Xml {
  constructor(options = {}) {
    this.options = options
  }

  async toJSON(file) {
    const body = await xml.parseStringPromise(file, this.options)

    return {
      body
    }
  }
}
