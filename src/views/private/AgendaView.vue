<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRoute } from 'vue-router';
import { toast } from '@/composables/useToast';
import PageHeader from '@/components/common/PageHeader.vue';
import {
    atualizarAgendamento,
    criarAgendamento,
    excluirAgendamento,
    listarClientesParaAgendamento,
    listarOrdensParaAgendamento,
    listarAgendamentos,
    listarTecnicos,
} from '@/services/agendamentosService';

import Card from '@/components/ui/Card.vue';
import CardContent from '@/components/ui/CardContent.vue';
import Table from '@/components/ui/Table.vue';
import TableHeader from '@/components/ui/TableHeader.vue';
import TableBody from '@/components/ui/TableBody.vue';
import TableRow from '@/components/ui/TableRow.vue';
import TableHead from '@/components/ui/TableHead.vue';
import TableCell from '@/components/ui/TableCell.vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import Select from '@/components/ui/Select.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import Modal from '@/components/ui/Modal.vue';
import FormGroup from '@/components/ui/FormGroup.vue';
import Badge from '@/components/ui/Badge.vue';

import { CalendarDays, ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from '@lucide/vue';

const authStore = useAuthStore();
const route = useRoute();
const dataAtual = new Date();
const dois = (numero) => String(numero).padStart(2, '0');
const agendamentos = ref([]);
const tecnicos = ref([]);
const clientes = ref([]);
const ordens = ref([]);
const loading = ref(true);
const carregandoTecnicos = ref(true);
const carregandoReferencias = ref(true);
const salvando = ref(false);
const excluindo = ref(false);
const erro = ref('');
const busca = ref('');
const dataFiltro = ref(`${dataAtual.getFullYear()}-${dois(dataAtual.getMonth() + 1)}-${dois(dataAtual.getDate())}`);
const modoVisualizacao = ref('dia');
const pagina = ref(1);
const total = ref(0);
const porPagina = 20;
const modalAberto = ref(false);
const modalExclusaoAberto = ref(false);
const agendamentoSelecionado = ref(null);
let buscaTimer = null;

const novoFormulario = () => ({
    id: null,
    tecnico_id: '',
    cliente_id: '',
    os_id: '',
    titulo: '',
    data_inicio: '',
    data_fim: '',
    status: 'agendado',
});
const formulario = ref(novoFormulario());

const totalPaginas = computed(() => Math.max(1, Math.ceil(total.value / porPagina)));
const podeExcluir = computed(() => ['gerente', 'tecnico'].includes(authStore.userProfile?.perfil));

const intervaloAgenda = computed(() => {
    const selecionada = new Date(`${dataFiltro.value}T00:00:00`);
    const inicio = new Date(selecionada);
    const fim = new Date(selecionada);

    if (modoVisualizacao.value === 'semana') {
        const diaSemana = inicio.getDay() || 7;
        inicio.setDate(inicio.getDate() - diaSemana + 1);
        fim.setTime(inicio.getTime());
        fim.setDate(inicio.getDate() + 6);
    } else if (modoVisualizacao.value === 'mes') {
        inicio.setDate(1);
        fim.setMonth(fim.getMonth() + 1, 0);
    }

    return {
        inicio: `${inicio.getFullYear()}-${dois(inicio.getMonth() + 1)}-${dois(inicio.getDate())}`,
        fim: `${fim.getFullYear()}-${dois(fim.getMonth() + 1)}-${dois(fim.getDate())}`,
    };
});

const tituloPeriodo = computed(() => {
    const inicio = new Date(`${intervaloAgenda.value.inicio}T00:00:00`);
    const fim = new Date(`${intervaloAgenda.value.fim}T00:00:00`);
    const formatador = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' });
    return modoVisualizacao.value === 'dia' ? formatador.format(inicio) : `${formatador.format(inicio)} até ${formatador.format(fim)}`;
});

const statusConfig = {
    agendado: { label: 'Agendado', variant: 'default' },
    concluido: { label: 'Concluído', variant: 'success' },
    cancelado: { label: 'Cancelado', variant: 'destructive' },
};

function statusInfo(status) {
    return statusConfig[status] || { label: status || 'Agendado', variant: 'outline' };
}

function formatarDataHora(valor) {
    if (!valor) return '-';
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(valor));
}

function formatarHorario(inicio, fim) {
    if (!inicio) return '-';
    const formatador = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    return fim ? `${formatador.format(new Date(inicio))} - ${formatador.format(new Date(fim))}` : formatador.format(new Date(inicio));
}

function paraInputDataHora(valor) {
    if (!valor) return '';
    const data = new Date(valor);
    return `${data.getFullYear()}-${dois(data.getMonth() + 1)}-${dois(data.getDate())}T${dois(data.getHours())}:${dois(data.getMinutes())}`;
}

function abrirNovo() {
    formulario.value = { ...novoFormulario(), tecnico_id: '', cliente_id: route.query.cliente || '', os_id: route.query.os || '', titulo: route.query.titulo || '' };
    modalAberto.value = true;
}

function abrirEdicao(agendamento) {
    formulario.value = {
        id: agendamento.id,
        tecnico_id: agendamento.tecnico_id,
        cliente_id: agendamento.cliente_id || '',
        os_id: agendamento.os_id || '',
        titulo: agendamento.titulo,
        data_inicio: paraInputDataHora(agendamento.data_inicio),
        data_fim: paraInputDataHora(agendamento.data_fim),
        status: agendamento.status || 'agendado',
    };
    modalAberto.value = true;
}

async function carregarDados() {
    if (!authStore.empresaId) return;
    loading.value = true;
    erro.value = '';
    try {
        const resultado = await listarAgendamentos(authStore.empresaId, {
            pagina: pagina.value,
            porPagina,
            dataInicio: intervaloAgenda.value.inicio,
            dataFim: intervaloAgenda.value.fim,
            busca: busca.value,
        });
        agendamentos.value = resultado.items;
        total.value = resultado.total;
    } catch (error) {
        erro.value = 'Não foi possível carregar a agenda.';
        toast.error('Erro', erro.value);
    } finally {
        loading.value = false;
    }
}

async function carregarTecnicos() {
    if (!authStore.empresaId) return;
    carregandoTecnicos.value = true;
    try {
        tecnicos.value = await listarTecnicos(authStore.empresaId);
    } catch (error) {
        toast.error('Erro', 'Não foi possível carregar os técnicos.');
    } finally {
        carregandoTecnicos.value = false;
    }
}

async function carregarReferencias() {
    if (!authStore.empresaId) return;
    carregandoReferencias.value = true;
    try {
        const [clientesCarregados, ordensCarregadas] = await Promise.all([
            listarClientesParaAgendamento(authStore.empresaId),
            listarOrdensParaAgendamento(authStore.empresaId),
        ]);
        clientes.value = clientesCarregados;
        ordens.value = ordensCarregadas;
    } catch (error) {
        toast.error('Erro', 'Não foi possível carregar clientes e OS para a agenda.');
    } finally {
        carregandoReferencias.value = false;
    }
}

async function salvar() {
    if (!formulario.value.tecnico_id || !formulario.value.titulo || !formulario.value.data_inicio || !formulario.value.data_fim) {
        toast.error('Atenção', 'Preencha técnico, título, início e fim.');
        return;
    }

    if (new Date(formulario.value.data_fim) <= new Date(formulario.value.data_inicio)) {
        toast.error('Atenção', 'O horário final deve ser depois do horário inicial.');
        return;
    }

    salvando.value = true;
    const payload = {
        tecnico_id: formulario.value.tecnico_id,
        cliente_id: formulario.value.cliente_id || null,
        os_id: formulario.value.os_id || null,
        titulo: formulario.value.titulo.trim(),
        data_inicio: new Date(formulario.value.data_inicio).toISOString(),
        data_fim: new Date(formulario.value.data_fim).toISOString(),
        status: formulario.value.status,
    };

    try {
        if (formulario.value.id) {
            await atualizarAgendamento(formulario.value.id, payload);
            toast.success('Sucesso', 'Agendamento atualizado.');
        } else {
            await criarAgendamento(authStore.empresaId, payload);
            toast.success('Sucesso', 'Agendamento criado.');
        }
        modalAberto.value = false;
        await carregarDados();
    } catch (error) {
        const mensagem = error?.message?.includes('ja possui um agendamento')
            ? 'Este técnico já possui um atendimento nesse intervalo.'
            : error?.message?.includes('horario final')
                ? 'O horário final deve ser depois do horário inicial.'
                : 'Não foi possível salvar o agendamento.';
        toast.error('Agenda', mensagem);
    } finally {
        salvando.value = false;
    }
}

function confirmarExclusao(agendamento) {
    agendamentoSelecionado.value = agendamento;
    modalExclusaoAberto.value = true;
}

async function excluir() {
    if (!agendamentoSelecionado.value) return;
    excluindo.value = true;
    try {
        await excluirAgendamento(agendamentoSelecionado.value.id);
        modalExclusaoAberto.value = false;
        toast.success('Sucesso', 'Agendamento excluído.');
        await carregarDados();
    } catch (error) {
        toast.error('Erro', 'Não foi possível excluir o agendamento.');
    } finally {
        excluindo.value = false;
        agendamentoSelecionado.value = null;
    }
}

function mudarPagina(novaPagina) {
    if (novaPagina < 1 || novaPagina > totalPaginas.value || novaPagina === pagina.value) return;
    pagina.value = novaPagina;
    carregarDados();
}

watch([dataFiltro, modoVisualizacao], () => {
    pagina.value = 1;
    carregarDados();
});

watch(busca, () => {
    pagina.value = 1;
    clearTimeout(buscaTimer);
    buscaTimer = setTimeout(carregarDados, 300);
});

watch(() => authStore.empresaId, (empresaId) => {
    if (empresaId) {
        carregarDados();
        carregarTecnicos();
        carregarReferencias();
    }
}, { immediate: true });

watch(() => [authStore.empresaId, route.query.novo], ([empresaId, novo]) => {
    if (empresaId && novo === '1') abrirNovo();
}, { immediate: true });

onMounted(() => {
    carregarTecnicos();
    carregarReferencias();
});
</script>

<template>
    <div class="space-y-6">
        <PageHeader eyebrow="Planejamento da equipe" title="Agenda" :description="`Programe visitas e compromissos da equipe. Período: ${tituloPeriodo}.`" tip="Alterne entre dia, semana e mês para enxergar a carga de trabalho. Use a agenda para visitas, retiradas, entregas e retornos.">
            <template #actions>
            <Button class="w-full gap-2 sm:w-auto" @click="abrirNovo">
                <Plus class="h-4 w-4" />
                Novo agendamento
            </Button>
            </template>
        </PageHeader>

        <Card>
            <CardContent class="p-4">
                <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div class="relative w-full md:max-w-sm">
                        <Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input v-model="busca" class="pl-9" placeholder="Buscar por título" />
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        <CalendarDays class="h-4 w-4 text-muted-foreground" />
                        <Input v-model="dataFiltro" type="date" class="w-full md:w-auto" />
                        <div class="flex rounded-md border border-border p-0.5">
                            <Button v-for="modo in [{ value: 'dia', label: 'Dia' }, { value: 'semana', label: 'Semana' }, { value: 'mes', label: 'Mês' }]" :key="modo.value" size="sm" :variant="modoVisualizacao === modo.value ? 'default' : 'ghost'" @click="modoVisualizacao = modo.value">{{ modo.label }}</Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        <div v-if="erro" class="flex flex-col gap-3 rounded border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between">
            <span>{{ erro }}</span>
            <Button variant="outline" size="sm" @click="carregarDados">Tentar novamente</Button>
        </div>

        <Card>
            <CardContent class="p-0">
                <div class="hidden overflow-x-auto md:block">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Período</TableHead>
                                <TableHead>Atendimento</TableHead>
                                <TableHead>Técnico</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead class="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow v-if="loading" v-for="item in 4" :key="item">
                                <TableCell v-for="coluna in 5" :key="coluna"><Skeleton class="h-4 w-24" /></TableCell>
                            </TableRow>
                            <TableRow v-else-if="agendamentos.length === 0">
                                <TableCell colspan="5" class="h-32 text-center text-muted-foreground">Nenhum agendamento para este dia.</TableCell>
                            </TableRow>
                            <TableRow v-else v-for="agendamento in agendamentos" :key="agendamento.id">
                                <TableCell class="whitespace-nowrap font-medium">{{ formatarHorario(agendamento.data_inicio, agendamento.data_fim) }}</TableCell>
                                <TableCell>
                                    <div class="font-medium">{{ agendamento.titulo }}</div>
                                    <div v-if="agendamento.ordens_servico?.numero_os" class="text-xs text-muted-foreground">OS #{{ agendamento.ordens_servico.numero_os }}</div>
                                </TableCell>
                                <TableCell>{{ agendamento.tecnico?.nome || 'Não informado' }}</TableCell>
                                <TableCell><Badge :variant="statusInfo(agendamento.status).variant">{{ statusInfo(agendamento.status).label }}</Badge></TableCell>
                                <TableCell class="text-right">
                                    <Button variant="ghost" size="icon" title="Editar agendamento" @click="abrirEdicao(agendamento)"><Pencil class="h-4 w-4" /></Button>
                                    <Button v-if="podeExcluir" variant="ghost" size="icon" title="Excluir agendamento" @click="confirmarExclusao(agendamento)"><Trash2 class="h-4 w-4 text-destructive" /></Button>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
                <div class="grid gap-3 bg-slate-50/50 p-4 md:hidden">
                    <div v-if="loading" v-for="item in 3" :key="`mobile-loading-${item}`" class="rounded-lg border border-border bg-background p-4">
                        <div class="space-y-3">
                            <Skeleton class="h-5 w-2/3" />
                            <Skeleton class="h-4 w-1/2" />
                            <Skeleton class="h-4 w-3/4" />
                        </div>
                    </div>
                    <div v-else-if="agendamentos.length === 0" class="py-8 text-center text-sm text-muted-foreground">
                        Nenhum agendamento para este dia.
                    </div>
                    <div v-else v-for="agendamento in agendamentos" :key="`mobile-${agendamento.id}`" class="rounded-lg border border-border bg-background p-4 shadow-sm">
                        <div class="flex items-start justify-between gap-3">
                            <div class="min-w-0">
                                <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">{{ formatarHorario(agendamento.data_inicio, agendamento.data_fim) }}</p>
                                <h3 class="mt-1 truncate font-semibold text-foreground">{{ agendamento.titulo }}</h3>
                            </div>
                            <Badge class="shrink-0" :variant="statusInfo(agendamento.status).variant">{{ statusInfo(agendamento.status).label }}</Badge>
                        </div>
                        <div class="mt-3 space-y-1 text-sm text-muted-foreground">
                            <p>Técnico: <span class="font-medium text-foreground">{{ agendamento.tecnico?.nome || 'Não informado' }}</span></p>
                            <p v-if="agendamento.ordens_servico?.numero_os">OS #{{ agendamento.ordens_servico.numero_os }}</p>
                        </div>
                        <div class="mt-4 flex justify-end gap-1 border-t border-border pt-3">
                            <Button variant="ghost" size="icon" title="Editar agendamento" @click="abrirEdicao(agendamento)"><Pencil class="h-4 w-4" /></Button>
                            <Button v-if="podeExcluir" variant="ghost" size="icon" title="Excluir agendamento" @click="confirmarExclusao(agendamento)"><Trash2 class="h-4 w-4 text-destructive" /></Button>
                        </div>
                    </div>
                </div>
                <div v-if="totalPaginas > 1" class="flex items-center justify-between border-t border-border p-4">
                    <span class="text-sm text-muted-foreground">Página {{ pagina }} de {{ totalPaginas }}</span>
                    <div class="flex gap-2">
                        <Button variant="outline" size="icon" :disabled="pagina === 1" title="Página anterior" @click="mudarPagina(pagina - 1)"><ChevronLeft class="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon" :disabled="pagina === totalPaginas" title="Próxima página" @click="mudarPagina(pagina + 1)"><ChevronRight class="h-4 w-4" /></Button>
                    </div>
                </div>
            </CardContent>
        </Card>

        <Modal v-model="modalAberto" :title="formulario.id ? 'Editar agendamento' : 'Novo agendamento'" description="Defina o técnico e o horário do atendimento." size="lg">
            <div class="grid gap-4 sm:grid-cols-2">
                <FormGroup id="titulo_agendamento" label="Título">
                    <Input id="titulo_agendamento" v-model="formulario.titulo" placeholder="Ex.: Avaliação do equipamento" />
                </FormGroup>
                <FormGroup id="tecnico_agendamento" label="Técnico">
                    <Select id="tecnico_agendamento" v-model="formulario.tecnico_id" :disabled="carregandoTecnicos">
                        <option value="">Selecione o técnico</option>
                        <option v-for="tecnico in tecnicos" :key="tecnico.id" :value="tecnico.id">{{ tecnico.nome }}</option>
                    </Select>
                </FormGroup>
                <FormGroup id="cliente_agendamento" label="Cliente (opcional)">
                    <Select id="cliente_agendamento" v-model="formulario.cliente_id" :disabled="carregandoReferencias">
                        <option value="">Sem cliente vinculado</option>
                        <option v-for="cliente in clientes" :key="cliente.id" :value="cliente.id">{{ cliente.nome }}{{ cliente.documento ? ` - ${cliente.documento}` : '' }}</option>
                    </Select>
                </FormGroup>
                <FormGroup id="os_agendamento" label="Ordem de serviço (opcional)">
                    <Select id="os_agendamento" v-model="formulario.os_id" :disabled="carregandoReferencias">
                        <option value="">Sem OS vinculada</option>
                        <option v-for="ordem in ordens" :key="ordem.id" :value="ordem.id">#{{ ordem.numero_os }} - {{ ordem.clientes?.nome || 'Cliente não informado' }}</option>
                    </Select>
                </FormGroup>
                <FormGroup id="inicio_agendamento" label="Início">
                    <Input id="inicio_agendamento" v-model="formulario.data_inicio" type="datetime-local" />
                </FormGroup>
                <FormGroup id="fim_agendamento" label="Fim">
                    <Input id="fim_agendamento" v-model="formulario.data_fim" type="datetime-local" />
                </FormGroup>
                <FormGroup id="status_agendamento" label="Status">
                    <Select id="status_agendamento" v-model="formulario.status">
                        <option value="agendado">Agendado</option>
                        <option value="concluido">Concluído</option>
                        <option value="cancelado">Cancelado</option>
                    </Select>
                </FormGroup>
            </div>
            <template #footer>
                <Button variant="outline" :disabled="salvando" @click="modalAberto = false">Cancelar</Button>
                <Button :disabled="salvando" @click="salvar">{{ salvando ? 'Salvando...' : 'Salvar agendamento' }}</Button>
            </template>
        </Modal>

        <Modal v-model="modalExclusaoAberto" title="Excluir agendamento" description="Essa ação não pode ser desfeita.">
            <p class="text-sm text-muted-foreground">Deseja excluir o agendamento “{{ agendamentoSelecionado?.titulo }}”?</p>
            <template #footer>
                <Button variant="outline" :disabled="excluindo" @click="modalExclusaoAberto = false">Cancelar</Button>
                <Button variant="destructive" :disabled="excluindo" @click="excluir">{{ excluindo ? 'Excluindo...' : 'Excluir' }}</Button>
            </template>
        </Modal>
    </div>
</template>
