<script setup>
import { ref } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import Sidebar from '@/components/layout/Sidebar.vue'
import Navbar from '@/components/layout/Navbar.vue'
import { LayoutDashboard, Building, CreditCard, Rocket, Bug } from '@lucide/vue'

const menuItems = ref([
  {
    label: 'Visão Geral',
    name: 'admin-dashboard',
    title: 'Visão Geral',
    to: '/admin',
    icon: LayoutDashboard,
  },
  {
    label: 'Planos SaaS',
    name: 'admin-planos',
    title: 'Planos SaaS',
    to: '/admin/planos',
    icon: CreditCard,
  },
  {
    label: 'Bugs Reportados',
    name: 'admin-bugs',
    title: 'Feedback e Bugs',
    to: '/admin/bugs',
    icon: Bug,
  },
])
</script>

<template>
  <AppLayout :navigation="menuItems">
    <template #sidebar>
      <!-- A sidebar usa inject('navigation'), então vai pegar os menuItems passados no AppLayout -->
      <Sidebar />
    </template>

    <template #navbar>
      <Navbar />
    </template>

    <template #default>
      <div class="mx-auto w-full max-w-360 space-y-6 p-4 md:p-8">
        <router-view />
      </div>
    </template>
  </AppLayout>
</template>
