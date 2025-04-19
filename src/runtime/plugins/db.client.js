import { defineNuxtPlugin } from '#app'
import { dbUrl, dbDirs } from '#build/nuxtdb-options'
import { useDB } from '#imports'

export default defineNuxtPlugin(async nuxtApp => {
  nuxtApp._nuxtDB = {
    dirs: dbDirs,
    fetchAt: null,
    async fetch() {
      this.fetchAt = Date.now()
      try {
        return await fetch(dbUrl).then(res => res.json())
      } catch (e) {
        console.error(e)
        return []
      }
    }
  }

  nuxtApp.provide('db', useDB)
})
