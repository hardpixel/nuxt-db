import { defineNuxtPlugin, useRuntimeConfig } from '#app'
import { useDB } from '../composables/useDB'

export default defineNuxtPlugin(async nuxtApp => {
  const config = useRuntimeConfig()
  const dbUrl  = config.db.dbUrl

  nuxtApp.fetchNuxtDB = async () => {
    return dbUrl ? await fetch(dbUrl).then(res => res.json()) : []
  }

  nuxtApp.provide('db', useDB)
})
