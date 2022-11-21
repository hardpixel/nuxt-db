<template>
  <main>
    <header>
      <h1>Nuxt DB</h1>
      <div>
        <input
          placeholder="Search..."
          type="text"
          @input="onInput">
        <select @change="onChange">
          <option
            value=""
            selected>
            All models
          </option>
          <option
            v-for="item in models"
            :key="item"
            :value="item.toLowerCase()">
            {{ item }}
          </option>
        </select>
      </div>
    </header>
    <pre>{{ data }}</pre>
  </main>
</template>

<script>
export default defineNuxtComponent({
  async asyncData({ $db }) {
    const data = await $db().fetch()

    return {
      search: null,
      model: null,
      data
    }
  },
  watch: {
    async params() {
      this.data = await this.$db(this.model)
        .search(this.search)
        .fetch()
    }
  },
  data() {
    return {
      models: [
        'Authors',
        'Posts',
        'Products',
        'Categories'
      ]
    }
  },
  computed: {
    params() {
      return [this.model, this.search]
    }
  },
  methods: {
    onInput({ target: { value } }) {
      this.search = value == '' ? null : value
    },
    onChange({ target: { value } }) {
      this.model = value == '' ? null : value
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

input, select {
  margin-left: 1rem;
}
</style>
