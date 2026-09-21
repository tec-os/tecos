<script setup>
import { computed, ref, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRoute } from 'vue-router';
import { toast } from '@/composables/useToast';
import { atualizarRecebimento, criarRecebimento, excluirRecebimento, listarOSParaRecebimento, listarRecebimentos } from '@/services/recebimentosService';

import PageHeader from '@/components/common/PageHeader.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import Card from '@/components/ui/Card.vue';
import CardContent from '@/components/ui/CardContent.vue';
import Button from '@/components/ui/Button.vue';
import Select from '@/components/ui/Select.vue';
import Input from '@/components/ui/Input.vue';
import FormGroup from '@/components/ui/FormGroup.vue';
import Modal from '@/components/ui/Modal.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import Badge from '@/components/ui/Badge.vue';
import { ChevronLeft, ChevronRight, Pencil, Plus, Receipt, Trash2 } from '@lucide/vue';

const authStore = useAuthStore();
const route = useRoute();
const recebimentos = ref([]);
const ordens = ref([]);
const loading = ref(true);
const carregandoOS = ref(true);
const erro = ref('');
const statusFiltro = ref('');
const pagina = ref(1);
const total = ref(0);
const porPagina = 20;
const modalAberto = ref(false);
const modalExclusaoAberto = ref(false);
const salvando = ref(false);
const excluindo = ref(false);
const selecionado = ref(null);
const formulario = ref({ id: null, os_id: '', valor: '', forma_pagamento: 'pix', status: 'pendente', vencimento: '', observacoes: '' });
const totalPaginas = computed(() => Math.max(1, Math.ceil(total.value / porPagina)));

const statusInfo = { pendente: ['Pendente', 'outline'], pago: ['Pago', 'success'], vencido: ['Vencido', 'destructive'], cancelado: ['Cancelado', 'secondary'] };
function moeda(valor) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0); }
function data(valor) { return valor ? new Intl.DateTimeFormat('pt-BR').format(new Date(valor)) : '-'; }
function novo() { formulario.value = { id: null, os_id: route.query.os || '', valor: route.query.valor || '', forma_pagamento: 'pix', status: 'pendente', vencimento: '', observacoes: '' }; modalAberto.value = true; }
function editar(item) { formulario.value = { id: item.id, os_id: item.os_id, valor: item.valor, forma_pagamento: item.forma_pagamento, status: item.status, vencimento: item.vencimento || '', observacoes: item.observacoes || '' }; modalAberto.value = true; }
function selecionarOS(osId) {
  const ordem = ordens.value.find((item) => item.id === osId);
  formulario.value.os_id = osId;
  if (ordem && !formulario.value.id) formulario.value.valor = ordem.valor_total || '';
}
function confirmar(item) { selecionado.value = item; modalExclusaoAberto.value = true; }
async function carregar() { if (!authStore.empresaId) return; loading.value = true; erro.value = ''; try { const resultado = await listarRecebimentos(authStore.empresaId, { pagina: pagina.value, porPagina, status: statusFiltro.value }); recebimentos.value = resultado.items; total.value = resultado.total; } catch (error) { erro.value = 'Não foi possível carregar os recebimentos.'; toast.error('Financeiro', erro.value); } finally { loading.value = false; } }
async function carregarOS() { if (!authStore.empresaId) return; try { ordens.value = await listarOSParaRecebimento(authStore.empresaId); } catch (error) { toast.error('Financeiro', 'Não foi possível carregar as OS.'); } finally { carregandoOS.value = false; } }
async function salvar() { if (!formulario.value.os_id || !formulario.value.valor || !formulario.value.forma_pagamento) { toast.error('Atenção', 'Preencha OS, valor e forma de pagamento.'); return; } salvando.value = true; const payload = { os_id: formulario.value.os_id, valor: Number(formulario.value.valor), forma_pagamento: formulario.value.forma_pagamento.trim(), status: formulario.value.status, vencimento: formulario.value.vencimento || null, observacoes: formulario.value.observacoes.trim() || null }; try { if (formulario.value.id) { await atualizarRecebimento(formulario.value.id, payload); toast.success('Sucesso', 'Recebimento atualizado.'); } else { await criarRecebimento(authStore.empresaId, payload); toast.success('Sucesso', 'Recebimento registrado.'); } modalAberto.value = false; await carregar(); } catch (error) { toast.error('Erro', 'Não foi possível salvar o recebimento.'); } finally { salvando.value = false; } }
async function excluir() { if (!selecionado.value) return; excluindo.value = true; try { await excluirRecebimento(selecionado.value.id); modalExclusaoAberto.value = false; toast.success('Sucesso', 'Recebimento arquivado.'); await carregar(); } catch (error) { toast.error('Erro', 'Não foi possível arquivar o recebimento.'); } finally { excluindo.value = false; selecionado.value = null; } }
function mudarPagina(novaPagina) { if (novaPagina < 1 || novaPagina > totalPaginas.value || novaPagina === pagina.value) return; pagina.value = novaPagina; carregar(); }
watch(statusFiltro, () => { pagina.value = 1; carregar(); });
watch(() => authStore.empresaId, (empresaId) => { if (empresaId) { carregar(); carregarOS(); } }, { immediate: true });
watch(() => [authStore.empresaId, route.query.novo], ([empresaId, novoRegistro]) => { if (empresaId && novoRegistro === '1') novo(); }, { immediate: true });
</script>

<template>
  <div class="space-y-8">
    <PageHeader eyebrow="Financeiro operacional" title="Recebimentos" description="Acompanhe o que foi recebido, o que está pendente e os próximos vencimentos." tip="Recebimentos são cobranças da assistência ligadas a uma OS. Eles são diferentes da assinatura do TecOS e ajudam você a controlar o dinheiro dos atendimentos."><template #actions><Button class="gap-2" @click="novo"><Plus class="h-4 w-4" />Novo recebimento</Button></template></PageHeader>
    <Card class="border-border shadow-none"><CardContent class="flex flex-wrap items-center gap-2 p-4"><Button v-for="filtro in [{ value: '', label: 'Todos' }, { value: 'pendente', label: 'Pendentes' }, { value: 'pago', label: 'Pagos' }, { value: 'vencido', label: 'Vencidos' }]" :key="filtro.value" size="sm" :variant="statusFiltro === filtro.value ? 'default' : 'outline'" @click="statusFiltro = filtro.value">{{ filtro.label }}</Button></CardContent></Card>
    <div v-if="erro" class="rounded-lg border border-destructive/30 bg-[#fff8f4] px-4 py-3 text-sm text-destructive">{{ erro }}</div>
    <Card class="border-border shadow-none"><CardContent class="p-0"><div v-if="loading" class="space-y-3 p-5"><Skeleton v-for="item in 4" :key="item" class="h-16 w-full" /></div><EmptyState v-else-if="!recebimentos.length" title="Nenhum recebimento encontrado" description="Registre o primeiro recebimento de uma OS para começar o controle financeiro." action-label="Novo recebimento" @action="novo" /><div v-else class="divide-y divide-border"><div v-for="item in recebimentos" :key="item.id" class="flex flex-col gap-3 p-5 sm:flex-row sm:items-center"><span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e8f3e4] text-success"><Receipt class="h-4 w-4" /></span><div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2"><strong class="text-primary">OS #{{ item.ordens_servico?.numero_os }}</strong><Badge :variant="statusInfo[item.status]?.[1] || 'outline'">{{ statusInfo[item.status]?.[0] || item.status }}</Badge></div><p class="mt-1 text-sm text-muted-foreground">{{ item.ordens_servico?.clientes?.nome || 'Cliente não informado' }} · {{ item.forma_pagamento }}</p><p v-if="item.vencimento" class="mt-1 text-xs text-muted-foreground">Vencimento: {{ data(item.vencimento) }}</p></div><strong class="text-lg text-primary">{{ moeda(item.valor) }}</strong><div class="flex gap-1"><Button variant="ghost" size="icon" title="Editar recebimento" @click="editar(item)"><Pencil class="h-4 w-4" /></Button><Button variant="ghost" size="icon" title="Arquivar recebimento" @click="confirmar(item)"><Trash2 class="h-4 w-4 text-destructive" /></Button></div></div></div><div v-if="totalPaginas > 1" class="flex items-center justify-between border-t border-border p-4"><span class="text-sm text-muted-foreground">Página {{ pagina }} de {{ totalPaginas }}</span><div class="flex gap-2"><Button variant="outline" size="icon" :disabled="pagina === 1" @click="mudarPagina(pagina - 1)"><ChevronLeft class="h-4 w-4" /></Button><Button variant="outline" size="icon" :disabled="pagina === totalPaginas" @click="mudarPagina(pagina + 1)"><ChevronRight class="h-4 w-4" /></Button></div></div></CardContent></Card>
    <Modal v-model="modalAberto" :title="formulario.id ? 'Editar recebimento' : 'Novo recebimento'" description="O valor da OS será sugerido automaticamente. Você pode ajustar para pagamento parcial." size="lg"><div class="grid gap-4 sm:grid-cols-2"><FormGroup id="rec_os" label="Ordem de serviço"><Select id="rec_os" v-model="formulario.os_id" :disabled="carregandoOS || Boolean(formulario.id)" @update:model-value="selecionarOS"><option value="">Selecione a OS</option><option v-for="ordem in ordens" :key="ordem.id" :value="ordem.id">#{{ ordem.numero_os }} · {{ ordem.clientes?.nome || 'Cliente' }} · {{ moeda(ordem.valor_total) }}</option></Select></FormGroup><FormGroup id="rec_valor" label="Valor do recebimento"><Input id="rec_valor" v-model="formulario.valor" type="number" step="0.01" min="0.01" placeholder="0,00" /><span class="mt-1 block text-xs text-muted-foreground">Pode ser ajustado para pagamento parcial.</span></FormGroup><FormGroup id="rec_forma" label="Forma de pagamento"><Input id="rec_forma" v-model="formulario.forma_pagamento" placeholder="Ex.: Pix, dinheiro, cartão" /></FormGroup><FormGroup id="rec_status" label="Status"><Select id="rec_status" v-model="formulario.status"><option value="pendente">Pendente</option><option value="pago">Pago</option><option value="vencido">Vencido</option><option value="cancelado">Cancelado</option></Select></FormGroup><FormGroup id="rec_vencimento" label="Vencimento"><Input id="rec_vencimento" v-model="formulario.vencimento" type="date" /></FormGroup><FormGroup id="rec_obs" label="Observações"><Input id="rec_obs" v-model="formulario.observacoes" placeholder="Observação opcional" /></FormGroup></div><template #footer><Button variant="outline" :disabled="salvando" @click="modalAberto = false">Cancelar</Button><Button :disabled="salvando" @click="salvar">{{ salvando ? 'Salvando...' : 'Salvar recebimento' }}</Button></template></Modal>
    <Modal v-model="modalExclusaoAberto" title="Arquivar recebimento" description="O registro sairá das listas, mas a auditoria será preservada."><p class="text-sm text-muted-foreground">Deseja arquivar este recebimento?</p><template #footer><Button variant="outline" :disabled="excluindo" @click="modalExclusaoAberto = false">Cancelar</Button><Button variant="destructive" :disabled="excluindo" @click="excluir">{{ excluindo ? 'Arquivando...' : 'Arquivar' }}</Button></template></Modal>
  </div>
</template>
