<script setup>
import Navi from "../components/Navi.vue";
</script>

<template>
<div class="page home-page">
<div class="sidebar">
    <Navi />
</div>

<div class="chart-pane">
  <p style="text-align: center; margin-top: 100px;">
    Select the chart type on the left sidebar.
  </p>
</div>
</div>
</template>

<style scoped>
.home-page {
  box-sizing: border-box;
}
</style>