# Nuxt DB

Nuxt database module acting as Git-based Headless CMS.

[![Build](https://github.com/hardpixel/nuxt-db/actions/workflows/build.yml/badge.svg?branch=master)](https://github.com/hardpixel/nuxt-db/actions/workflows/build.yml)

## Installation

1. Add the `nuxt-db` dependency with `yarn` or `npm` to your project
2. Add `nuxt-db` to the `modules` section of `nuxt.config.js`
3. Configure it:

```js
{
  modules: [
    // Simple usage
    'nuxt-db',

    // With options
    ['nuxt-db', { dir: 'content' }]
  ]
}
```

or add top level options

```js
{
  database: {
    dir: 'content'
  }
}
```

## Development

1. Clone this repository
2. Install dependencies using `yarn install` or `npm install`
3. Start development server using `npm run dev`

## Contributing

Bug reports and pull requests are welcome on GitHub at https://github.com/hardpixel/nuxt-db.

## License

The gem is available as open source under the terms of the [MIT License](https://opensource.org/licenses/MIT).
