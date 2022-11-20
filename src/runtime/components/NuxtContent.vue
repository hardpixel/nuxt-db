<template>
  <div v-html="document.body" />
</template>

<script>
export default {
  name: 'NuxtContent',
  props: {
    document: {
      type: Object,
      required: true
    }
  }
}
</script>
