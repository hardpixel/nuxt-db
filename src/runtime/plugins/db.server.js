import { readFile } from 'fs/promises'
import { defineNuxtPlugin, useRuntimeConfig } from '#app'
import { useDB } from '#imports'

export default defineNuxtPlugin(async nuxtApp => {
  const config = useRuntimeConfig()
  const dbPath = config.db.dbPath

  nuxtApp.fetchNuxtDB = async () => {
    return dbPath ? JSON.parse(await readFile(dbPath, 'utf8')) : []
  }

  nuxtApp.provide('db', useDB)
})
