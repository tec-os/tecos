<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { listarClientes, criarCliente, atualizarCliente, excluirCliente as excluirClienteServico } from '@/services/clientesService';
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
import Modal from '@/components/ui/Modal.vue';
import FormGroup from '@/components/ui/FormGroup.vue';
import Textarea from '@/components/ui/Textarea.vue';
import Select from '@/components/ui/Select.vue';
import Tabs from '@/components/ui/Tabs.vue';
import TabsList from '@/components/ui/TabsList.vue';
import TabsTrigger from '@/components/ui/TabsTrigger.vue';
import TabsContent from '@/components/ui/TabsContent.vue';

// Importamos o AlertCircle para o modal de exclusão
import { Eye, Plus, Search, Pencil, Trash2, Users, AlertCircle } from '@lucide/vue';

const authStore = useAuthStore();
const clientes = ref([]);
const loading = ref(true);
const erro = ref('');
const busca = ref('');
const pagina = ref(1);
const totalClientes = ref(0);
const porPagina = 20;
let buscaTimer = null;

// Estado do Modal de Cadastro/Edição
const isModalOpen = ref(false);
const salvando = ref(false);
const abaAtual = ref('basico');

// Estado do Modal de Exclusão
const isModalExclusaoOpen = ref(false);
const excluindo = ref(false);
const clienteParaExcluir = ref(null);

// Estrutura completa (agora com ID para sabermos quando é edição)
const formClienteDefault = {
    id: null,
    nome: '',
    tipo_pessoa: 'F',
    documento: '',
    email: '',
    telefone: '',
    celular: '',
    cep: '',
    logradouro: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    observacoes: ''
};
const formCliente = ref({ ...formClienteDefault });

const clientesFiltrados = computed(() => {
    return clientes.value;
});

const totalPaginas = computed(() => Math.max(1, Math.ceil(totalClientes.value / porPagina)));

async function carregarClientes() {
    loading.value = true;
    erro.value = '';
    try {
        const resultado = await listarClientes(authStore.empresaId, {
            pagina: pagina.value,
            porPagina,
            busca: busca.value,
        });
        clientes.value = resultado.items;
        totalClientes.value = resultado.total;
    } catch (error) {
        erro.value = 'Não foi possível carregar os clientes.';
        toast.error('Erro', 'Não foi possível carregar os clientes.');
    } finally {
        loading.value = false;
    }
}

// Prepara o modal para um NOVO cliente
function abrirModalNovo() {
    formCliente.value = { ...formClienteDefault };
    abaAtual.value = 'basico';
    isModalOpen.value = true;
}

// Prepara o modal para EDITAR um cliente existente
function abrirModalEditar(cliente) {
    formCliente.value = { ...cliente };
    abaAtual.value = 'basico';
    isModalOpen.value = true;
}

// Salva (Insert) ou Atualiza (Update) baseado na existência do ID
async function salvarCliente() {
    if (!formCliente.value.nome) {
        abaAtual.value = 'basico';
        toast.error('Atenção', 'O nome do cliente é obrigatório.');
        return;
    }

    salvando.value = true;
    try {
        const payload = { ...formCliente.value };
        const clienteId = payload.id;
        delete payload.id; // Removemos o ID do payload para não conflitar com o banco

        if (clienteId) {
            // Editando
            await atualizarCliente(clienteId, payload);
            toast.success('Sucesso', 'Cliente atualizado com sucesso!');
        } else {
            // Criando
            await criarCliente(authStore.empresaId, payload);
            toast.success('Sucesso', 'Cliente cadastrado com sucesso!');
        }

        isModalOpen.value = false;
        await carregarClientes();
    } catch (error) {
        toast.error('Erro', 'Não foi possível salvar o cliente.');
    } finally {
        salvando.value = false;
    }
}

// Prepara o modal de exclusão
function confirmarExclusao(cliente) {
    clienteParaExcluir.value = cliente;
    isModalExclusaoOpen.value = true;
}

// Executa a exclusão no banco
async function excluirCliente() {
    if (!clienteParaExcluir.value) return;
    
    excluindo.value = true;
    try {
        await excluirClienteServico(clienteParaExcluir.value.id);

        toast.success('Sucesso', 'Cliente excluído com sucesso!');
        isModalExclusaoOpen.value = false;
        await carregarClientes();
    } catch (error) {
        toast.error('Erro', 'Não foi possível excluir. Verifique se o cliente possui Ordens de Serviço.');
    } finally {
        excluindo.value = false;
        clienteParaExcluir.value = null;
    }
}

onMounted(() => {
    carregarClientes();
});

watch(busca, () => {
    pagina.value = 1;
    clearTimeout(buscaTimer);
    buscaTimer = setTimeout(carregarClientes, 300);
});

function mudarPagina(novaPagina) {
    if (novaPagina < 1 || novaPagina > totalPaginas.value || novaPagina === pagina.value) return;
    pagina.value = novaPagina;
    carregarClientes();
}
</script>

<template>
    <div class="space-y-6">
        <!-- Cabeçalho da Página -->
        <PageHeader eyebrow="Base de relacionamento" title="Clientes" description="Tenha contato, histórico e próximos atendimentos sempre à mão." tip="Cadastre cada cliente uma vez. Depois, busque pelo nome ou documento para encontrar rapidamente o histórico e abrir uma nova ordem de serviço.">
            <template #actions>
            <Button variant="default" class="w-full gap-2 sm:w-auto" @click="abrirModalNovo">
                <Plus class="w-4 h-4" />
                Novo cliente
            </Button>
            </template>
        </PageHeader>

        <div v-if="erro" class="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-[#fff8f4] px-4 py-3 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between">
            <span>{{ erro }}</span>
            <Button variant="outline" size="sm" @click="carregarClientes">Tentar novamente</Button>
        </div>

        <Card>
            <CardContent class="p-0">
                <!-- Barra de Ferramentas -->
                <div class="p-4 border-b border-border flex items-center justify-between">
                    <div class="relative w-full max-w-sm flex items-center">
                        <Search class="absolute left-3 w-4 h-4 text-muted-foreground" />
                        <Input 
                            v-model="busca" 
                            placeholder="Buscar por nome ou documento..." 
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
                                <TableHead>Nome</TableHead>
                                <TableHead>Documento</TableHead>
                                <TableHead>Contato</TableHead>
                                <TableHead class="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        
                        <TableBody>
                            <TableRow v-if="loading" v-for="i in 3" :key="i">
                                <TableCell><Skeleton class="h-4 w-32" /></TableCell>
                                <TableCell><Skeleton class="h-4 w-24" /></TableCell>
                                <TableCell><Skeleton class="h-4 w-24" /></TableCell>
                                <TableCell class="text-right"><Skeleton class="h-8 w-16 ml-auto" /></TableCell>
                            </TableRow>

                            <TableRow v-else-if="clientesFiltrados.length === 0">
                                <TableCell colspan="4"><EmptyState title="Nenhum cliente encontrado" description="Cadastre seu primeiro cliente ou ajuste a busca." action-label="Novo cliente" @action="abrirModalNovo" /></TableCell>
                            </TableRow>

                            <TableRow v-else v-for="cliente in clientesFiltrados" :key="cliente.id">
                                <TableCell class="font-medium text-foreground">
                                    {{ cliente.nome }}
                                </TableCell>
                                <TableCell class="text-muted-foreground">
                                    {{ cliente.documento || '-' }}
                                </TableCell>
                                <TableCell class="text-muted-foreground">
                                    {{ cliente.celular || cliente.telefone || cliente.email || '-' }}
                                </TableCell>
                                <TableCell class="text-right space-x-2">
                                    <Button variant="ghost" size="icon" title="Abrir painel do cliente" @click="$router.push(`/clientes/${cliente.id}`)">
                                        <Eye class="w-4 h-4 text-primary" />
                                    </Button>
                                    <Button variant="ghost" size="icon" title="Editar" @click="abrirModalEditar(cliente)">
                                        <Pencil class="w-4 h-4 text-slate-500" />
                                    </Button>
                                    <Button variant="ghost" size="icon" title="Excluir" @click="confirmarExclusao(cliente)">
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
                                <Skeleton class="h-5 w-3/4" />
                                <Skeleton class="h-4 w-1/2" />
                            </CardContent>
                        </Card>
                    </div>

                    <div v-else-if="clientesFiltrados.length === 0" class="py-8 text-center text-muted-foreground flex flex-col items-center">
                        <Users class="w-8 h-8 text-muted-foreground/50 mb-2" />
                        <p>Nenhum cliente encontrado.</p>
                    </div>

                    <Card v-else v-for="cliente in clientesFiltrados" :key="'mob-card-'+cliente.id" class="shadow-sm">
                        <CardContent class="p-4 flex flex-col gap-1">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h3 class="font-bold text-foreground">{{ cliente.nome }}</h3>
                                    <p class="text-sm text-muted-foreground mt-0.5">{{ cliente.documento || 'Sem documento' }}</p>
                                </div>
                            </div>
                            
                            <div class="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                                <span class="text-sm font-medium text-slate-600">
                                    {{ cliente.celular || cliente.telefone || cliente.email || 'Sem contato' }}
                                </span>
                                <div class="flex gap-1">
                                    <Button variant="outline" size="icon" class="h-8 w-8" title="Abrir painel do cliente" @click="$router.push(`/clientes/${cliente.id}`)">
                                        <Eye class="w-3.5 h-3.5 text-primary" />
                                    </Button>
                                    <Button variant="outline" size="icon" class="h-8 w-8 rounded-full" @click="abrirModalEditar(cliente)">
                                        <Pencil class="w-3.5 h-3.5 text-slate-500" />
                                    </Button>
                                    <Button variant="outline" size="icon" class="h-8 w-8 rounded-full border-red-100 bg-red-50 hover:bg-red-100" @click="confirmarExclusao(cliente)">
                                        <Trash2 class="w-3.5 h-3.5 text-red-500" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div v-if="totalClientes > 0" class="flex flex-col gap-3 border-t border-border p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <span class="text-muted-foreground">
                        Página {{ pagina }} de {{ totalPaginas }} · {{ totalClientes }} clientes
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
    </div>

<!-- Modal de Novo/Editar Cliente -->
        <Modal 
            v-model="isModalOpen" 
            :title="formCliente.id ? 'Editar Cliente' : 'Novo Cliente'" 
            :description="formCliente.id ? 'Atualize os dados cadastrais deste cliente.' : 'Cadastre um novo cliente na sua base.'" 
            size="lg"
        >
            <div class="py-4">
                <Tabs v-model="abaAtual" class="w-full">
                    <TabsList class="grid w-full grid-cols-3 mb-6">
                        <TabsTrigger value="basico">Básico</TabsTrigger>
                        <TabsTrigger value="endereco">Endereço</TabsTrigger>
                        <TabsTrigger value="outros">Outros</TabsTrigger>
                    </TabsList>
                    
                    <!-- Aba 1: Dados Básicos -->
                    <TabsContent value="basico" class="space-y-4">
                        <FormGroup id="nome" label="Nome / Razão Social *">
                            <Input id="nome" v-model="formCliente.nome" placeholder="Ex: João da Silva" />
                        </FormGroup>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormGroup id="tipo_pessoa" label="Tipo">
                                <Select id="tipo_pessoa" v-model="formCliente.tipo_pessoa">
                                    <option value="F">Pessoa Física</option>
                                    <option value="J">Pessoa Jurídica</option>
                                </Select>
                            </FormGroup>

                            <FormGroup id="documento" label="CPF / CNPJ">
                                <Input id="documento" v-model="formCliente.documento" placeholder="000.000.000-00" />
                            </FormGroup>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormGroup id="celular" label="Celular / WhatsApp">
                                <Input id="celular" v-model="formCliente.celular" placeholder="(00) 00000-0000" />
                            </FormGroup>
                            
                            <FormGroup id="email" label="E-mail">
                                <Input id="email" type="email" v-model="formCliente.email" placeholder="contato@email.com" />
                            </FormGroup>
                        </div>
                    </TabsContent>

                    <!-- Aba 2: Endereço (Opcional) -->
                    <TabsContent value="endereco" class="space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormGroup id="cep" label="CEP">
                                <Input id="cep" v-model="formCliente.cep" placeholder="00000-000" />
                            </FormGroup>
                            
                            <FormGroup id="cidade" label="Cidade" class="md:col-span-2">
                                <Input id="cidade" v-model="formCliente.cidade" placeholder="Nome da cidade" />
                            </FormGroup>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <FormGroup id="logradouro" label="Rua / Avenida" class="md:col-span-3">
                                <Input id="logradouro" v-model="formCliente.logradouro" placeholder="Ex: Rua das Flores" />
                            </FormGroup>
                            
                            <FormGroup id="numero" label="Número">
                                <Input id="numero" v-model="formCliente.numero" placeholder="123" />
                            </FormGroup>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormGroup id="bairro" label="Bairro">
                                <Input id="bairro" v-model="formCliente.bairro" placeholder="Centro" />
                            </FormGroup>

                            <FormGroup id="estado" label="Estado (UF)">
                                <Input id="estado" v-model="formCliente.estado" placeholder="SP" maxlength="2" />
                            </FormGroup>
                        </div>
                    </TabsContent>

                    <!-- Aba 3: Outros (Opcional) -->
                    <TabsContent value="outros" class="space-y-4">
                        <FormGroup id="telefone" label="Telefone Fixo">
                            <Input id="telefone" v-model="formCliente.telefone" placeholder="(00) 0000-0000" />
                        </FormGroup>
                        
                        <FormGroup id="observacoes" label="Observações Internas">
                            <Textarea id="observacoes" rows="4" v-model="formCliente.observacoes" placeholder="Detalhes adicionais sobre o cliente..." />
                        </FormGroup>
                    </TabsContent>
                </Tabs>
            </div>

            <template #footer>
                <Button variant="ghost" @click="isModalOpen = false" :disabled="salvando">
                    Cancelar
                </Button>
                <Button variant="default" @click="salvarCliente" :disabled="salvando">
                    <span v-if="salvando">Salvando...</span>
                    <span v-else>{{ formCliente.id ? 'Atualizar Cliente' : 'Cadastrar Cliente' }}</span>
                </Button>
            </template>
        </Modal>

        <!-- Modal de Confirmação de Exclusão -->
        <Modal 
            v-model="isModalExclusaoOpen" 
            title="Excluir Cliente" 
            size="sm"
        >
            <div class="flex flex-col items-center justify-center py-6 text-center">
                <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                    <AlertCircle class="w-6 h-6 text-red-600" />
                </div>
                <p class="text-slate-700 font-medium">Tem certeza que deseja excluir este cliente?</p>
                <p class="text-sm text-slate-500 mt-2">
                    O cliente <span class="font-bold">{{ clienteParaExcluir?.nome }}</span> será apagado do sistema. Esta ação não pode ser desfeita.
                </p>
            </div>

            <template #footer>
                <Button variant="ghost" @click="isModalExclusaoOpen = false" :disabled="excluindo">
                    Cancelar
                </Button>
                <Button variant="destructive" @click="excluirCliente" :disabled="excluindo">
                    {{ excluindo ? 'Excluindo...' : 'Sim, excluir' }}
                </Button>
            </template>
        </Modal>
</template>