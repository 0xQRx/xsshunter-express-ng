<template>
  <nav class="navbar navbar-expand-lg navbar-absolute navbar-transparent">
    <div class="container-fluid">
      <div class="navbar-wrapper">
        <div class="navbar-toggle d-inline">
          <button type="button" class="navbar-toggler" @click="toggleSidebar">
            <span class="navbar-toggler-bar bar1"></span>
            <span class="navbar-toggler-bar bar2"></span>
            <span class="navbar-toggler-bar bar3"></span>
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  toggleSidebar: []
}>()

const toggleSidebar = () => {
  emit('toggleSidebar')
}
</script>

<style lang="scss" scoped>
// Styles inherited from theme
</style>