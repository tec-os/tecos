<script setup>
import { inject, computed, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useRoute } from 'vue-router';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/auth';
import { Bell, Menu, User, Settings, LogOut, Search } from '@lucide/vue';
import Button from '../ui/Button.vue';
import Dropdown from '../ui/Dropdown.vue';
import { useCommandMenu } from '../../composables/useCommandMenu';
import { useLembretesNotifications } from '../../composables/useLembretesNotifications';

const toggleMobile = inject('toggleMobile');
const { open: openCommandMenu } = useCommandMenu();

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const { lembretesPendentes, totalPendentes, carregando, iniciar, parar } = useLembretesNotifications();

// Dados reativos
const userEmail = computed(() => authStore.user?.email || '');
const userName = computed(() => {
    return authStore.userProfile?.nome || authStore.user?.user_metadata?.nome || userEmail.value.split('@')[0] || 'Usuário';
});

// Trava de segurança visual
const isGerente = computed(() => ['gerente', 'dono'].includes(authStore.userProfile?.perfil));
const isSuperadmin = computed(() => authStore.userProfile?.is_superadmin === true);

const pageTitle = computed(() => {
    if (route.path.startsWith('/admin')) {
        return 'Quartel General do SaaS';
    }
    const titles = {
        dashboard: 'Visão geral',
        clientes: 'Clientes',
        equipamentos: 'Equipamentos',
        catalogo: 'Catálogo',
        'ordens-servico': 'Ordens de serviço',
        'nova-os': 'Nova ordem de serviço',
        'os-detalhes': 'Detalhes da ordem de serviço',
        agenda: 'Agenda',
        lembretes: 'Lembretes',
        relatorios: 'Relatórios',
        recebimentos: 'Recebimentos',
        equipe: 'Equipe',
        configuracoes: 'Configurações'
    };
    return titles[route.name] || 'Operação';
});

function formatarTipo(tipo) {
    return String(tipo || 'geral').replaceAll('_', ' ');
}

function formatarData(valor) {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(valor));
}

async function handleLogout() {
    try {
        await supabase.auth.signOut();
        authStore.user = null;
        authStore.userProfile = null;
        router.push('/login');
    } catch (error) {
        console.error('Erro ao sair:', error);
    }
}

watch(() => [authStore.empresaId, authStore.user?.id], ([empresaId, usuarioId]) => {
    if (empresaId && usuarioId && !isSuperadmin.value) {
        iniciar(empresaId, usuarioId);
    } else {
        parar();
    }
}, { immediate: true });

onUnmounted(parar);
</script>

<template>
    <header class="flex h-16 items-center justify-between border-b border-border bg-background px-4 shadow-sm">
        
        <div class="flex items-center">
            <Button variant="ghost" size="icon" class="mr-2 md:hidden" @click="toggleMobile">
                <Menu class="h-5 w-5" />
            </Button>
            <div class="min-w-0">
                <p class="truncate text-base font-bold text-foreground">{{ pageTitle }}</p>
                <p class="hidden truncate text-xs text-muted-foreground sm:block">
                    {{ isSuperadmin ? 'Administração da Plataforma' : (authStore.userProfile?.nome || 'Sua operação em um só lugar') }}
                </p>
            </div>
        </div>
        
        <div class="flex items-center gap-4">
            <!-- Lembretes para tenants vs Alertas para SuperAdmin -->
            <Dropdown>
                <template #trigger>
                    <button class="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-muted hover:text-primary" :aria-label="isSuperadmin ? 'Alertas do sistema' : 'Abrir lembretes'">
                        <Bell class="h-5 w-5" />
                        <span v-if="!isSuperadmin && totalPendentes > 0" class="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">{{ totalPendentes > 99 ? '99+' : totalPendentes }}</span>
                    </button>
                </template>
                <template #content>
                    <div v-if="isSuperadmin">
                        <div class="border-b border-border px-4 py-3"><p class="text-sm font-semibold text-foreground">Alertas do SaaS</p></div>
                        <div class="px-4 py-5 text-center text-xs text-muted-foreground">Nenhum alerta estrutural no momento.</div>
                    </div>
                    <div v-else>
                        <div class="border-b border-border px-4 py-3"><p class="text-sm font-semibold text-foreground">Lembretes</p><p class="mt-1 text-xs text-muted-foreground">{{ totalPendentes }} pendente(s)</p></div>
                        <div v-if="carregando" class="px-4 py-4 text-xs text-muted-foreground">Atualizando...</div>
                        <div v-else-if="!lembretesPendentes.length" class="px-4 py-5 text-center text-xs text-muted-foreground">Nenhum lembrete pendente.</div>
                        <div v-else class="max-h-64 overflow-y-auto">
                            <button v-for="lembrete in lembretesPendentes" :key="lembrete.id" class="block w-full border-b border-border px-4 py-3 text-left hover:bg-surface-muted" @click="router.push('/lembretes')">
                                <span class="block text-[10px] font-bold uppercase tracking-wide text-destructive">{{ formatarTipo(lembrete.tipo) }}</span>
                                <span class="mt-1 block text-xs font-medium leading-5 text-foreground">{{ lembrete.mensagem }}</span>
                                <span class="mt-1 block text-[10px] text-muted-foreground">{{ formatarData(lembrete.data_alvo) }}</span>
                            </button>
                        </div>
                        <button class="w-full border-t border-border px-4 py-3 text-left text-xs font-semibold text-primary hover:bg-surface-muted" @click="router.push('/lembretes')">Ver todos os lembretes</button>
                    </div>
                </template>
            </Dropdown>

            <Dropdown>
                <template #trigger>
                    <button class="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                        <User class="h-5 w-5" />
                    </button>
                </template>
                
                <template #content>
                    <div class="px-4 py-2 border-b border-border">
                        <p class="text-sm font-medium text-foreground capitalize">{{ isSuperadmin ? 'Administrador' : userName }}</p>
                        <p class="text-xs text-primary/70 uppercase font-bold mt-0.5">
                            {{ isSuperadmin ? 'ADMIN_PLATAFORMA' : (authStore.userProfile?.perfil || 'Carregando...') }}
                        </p>
                    </div>
                    
                    <!-- Exibe apenas para gerentes -->
                    <button 
                        v-if="isGerente && !isSuperadmin"
                        @click="router.push('/configuracoes')" 
                        class="w-full flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground text-left transition-colors"
                    >
                        <Settings class="h-4 w-4" />
                        Configurações
                    </button>
                    
                    <div v-if="isGerente" class="border-t border-border my-1"></div>
                    
                    <button 
                        @click="handleLogout" 
                        class="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 hover:text-red-600 text-left transition-colors"
                    >
                        <LogOut class="h-4 w-4" />
                        Sair
                    </button>
                </template>
            </Dropdown>
        </div>
    </header>
</template>