import { defineNuxtPlugin, useRuntimeConfig } from '#app'
import { useDB } from '#imports'

export default defineNuxtPlugin(async nuxtApp => {
  const config = useRuntimeConfig()
  const dbUrl  = config.public.db.dbUrl

  nuxtApp.fetchNuxtDB = async () => {
    return dbUrl ? await fetch(dbUrl).then(res => res.json()) : []
  }

  nuxtApp.provide('db', useDB)
})
