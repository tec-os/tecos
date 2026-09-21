<template>
    <div class="min-h-screen overflow-hidden bg-[#f5f7f4] text-[#17201d]">
        <header class="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
            <RouterLink to="/" class="flex items-center gap-3" aria-label="TecOS início">
                <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#173b35] text-[#d6f36b]">
                    <Wrench class="h-5 w-5" />
                </span>
                <span class="text-xl font-bold tracking-tight">Tec<span class="text-[#d26a45]">OS</span></span>
            </RouterLink>
            <nav class="flex items-center gap-2 sm:gap-5">
                <a href="#planos" class="hidden text-sm font-medium text-[#52625c] transition-colors hover:text-[#173b35] sm:inline">Planos</a>
                <RouterLink to="/login" class="rounded-md px-3 py-2 text-sm font-semibold text-[#173b35] hover:bg-white">Entrar</RouterLink>
                <RouterLink to="#planos" class="rounded-md bg-[#173b35] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#26564d]">Começar agora</RouterLink>
            </nav>
        </header>

        <main>
            <section class="relative mx-auto grid max-w-7xl gap-10 px-5 pb-20 pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:pb-28 lg:pt-20">
                <div class="relative z-10 max-w-2xl">
                    <Badge variant="outline" class="mb-6 border-[#bed1c5] bg-white/60 text-[#376056]">Operação mais clara, equipe mais rápida</Badge>
                    <h1 class="max-w-2xl text-5xl font-bold leading-[0.98] tracking-tight text-[#173b35] sm:text-6xl lg:text-7xl">
                        Sua assistência técnica, <span class="text-[#d26a45]">no controle.</span>
                    </h1>
                    <p class="mt-6 max-w-xl text-lg leading-8 text-[#52625c]">
                        Clientes, ordens de serviço, equipe e cobrança em um só fluxo. Menos retrabalho no balcão, mais previsibilidade para entregar.
                    </p>
                    <div class="mt-8 flex flex-col gap-3 sm:flex-row">
                        <a href="#planos" class="inline-flex h-11 items-center justify-center rounded-md bg-[#d26a45] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#b95736]">Ver planos</a>
                        <RouterLink to="/login" class="inline-flex h-11 items-center justify-center rounded-md border border-[#c8d5cd] bg-white px-5 text-sm font-semibold text-[#173b35] transition-colors hover:bg-[#eef3ee]">Já sou cliente</RouterLink>
                    </div>
                    <div class="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-[#d6e0d8] pt-5 text-sm">
                        <div><strong class="block text-xl text-[#173b35]">01</strong><span class="text-[#687871]">fluxo central</span></div>
                        <div><strong class="block text-xl text-[#173b35]">100%</strong><span class="text-[#687871]">visão da equipe</span></div>
                        <div><strong class="block text-xl text-[#173b35]">24/7</strong><span class="text-[#687871]">dados disponíveis</span></div>
                    </div>
                </div>

                <div class="relative min-h-97.5 lg:min-h-125">
                    <div class="absolute right-0 top-5 h-[88%] w-[88%] rounded-4xl border border-[#c8d9ce] bg-[#dce9df] p-4 shadow-[18px_18px_0_#c3d4ca] sm:p-7">
                        <div class="flex items-center justify-between border-b border-[#c1d4c7] pb-4">
                            <div><span class="text-xs font-semibold uppercase tracking-[0.2em] text-[#668077]">Visão geral</span><p class="mt-1 font-bold text-[#173b35]">Terça, 03 setembro</p></div>
                            <span class="h-3 w-3 rounded-full bg-[#d26a45]" aria-hidden="true"></span>
                        </div>
                        <div class="mt-5 grid grid-cols-2 gap-3">
                            <div class="rounded-xl bg-white p-4"><Users class="h-5 w-5 text-[#d26a45]" /><strong class="mt-5 block text-3xl text-[#173b35]">248</strong><span class="text-xs text-[#687871]">clientes ativos</span></div>
                            <div class="rounded-xl bg-[#173b35] p-4 text-white"><ClipboardList class="h-5 w-5 text-[#d6f36b]" /><strong class="mt-5 block text-3xl">36</strong><span class="text-xs text-[#b7c9c0]">OS em andamento</span></div>
                        </div>
                        <div class="mt-3 rounded-xl bg-white p-4">
                            <div class="flex items-center justify-between"><span class="text-sm font-semibold text-[#173b35]">Fila de atendimento</span><span class="text-xs text-[#d26a45]">ver todas</span></div>
                            <div class="mt-4 space-y-3"><div class="flex items-center justify-between border-b border-[#edf1ed] pb-3"><span class="text-sm text-[#52625c]">#1048 · Notebook Silva</span><span class="rounded-full bg-[#fff0e9] px-2 py-1 text-xs font-semibold text-[#b95736]">Em análise</span></div><div class="flex items-center justify-between"><span class="text-sm text-[#52625c]">#1047 · PC Andrade</span><span class="rounded-full bg-[#e8f3e4] px-2 py-1 text-xs font-semibold text-[#47734d]">Pronto</span></div></div>
                        </div>
                    </div>
                    <div class="absolute bottom-3 left-0 hidden w-48 rounded-xl border border-[#e4c1b3] bg-[#fff8f4] p-4 shadow-lg sm:block"><span class="text-xs font-semibold uppercase tracking-wider text-[#a95639]">Hoje</span><strong class="mt-2 block text-2xl text-[#173b35]">92%</strong><span class="text-xs text-[#687871]">das OS no prazo</span></div>
                </div>
            </section>

            <section class="border-y border-[#dce5de] bg-white px-5 py-10 lg:px-8">
                <div class="mx-auto grid max-w-7xl gap-8 md:grid-cols-3">
                    <div class="flex gap-4"><span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#e8f3e4] text-[#47734d]"><Users class="h-5 w-5" /></span><div><h2 class="font-semibold text-[#173b35]">Clientes em ordem</h2><p class="mt-1 text-sm leading-6 text-[#687871]">Histórico, contato e atendimento reunidos em um só lugar.</p></div></div>
                    <div class="flex gap-4"><span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fff0e9] text-[#b95736]"><ClipboardList class="h-5 w-5" /></span><div><h2 class="font-semibold text-[#173b35]">OS sem ruído</h2><p class="mt-1 text-sm leading-6 text-[#687871]">Cada serviço tem responsável, status, itens e próximos passos.</p></div></div>
                    <div class="flex gap-4"><span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#e7eef5] text-[#43627a]"><ShieldCheck class="h-5 w-5" /></span><div><h2 class="font-semibold text-[#173b35]">Acesso protegido</h2><p class="mt-1 text-sm leading-6 text-[#687871]">Equipe, empresa e dados financeiros separados por permissão.</p></div></div>
                </div>
            </section>

            <section id="planos" class="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
                <div class="max-w-2xl"><span class="text-sm font-bold uppercase tracking-[0.2em] text-[#d26a45]">Planos simples</span><h2 class="mt-3 text-4xl font-bold tracking-tight text-[#173b35] sm:text-5xl">Escolha o ritmo da sua operação.</h2><p class="mt-4 text-lg leading-8 text-[#52625c]">Comece com o essencial e avance quando sua equipe crescer.</p></div>
                <div v-if="loading" class="mt-10 flex items-center gap-2 text-[#687871]"><Loader2 class="h-5 w-5 animate-spin" /> Carregando planos...</div>
                <div v-else-if="erro" class="mt-10 rounded-lg border border-[#e4c1b3] bg-[#fff8f4] p-4 text-[#a95639]">{{ erro }}</div>
                <div v-else class="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    <Card v-for="(plano, index) in planos" :key="plano.id" class="flex flex-col border-[#d6e0d8] p-6 shadow-none transition-transform hover:-translate-y-1">
                        <CardContent class="flex h-full flex-col p-0"><Badge v-if="index === 1" class="mb-5 w-fit bg-[#d6f36b] text-[#173b35]">Mais escolhido</Badge><h3 class="text-xl font-bold text-[#173b35]">{{ plano.nome }}</h3><div class="mt-4 flex items-baseline gap-1"><span class="text-4xl font-bold text-[#173b35]">R$ {{ formatarMoeda(plano.valor) }}</span><span class="text-sm text-[#687871]">/ {{ plano.periodicidade.toLowerCase() }}</span></div><div class="my-7 h-px bg-[#e5ebe6]"></div><ul class="flex-1 space-y-4 text-sm text-[#52625c]"><li class="flex gap-3"><CheckCircle2 class="h-5 w-5 shrink-0 text-[#47734d]" />Até <strong>{{ plano.limite_usuarios }}</strong> usuários</li><li class="flex gap-3"><CheckCircle2 class="h-5 w-5 shrink-0 text-[#47734d]" />Clientes e OS organizadas</li><li class="flex gap-3"><CheckCircle2 class="h-5 w-5 shrink-0 text-[#47734d]" />Equipe com permissões</li></ul><Button class="mt-8 w-full bg-[#173b35] hover:bg-[#26564d]" @click="escolherPlano(plano.id)">Começar com este plano</Button></CardContent>
                    </Card>
                </div>
            </section>
        </main>
        <footer class="border-t border-[#dce5de] px-5 py-8 text-sm text-[#687871] lg:px-8"><div class="mx-auto flex max-w-7xl flex-col justify-between gap-3 sm:flex-row"><span>© {{ new Date().getFullYear() }} TecOS</span><span>Gestão feita para quem resolve.</span></div></footer>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '../../services/supabase';
import { Loader2, CheckCircle2, Wrench, Users, ClipboardList, ShieldCheck } from '@lucide/vue';
import Card from '@/components/ui/Card.vue';
import CardContent from '@/components/ui/CardContent.vue';
import Badge from '@/components/ui/Badge.vue';
import Button from '@/components/ui/Button.vue';

const router = useRouter();
const planos = ref([]);
const loading = ref(true);
const erro = ref('');

// Busca planos ativos
async function carregarPlanos() {
    try {
        const { data, error } = await supabase
            .from('planos')
            .select('id, nome, periodicidade, valor, limite_usuarios, ativo')
            .eq('ativo', true)
            .order('valor', { ascending: true });

        if (error) throw error;
        planos.value = data;
    } catch (e) {
        erro.value = 'Não foi possível carregar os planos no momento.';
        console.error(e);
    } finally {
        loading.value = false;
    }
}

// Formata moeda
function formatarMoeda(valor) {
    return Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

// Navega pro cadastro
function escolherPlano(planoId) {
    router.push({ name: 'cadastro', query: { plano: planoId } });
}

onMounted(() => {
    carregarPlanos();
});
</script>