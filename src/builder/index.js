import { join, extname } from 'pathe'
import { hash } from 'ohash'
import { promises as fs } from 'fs'

import fsDriver from 'unstorage/drivers/fs'
import PicoDB from 'picodb'

import { useLogger } from '@nuxt/kit'
import { Hookable } from 'hookable'

import { Markdown, Yaml, Csv, Xml, Json, Json5 } from './parsers'

const logger = useLogger('nuxt-db')

const isArray = Array.isArray
const toArray = val => isArray(val) ? val : (val ? [val] : [])

const EXTENSIONS = ['.md', '.json', '.json5', '.yaml', '.yml', '.csv', '.xml']

export class Database extends Hookable {
  constructor(options = {}) {
    super()

    this.db         = PicoDB()
    this.dirs       = ['/']
    this.srcDir     = options.srcDir
    this.buildDir   = options.buildDir
    this.dir        = join(options.srcDir, options.dir)
    this.name       = `${options.dir}.json`
    this.storage    = fsDriver({ base: this.dir, ignore: 'node_modules/**/*' })

    this.markdown   = new Markdown(options.markdown)
    this.yaml       = new Yaml(options.yaml)
    this.csv        = new Csv(options.csv)
    this.xml        = new Xml(options.xml)
    this.json       = new Json(options.json)
    this.json5      = new Json5(options.json5)

    this.omitKeys   = ['_id']
    this.parsers    = options.extendParser || {}
    this.extensions = EXTENSIONS.concat(Object.keys(this.parsers))
    this.options    = options

    if (options.isDev) {
      this.watch()
    }
  }

  async toJSON() {
    const omit = (key, val) => this.omitKeys.includes(key) ? undefined : val
    const data = await this.db.find({}).toArray()

    return JSON.stringify(data, omit)
  }

  async toHash() {
    const keys = ['createdAt', 'updatedAt', ...this.omitKeys]
    const omit = (key, val) => keys.includes(key) ? undefined : val

    const sort = (a, b) => a.path.localeCompare(b.path)
    const data = (await this.db.find({}).toArray()).sort(sort)

    return hash(JSON.stringify(data, omit))
  }

  async init() {
    const startTime = process.hrtime()

    this.db = PicoDB()

    const keys = await this.storage.getKeys()

    await Promise.all(keys.map(async key => {
      await this.insertFile(key)
    }))

    const [s, ns] = process.hrtime(startTime)

    const count = keys.length
    const timer = Math.round(ns / 1e8)

    await this.updateDirs()

    logger.info(`Parsed ${count} files in ${s}.${timer} seconds`)
  }

  async save(dir, filename) {
    dir = dir || this.buildDir
    filename = filename || this.name

    const path = join(dir, filename)
    const json = await this.toJSON()

    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path, json, 'utf-8')
  }

  async insertFile(path) {
    const items = await this.parseFile(path)

    for (const item of toArray(items)) {
      await this.callHook('file:beforeInsert', item)
      await this.db.insertOne(item)
    }
  }

  async updateFile(path) {
    const npath = this.normalizePath(path)
    const items = await this.parseFile(path)

    await this.db.deleteOne({ path: npath })

    if (isArray(items)) {
      await this.db.deleteMany({ dir: npath })
    }

    for (const item of toArray(items)) {
      await this.callHook('file:beforeInsert', item)
      await this.db.insertOne(item)
    }

    await this.updateDirs()

    logger.info(`Updated ${path}`)
  }

  async removeFile(path) {
    const npath = await this.normalizePath(path)
    const exist = await this.db.count({ path: npath })

    if (exist) {
      await this.db.deleteOne({ path: npath })
    } else {
      await this.db.deleteMany({ dir: npath })
    }

    await this.updateDirs()

    logger.info(`Removed ${path}`)
  }

  async parseFile(path) {
    const extension = extname(path)

    if (!this.extensions.includes(extension)) {
      return null
    }

    const data = await this.storage.getItem(path)
    const stat = await fs.stat(join(this.dir, path))
    const file = { path, extension, data }

    await this.callHook('file:beforeParse', file)

    const parser = ({
      '.json':  val => this.json.toJSON(val),
      '.json5': val => this.json5.toJSON(val),
      '.md':    val => this.markdown.toJSON(val),
      '.csv':   val => this.csv.toJSON(val),
      '.yaml':  val => this.yaml.toJSON(val),
      '.yml':   val => this.yaml.toJSON(val),
      '.xml':   val => this.xml.toJSON(val),
      ...this.parsers
    })[extension]

    let value = null

    try {
      value = await parser(file.data, { path: file.path })
    } catch (err) {
      logger.warn(`Could not parse ${path}:`, err.message)
      return null
    }

    if (!value || value == '') {
      return null
    }

    const normalizedPath = this.normalizePath(path)
    const isValidDate = date => date instanceof Date && !isNaN(date)

    const parseValue = (item, index) => {
      const paths = normalizedPath.split('/')

      if (index != null) {
        paths.push(item.slug || index + 1)
      }

      const last = paths.length - 1
      const dir  = paths.slice(0, last).join('/') || '/'
      const slug = paths[last]
      const path = paths.join('/')

      const createdTs = item.createdAt && new Date(item.createdAt)
      const createdAt = isValidDate(createdTs) ? createdTs : stat.birthtime

      const updatedTs = item.updatedAt && new Date(item.updatedAt)
      const updatedAt = isValidDate(updatedTs) ? updatedTs : stat.mtime

      return {
        slug,
        ...item,
        dir,
        path,
        extension,
        createdAt,
        updatedAt
      }
    }

    if (isArray(value)) {
      return value.map(parseValue)
    } else {
      return parseValue(value)
    }
  }

  async updateDirs() {
    const all = await this.db.find({}).toArray()
    this.dirs = ['/', ...(new Set(all.map(item => item.dir)))]
  }

  normalizePath(path) {
    let extractPath = path.replace(this.dir, '')
    const extension = extname(extractPath)

    if (this.extensions.includes(extension) || extractPath.startsWith('.')) {
      extractPath = extractPath.replace(/(?:\.([^.]+))?$/, '')
    }

    if (!extractPath.startsWith('/')) {
      extractPath = '/' + extractPath
    }

    return extractPath.replace(/\\/g, '/')
  }

  watch() {
    this.storage.watch(async (event, key) => {
      const path = join(this.dir, key)

      if (event == 'remove') {
        await this.removeFile(key)
      } else {
        await this.updateFile(key)
      }

      this.callHook('file:updated', { event, path })
    })
  }

  async close() {
    this.db = null
    await this.storage.dispose()
  }
}
