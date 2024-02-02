<script>
import { h, resolveDynamicComponent } from 'vue'
import { NuxtLink } from '#components'

const isArr  = Array.isArray
const isObj  = item => typeof item == 'object'
const isPobj = item => isObj(item) && !isArr(item)

const toNode = ctx => node => isArr(node) ? toComp(node, ctx) : node
const toArgs = ctx => item => isArr(item) ? item.map(toNode(ctx)) : item
const toSlot = ctx => item => isPobj(item) ? toProp(item, ctx) : (() => item)

const toComp = ([tag, ...attrs], ctx) => {
  const comp = /nuxt-?link/i.test(tag) ? NuxtLink : resolveDynamicComponent(tag)
  const args = isObj(comp) ? attrs.map(toArgs(ctx)).map(toSlot(ctx)) : attrs.map(toArgs(ctx))

  return h(comp, ...args)
}

const getVal = (obj, path) => path.split('.')
  .reduce((o, i) => Object(o)[i], obj)

const toProp = (value, ctx) => {
  if (isPobj(value)) {
    return Object.keys(value).reduce((obj, key) => {
      obj[key] = toProp(value[key], ctx)
      return obj
    }, {})
  }

  if (typeof value == 'string') {
    if (value == '$doc' || value.startsWith('$doc.')) {
      return getVal({ $doc: ctx.document }, value)
    }

    if (value == '$ctx' || value.startsWith('$ctx.')) {
      return getVal({ $ctx: ctx.context }, value)
    }
  }

  return value
}

export default {
  name: 'NuxtContent',
  props: {
    tag: {
      type: String,
      default: 'div'
    },
    context: {
      type: Object,
      default: () => ({})
    },
    document: {
      type: Object,
      required: true
    }
  },
  render() {
    const body = this.document.body

    if (isArr(body)) {
      return h(this.tag, body.map(toNode(this)))
    } else {
      return h(this.tag, { innerHTML: body })
    }
  }
}
</script>
