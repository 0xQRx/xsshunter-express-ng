<template>
  <div class="form-group"
       :class="{
          'input-group': hasIcon,
          'input-group-focus': focused
       }">
    <slot name="label">
      <label v-if="label" class="control-label">
        {{label}}
      </label>
    </slot>
    <slot name="addonLeft">
      <span v-if="addonLeftIcon" class="input-group-prepend">
        <div class="input-group-text">
          <i :class="addonLeftIcon"></i>
        </div>
      </span>
    </slot>
    <slot>
      <input
        :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @focus="focused = true"
        @blur="focused = false"
        v-bind="$attrs"
        class="form-control"
        aria-describedby="addon-right addon-left">
    </slot>
    <slot name="addonRight">
      <span v-if="addonRightIcon" class="input-group-append">
        <div class="input-group-text">
          <i :class="addonRightIcon"></i>
        </div>
      </span>
    </slot>
    <slot name="helperText"></slot>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, useSlots } from 'vue'

defineOptions({
  inheritAttrs: false,
  name: 'BaseInput'
})

const props = defineProps({
  label: {
    type: String,
    default: ''
  },
  modelValue: {
    type: [String, Number],
    default: ''
  },
  addonRightIcon: {
    type: String,
    default: ''
  },
  addonLeftIcon: {
    type: String,
    default: ''
  },
  autofocus: {
    type: Boolean,
    default: false
  }
})

defineEmits(['update:modelValue'])

const slots = useSlots()
const focused = ref(false)

const hasIcon = computed(() => {
  return slots.addonRight !== undefined || 
         slots.addonLeft !== undefined || 
         props.addonRightIcon !== '' || 
         props.addonLeftIcon !== ''
})
</script>

<style scoped>
/* Component styles */
</style>