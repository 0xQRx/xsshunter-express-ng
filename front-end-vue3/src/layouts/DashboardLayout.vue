<template>
  <div class="wrapper">
    <!-- Mobile backdrop -->
    <div 
      v-if="sidebarOpen" 
      class="sidebar-backdrop"
      @click="closeSidebar"
    ></div>
    
    <Sidebar 
      :isOpen="sidebarOpen"
      @toggle="toggleSidebar"
    />
    <div class="main-panel">
      <TopNavbar @toggleSidebar="toggleSidebar" />
      <div class="content">
        <div class="container-fluid">
          <router-view />
        </div>
      </div>
      <ContentFooter />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import Sidebar from '@/components/Sidebar/Sidebar.vue'
import TopNavbar from '@/components/TopNavbar.vue'
import ContentFooter from '@/components/ContentFooter.vue'

const sidebarOpen = ref(false)

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
}

const closeSidebar = () => {
  if (sidebarOpen.value) {
    sidebarOpen.value = false
  }
}

// Handle body class for mobile sidebar
watch(sidebarOpen, (isOpen) => {
  if (window.innerWidth < 992) {
    if (isOpen) {
      document.body.classList.add('nav-open')
      document.body.style.overflow = 'hidden'
    } else {
      document.body.classList.remove('nav-open')
      document.body.style.overflow = ''
    }
  }
})

// Clean up on unmount
onUnmounted(() => {
  document.body.classList.remove('nav-open')
  document.body.style.overflow = ''
})
</script>

<style lang="scss" scoped>
// Mobile backdrop
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
    display: block;
  }
}

// Ensure main panel doesn't overflow on mobile
@media screen and (max-width: 991px) {
  .main-panel {
    width: 100%;
    transform: translate3d(0, 0, 0) !important;
  }
}
</style>