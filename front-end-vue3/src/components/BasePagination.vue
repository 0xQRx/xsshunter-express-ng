<template>
  <ul class="pagination" :class="[size && `pagination-${size}`, align && `justify-content-${align}`]">
    <li class="page-item prev-page" :class="{disabled: modelValue === 1}">
      <a class="page-link" aria-label="Previous" @click="prevPage">
        <span aria-hidden="true"><i class="fa fa-angle-left" aria-hidden="true"></i></span>
      </a>
    </li>
    <li class="page-item" :class="{active: modelValue === item}"
        :key="item"
        v-for="item in range(minPage, maxPage)">
      <a class="page-link" @click="changePage(item)">{{item}}</a>
    </li>
    <li class="page-item next-page" :class="{disabled: modelValue === totalPages}">
      <a class="page-link" aria-label="Next" @click="nextPage">
        <span aria-hidden="true"><i class="fa fa-angle-right" aria-hidden="true"></i></span>
      </a>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { computed } from 'vue'

defineOptions({
  name: 'BasePagination'
})

const props = defineProps({
  pageCount: {
    type: Number,
    default: 0
  },
  perPage: {
    type: Number,
    default: 10
  },
  total: {
    type: Number,
    default: 0
  },
  modelValue: {
    type: Number,
    default: 1
  },
  size: {
    type: String,
    default: ""
  },
  align: {
    type: String,
    default: ""
  }
})

const emit = defineEmits(['update:modelValue'])

const totalPages = computed(() => {
  if (props.pageCount > 0) return props.pageCount
  if (props.total > 0) {
    return Math.ceil(props.total / props.perPage)
  }
  return 1
})

const minPage = computed(() => {
  const paginationRange = 5
  const halfRange = Math.floor(paginationRange / 2)
  
  if (totalPages.value <= paginationRange) {
    return 1
  }
  
  if (props.modelValue <= halfRange) {
    return 1
  }
  
  if (props.modelValue >= totalPages.value - halfRange) {
    return totalPages.value - paginationRange + 1
  }
  
  return props.modelValue - halfRange
})

const maxPage = computed(() => {
  const paginationRange = 5
  const halfRange = Math.floor(paginationRange / 2)
  
  if (totalPages.value <= paginationRange) {
    return totalPages.value
  }
  
  if (props.modelValue <= halfRange) {
    return paginationRange
  }
  
  if (props.modelValue >= totalPages.value - halfRange) {
    return totalPages.value
  }
  
  return props.modelValue + halfRange
})

const range = (min: number, max: number) => {
  const arr: number[] = []
  for (let i = min; i <= max; i++) {
    arr.push(i)
  }
  return arr
}

const changePage = (page: number) => {
  emit('update:modelValue', page)
}

const nextPage = () => {
  if (props.modelValue < totalPages.value) {
    emit('update:modelValue', props.modelValue + 1)
  }
}

const prevPage = () => {
  if (props.modelValue > 1) {
    emit('update:modelValue', props.modelValue - 1)
  }
}
</script>

<style scoped>
/* Pagination styles handled by theme */
</style>