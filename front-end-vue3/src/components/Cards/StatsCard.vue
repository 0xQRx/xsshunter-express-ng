<template>
  <Card>
    <div>
      <div class="row">
        <div class="col-5" v-if="$slots.header">
          <slot name="header"></slot>
        </div>
        <div class="col-7" v-if="$slots.content">
          <slot name="content"></slot>
        </div>
      </div>
      <div v-if="$slots.footer">
        <hr/>
        <slot name="footer"></slot>
      </div>
    </div>
  </Card>
</template>

<script setup lang="ts">
import Card from "./Card.vue"

defineOptions({
  name: 'StatsCard'
})
</script>

<style scoped>
/* Stats card styles handled by theme */
</style>