import yaml from 'js-yaml'

export default class Yaml {
  constructor(options = {}) {
    this.options = options
  }

  toJSON(file) {
    return yaml.load(file, { ...this.options, json: true })
  }
}
