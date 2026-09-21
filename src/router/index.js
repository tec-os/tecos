/**
 * Configuração Principal de Rotas (Vue Router)
 * 
 * Este módulo gerencia toda a navegação da aplicação (SPA). 
 * Ele implementa:
 * 1. Separação de áreas (Pública, Privada/Tenant, SuperAdmin).
 * 2. Bloqueios de acesso via Navigation Guards (`beforeEach`).
 * 3. Verificação de adimplência (redireciona para /checkout se inativo).
 * 4. Controle de Acesso Baseado em Cargos (RBAC) através do `meta.roles`.
 */
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('../layouts/AuthLayout.vue'),
      children: [
        { path: '', name: 'planos', component: () => import('../views/public/PlanosView.vue') },
        {
          path: 'cadastro',
          name: 'cadastro',
          component: () => import('../views/public/CadastroView.vue'),
        },
        { path: 'login', name: 'login', component: () => import('../views/public/LoginView.vue') },
        {
          path: 'checkout',
          name: 'checkout',
          component: () => import('../views/public/CheckoutView.vue'),
        },
      ],
    },
    {
      path: '/painel',
      redirect: '/dashboard',
      component: () => import('../layouts/DashboardLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '/dashboard',
          name: 'dashboard',
          component: () => import('../views/private/DashboardView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: '/clientes',
          name: 'clientes',
          component: () => import('../views/private/ClientesView.vue'),
          meta: { requiresAuth: true, roles: ['gerente', 'atendente'] },
        },
        {
          path: '/clientes/:id',
          name: 'cliente-detalhes',
          component: () => import('../views/private/ClienteDetalhesView.vue'),
          meta: { requiresAuth: true, roles: ['gerente', 'atendente'] },
        },
        {
          path: '/equipamentos',
          name: 'equipamentos',
          component: () => import('../views/private/EquipamentosView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: '/ordens-servico',
          name: 'ordens-servico',
          component: () => import('../views/private/OrdensServicoView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: '/ordens-servico/nova',
          name: 'nova-os',
          component: () => import('../views/private/NovaOSView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: '/ordens-servico/:id',
          name: 'os-detalhes',
          component: () => import('../views/private/OSDetalhesView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: '/agenda',
          name: 'agenda',
          component: () => import('../views/private/AgendaView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: '/lembretes',
          name: 'lembretes',
          component: () => import('../views/private/LembretesView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: '/relatorios',
          name: 'relatorios',
          component: () => import('../views/private/RelatoriosView.vue'),
          meta: { requiresAuth: true, roles: ['gerente'] },
        },
        {
          path: '/recebimentos',
          name: 'recebimentos',
          component: () => import('../views/private/RecebimentosView.vue'),
          meta: { requiresAuth: true, roles: ['gerente', 'atendente'] },
        },
        {
          path: '/catalogo',
          name: 'catalogo',
          component: () => import('../views/private/CatalogoView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: '/estoque',
          name: 'estoque',
          component: () => import('../views/private/EstoqueView.vue'),
          meta: { requiresAuth: true, roles: ['gerente'] },
        },
        {
          path: '/configuracoes',
          name: 'configuracoes',
          component: () => import('../views/private/ConfiguracoesView.vue'),
          meta: { requiresAuth: true, roles: ['gerente'] },
        },
        // Nova rota de equipe
        {
          path: '/equipe',
          name: 'equipe',
          component: () => import('../views/private/EquipeView.vue'),
          meta: { requiresAuth: true, roles: ['gerente'] },
        },
        // Tela de novidades e envio de bugs
        {
          path: '/novidades',
          name: 'novidades',
          component: () => import('../views/private/NovidadesView.vue'),
          meta: { requiresAuth: true, roles: ['gerente'] },
        },
      ],
    },
    {
      path: '/ordens-servico/:id/imprimir',
      name: 'OSImprimir',
      component: () => import('../views/private/OSImprimirView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin',
      component: () => import('../layouts/AdminLayout.vue'),
      children: [
        {
          path: '',
          name: 'admin-dashboard',
          component: () => import('../views/admin/AdminDashboardView.vue'),
          meta: { requiresAuth: true, requiresSuperadmin: true },
        },
        {
          path: 'planos',
          name: 'admin-planos',
          component: () => import('../views/admin/AdminPlanosView.vue'),
          meta: { requiresAuth: true, requiresSuperadmin: true },
        },
        {
          path: 'bugs',
          name: 'admin-bugs',
          component: () => import('../views/admin/AdminBugsView.vue'),
          meta: { requiresAuth: true, requiresSuperadmin: true },
        },
      ],
    },
    // Rota coringa (Catch-all) para 404
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../views/public/NotFoundView.vue'),
    },
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  // 1. Tenta verificar se está autorizado
  const isAuth = authStore.user ? await authStore.verificarUsuarioAtivo() : false
  const userProfile = authStore.userProfile?.perfil
  const isSuperadmin = authStore.userProfile?.is_superadmin === true
  const hasSession = !!authStore.user

  // 2. Bloqueia usuário tentando acessar área privada
  if (to.meta.requiresAuth && !isAuth) {
    // Se ele tem sessão salva, mas `isAuth` deu falso, é porque ele está bloqueado pela assinatura!
    if (hasSession && to.name !== 'checkout') {
      return '/checkout'
    }
    // Se não tem sessão, manda pro login normal
    return '/login'
  }

  // 3. Redireciona usuário logado que tenta acessar login/cadastro
  else if ((to.name === 'login' || to.name === 'cadastro') && hasSession) {
    if (isAuth) {
      if (isSuperadmin) return '/admin'
      return '/dashboard'
    } else {
      // Tem sessão mas está inadimplente
      return '/checkout'
    }
  }

  // Bloqueia rotas baseadas na regra de roles
  if (to.meta.roles && to.meta.roles.length > 0 && !isSuperadmin) {
    if (!to.meta.roles.includes(userProfile)) {
      return '/dashboard' // Redireciona para o painel principal se não tiver permissão
    }
  }

  // Fallback de segurança legado
  if (to.meta.requiresGerente && userProfile !== 'gerente' && !isSuperadmin) {
    return '/dashboard'
  }

  // Bloqueia rotas de superadmin
  if (to.meta.requiresSuperadmin && !isSuperadmin) {
    return '/dashboard'
  }
})

// Atualiza o Title da página para SEO e usabilidade
router.afterEach((to) => {
  const titles = {
    'planos': 'Planos | TecOS',
    'cadastro': 'Criar Conta | TecOS',
    'login': 'Login | TecOS',
    'checkout': 'Assinatura | TecOS',
    'dashboard': 'Painel | TecOS',
    'clientes': 'Clientes | TecOS',
    'cliente-detalhes': 'Detalhes do Cliente | TecOS',
    'equipamentos': 'Equipamentos | TecOS',
    'ordens-servico': 'Ordens de Serviço | TecOS',
    'nova-os': 'Nova OS | TecOS',
    'os-detalhes': 'Detalhes da OS | TecOS',
    'OSImprimir': 'Impressão de OS | TecOS',
    'agenda': 'Agenda | TecOS',
    'lembretes': 'Lembretes | TecOS',
    'relatorios': 'Relatórios | TecOS',
    'recebimentos': 'Financeiro | TecOS',
    'catalogo': 'Catálogo | TecOS',
    'estoque': 'Estoque | TecOS',
    'configuracoes': 'Configurações | TecOS',
    'equipe': 'Equipe | TecOS',
    'novidades': 'Novidades | TecOS',
    'admin-dashboard': 'SuperAdmin | TecOS',
    'admin-planos': 'Planos da Plataforma | TecOS',
    'admin-bugs': 'Bugs Reportados | TecOS',
    'not-found': 'Página Não Encontrada | TecOS',
  }
  document.title = titles[to.name] || 'TecOS - Gestão de Assistências Técnicas'
})

export default router
