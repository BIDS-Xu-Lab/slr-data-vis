<script setup>
</script>

<template>
<div class="navi">
    <h1>
        <a href="./">
            <i class="fa-solid fa-chart-column"></i>
            Visualization
        </a>
    </h1>

    <div class="navi-links">
        <RouterLink to="/network">
            <i class="fa-solid fa-hexagon-nodes"></i>
            Network
        </RouterLink>
        <RouterLink to="/parallel">
            <i class="fa-solid fa-lines-leaning"></i>
            Parallel
        </RouterLink>
    </div>
</div>
</template>

<style scoped>
.navi {
    border-bottom: 1px solid #eee;
}
h1 {
    font-size: 1.5rem;
    margin: 0;
}
a {
    text-decoration: none;
}
.navi-links {
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
    padding: 1rem;
}
.navi-links a {
    text-decoration: none;
    color: #000;
}
</style>