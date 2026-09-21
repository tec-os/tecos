<script setup>
import { computed, ref, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRoute } from 'vue-router';
import { toast } from '@/composables/useToast';
import { adiarLembrete, atualizarLembrete, criarLembrete, excluirLembrete, listarLembretes, marcarLembreteComoLido } from '@/services/lembretesService';

import PageHeader from '@/components/common/PageHeader.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import Card from '@/components/ui/Card.vue';
import CardContent from '@/components/ui/CardContent.vue';
import Badge from '@/components/ui/Badge.vue';
import Button from '@/components/ui/Button.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import Input from '@/components/ui/Input.vue';
import Select from '@/components/ui/Select.vue';
import FormGroup from '@/components/ui/FormGroup.vue';
import Modal from '@/components/ui/Modal.vue';
import { Bell, Check, ChevronLeft, ChevronRight, Pencil, Plus, RefreshCw, Trash2 } from '@lucide/vue';

const authStore = useAuthStore();
const route = useRoute();
const lembretes = ref([]);
const loading = ref(true);
const erro = ref('');
const apenasPendentes = ref(true);
const pagina = ref(1);
const total = ref(0);
const porPagina = 20;
const processando = ref(null);
const salvando = ref(false);
const modalAberto = ref(false);
const modalExclusaoAberto = ref(false);
const lembreteSelecionado = ref(null);
const formulario = ref({ id: null, tipo: 'geral', referencia_id: null, mensagem: '', data_alvo: '' });

const totalPaginas = computed(() => Math.max(1, Math.ceil(total.value / porPagina)));
const pendentes = computed(() => lembretes.value.filter((lembrete) => !lembrete.lido).length);

function formatarData(valor) {
    if (!valor) return '-';
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(valor));
}

function formatarTipo(tipo) {
    return String(tipo || 'lembrete').replaceAll('_', ' ');
}

function estaVencido(lembrete) {
    return !lembrete.lido && new Date(lembrete.data_alvo) <= new Date();
}

function novoFormulario() {
    return { id: null, tipo: 'geral', referencia_id: null, mensagem: '', data_alvo: '' };
}

function paraInputDataHora(valor) {
    if (!valor) return '';
    const data = new Date(valor);
    const dois = (numero) => String(numero).padStart(2, '0');
    return `${data.getFullYear()}-${dois(data.getMonth() + 1)}-${dois(data.getDate())}T${dois(data.getHours())}:${dois(data.getMinutes())}`;
}

function abrirNovo() {
    formulario.value = { ...novoFormulario(), tipo: route.query.tipo || 'geral', referencia_id: route.query.referencia || null, mensagem: route.query.mensagem || '' };
    modalAberto.value = true;
}

function abrirEdicao(lembrete) {
    formulario.value = {
        id: lembrete.id,
        tipo: lembrete.tipo,
        referencia_id: lembrete.referencia_id || null,
        mensagem: lembrete.mensagem,
        data_alvo: paraInputDataHora(lembrete.data_alvo),
    };
    modalAberto.value = true;
}

async function carregarLembretes() {
    if (!authStore.empresaId || !authStore.user?.id) return;
    loading.value = true;
    erro.value = '';
    try {
        const resultado = await listarLembretes(authStore.empresaId, authStore.user.id, {
            pagina: pagina.value,
            porPagina,
            apenasPendentes: apenasPendentes.value,
        });
        lembretes.value = resultado.items;
        total.value = resultado.total;
    } catch (error) {
        erro.value = 'Não foi possível carregar seus lembretes.';
        toast.error('Erro', erro.value);
    } finally {
        loading.value = false;
    }
}

async function concluir(lembrete) {
    processando.value = lembrete.id;
    try {
        await marcarLembreteComoLido(lembrete.id, authStore.user.id);
        toast.success('Concluído', 'Lembrete marcado como lido.');
        await carregarLembretes();
    } catch (error) {
        toast.error('Erro', 'Não foi possível concluir o lembrete.');
    } finally {
        processando.value = null;
    }
}

function calcularAdiamento(horas) {
    const data = new Date();
    data.setHours(data.getHours() + horas, 0, 0, 0);
    return data;
}

async function adiar(lembrete, horas) {
    processando.value = lembrete.id;
    const novaData = calcularAdiamento(horas);
    try {
        await adiarLembrete(lembrete.id, authStore.user.id, novaData);
        toast.success('Lembrete adiado', `Voltaremos a avisar em ${formatarData(novaData)}.`);
        await carregarLembretes();
    } catch (error) {
        toast.error('Erro', 'Não foi possível adiar o lembrete.');
    } finally {
        processando.value = null;
    }
}

async function salvar() {
    if (!formulario.value.mensagem.trim() || !formulario.value.data_alvo) {
        toast.error('Atenção', 'Preencha a mensagem e a data do lembrete.');
        return;
    }

    salvando.value = true;
    const payload = {
        tipo: formulario.value.tipo,
        referencia_id: formulario.value.referencia_id || null,
        mensagem: formulario.value.mensagem.trim(),
        data_alvo: new Date(formulario.value.data_alvo).toISOString(),
    };

    try {
        if (formulario.value.id) {
            await atualizarLembrete(formulario.value.id, authStore.user.id, payload);
            toast.success('Sucesso', 'Lembrete atualizado.');
        } else {
            await criarLembrete(authStore.empresaId, authStore.user.id, payload);
            toast.success('Sucesso', 'Lembrete criado.');
        }
        modalAberto.value = false;
        await carregarLembretes();
    } catch (error) {
        toast.error('Erro', 'Não foi possível salvar o lembrete.');
    } finally {
        salvando.value = false;
    }
}

function confirmarExclusao(lembrete) {
    lembreteSelecionado.value = lembrete;
    modalExclusaoAberto.value = true;
}

async function excluir() {
    if (!lembreteSelecionado.value) return;
    processando.value = lembreteSelecionado.value.id;
    try {
        await excluirLembrete(lembreteSelecionado.value.id, authStore.user.id);
        modalExclusaoAberto.value = false;
        toast.success('Sucesso', 'Lembrete excluído.');
        await carregarLembretes();
    } catch (error) {
        toast.error('Erro', 'Não foi possível excluir o lembrete.');
    } finally {
        processando.value = null;
        lembreteSelecionado.value = null;
    }
}

function mudarFiltro(valor) {
    apenasPendentes.value = valor;
    pagina.value = 1;
    carregarLembretes();
}

function mudarPagina(novaPagina) {
    if (novaPagina < 1 || novaPagina > totalPaginas.value || novaPagina === pagina.value) return;
    pagina.value = novaPagina;
    carregarLembretes();
}

watch(() => authStore.empresaId, carregarLembretes, { immediate: true });
watch(() => [authStore.empresaId, route.query.novo], ([empresaId, novo]) => {
    if (empresaId && novo === '1') abrirNovo();
}, { immediate: true });
</script>

<template>
    <div class="space-y-8">
        <PageHeader eyebrow="Sua rotina" title="Lembretes" description="Veja o que precisa da sua atenção e marque como lido quando resolver." :tip="`Lembretes são pessoais: cada membro vê apenas os seus. Use esta área para não perder retornos, prazos e tarefas importantes da operação. Você tem ${pendentes} pendente(s) nesta lista. Adiar não conclui o lembrete: apenas muda o próximo horário do aviso.`">
            <template #actions>
                <Button variant="outline" size="icon" title="Atualizar lembretes" :disabled="loading" @click="carregarLembretes"><RefreshCw class="h-4 w-4" :class="loading && 'animate-spin'" /></Button>
                <Button class="gap-2" @click="abrirNovo"><Plus class="h-4 w-4" />Novo lembrete</Button>
            </template>
        </PageHeader>

        <div class="flex flex-wrap items-center gap-2">
            <Button :variant="apenasPendentes ? 'default' : 'outline'" size="sm" @click="mudarFiltro(true)">Pendentes</Button>
            <Button :variant="!apenasPendentes ? 'default' : 'outline'" size="sm" @click="mudarFiltro(false)">Todos</Button>
            <span class="ml-1 text-sm text-muted-foreground">{{ pendentes }} pendente(s) nesta página</span>
        </div>

        <div v-if="erro" class="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-[#fff8f4] px-4 py-3 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between"><span>{{ erro }}</span><Button variant="outline" size="sm" @click="carregarLembretes">Tentar novamente</Button></div>

        <Card class="border-border shadow-none">
            <CardContent class="p-0">
                <div v-if="loading" class="space-y-3 p-5"><Skeleton v-for="item in 4" :key="item" class="h-16 w-full" /></div>
                <EmptyState v-else-if="!lembretes.length" title="Nenhum lembrete por aqui" description="Quando houver algo para acompanhar, aparecerá nesta lista." />
                <div v-else class="divide-y divide-border">
                    <div v-for="lembrete in lembretes" :key="lembrete.id" class="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-4 sm:p-5" :class="!lembrete.lido && 'bg-[#fffaf6]'">
                        <div class="flex min-w-0 flex-1 items-start gap-3">
                            <span class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" :class="lembrete.lido ? 'bg-surface-muted text-muted-foreground' : 'bg-[#fff0e9] text-destructive'"><Bell class="h-4 w-4" /></span>
                            <div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2"><Badge variant="outline" class="capitalize">{{ formatarTipo(lembrete.tipo) }}</Badge><Badge v-if="estaVencido(lembrete)" variant="destructive">Atenção</Badge><span class="text-xs text-muted-foreground">{{ formatarData(lembrete.data_alvo) }}</span></div><p class="mt-2 wrap-break-word text-sm leading-6" :class="lembrete.lido ? 'text-muted-foreground' : 'font-medium text-foreground'">{{ lembrete.mensagem }}</p></div>
                        </div>
                        <div class="flex w-full flex-wrap items-center justify-end gap-1 border-t border-border/60 pt-3 sm:w-auto sm:border-t-0 sm:pt-0">
                            <Button v-if="!lembrete.lido" variant="ghost" size="sm" :disabled="processando === lembrete.id" title="Mudar o aviso para uma hora a partir de agora" @click="adiar(lembrete, 1)">Adiar 1 hora</Button>
                            <Button v-if="!lembrete.lido" variant="ghost" size="sm" :disabled="processando === lembrete.id" title="Mudar o aviso para 24 horas a partir de agora" @click="adiar(lembrete, 24)">Adiar para amanhã</Button>
                            <Button v-if="!lembrete.lido" variant="outline" size="sm" class="gap-1" :disabled="processando === lembrete.id" @click="concluir(lembrete)"><Check class="h-4 w-4" />Concluir</Button>
                            <Button variant="ghost" size="icon" title="Editar lembrete" @click="abrirEdicao(lembrete)"><Pencil class="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" title="Excluir lembrete" @click="confirmarExclusao(lembrete)"><Trash2 class="h-4 w-4 text-destructive" /></Button>
                        </div>
                    </div>
                </div>
                <div v-if="totalPaginas > 1" class="flex items-center justify-between border-t border-border p-4"><span class="text-sm text-muted-foreground">Página {{ pagina }} de {{ totalPaginas }}</span><div class="flex gap-2"><Button variant="outline" size="icon" title="Página anterior" :disabled="pagina === 1 || loading" @click="mudarPagina(pagina - 1)"><ChevronLeft class="h-4 w-4" /></Button><Button variant="outline" size="icon" title="Próxima página" :disabled="pagina === totalPaginas || loading" @click="mudarPagina(pagina + 1)"><ChevronRight class="h-4 w-4" /></Button></div></div>
            </CardContent>
        </Card>

        <Modal v-model="modalAberto" :title="formulario.id ? 'Editar lembrete' : 'Novo lembrete'" description="Registre algo que você precisa acompanhar." size="md">
            <div class="space-y-4">
                <FormGroup id="tipo_lembrete" label="Tipo">
                    <Select id="tipo_lembrete" v-model="formulario.tipo">
                        <option value="geral">Geral</option>
                        <option value="cliente">Cliente</option>
                        <option value="os">Ordem de serviço</option>
                        <option value="agendamento">Agendamento</option>
                    </Select>
                </FormGroup>
                <FormGroup id="mensagem_lembrete" label="O que você precisa lembrar?">
                    <Input id="mensagem_lembrete" v-model="formulario.mensagem" placeholder="Ex.: Ligar para o cliente sobre a retirada" />
                </FormGroup>
                <FormGroup id="data_lembrete" label="Quando lembrar?">
                    <Input id="data_lembrete" v-model="formulario.data_alvo" type="datetime-local" />
                </FormGroup>
            </div>
            <template #footer>
                <Button variant="outline" :disabled="salvando" @click="modalAberto = false">Cancelar</Button>
                <Button :disabled="salvando" @click="salvar">{{ salvando ? 'Salvando...' : 'Salvar lembrete' }}</Button>
            </template>
        </Modal>

        <Modal v-model="modalExclusaoAberto" title="Excluir lembrete" description="Essa ação não pode ser desfeita.">
            <p class="text-sm text-muted-foreground">Deseja excluir este lembrete?</p>
            <template #footer>
                <Button variant="outline" :disabled="processando === lembreteSelecionado?.id" @click="modalExclusaoAberto = false">Cancelar</Button>
                <Button variant="destructive" :disabled="processando === lembreteSelecionado?.id" @click="excluir">{{ processando ? 'Excluindo...' : 'Excluir' }}</Button>
            </template>
        </Modal>
    </div>
</template>
