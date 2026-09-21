<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { atualizarStatusOrdemServico, listarOrdensServico, excluirOrdemServico } from '@/services/ordensServicoService';
import { toast } from '@/composables/useToast';
import PageHeader from '@/components/common/PageHeader.vue';
import EmptyState from '@/components/common/EmptyState.vue';

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
import Skeleton from '@/components/ui/Skeleton.vue';
import Badge from '@/components/ui/Badge.vue';
import Modal from '@/components/ui/Modal.vue';
import FormGroup from '@/components/ui/FormGroup.vue';
import Select from '@/components/ui/Select.vue';

import { ArrowRight, Plus, Search, Eye, Wrench, Trash2 } from '@lucide/vue';

const authStore = useAuthStore();
const ordens = ref([]);
const loading = ref(true);
const erro = ref('');
const busca = ref('');
const pagina = ref(1);
const totalOrdens = ref(0);
const porPagina = 20;
let buscaTimer = null;
const excluindo = ref(false);
const isModalExclusaoOpen = ref(false);
const ordemParaExcluir = ref(null);
const ordemParaStatus = ref(null);
const novoStatus = ref('');
const salvandoStatus = ref(false);
const isModalStatusOpen = ref(false);
const podeExcluirOS = computed(() => ['gerente', 'tecnico'].includes(authStore.userProfile?.perfil));

// Filtra as OS por número ou nome do cliente
const ordensFiltradas = computed(() => {
    return ordens.value;
});

const totalPaginas = computed(() => Math.max(1, Math.ceil(totalOrdens.value / porPagina)));

// Busca as OS atrelando o nome do cliente
async function carregarOS() {
    loading.value = true;
    erro.value = '';
    try {
        const resultado = await listarOrdensServico(authStore.empresaId, {
            pagina: pagina.value,
            porPagina,
            busca: busca.value,
        });
        ordens.value = resultado.items;
        totalOrdens.value = resultado.total;
    } catch (error) {
        erro.value = 'Não foi possível carregar as ordens de serviço.';
        toast.error('Erro', 'Não foi possível carregar as Ordens de Serviço.');
    } finally {
        loading.value = false;
    }
}

// Utilitários de formatação visual
function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
}

function obterStatus(status) {
    const mapa = {
        'rascunho': { label: 'Rascunho', variant: 'outline' },
        'aberta': { label: 'Aberta', variant: 'destructive' },
        'agendada': { label: 'Agendada', variant: 'secondary' },
        'em_andamento': { label: 'Em Andamento', variant: 'default' },
        'aguardando_peca': { label: 'Aguardando Peça', variant: 'outline' },
        'concluida': { label: 'Concluída', variant: 'success' },
        'cancelada': { label: 'Cancelada', variant: 'destructive' }
    };
    return mapa[status] || { label: status, variant: 'outline' };
}

function confirmarExclusao(os) {
    ordemParaExcluir.value = os;
    isModalExclusaoOpen.value = true;
}

const proximosStatus = {
    rascunho: ['aberta', 'cancelada'],
    aberta: ['agendada', 'em_andamento', 'aguardando_peca', 'concluida', 'cancelada'],
    agendada: ['em_andamento', 'aguardando_peca', 'concluida', 'cancelada'],
    em_andamento: ['aguardando_peca', 'concluida', 'cancelada'],
    aguardando_peca: ['em_andamento', 'concluida', 'cancelada'],
    concluida: [],
    cancelada: [],
};

function abrirAlteracaoStatus(os) {
    ordemParaStatus.value = os;
    novoStatus.value = proximosStatus[os.status]?.[0] || '';
    isModalStatusOpen.value = true;
}

function nomeStatus(status) {
    return obterStatus(status).label;
}

async function salvarStatus() {
    if (!ordemParaStatus.value || !novoStatus.value) return;
    salvandoStatus.value = true;
    try {
        await atualizarStatusOrdemServico(ordemParaStatus.value.id, novoStatus.value);
        toast.success('Status atualizado', `OS #${ordemParaStatus.value.numero_os} agora está ${nomeStatus(novoStatus.value)}.`);
        isModalStatusOpen.value = false;
        await carregarOS();
    } catch (error) {
        toast.error('Não foi possível alterar o status', error.message || 'A transição não foi permitida.');
    } finally {
        salvandoStatus.value = false;
    }
}

async function excluirOS() {
    if (!ordemParaExcluir.value) return;

    excluindo.value = true;
    try {
        await excluirOrdemServico(ordemParaExcluir.value.id);

        toast.success('Sucesso', 'Ordem de servico excluida com sucesso.');
        isModalExclusaoOpen.value = false;
        await carregarOS();
    } catch (error) {
        toast.error('Erro', 'Nao foi possivel excluir a ordem de servico.');
    } finally {
        excluindo.value = false;
        ordemParaExcluir.value = null;
    }
}

onMounted(() => {
    carregarOS();
});

watch(busca, () => {
    pagina.value = 1;
    clearTimeout(buscaTimer);
    buscaTimer = setTimeout(carregarOS, 300);
});

function mudarPagina(novaPagina) {
    if (novaPagina < 1 || novaPagina > totalPaginas.value || novaPagina === pagina.value) return;
    pagina.value = novaPagina;
    carregarOS();
}
</script>

<template>
    <div class="space-y-6">
        <!-- Cabeçalho -->
        <PageHeader eyebrow="Fluxo de atendimento" title="Ordens de serviço" description="Acompanhe cada atendimento do primeiro contato à entrega." tip="Uma OS reúne o pedido do cliente, o responsável, o status, o diagnóstico, os itens e o valor final. Abra uma nova OS quando surgir um atendimento.">
            <template #actions>
            <Button variant="default" class="w-full gap-2 sm:w-auto" @click="$router.push('/ordens-servico/nova')">
                <Plus class="w-4 h-4" />
                Nova ordem
            </Button>
            </template>
        </PageHeader>

        <div v-if="erro" class="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-[#fff8f4] px-4 py-3 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between">
            <span>{{ erro }}</span>
            <Button variant="outline" size="sm" @click="carregarOS">Tentar novamente</Button>
        </div>

        <Card>
            <CardContent class="p-0">
                <!-- Barra de Busca -->
                <div class="p-4 border-b border-border flex items-center justify-between">
                    <div class="relative w-full max-w-sm flex items-center">
                        <Search class="absolute left-3 w-4 h-4 text-muted-foreground" />
                        <Input 
                            v-model="busca" 
                            placeholder="Buscar por nº da OS ou cliente..." 
                            class="pl-9 w-full"
                        />
                    </div>
                </div>

                <!-- ========================================== -->
                <!-- VISÃO DESKTOP (TABELA) -->
                <!-- ========================================== -->
                <div class="hidden md:block overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead class="w-24">OS nº</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead class="text-right">Valor Total</TableHead>
                                <TableHead class="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        
                        <TableBody>
                            <TableRow v-if="loading" v-for="i in 3" :key="i">
                                <TableCell><Skeleton class="h-4 w-12" /></TableCell>
                                <TableCell><Skeleton class="h-4 w-32" /></TableCell>
                                <TableCell><Skeleton class="h-6 w-24 rounded-full" /></TableCell>
                                <TableCell><Skeleton class="h-4 w-24" /></TableCell>
                                <TableCell class="text-right"><Skeleton class="h-4 w-20 ml-auto" /></TableCell>
                                <TableCell class="text-right"><Skeleton class="h-8 w-8 ml-auto" /></TableCell>
                            </TableRow>

                            <TableRow v-else-if="ordensFiltradas.length === 0">
                                <TableCell colspan="6"><EmptyState title="Nenhuma ordem encontrada" description="Crie uma nova OS ou ajuste os termos da busca." action-label="Nova ordem" @action="$router.push('/ordens-servico/nova')" /></TableCell>
                            </TableRow>

                            <TableRow v-else v-for="os in ordensFiltradas" :key="os.id">
                                <TableCell class="font-bold text-muted-foreground">
                                    #{{ os.numero_os }}
                                </TableCell>
                                <TableCell class="font-medium text-foreground">
                                    {{ os.clientes?.nome || 'Cliente não encontrado' }}
                                </TableCell>
                                <TableCell>
                                    <Badge :variant="obterStatus(os.status).variant">
                                        {{ obterStatus(os.status).label }}
                                    </Badge>
                                </TableCell>
                                <TableCell class="text-muted-foreground">
                                    {{ new Date(os.created_at).toLocaleDateString('pt-BR') }}
                                </TableCell>
                                <TableCell class="text-right font-medium">
                                    {{ formatarMoeda(os.valor_total) }}
                                </TableCell>
                                <TableCell class="text-right">
                                    <Button variant="ghost" size="icon" title="Ver Detalhes" @click="$router.push(`/ordens-servico/${os.id}`)">
                                        <Eye class="w-4 h-4 text-slate-500" />
                                    </Button>
                                    <Button v-if="proximosStatus[os.status]?.length" variant="ghost" size="icon" title="Alterar status" @click="abrirAlteracaoStatus(os)">
                                        <ArrowRight class="w-4 h-4 text-primary" />
                                    </Button>
                                    <Button v-if="podeExcluirOS" variant="ghost" size="icon" title="Excluir OS" @click="confirmarExclusao(os)">
                                        <Trash2 class="w-4 h-4 text-red-500" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>

                <!-- ========================================== -->
                <!-- VISÃO MOBILE (CARDS) -->
                <!-- ========================================== -->
                <div class="grid md:hidden gap-4 p-4 bg-slate-50/50">
                    <div v-if="loading" v-for="i in 3" :key="'mob-'+i">
                        <Card>
                            <CardContent class="p-4 space-y-3">
                                <Skeleton class="h-5 w-1/4" />
                                <Skeleton class="h-4 w-3/4" />
                            </CardContent>
                        </Card>
                    </div>

                    <div v-else-if="ordensFiltradas.length === 0" class="py-8 text-center text-muted-foreground flex flex-col items-center">
                        <Wrench class="w-8 h-8 text-muted-foreground/50 mb-2" />
                        <p>Nenhuma OS encontrada.</p>
                    </div>

                    <Card v-else v-for="os in ordensFiltradas" :key="'mob-card-'+os.id" class="shadow-sm">
                        <CardContent class="p-4 flex flex-col gap-2">
                            <div class="flex justify-between items-start gap-2">
                                <div>
                                    <span class="text-xs font-bold text-muted-foreground">#{{ os.numero_os }}</span>
                                    <h3 class="font-bold text-foreground leading-tight mt-0.5">{{ os.clientes?.nome }}</h3>
                                </div>
                                <Badge :variant="obterStatus(os.status).variant" class="whitespace-nowrap">
                                    {{ obterStatus(os.status).label }}
                                </Badge>
                            </div>
                            
                            <div class="flex items-center justify-between mt-2 pt-3 border-t border-border/50">
                                <div class="flex flex-col">
                                    <span class="text-xs text-muted-foreground">{{ new Date(os.created_at).toLocaleDateString('pt-BR') }}</span>
                                    <span class="font-bold text-slate-700">{{ formatarMoeda(os.valor_total) }}</span>
                                </div>
                                <Button variant="outline" size="sm" class="gap-2" @click="$router.push(`/ordens-servico/${os.id}`)">
                                    <Eye class="w-3.5 h-3.5 text-slate-500" />
                                    Abrir
                                </Button>
                                <Button v-if="proximosStatus[os.status]?.length" variant="ghost" size="icon" title="Alterar status" @click="abrirAlteracaoStatus(os)">
                                    <ArrowRight class="w-4 h-4 text-primary" />
                                </Button>
                                <Button v-if="podeExcluirOS" variant="ghost" size="icon" title="Excluir OS" @click="confirmarExclusao(os)">
                                    <Trash2 class="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div v-if="totalOrdens > 0" class="flex flex-col gap-3 border-t border-border p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <span class="text-muted-foreground">
                        Página {{ pagina }} de {{ totalPaginas }} · {{ totalOrdens }} OS
                    </span>
                    <div class="flex gap-2">
                        <Button variant="outline" size="sm" :disabled="pagina === 1 || loading" @click="mudarPagina(pagina - 1)">
                            Anterior
                        </Button>
                        <Button variant="outline" size="sm" :disabled="pagina === totalPaginas || loading" @click="mudarPagina(pagina + 1)">
                            Próxima
                        </Button>
                    </div>
                </div>

            </CardContent>
        </Card>

        <Modal
            v-model="isModalExclusaoOpen"
            title="Excluir ordem de servico"
            description="Esta acao nao pode ser desfeita."
            size="sm"
        >
            <p class="text-sm text-muted-foreground">
                Deseja excluir a OS #{{ ordemParaExcluir?.numero_os }}?
            </p>

            <template #footer>
                <Button variant="ghost" @click="isModalExclusaoOpen = false" :disabled="excluindo">
                    Cancelar
                </Button>
                <Button variant="destructive" @click="excluirOS" :disabled="excluindo" class="gap-2">
                    <Trash2 class="w-4 h-4" />
                    {{ excluindo ? 'Excluindo...' : 'Excluir OS' }}
                </Button>
            </template>
        </Modal>

        <Modal v-model="isModalStatusOpen" title="Alterar status da OS" :description="`Escolha o próximo passo da OS #${ordemParaStatus?.numero_os}.`" size="sm">
            <FormGroup id="novo_status_os" label="Próximo status">
                <Select id="novo_status_os" v-model="novoStatus">
                    <option v-for="status in proximosStatus[ordemParaStatus?.status] || []" :key="status" :value="status">{{ nomeStatus(status) }}</option>
                </Select>
            </FormGroup>
            <template #footer>
                <Button variant="outline" :disabled="salvandoStatus" @click="isModalStatusOpen = false">Cancelar</Button>
                <Button :disabled="salvandoStatus || !novoStatus" class="gap-2" @click="salvarStatus"><ArrowRight class="h-4 w-4" />{{ salvandoStatus ? 'Salvando...' : 'Atualizar status' }}</Button>
            </template>
        </Modal>
    </div>
</template>