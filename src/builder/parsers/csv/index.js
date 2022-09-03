import csv from 'csvtojson'

export default class Csv {
  constructor(options = {}) {
    this.options = options
  }

  async toJSON (file) {
    const body = await csv({ output: 'json', ...this.options }).fromString(file)

    return {
      body
    }
  }
}
