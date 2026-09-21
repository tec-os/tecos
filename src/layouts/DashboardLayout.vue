<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import AppLayout from '@/components/layout/AppLayout.vue'
import Sidebar from '@/components/layout/Sidebar.vue'
import Navbar from '@/components/layout/Navbar.vue'
import {
  BarChart3,
  Bell,
  CalendarDays,
  Cpu,
  CreditCard,
  LayoutDashboard,
  Package,
  Users,
  Wrench,
  Settings,
  Shield,
  Archive,
  Rocket,
  Megaphone,
} from '@lucide/vue'

const authStore = useAuthStore()
const isSuperadmin = computed(() => authStore.userProfile?.is_superadmin === true)

// ...

const menuItems = computed(() => {
  const items = [
    {
      label: 'Dashboard',
      name: 'Dashboard',
      title: 'Dashboard',
      to: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'Clientes',
      name: 'Clientes',
      title: 'Clientes',
      to: '/clientes',
      icon: Users,
      roles: ['gerente', 'atendente'],
    },
    {
      label: 'Equipamentos',
      name: 'Equipamentos',
      title: 'Equipamentos',
      to: '/equipamentos',
      icon: Cpu,
    },
    { label: 'Catálogo', name: 'Catálogo', title: 'Catálogo', to: '/catalogo', icon: Package },
    {
      label: 'Estoque',
      name: 'Estoque',
      title: 'Estoque',
      to: '/estoque',
      icon: Archive,
      roles: ['gerente'],
    },
    {
      label: 'Ordens de Serviço',
      name: 'OS',
      title: 'Ordens de Serviço',
      to: '/ordens-servico',
      icon: Wrench,
    },
    { label: 'Agenda', name: 'Agenda', title: 'Agenda', to: '/agenda', icon: CalendarDays },
    { label: 'Lembretes', name: 'Lembretes', title: 'Lembretes', to: '/lembretes', icon: Bell },
    {
      label: 'Relatórios',
      name: 'Relatórios',
      title: 'Relatórios',
      to: '/relatorios',
      icon: BarChart3,
      roles: ['gerente'],
    },
    {
      label: 'Recebimentos',
      name: 'Recebimentos',
      title: 'Recebimentos',
      to: '/recebimentos',
      icon: CreditCard,
      roles: ['gerente', 'atendente'],
    },
    {
      label: 'Equipe',
      name: 'Equipe',
      title: 'Equipe',
      to: '/equipe',
      icon: Shield,
      roles: ['gerente'],
    },
    {
      label: 'Configurações',
      name: 'Configurações',
      title: 'Configurações',
      to: '/configuracoes',
      icon: Settings,
      roles: ['gerente'],
    },
    {
      label: 'Novidades & Suporte',
      name: 'Novidades',
      title: 'Novidades & Suporte',
      to: '/novidades',
      icon: Megaphone,
      roles: ['gerente'],
    },
  ]

  if (isSuperadmin.value) {
    items.push({
      label: 'Painel SaaS',
      name: 'Admin',
      title: 'Painel SaaS',
      to: '/admin',
      icon: Rocket,
      requiresGerente: true,
    })
  }

  return items
})
</script>

<template>
  <AppLayout :navigation="menuItems">
    <template #sidebar>
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
