<template>
  <li class="nav-item">
    <router-link :to="to" class="nav-link" @click="hideSidebar">
      <i v-if="icon" :class="icon"></i>
      <p>{{ name }}</p>
    </router-link>
  </li>
</template>

<script setup lang="ts">
import { inject } from 'vue'

defineProps<{
  name: string
  icon?: string
  to: string
}>()

const closeSidebar = inject('closeSidebar', () => {})

const hideSidebar = () => {
  // Only close sidebar on mobile (screen width < 992px)
  if (window.innerWidth < 992) {
    closeSidebar()
  }
}
</script>

<style lang="scss" scoped>
.nav-item {
  position: relative;
  
  .nav-link {
    position: relative;
    
    // Dot indicator for active menu item (using exact match)
    &.router-link-exact-active::before {
      content: " ";
      position: absolute;
      height: 6px;
      width: 6px;
      top: 50%;
      transform: translateY(-50%);
      left: -4px;
      background: #ffffff;
      border-radius: 50%;
    }
    
    // Hover state dot (slightly transparent)
    &:hover:not(.router-link-exact-active)::before {
      content: " ";
      position: absolute;
      height: 6px;
      width: 6px;
      top: 50%;
      transform: translateY(-50%);
      left: -4px;
      background: rgba(255, 255, 255, 0.6);
      border-radius: 50%;
    }
  }
}
</style>