import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import { is_authenticated } from '@/services/api'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    redirect: '/xss',
    component: DashboardLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '/xss',
        name: 'XSS',
        component: () => import('@/views/XSSPayloadFireReports.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: '/collected',
        name: 'CollectedPages',
        component: () => import('@/views/CollectedPages.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: '/payloads',
        name: 'Payloads',
        component: () => import('@/views/XSSPayloads.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: '/console',
        name: 'ExtensionConsole',
        component: () => import('@/views/ExtensionConsole.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: '/settings',
        name: 'Settings',
        component: () => import('@/views/Settings.vue'),
        meta: { requiresAuth: true }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
  linkActiveClass: 'active'
})

// Navigation guard for authentication
router.beforeEach(async (to, from, next) => {
  // Skip auth check for login page
  if (to.path === '/login') {
    next()
    return
  }

  // Check if route requires authentication
  if (to.matched.some(record => record.meta.requiresAuth !== false)) {
    try {
      const authResult = await is_authenticated()
      if (authResult.result && authResult.result.is_authenticated) {
        next()
      } else {
        next('/login')
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      next('/login')
    }
  } else {
    next()
  }
})

export default router