import { useRuntimeConfig, useNuxtApp } from '#app'

import PicoDB from 'picodb'
import Fuse from 'fuse.js/dist/fuse.esm'
import sortOn from 'sort-on'

export const useDB = (...args) => {
  const config  = useRuntimeConfig()
  const nuxtApp = useNuxtApp()

  const dbUrl  = config.db.dbUrl
  const dbDirs = config.db.dbDirs || []
  const query  = new Query()

  let options = {}
  const paths = []

  args.forEach(arg => {
    if (typeof arg === 'string') {
      paths.push(arg)
    } else if (typeof arg === 'object') {
      options = arg
    }
  })

  const path = `/${paths.join('/').replace(/\/+/g, '/')}`
  const many = dbDirs.some(dir => dir === path)

  if (paths.length) {
    if (many) {
      query.where({ dir: path })
    } else {
      query.where({ path })
    }
  }

  const doFetch = async config => {
    if (!nuxtApp.DB) {
      nuxtApp.DB = PicoDB()

      if (dbUrl) {
        const data = await fetch(dbUrl).then(res => res.json())
        await nuxtApp.DB.insertMany(data)
      }
    }

    return await query.resolve(nuxtApp.DB, {
      ...options,
      ...config,
      path
    })
  }

  query.fetchOne  = (raise = true) => doFetch({ find: true, raise })
  query.fetch     = () => doFetch({ find: !many, raise: true })
  query.fetchMany = () => doFetch({ find: false })

  return query
}

class Query {
  constructor() {
    this.query = {
      only: [],
      without: [],
      where: {},
      order: [],
      limit: null,
      skip: null,
      search: null,
      config: null
    }
  }

  only(keys) {
    this.query.only.push(...keys || [])
    return this
  }

  without(keys) {
    this.query.without.push(...keys || [])
    return this
  }

  where(query) {
    this.query.where = { ...this.query.where, ...query }
    return this
  }

  sortBy(key, dir = 'asc') {
    this.query.order.push(dir == 'desc' ? `-${key}` : key)
    return this
  }

  limit(n) {
    this.query.limit = n
    return this
  }

  skip(n) {
    this.query.skip = n
    return this
  }

  search(query, options) {
    const keys = ['slug', 'name', 'title']

    this.query.search = query
    this.query.config = { keys, ...options }

    return this
  }

  async resolve(db, options) {
    if (options.find) { this.limit(1) }

    const { where, order, limit, skip, search, only, without, config } = this.query

    let records = await db.find(where).toArray()

    if (search && records.length) {
      const fuse = new Fuse(records, config)
      const resp = fuse.search(search)

      records = resp.map(({ item, ...$meta }) => ({ ...item, $meta }))
    }

    if (order.length) {
      records = sortOn(records, order)
    }

    if (skip) {
      records = records.slice(skip)
    }

    if (limit) {
      records = records.slice(0, limit)
    }

    if (only.length || without.length) {
      const keep = only.length
        ? kn => only.includes(kn)
        : () => true

      const omit = without.length
        ? kn => without.includes(kn)
        : () => false

      records = records.map(
        item => Object.keys(item)
          .filter(key => keep(key) && !omit(key))
          .reduce((obj, key) => ({ ...obj, [key]: item[key] }), {})
      )
    }

    if (options.find) {
      records = records[0]
    }

    if (!records && options.raise) {
      throw new Error(`${options.path} not found`)
    }

    return records
  }
}
