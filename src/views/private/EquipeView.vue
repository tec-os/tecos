<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { toast } from '@/composables/useToast';
import PageHeader from '@/components/common/PageHeader.vue';
import { useAuthStore } from '@/stores/auth';
import { listarEquipe, atualizarStatusMembro, criarMembroEquipe } from '@/services/equipeService';

// Importação dos componentes do W2 UI Kit
import Card from '@/components/ui/Card.vue';
import CardContent from '@/components/ui/CardContent.vue';
import Button from '@/components/ui/Button.vue';
import Badge from '@/components/ui/Badge.vue';
import Table from '@/components/ui/Table.vue';
import TableHeader from '@/components/ui/TableHeader.vue';
import TableBody from '@/components/ui/TableBody.vue';
import TableRow from '@/components/ui/TableRow.vue';
import TableHead from '@/components/ui/TableHead.vue';
import TableCell from '@/components/ui/TableCell.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import Modal from '@/components/ui/Modal.vue';
import FormGroup from '@/components/ui/FormGroup.vue';
import Input from '@/components/ui/Input.vue';
import Select from '@/components/ui/Select.vue';

import { Users, UserPlus, ShieldBan, CheckCircle } from '@lucide/vue';

const authStore = useAuthStore();
const equipe = ref([]);
const loading = ref(true);
const processando = ref(null);
const busca = ref('');
const pagina = ref(1);
const totalMembros = ref(0);
const porPagina = 20;
const totalPaginas = computed(() => Math.max(1, Math.ceil(totalMembros.value / porPagina)));
let buscaTimer = null;

// Estados do Modal e Formulário
const isModalOpen = ref(false);
const criandoUsuario = ref(false);
const formNovoUsuario = ref({
    nome: '',
    email: '',
    password: '',
    perfil: 'tecnico'
});

// Busca todos os usuários da mesma empresa
async function carregarEquipe() {
    try {
        const resultado = await listarEquipe(authStore.empresaId, { pagina: pagina.value, porPagina, busca: busca.value });
        equipe.value = resultado.items;
        totalMembros.value = resultado.total;
    } catch (error) {
        toast.error('Erro', 'Não foi possível carregar a equipe.');
        console.error(error);
    } finally {
        loading.value = false;
    }
}

// Alterna o status ativo/inativo do funcionário
async function alternarStatus(usuario) {
    if (usuario.id === authStore.user.id) {
        toast.error('Atenção', 'Você não pode desativar seu próprio usuário.');
        return;
    }

    processando.value = usuario.id;
    const novoStatus = !usuario.ativo;

    try {
        const membroAtualizado = await atualizarStatusMembro(usuario.id, novoStatus);

        usuario.ativo = membroAtualizado.ativo;
        toast.success('Sucesso', `Usuário ${novoStatus ? 'ativado' : 'desativado'} com sucesso!`);
    } catch (error) {
        toast.error('Erro', error.message || 'Não foi possível alterar o status.');
        console.error(error);
    } finally {
        processando.value = null;
    }
}

// Cria um novo usuário via Edge Function
async function criarUsuario() {
    // Validação básica
    if (!formNovoUsuario.value.nome || !formNovoUsuario.value.email || !formNovoUsuario.value.password) {
        toast.error('Atenção', 'Preencha todos os campos obrigatórios.');
        return;
    }
    if (formNovoUsuario.value.password.length < 8) {
        toast.error('Atenção', 'A senha deve ter no mínimo 8 caracteres.');
        return;
    }

    criandoUsuario.value = true;
    
    try {
        // Chama a Edge Function criada no Supabase
        await criarMembroEquipe({
            nome: formNovoUsuario.value.nome,
            email: formNovoUsuario.value.email,
            password: formNovoUsuario.value.password,
            perfil: formNovoUsuario.value.perfil
        });

        toast.success('Sucesso', 'Membro da equipe criado com sucesso!');
        
        // Fecha o modal e limpa o formulário
        isModalOpen.value = false;
        formNovoUsuario.value = { nome: '', email: '', password: '', perfil: 'tecnico' };
        
        // Recarrega a tabela silenciosamente para exibir o novo usuário
        await carregarEquipe();
        
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        toast.error('Erro', 'Não foi possível criar o usuário. Verifique os dados.');
    } finally {
        criandoUsuario.value = false;
    }
}

function formatarPerfil(perfil) {
    const perfis = { 'gerente': 'Gerente', 'atendente': 'Atendente', 'tecnico': 'Técnico' };
    return perfis[perfil] || perfil;
}

function obterCorPerfil(perfil) {
    switch (perfil) {
        case 'gerente': return 'default';
        case 'tecnico': return 'secondary';
        case 'atendente': return 'outline';
        default: return 'outline';
    }
}

onMounted(() => {
    carregarEquipe();
});

watch(busca, () => {
    pagina.value = 1;
    clearTimeout(buscaTimer);
    buscaTimer = setTimeout(carregarEquipe, 300);
});

function mudarPagina(novaPagina) {
    if (novaPagina < 1 || novaPagina > totalPaginas.value || novaPagina === pagina.value) return;
    pagina.value = novaPagina;
    carregarEquipe();
}
</script>

<template>
    <div class="space-y-6">
        <PageHeader eyebrow="Pessoas e acessos" title="Equipe" description="Mantenha os acessos certos para cada pessoa da sua operação." tip="Crie um acesso para cada funcionário e escolha o perfil conforme sua função. Bloquear um membro impede novos acessos sem apagar o histórico da operação.">
            <template #actions>
            <Button class="w-full gap-2 sm:w-auto" @click="isModalOpen = true">
                <UserPlus class="w-4 h-4" /> Novo Usuário
            </Button>
            </template>
        </PageHeader>

        <Card>
            <CardContent class="p-0">
                <div class="border-b border-border p-4">
                    <Input v-model="busca" placeholder="Buscar membro por nome..." class="max-w-sm" />
                </div>
                <div class="hidden overflow-x-auto md:block">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Perfil</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead class="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow v-if="loading" v-for="i in 3" :key="i">
                                <TableCell><Skeleton class="h-5 w-40" /></TableCell>
                                <TableCell><Skeleton class="h-6 w-20 rounded-full" /></TableCell>
                                <TableCell><Skeleton class="h-6 w-16 rounded-full" /></TableCell>
                                <TableCell class="text-right"><Skeleton class="h-8 w-24 ml-auto" /></TableCell>
                            </TableRow>

                            <TableRow v-else v-for="membro in equipe" :key="membro.id">
                                <TableCell class="font-medium text-slate-900">
                                    {{ membro.nome }}
                                    <span v-if="membro.id === authStore.user.id" class="text-xs text-muted-foreground ml-2">(Você)</span>
                                </TableCell>
                                <TableCell>
                                    <Badge :variant="obterCorPerfil(membro.perfil)">
                                        {{ formatarPerfil(membro.perfil) }}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge :variant="membro.ativo ? 'success' : 'destructive'" class="bg-opacity-20">
                                        {{ membro.ativo ? 'Ativo' : 'Bloqueado' }}
                                    </Badge>
                                </TableCell>
                                <TableCell class="text-right space-x-2">
                                    <Button 
                                        v-if="membro.id !== authStore.user.id"
                                        :variant="membro.ativo ? 'destructive' : 'outline'" 
                                        size="sm" 
                                        class="gap-1"
                                        :disabled="processando === membro.id"
                                        @click="alternarStatus(membro)"
                                    >
                                        <template v-if="membro.ativo">
                                            <ShieldBan class="w-3.5 h-3.5" /> Bloquear
                                        </template>
                                        <template v-else>
                                            <CheckCircle class="w-3.5 h-3.5 text-green-600" /> Reativar
                                        </template>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
                <div class="grid gap-3 bg-slate-50/50 p-4 md:hidden">
                    <div v-if="loading" v-for="i in 3" :key="`mobile-loading-${i}`" class="rounded-lg border border-border bg-background p-4">
                        <div class="space-y-3">
                            <Skeleton class="h-5 w-2/3" />
                            <Skeleton class="h-6 w-20" />
                            <Skeleton class="h-8 w-24" />
                        </div>
                    </div>
                    <div v-else-if="equipe.length === 0" class="py-8 text-center text-sm text-muted-foreground">
                        Nenhum membro encontrado.
                    </div>
                    <div v-else v-for="membro in equipe" :key="`mobile-${membro.id}`" class="rounded-lg border border-border bg-background p-4 shadow-sm">
                        <div class="flex items-start justify-between gap-3">
                            <div class="min-w-0">
                                <h3 class="truncate font-semibold text-foreground">
                                    {{ membro.nome }}
                                    <span v-if="membro.id === authStore.user.id" class="text-xs font-normal text-muted-foreground">(Você)</span>
                                </h3>
                                <div class="mt-2 flex flex-wrap gap-2">
                                    <Badge :variant="obterCorPerfil(membro.perfil)">{{ formatarPerfil(membro.perfil) }}</Badge>
                                    <Badge :variant="membro.ativo ? 'success' : 'destructive'">{{ membro.ativo ? 'Ativo' : 'Bloqueado' }}</Badge>
                                </div>
                            </div>
                            <Button
                                v-if="membro.id !== authStore.user.id"
                                :variant="membro.ativo ? 'destructive' : 'outline'"
                                size="sm"
                                class="shrink-0 gap-1"
                                :disabled="processando === membro.id"
                                @click="alternarStatus(membro)"
                            >
                                <ShieldBan v-if="membro.ativo" class="h-3.5 w-3.5" />
                                <CheckCircle v-else class="h-3.5 w-3.5 text-green-600" />
                                {{ membro.ativo ? 'Bloquear' : 'Reativar' }}
                            </Button>
                        </div>
                    </div>
                </div>
                <div v-if="totalMembros > 0" class="flex flex-col gap-3 border-t border-border p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <span class="text-muted-foreground">
                        Página {{ pagina }} de {{ totalPaginas }} · {{ totalMembros }} membros
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

        <!-- Modal de Novo Usuário -->
        <Modal 
            v-model="isModalOpen" 
            title="Adicionar Membro" 
            description="Crie um acesso para um novo funcionário da assistência." 
            size="md"
        >
            <div class="space-y-4 py-2">
                <FormGroup id="nome" label="Nome Completo">
                    <Input id="nome" v-model="formNovoUsuario.nome" placeholder="Digite o nome do funcionário" />
                </FormGroup>

                <FormGroup id="email" label="E-mail de Acesso">
                    <Input id="email" type="email" v-model="formNovoUsuario.email" placeholder="funcionario@email.com" />
                </FormGroup>

                <FormGroup id="senha" label="Senha Provisória" description="O funcionário usará esta senha para o primeiro acesso.">
                    <Input id="senha" type="password" v-model="formNovoUsuario.password" placeholder="Mínimo 6 caracteres" />
                </FormGroup>

                <FormGroup id="perfil" label="Perfil de Acesso">
                    <Select id="perfil" v-model="formNovoUsuario.perfil">
                        <option value="tecnico">Técnico (Acesso Operacional)</option>
                        <option value="atendente">Atendente (Acesso Front-Desk)</option>
                        <option value="gerente">Gerente (Acesso Total da Empresa)</option>
                    </Select>
                </FormGroup>
            </div>
            
            <template #footer>
                <Button variant="ghost" @click="isModalOpen = false" :disabled="criandoUsuario">Cancelar</Button>
                <Button variant="default" @click="criarUsuario" :disabled="criandoUsuario" class="gap-2">
                    <UserPlus class="w-4 h-4" v-if="!criandoUsuario" />
                    {{ criandoUsuario ? 'Cadastrando...' : 'Criar Acesso' }}
                </Button>
            </template>
        </Modal>
    </div>
</template>