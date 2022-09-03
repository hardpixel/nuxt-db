<template>
  <main>
    <header>
      <h1>Nuxt DB</h1>
      <client-only>
        <select @change="onChange">
          <option value="all">
            All models
          </option>
          <option
            v-for="item in models"
            :key="item"
            :value="item.toLowerCase()">
            {{ item }}
          </option>
        </select>
      </client-only>
    </header>
    <pre>{{ data }}</pre>
  </main>
</template>

<script>
export default defineNuxtComponent({
  async asyncData({ $db }) {
    const data = await $db()
      .fetch()

    return {
      data
    }
  },
  watch: {
    async model(value) {
      this.data = await this.$db(value)
        .fetch()
    }
  },
  data() {
    return {
      model: 'all',
      models: [
        'Authors',
        'Posts',
        'Products',
        'Categories'
      ]
    }
  },
  methods: {
    onChange({ target: { value } }) {
      this.model = value == 'all' ? null : value
    }
  }
})
</script>

<style>
body {
  font-family: "Source Sans Pro", Arial, serif;
}

main {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  max-width: 768px;
  margin: 0 auto;
  padding: 1rem;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

h1 {
  margin: 0;
  line-height: 1;
}

pre {
  background: #fafafa;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 5px;
  margin: 0;
  overflow-x: auto;
}
</style>
