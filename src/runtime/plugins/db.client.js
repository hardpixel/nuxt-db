import { defineNuxtPlugin } from '#app'
import { useDB } from '../composables/useDB'

export default defineNuxtPlugin(async nuxtApp => {
  nuxtApp.provide('db', useDB)
})
