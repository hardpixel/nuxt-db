import { readFile } from 'fs/promises'
import { defineNuxtPlugin, useRuntimeConfig } from '#app'
import { dbDirs } from '#build/nuxtdb-options'
import { useDB } from '#imports'

export default defineNuxtPlugin(async nuxtApp => {
  const config = useRuntimeConfig()
  const dbPath = config.db.dbPath

  nuxtApp._nuxtDB = {
    dirs: dbDirs,
    fetchAt: null,
    async fetch() {
      this.fetchAt = Date.now()
      try {
        return JSON.parse(await readFile(dbPath, 'utf8'))
      } catch (e) {
        console.error(e)
        return []
      }
    }
  }

  nuxtApp.provide('db', useDB)
})
