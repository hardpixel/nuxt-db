import { useNuxtApp } from '#app'

import fuzzysort from 'fuzzysort'
import sortOn from 'sort-on'

let database = null

export const useDB = (...args) => {
  const nuxtApp = useNuxtApp()
  const nuxtDB  = nuxtApp['_nuxtDB']

  let options = {}

  const query = new Query()
  const paths = []

  args.forEach(arg => {
    if (typeof arg === 'string') {
      paths.push(arg)
    } else if (typeof arg === 'object') {
      options = arg
    }
  })

  const path = `/${paths.join('/')}`.replace(/\/+/g, '/')
  const many = nuxtDB.dirs.some(dir => dir === path)

  if (paths.length) {
    if (many) {
      query.where({ dir: path })
    } else {
      query.where({ path })
    }
  }

  const doFetch = async config => {
    if (!database || !nuxtDB.fetchAt) {
      database = await nuxtDB.fetch()
    }

    return await query.resolve(database, {
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

  async resolve(data, options) {
    if (options.find) { this.limit(1) }

    const { where, order, limit, skip, search, only, without, config } = this.query

    let records = data.filter(compile(where))

    if (search && records.length) {
      records = fuzzysort.go(search, records, config).map(res => res.obj)
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

const type = e => Object.prototype.toString.call(e).replace(/^\[object\s(.*)\]$/, '$1')
const keys = Object.keys

const isArray = Array.isArray
const isString = v => typeof v === 'string'
const isFunction = v => typeof v === 'function'
const isObject = v => type(v) === 'Object'

const equals = (x, e) => {
  if (e === x) return true

  if (isArray(e) && isArray(x)) {
    const length = e.length

    if (length !== x.length) return false

    for (let i = 0; i < length; i++) {
      if (!equals(x[i], e[i])) return false
    }

    return true
  }

  if (isObject(e) && isObject(x)) {
    const obkeys = keys(e)
    const length = obkeys.length

    if (length !== keys(x).length) return false

    for (let i = 0; i < length; i++) {
      if (!equals(x[obkeys[i]], e[obkeys[i]])) return false
    }

    return true
  }

  return e !== e && x !== x
}

const operations = {
  $eq:         (f, v) => equals(v, f),
  $ne:         (f, v) => !equals(v, f),
  $gt:         (f, v) => v > f,
  $gte:        (f, v) => v >= f,
  $lt:         (f, v) => v < f,
  $lte:        (f, v) => v <= f,
  $between:    (f, v) => v >= f[0] && v <= f[1],
  $regex:      (f, v) => isString(v) && v.test(f),
  $in:         (f, v) => f.includes(v),
  $nin:        (f, v) => !f.includes(v),
  $not:        (f, v) => !compile(f)(v),
  $and:        (f, v) => f.every(c => compile(c)(v)),
  $or:         (f, v) => f.some(c => compile(c)(v)),
  $exists:     (f, v) => f ? v !== undefined : v === undefined,
  $size:       (f, v) => (isArray(v) || isString(v)) && v.length === f,
  $all:        (f, v) => isArray(v) && f.every(i => v.includes(i)),
  $elemMatch:  (f, v) => isArray(v) && v.some(compile(f)),
  $startsWith: (f, v) => isString(v) && v.startsWith(f),
  $endsWith:   (f, v) => isString(v) && v.endsWith(f)
}

const compile = (filter, ctx) => {
  if (ctx && operations[ctx]) {
    return value => operations[ctx](filter, value)
  }

  if (isFunction(filter)) {
    return value => filter(value)
  }

  if (isObject(filter)) {
    const compiled = keys(filter).reduce((result, prop) => {
      result[prop] = compile(filter[prop], prop)
      return result
    }, {})

    return value => keys(compiled).every(prop => {
      if (!prop.startsWith('$') && value === undefined) {
        return false
      }
      return compiled[prop](prop.startsWith('$') ? value : value[prop])
    })
  }

  return value => equals(value, filter)
}
