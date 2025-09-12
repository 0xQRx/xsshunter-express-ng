<template>
  <div class="sidebar" :class="{ 'sidebar-open': isOpen }">
    <div class="sidebar-wrapper">
      <div class="logo">
        <a class="simple-text logo-normal text-center">
          XSS Hunter Express
        </a>
      </div>
      <ul class="nav">
        <SidebarLink
          to="/xss"
          name="XSS Payload Fires"
          icon="fas fa-fire"
        />
        <SidebarLink
          to="/collected"
          name="Collected Pages"
          icon="fas fa-file"
        />
        <SidebarLink
          to="/payloads"
          name="XSS Payloads"
          icon="fas fa-file-code"
        />
        <SidebarLink
          to="/console"
          name="Payload Console"
          icon="fas fa-terminal"
        />
        <SidebarLink
          to="/settings"
          name="Settings"
          icon="fas fa-cogs"
        />
        <li class="nav-item mt-5">
          <a target="_blank" href="https://x.com/0xQRx" class="nav-link">
            <i style="font-style: normal; font-weight: bold; font-size: 18px;">𝕏</i>
            <p>By @0xQRx</p>
          </a>
        </li>
        <li class="nav-item">
          <a target="_blank" href="https://github.com/0xQRx/xsshunter-express-ng" class="nav-link">
            <i class="fab fa-github"></i>
            <p>Github Repo</p>
          </a>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { provide } from 'vue'
import SidebarLink from './SidebarLink.vue'

defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  toggle: []
}>()

// Provide the closeSidebar function to child components
provide('closeSidebar', () => {
  emit('toggle')
})
</script>

<style lang="scss" scoped>
// Center the logo text
.logo {
  text-align: center;
  
  .logo-normal {
    display: block;
    text-align: center;
    width: 100%;
  }
}

// Mobile sidebar overlay
@media screen and (max-width: 991px) {
  .sidebar {
    position: fixed;
    display: block;
    top: 0;
    left: 0;
    height: 100%;
    width: 260px;
    right: auto;
    z-index: 1032;
    visibility: visible;
    overflow-y: visible;
    padding: 0;
    transition: all 0.5s cubic-bezier(0.685, 0.0473, 0.346, 1);
    transform: translate3d(-260px, 0, 0);
    
    &.sidebar-open {
      transform: translate3d(0px, 0, 0);
    }
  }
}

// Add backdrop for mobile
.sidebar-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1031;
  display: none;
  
  @media screen and (max-width: 991px) {
    &.show {
      display: block;
    }
  }
}
</style>