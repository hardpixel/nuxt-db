import { defineNuxtPlugin, useRuntimeConfig } from '#app'
import { useDB } from '../composables/useDB'

import fs from 'fs'
import PicoDB from 'picodb'

export default defineNuxtPlugin(async nuxtApp => {
  const config = useRuntimeConfig()
  const dbPath = config.db.dbPath

  if (!nuxtApp.DB) {
    nuxtApp.DB = PicoDB()

    if (dbPath) {
      const data = fs.readFileSync(dbPath, 'utf8')
      await nuxtApp.DB.insertMany(JSON.parse(data))
    }
  }

  nuxtApp.provide('db', useDB)
})
