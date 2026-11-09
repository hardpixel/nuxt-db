import { defineNuxtPlugin } from '#app'
import { dbUrl, dbDirs } from '#build/nuxtdb-options'
import { useDB } from '#imports'

export default defineNuxtPlugin(async nuxtApp => {
  nuxtApp._nuxtDB = {
    dirs: dbDirs,
    fetchAt: null,
    async fetch() {
      try {
        const res = await fetch(dbUrl)

        if (!res.ok) {
          throw new Error(`Failed to fetch database: ${res.status} ${dbUrl}`)
        }

        const data = await res.json()

        if (!Array.isArray(data)) {
          throw new Error(`Invalid database format: ${dbUrl}`)
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
