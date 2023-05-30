import csv from 'csvtojson'

export default class Csv {
  constructor(options = {}) {
    this.options = options
  }

  async toJSON (file) {
    const body = await csv({ ...this.options, output: 'json' }).fromString(file)

    return {
      body
    }
  }
}
