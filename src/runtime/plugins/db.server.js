import { useStorage } from 'nitropack/runtime/storage'
import { defineNuxtPlugin } from '#app'
import { dbName, dbDirs } from '#build/nuxtdb-options'
import { useDB } from '#imports'

export default defineNuxtPlugin(async nuxtApp => {
  nuxtApp._nuxtDB = {
    dirs: dbDirs,
    fetchAt: null,
    async fetch() {
      this.fetchAt = Date.now()
      try {
        const storage = useStorage('assets:nuxt-db')
        return await storage.getItem(dbName)
      } catch (e) {
        console.error(e)
        return []
      }
    }
  }

  nuxtApp.provide('db', useDB)
})
