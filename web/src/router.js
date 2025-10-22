import { createWebHistory, createRouter } from 'vue-router'

import HomeView from './pages/HomeView.vue'
import NetworkView from './pages/NetworkView.vue'
import ParallelView from './pages/ParallelView.vue'

const routes = [
  { path: '/', component: HomeView },
  { path: '/network', component: NetworkView },
  { path: '/parallel', component: ParallelView },
]

export const router = createRouter({
  history: createWebHistory(
    '/'
  ),
  routes,
})