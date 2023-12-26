<script>
import { h, resolveDynamicComponent } from 'vue'
import { NuxtLink } from '#components'

const isArr  = Array.isArray
const isObj  = item => typeof item == 'object'
const isPobj = item => isObj(item) && !isArr(item)

const toNode = node => isArr(node) ? toComp(node) : node
const toArgs = item => isArr(item) ? item.map(toNode) : item
const toSlot = item => isPobj(item) ? item : (() => item)

const toComp = ([tag, ...props]) => {
  const comp = /nuxt-?link/i.test(tag) ? NuxtLink : resolveDynamicComponent(tag)
  const args = isObj(comp) ? props.map(toArgs).map(toSlot) : props.map(toArgs)

  return h(comp, ...args)
}

export default {
  name: 'NuxtContent',
  props: {
    tag: {
      type: String,
      default: 'div'
    },
    document: {
      type: Object,
      required: true
    }
  },
  render() {
    const body = this.document.body

    if (isArr(body)) {
      return h(this.tag, body.map(toNode))
    } else {
      return h(this.tag, { innerHTML: body })
    }
  }
}
</script>
