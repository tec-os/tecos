<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/auth';
import { Printer, ArrowLeft, X } from '@lucide/vue';
import Button from '@/components/ui/Button.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const os = ref(null);
const itens = ref([]);
const empresa = ref(null);
const loading = ref(true);
const erro = ref('');

async function carregarDadosImpressao() {
    loading.value = true;
    erro.value = '';
    try {
        const osId = route.params.id;

        // 1. Busca os dados da Empresa (Tenant logado)
        const { data: dadosEmpresa } = await supabase
            .from('empresas')
            .select('id, nome_fantasia, razao_social, documento, telefone, email')
            .eq('id', authStore.userProfile.empresa_id)
            .single();
        empresa.value = dadosEmpresa;

        // 2. Busca a OS e os dados do Cliente
        const { data: dadosOS, error: erroOS } = await supabase
            .from('ordens_servico')
            .select('id, numero_os, status, created_at, updated_at, data_previsao, descricao_problema, diagnostico, solucao_executada, valor_total, desconto, equipamento_id, equipamentos(tipo, marca, modelo, numero_serie, identificacao), clientes(id, nome, tipo_pessoa, documento, email, telefone, celular, cep, logradouro, numero, bairro, cidade, estado)')
            .eq('id', osId)
            .single();
        if (erroOS) throw erroOS;
        os.value = dadosOS;

        // 3. Busca os Itens/Peças da OS
        const { data: dadosItens } = await supabase
            .from('os_itens')
            .select('id, os_id, tipo, descricao, quantidade, valor_unitario, created_at')
            .eq('os_id', osId)
            .order('created_at', { ascending: true });
        itens.value = dadosItens || [];

    } catch (error) {
        console.error('Erro ao carregar dados para impressão:', error);
        erro.value = 'Não foi possível carregar o documento da ordem de serviço.';
    } finally {
        loading.value = false;
        // Opcional: Aciona a janela de impressão automaticamente após carregar
        // setTimeout(() => window.print(), 500);
    }
}

function tentarNovamente() {
    carregarDadosImpressao();
}

function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
}

function formatarData(dataISO) {
    if (!dataISO) return '';
    return new Date(dataISO).toLocaleDateString('pt-BR');
}

function imprimir() {
    window.print();
}

function fecharAba() {
    window.close();
}

onMounted(() => {
    carregarDadosImpressao();
});
</script>

<template>
    <div v-if="loading" class="flex min-h-screen items-center justify-center bg-[#f5f7f4] text-primary">
        <div class="text-center"><Printer class="mx-auto h-8 w-8 animate-pulse text-destructive" /><p class="mt-3 text-sm font-medium">Preparando documento...</p></div>
    </div>

    <div v-else-if="erro" class="flex min-h-screen items-center justify-center bg-[#f5f7f4] p-5">
        <div class="w-full max-w-md rounded-xl border border-[#e4c1b3] bg-[#fff8f4] p-6 text-center">
            <p class="font-semibold text-[#a95639]">{{ erro }}</p>
            <div class="mt-5 flex justify-center gap-2"><Button variant="outline" @click="fecharAba">Fechar</Button><Button @click="tentarNovamente">Tentar novamente</Button></div>
        </div>
    </div>

    <div v-else class="bg-white min-h-screen">
        <!-- BARRA DE AÇÕES (ESCONDIDA NA IMPRESSÃO) -->
        <div class="print:hidden flex items-center justify-between border-b border-[#d6e0d8] bg-[#eef3ee] p-4 no-print">
            <button @click="fecharAba" class="flex cursor-pointer items-center gap-2 font-medium text-[#376056] hover:text-primary">
                <X class="w-4 h-4" /> Fechar Aba
            </button>
            <button @click="imprimir" class="flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-bold text-primary-foreground shadow-sm hover:bg-[#26564d]">
                <Printer class="w-4 h-4" /> Imprimir / Gerar PDF
            </button>
        </div>

        <!-- ÁREA DO DOCUMENTO A4 -->
        <div class="max-w-4xl mx-auto p-8 bg-white print:p-0 print:max-w-full text-slate-800">
            
            <!-- CABEÇALHO -->
            <div class="mb-6 flex items-start justify-between border-b-2 border-primary pb-6">
                <div>
                    <h1 class="text-3xl font-black uppercase tracking-tight text-slate-900">{{ empresa?.nome_fantasia || empresa?.razao_social || 'NOME DA EMPRESA' }}</h1>
                    <div class="mt-2 text-sm text-slate-600 space-y-1">
                        <p v-if="empresa?.documento">CNPJ/CPF: {{ empresa.documento }}</p>
                        <p v-if="empresa?.telefone">Telefone: {{ empresa.telefone }}</p>
                        <p v-if="empresa?.email">E-mail: {{ empresa.email }}</p>
                    </div>
                </div>
                <div class="text-right">
                    <h2 class="text-2xl font-bold text-slate-400">{{ ['rascunho', 'aberta', 'aguardando_aprovacao', 'orcamento_reprovado'].includes(os.status) ? 'ORÇAMENTO' : 'ORDEM DE SERVIÇO' }}</h2>
                    <p class="mt-1 text-xl font-black text-slate-900">Nº {{ os.numero_os.toString().padStart(5, '0') }}</p>
                    <p class="mt-2 text-sm text-slate-500">Abertura: {{ formatarData(os.created_at) }}</p>
                    <p v-if="os.data_previsao" class="text-sm text-slate-500">Previsão: {{ formatarData(os.data_previsao) }}</p>
                    <span class="mt-2 inline-block rounded-full bg-[#e8f3e4] px-2.5 py-1 text-xs font-bold uppercase text-[#47734d]">{{ os.status.replace('_', ' ') }}</span>
                </div>
            </div>

            <!-- DADOS DO CLIENTE -->
            <div class="mb-8">
                <h3 class="font-bold text-slate-900 uppercase border-b border-slate-300 mb-3 pb-1">Dados do Cliente</h3>
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div><span class="font-semibold">Nome:</span> {{ os.clientes?.nome }}</div>
                    <div><span class="font-semibold">Documento:</span> {{ os.clientes?.documento || 'Não informado' }}</div>
                    <div><span class="font-semibold">Celular:</span> {{ os.clientes?.celular || os.clientes?.telefone || 'Não informado' }}</div>
                    <div><span class="font-semibold">E-mail:</span> {{ os.clientes?.email || 'Não informado' }}</div>
                </div>
            </div>

            <div v-if="os.equipamentos" class="mb-8">
                <h3 class="font-bold text-slate-900 uppercase border-b border-slate-300 mb-3 pb-1">Equipamento</h3>
                <p class="text-sm"><span class="font-semibold">{{ os.equipamentos.tipo }}</span>{{ os.equipamentos.marca || os.equipamentos.modelo ? ` · ${[os.equipamentos.marca, os.equipamentos.modelo].filter(Boolean).join(' ')}` : '' }}{{ os.equipamentos.numero_serie ? ` · Série ${os.equipamentos.numero_serie}` : '' }}</p>
            </div>

            <!-- LAUDO TÉCNICO -->
            <div class="mb-8">
                <h3 class="font-bold text-slate-900 uppercase border-b border-slate-300 mb-3 pb-1">Relatório Técnico</h3>
                <div class="space-y-4 text-sm">
                    <div>
                        <span class="font-semibold block mb-1">Problema Relatado:</span>
                        <p class="p-3 bg-slate-50 border border-slate-200 rounded min-h-15">{{ os.descricao_problema }}</p>
                    </div>
                    <div v-if="os.diagnostico">
                        <span class="font-semibold block mb-1">Diagnóstico:</span>
                        <p class="p-3 bg-slate-50 border border-slate-200 rounded min-h-15">{{ os.diagnostico }}</p>
                    </div>
                    <div v-if="os.solucao_executada">
                        <span class="font-semibold block mb-1">Solução Executada:</span>
                        <p class="p-3 bg-slate-50 border border-slate-200 rounded min-h-15">{{ os.solucao_executada }}</p>
                    </div>
                </div>
            </div>

            <!-- PEÇAS E SERVIÇOS -->
            <div class="mb-8">
                <h3 class="font-bold text-slate-900 uppercase border-b border-slate-300 mb-3 pb-1">Peças e Serviços</h3>
                <table class="w-full text-sm border-collapse">
                    <thead>
                        <tr class="bg-slate-100 border-b border-slate-300 text-left">
                            <th class="py-2 px-3 font-semibold w-16">Qtd</th>
                            <th class="py-2 px-3 font-semibold">Descrição</th>
                            <th class="py-2 px-3 font-semibold text-right w-32">V. Unitário</th>
                            <th class="py-2 px-3 font-semibold text-right w-32">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="itens.length === 0">
                            <td colspan="4" class="py-4 px-3 text-center text-slate-500 border-b border-slate-200">Nenhum item lançado nesta OS.</td>
                        </tr>
                        <tr v-for="item in itens" :key="item.id" class="border-b border-slate-200">
                            <td class="py-2 px-3 text-center">{{ item.quantidade }}</td>
                            <td class="py-2 px-3">{{ item.descricao }}</td>
                            <td class="py-2 px-3 text-right">{{ formatarMoeda(item.valor_unitario) }}</td>
                            <td class="py-2 px-3 text-right font-medium">{{ formatarMoeda(item.quantidade * item.valor_unitario) }}</td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr v-if="os.desconto">
                            <td colspan="3" class="px-3 pt-3 text-right text-sm text-slate-500">Desconto:</td>
                            <td class="px-3 pt-3 text-right text-sm text-slate-500">- {{ formatarMoeda(os.desconto) }}</td>
                        </tr>
                        <tr>
                            <td colspan="3" class="py-3 px-3 text-right font-bold text-slate-900">VALOR TOTAL:</td>
                            <td class="py-3 px-3 text-right font-black text-lg text-slate-900">{{ formatarMoeda(os.valor_total) }}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <!-- ASSINATURAS -->
            <div class="mt-20 grid grid-cols-2 gap-16 text-center text-sm">
                <div>
                    <div class="border-t border-slate-800 pt-2">
                        <p class="font-bold">{{ empresa?.nome_fantasia || empresa?.razao_social || 'Assistência Técnica' }}</p>
                        <p class="text-slate-500">Responsável Técnico</p>
                    </div>
                </div>
                <div>
                    <div class="border-t border-slate-800 pt-2">
                        <p class="font-bold">{{ os.clientes?.nome }}</p>
                        <p class="text-slate-500">Cliente (De Acordo)</p>
                    </div>
                </div>
            </div>
            
            <div class="mt-12 text-center text-xs text-slate-400 print:block">
                Documento gerado por {{ authStore.userProfile?.nome }} via TeCOS.
            </div>

        </div>
    </div>
</template>

<style>
/* Esconde tudo que tem a classe 'print:hidden' na hora de imprimir */
@media print {
    .print\:hidden {
        display: none !important;
    }
    body {
        background-color: white;
    }
}
</style>