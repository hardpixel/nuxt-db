import { defineNuxtPlugin } from '#app'
import { dbDirs } from '#build/nuxtdb-options'
import { useDB } from '#imports'

export default defineNuxtPlugin(async nuxtApp => {
  nuxtApp._nuxtDB = {
    dirs: dbDirs,
    fetchAt: null,
    async fetch() {
      this.fetchAt = Date.now()
      try {
        return await import('#build/nuxtdb-database').then(res => res.data)
      } catch (e) {
        console.error(e)
        return []
      }
    }
  }

  nuxtApp.provide('db', useDB)
})
