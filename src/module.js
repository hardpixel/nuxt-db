import { fileURLToPath } from 'url'
import { resolve, join } from 'pathe'
import { joinURL } from 'ufo'
import { hash } from 'ohash'
import { defineNuxtModule, addPlugin, addComponent } from '@nuxt/kit'
import { Database } from './builder'

export default defineNuxtModule({
  meta: {
    name: 'nuxt-db',
    configKey: 'database',
    compatibility: {
      nuxt: '^3.0.0'
    }
  },
  defaults: {
    dir: 'database',
    markdown: {},
    yaml: {},
    csv: {},
    json: {},
    json5: {},
    xml: {},
    extendParser: {}
  },
  async setup(options, nuxt) {
    const runtimeDir = fileURLToPath(new URL('./runtime', import.meta.url))
    nuxt.options.build.transpile.push(runtimeDir, 'nuxt-db')

    nuxt.options.vite.optimizeDeps.include ||= []
    nuxt.options.vite.optimizeDeps.include.push('fuzzysort')

    const isDev    = nuxt.options.dev
    const srcDir   = nuxt.options.srcDir
    const pubPath  = nuxt.options.app.buildAssetsDir
    const baseURL  = nuxt.options.app.baseURL

    const dbFolder = join('.', pubPath, 'database')
    const buildDir = resolve(nuxt.options.buildDir, dbFolder)
    const pubDir   = resolve(nuxt.options.buildDir, 'dist', 'client', dbFolder)
    const database = new Database({ ...options, isDev, srcDir, buildDir })

    database.hook('file:beforeInsert', item => {
      nuxt.callHook('database:file:beforeInsert', item, database)
    })

    database.hook('file:beforeParse', file => {
      nuxt.callHook('database:file:beforeParse', file)
    })

    database.hook('file:updated', file => {
      nuxt.callHook('database:file:updated', file)
    })

    await database.init()

    const dbHash = hash(database.db)
    const dbName = `db-${dbHash}.json`
    const dbUrl  = joinURL(baseURL, dbFolder, dbName)
    const dbPath = resolve(pubDir, dbName)
    const dbDirs = database.dirs

    nuxt.options.runtimeConfig.db = { dbPath, dbDirs }
    nuxt.options.runtimeConfig.public.db = { dbUrl, dbDirs }

    addPlugin(resolve(runtimeDir, 'plugins', 'db.server'))
    addPlugin(resolve(runtimeDir, 'plugins', 'db.client'))

    addComponent({
      name: 'NuxtContent',
      filePath: resolve(runtimeDir, 'components', 'NuxtContent.vue')
    })

    nuxt.hook('imports:dirs', (dirs) => {
      dirs.push(resolve(runtimeDir, 'composables'))
    })

    nuxt.hook('database:file:updated', async () => {
      await database.save(pubDir, dbName)
    })

    nuxt.hook('build:done', async () => {
      await database.save(pubDir, dbName)
    })

    nuxt.hook('nitro:generate', async ctx => {
      const dbPath = join(ctx.output.publicDir, dbFolder, dbName)
      nuxt.options.runtimeConfig.db.dbPath = dbPath

      await database.save(pubDir, dbName)
    })

    nuxt.hook('close', async () => {
      await database.close()
    })
  }
})
