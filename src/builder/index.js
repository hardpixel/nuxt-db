import { join, extname } from 'path'

import gfs from 'graceful-fs'
import mkdirp from 'mkdirp'
import chokidar from 'chokidar'
import PicoDB from 'picodb'

import { useLogger } from '@nuxt/kit'
import { Hookable } from 'hookable'

import { Markdown, Yaml, Csv, Xml, Json, Json5 } from './parsers'

const fs = gfs.promises
const logger = useLogger('nuxt-db')

const EXTENSIONS = ['.md', '.json', '.json5', '.yaml', '.yml', '.csv', '.xml']

export class Database extends Hookable {
  constructor(options = {}) {
    super()

    this.db         = PicoDB()
    this.srcDir     = options.srcDir
    this.buildDir   = options.buildDir
    this.dir        = join(options.srcDir, options.dir)
    this.name       = `${options.dir}.json`

    this.markdown   = new Markdown(options.markdown)
    this.yaml       = new Yaml(options.yaml)
    this.csv        = new Csv(options.csv)
    this.xml        = new Xml(options.xml)
    this.json       = new Json(options.json)
    this.json5      = new Json5(options.json5)

    this.parsers    = options.extendParser || {}
    this.extensions = EXTENSIONS.concat(Object.keys(this.parsers))
    this.options    = options

    if (options.isDev) {
      this.watch()
    }
  }

  async init() {
    const startTime = process.hrtime()

    this.db   = PicoDB()
    this.dirs = ['/']

    await this.walk(this.dir)

    const [s, ns] = process.hrtime(startTime)

    const count = await this.db.count({})
    const timer = Math.round(ns / 1e8)

    logger.info(`Parsed ${count} files in ${s}.${timer} seconds`)
  }

  async save(dir, filename) {
    dir = dir || this.buildDir
    filename = filename || this.name

    const path = join(dir, filename)
    const data = await this.db.find({}).toArray()
    const json = JSON.stringify(data)

    await mkdirp(dir)
    await fs.writeFile(path, json, 'utf-8')
  }

  async walk(dir) {
    let files = []

    try {
      files = await fs.readdir(dir)
    } catch (e) {
      logger.warn(`DB: ${dir} does not exist!`)
    }

    await Promise.all(files.map(async file => {
      const path = join(dir, file)
      const stat = await fs.stat(path)

      if (file.includes('node_modules') || (/(^|\/)\.[^/.]/g).test(file)) {
        return
      }

      if (stat.isDirectory()) {
        this.dirs.push(this.normalizePath(path))
        return this.walk(path)
      } else if (stat.isFile()) {
        return this.insertFile(path)
      }
    }))
  }

  async insertFile(path) {
    const items = await this.parseFile(path)

    if (items.length > 1) {
      this.dirs.push(this.normalizePath(path))
    }

    for (const item of items) {
      await this.callHook('file:beforeInsert', item)
      await this.db.insertOne(item)
    }
  }

  async updateFile(path) {
    const items = await this.parseFile(path)

    if (items.length > 1) {
      const first = items[0]
      const saved = await this.db.find({ dir: first.dir }).toArray()

      for (const entry of saved) {
        if (!items.some(item => item.path == entry.path)) {
          await this.db.deleteOne({ path: entry.path })
        }
      }
    }

    for (const item of items) {
      await this.callHook('file:beforeInsert', item)

      const query = { path: item.path }
      const exist = await this.db.count(query)

      if (exist) {
        await this.db.updateOne(query, item)
      } else {
        await this.db.insertOne(item)
      }
    }

    logger.info(`Updated ${path.replace(this.srcDir, '.')}`)
  }

  async removeFile(path) {
    const npath = await this.normalizePath(path)
    const exist = await this.db.count({ path: npath })

    if (exist) {
      await this.db.deleteOne({ path: npath })
    } else {
      await this.db.deleteMany({ dir: npath })
    }

    logger.info(`Removed ${path.replace(this.srcDir, '.')}`)
  }

  async parseFile(path) {
    const extension = extname(path)

    if (!this.extensions.includes(extension)) {
      return []
    }

    const stat = await fs.stat(path)
    const file = {
      path,
      extension,
      data: await fs.readFile(path, 'utf-8')
    }

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

    let value = []

    try {
      value = await parser(file.data, { path: file.path })
      value = Array.isArray(value) ? value : [value]
    } catch (err) {
      logger.warn(`Could not parse ${path.replace(this.srcDir, '.')}:`, err.message)
      return []
    }

    const normalizedPath = this.normalizePath(path)
    const isValidDate = date => date instanceof Date && !isNaN(date)

    return value.map(item => {
      const paths = normalizedPath.split('/')

      if (value.length > 1 && item.slug) {
        paths.push(item.slug)
      }

      const dir  = paths.slice(0, paths.length - 1).join('/') || '/'
      const slug = paths[paths.length - 1]
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
    })
  }

  normalizePath(path) {
    let extractPath = path.replace(this.dir, '')
    const extension = extname(extractPath)

    if (this.extensions.includes(extension) || extractPath.startsWith('.')) {
      extractPath = extractPath.replace(/(?:\.([^.]+))?$/, '')
    }

    return extractPath.replace(/\\/g, '/')
  }

  watch() {
    this.watcher = chokidar.watch('**/*', {
      cwd: this.dir,
      ignoreInitial: true,
      ignored: 'node_modules/**/*'
    })
    .on('add', path => this.refresh('add', path))
    .on('change', path => this.refresh('change', path))
    .on('unlink', path => this.refresh('unlink', path))
  }

  async refresh(event, path) {
    const file = join(this.dir, path)

    switch (event) {
      case 'add':
        await this.insertFile(file)
        break
      case 'change':
        await this.updateFile(file)
        break
      case 'unlink':
        await this.removeFile(file)
        break
    }

    this.callHook('file:updated', { event, path })
  }

  async close() {
    this.db = null

    if (this.watcher) {
      await this.watcher.close()
      this.watcher = null
    }
  }
}
