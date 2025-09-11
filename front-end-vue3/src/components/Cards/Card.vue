<template>
  <div class="card" :class="[type && `card-${type}`]">
    <div class="card-image" v-if="$slots.image">
      <slot name="image"></slot>
    </div>
    <div class="card-header" v-if="$slots.header || title" :class="headerClasses">
      <slot name="header">
        <h4 class="card-title">{{title}}</h4>
        <p class="card-category" v-if="subTitle">{{subTitle}}</p>
      </slot>
    </div>
    <div class="card-body" v-if="$slots.default" :class="bodyClasses">
      <slot></slot>
    </div>
    <div class="card-image" v-if="$slots['image-bottom']">
      <slot name="image-bottom"></slot>
    </div>
    <slot name="raw-content"></slot>
    <div class="card-footer" :class="footerClasses" v-if="$slots.footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: 'Card'
})

defineProps({
  title: {
    type: String,
    default: ''
  },
  subTitle: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: ''
  },
  headerClasses: {
    type: [String, Object, Array],
    default: ''
  },
  bodyClasses: {
    type: [String, Object, Array],
    default: ''
  },
  footerClasses: {
    type: [String, Object, Array],
    default: ''
  }
})
</script>

<style scoped>
/* Card styles handled by theme */
</style>