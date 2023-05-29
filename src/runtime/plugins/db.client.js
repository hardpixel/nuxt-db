import { defineNuxtPlugin, useRuntimeConfig } from '#app'
import { dbDirs } from '#build/nuxtdb-options'
import { useDB } from '#imports'

export default defineNuxtPlugin(async nuxtApp => {
  const config = useRuntimeConfig()
  const dbUrl  = config.public.db.dbUrl

  nuxtApp._nuxtDB = {
    dirs: dbDirs,
    fetchAt: null,
    async fetch() {
      this.fetchAt = Date.now()
      return dbUrl ? await fetch(dbUrl).then(res => res.json()) : []
    }
  }

  nuxtApp.provide('db', useDB)
})
