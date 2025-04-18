import { fileURLToPath } from 'url'
import { resolve, join } from 'pathe'
import { joinURL } from 'ufo'
import { defineNuxtModule, extendViteConfig, updateTemplates } from '@nuxt/kit'
import { addPlugin, addImports, addComponent, addTemplate } from '@nuxt/kit'
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

    extendViteConfig(config => {
      config.optimizeDeps.include ||= []
      config.optimizeDeps.include.push('fuzzysort')
    })

    const isDev    = nuxt.options.dev
    const srcDir   = nuxt.options.srcDir
    const baseURL  = nuxt.options.app.baseURL

    const dbFolder = join('.', '_database')
    const baseDir  = resolve(nuxt.options.buildDir, 'nuxt-db')
    const buildDir = resolve(baseDir, dbFolder)
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

    const dbHash = isDev ? 'content' : await database.toHash()
    const dbName = `db-${dbHash}.json`
    const dbUrl  = joinURL(baseURL, dbFolder, dbName)
    const dbPath = resolve(baseDir, dbFolder, dbName)

    nuxt.options.runtimeConfig.db = { dbPath }
    nuxt.options.runtimeConfig.public.db = { dbUrl }

    addPlugin(resolve(runtimeDir, 'plugins', 'db.server'))
    addPlugin(resolve(runtimeDir, 'plugins', 'db.client'))

    addComponent({
      name: 'NuxtContent',
      filePath: resolve(runtimeDir, 'components', 'NuxtContent.vue')
    })

    addImports({
      name: 'useDB',
      from: resolve(runtimeDir, 'composables', 'useDB')
    })

    addTemplate({
      filename: 'nuxtdb-options.mjs',
      write: true,
      getContents() {
        return `export const dbDirs = ${JSON.stringify(database.dirs)}`
      }
    })

    nuxt.hook('database:file:updated', async () => {
      await database.save(buildDir, dbName)
      await updateTemplates({ filter: temp => /^nuxtdb-/.test(temp.filename) })
    })

    nuxt.hook('build:done', async () => {
      await database.save(buildDir, dbName)
    })

    nuxt.hook('nitro:config', async nitroConfig => {
      nitroConfig.publicAssets ||= []
      nitroConfig.publicAssets.push({ dir: baseDir })
    })

    nuxt.hook('nitro:build:before', async ctx => {
      const dbPath = join(dbFolder, dbName)
      nuxt.options.runtimeConfig.db.dbPath = dbPath
    })

    nuxt.hook('close', async () => {
      await database.close()
    })
  }
})
