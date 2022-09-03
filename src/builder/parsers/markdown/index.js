import MarkdownIt from 'markdown-it'
import matter from 'gray-matter'

const cleanHTML = html => {
  return html.trim()
    .replace(/<!--\s?\w+\s?-->/g, '')
    .replace(/>(\n)+</g, '><')
}

export default class Markdown {
  constructor(options = {}) {
    this.options = options
  }

  async toJSON(file) {
    const markdown = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      ...this.options
    })

    const { data, content, ...meta } = matter(file, {
      excerpt: true,
      excerpt_separator: '<!--more-->'
    })

    const body    = cleanHTML(markdown.render(content || ''))
    const excerpt = cleanHTML(markdown.render(meta.excerpt || ''))

    return {
      excerpt,
      body,
      ...data
    }
  }
}
