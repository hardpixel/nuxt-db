import { defineNuxtPlugin } from '#app'
import { dbDirs } from '#build/nuxtdb-options'
import { useDB } from '#imports'

export default defineNuxtPlugin(async nuxtApp => {
  nuxtApp._nuxtDB = {
    dirs: dbDirs,
    fetchAt: null,
    async fetch() {
      try {
        const { data } = await import('#build/nuxtdb-database')

        if (!Array.isArray(data)) {
          throw new Error('Invalid database format')
        }

        this.fetchAt = Date.now()
        return data
      } catch (e) {
        this.fetchAt = null
        console.error(e)
        return []
      }
    }
  }

  nuxtApp.provide('db', useDB)
})
