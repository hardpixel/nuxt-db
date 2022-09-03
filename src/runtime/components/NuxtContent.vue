<template>
  <component
    :is="tag"
    v-html="document.body" />
</template>

<script>
export default {
  name: 'NuxtContent',
  props: {
    document: {
      type: Object,
      required: true
    },
    tag: {
      type: String,
      default: 'div'
    }
  }
}
</script>
