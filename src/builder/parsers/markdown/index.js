import MarkdownIt from 'markdown-it'
import matter from 'gray-matter'
import { DOMParser } from '@xmldom/xmldom'

import YAML from 'js-yaml'
import htmlTags from 'html-tags'
import voidHtmlTags from 'html-tags/void.js'

const isHtmlTag = tag => htmlTags.includes(tag) || voidHtmlTags.includes(tag)

const htmlToText = html => {
  const dom = new DOMParser()
  const doc = dom.parseFromString(`<!DOCTYPE html><html><body>${html}</body></html>`, 'text/html')

  return nodeToText(doc.documentElement)
}

const nodeToText = (node) => {
  if (node.nodeType === 3 || node.nodeType === 4) {
    return node.nodeValue
  }

  let result = ''

  if (node.childNodes && node.childNodes.length > 0) {
    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i]
      result += nodeToText(child)
    }
  }

  return result
}

const htmlToVnode = html => {
  const dom = new DOMParser()
  const doc = dom.parseFromString(`<!DOCTYPE html><html><body>${html}</body></html>`, 'text/html')

  const env = { tags: [] }
  const arr = nodeToVnode(doc.documentElement, env)

  if (env.tags.every(isHtmlTag)) {
    return html
  } else {
    return arr
  }
}

const nodeToVnode = (node, env) => {
  if (node.nodeType === 3 || node.nodeType === 4) {
    return node.nodeValue
  }

  const children = []

  if (node.childNodes && node.childNodes.length > 0) {
    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i]
      children.push(nodeToVnode(child, env))
    }
  }

  if (node.nodeName == 'html') return children[0]
  if (node.nodeName == 'body') return children

  const attributes = {}

  if (node.attributes && node.attributes.length > 0) {
    for (let i = 0; i < node.attributes.length; i++) {
      const attribute = node.attributes[i]

      try {
        attributes[attribute.name] = YAML.load(attribute.value)
      } catch (e) {
        attributes[attribute.name] = attribute.value
      }
    }
  }

  const result = [node.nodeName]

  if (Object.keys(attributes).length) {
    result.push(attributes)
  }

  if (children.length) {
    if (children.length == 1 && typeof children[0] == 'string') {
      result.push(children[0])
    } else {
      result.push(children)
    }
  }

  if (!env.tags.includes(node.nodeName)) {
    env.tags.push(node.nodeName)
  }

  return result
}

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

    const excerptHTML = cleanHTML(markdown.render(meta.excerpt || ''))
    const contentHTML = cleanHTML(markdown.render(content || ''))

    return {
      description: htmlToText(excerptHTML),
      excerpt: htmlToVnode(excerptHTML),
      body: htmlToVnode(contentHTML),
      ...data
    }
  }
}
