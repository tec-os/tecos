<script setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { supabase } from '../../services/supabase';

import PublicAuthShell from '@/components/common/PublicAuthShell.vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import FormGroup from '@/components/ui/FormGroup.vue';
import { AlertCircle, ArrowRight, Building2, FileText, LockKeyhole, Mail, User, Loader2 } from '@lucide/vue';

const router = useRouter();
const route = useRoute();
const loading = ref(false);
const erro = ref('');
const statusMsg = ref('');
const planoId = ref('');
const form = ref({ razao_social: '', documento: '', nome: '', email: '', senha: '' });

onMounted(() => {
    if (!route.query.plano) {
        router.push('/');
        return;
    }
    planoId.value = route.query.plano;
});

async function cadastrar() {
    loading.value = true;
    erro.value = '';
    statusMsg.value = 'Configurando seu ambiente...';
    try {
        statusMsg.value = 'Preparando sua assinatura...';
        const { data: asaasData, error: asaasError } = await supabase.functions.invoke('asaas-onboarding', {
            body: { ...form.value, plano_id: planoId.value },
        });
        if (asaasError || asaasData?.erro) {
            let mensagem = asaasData?.erro;
            if (!mensagem && asaasError?.context instanceof Response) {
                const resposta = await asaasError.context.json().catch(() => null);
                mensagem = resposta?.erro;
                if (resposta?.etapa) mensagem = `${mensagem || 'Erro no cadastro'} Etapa: ${resposta.etapa}.`;
            }
            throw new Error(mensagem || 'Não foi possível concluir o cadastro.');
        }
        router.push({ name: 'checkout', query: { link: asaasData.invoiceUrl } });
    } catch (error) {
        erro.value = error.message;
        loading.value = false;
    }
}
</script>

<template>
    <PublicAuthShell eyebrow="Comece sua operação" title="Configure seu ambiente" description="Leva poucos minutos. Depois disso, sua empresa já terá um espaço próprio para organizar os atendimentos.">
        <div class="mb-6 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span class="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">1</span><span class="text-primary">Dados da empresa</span><span class="h-px flex-1 bg-border"></span><span class="flex h-6 w-6 items-center justify-center rounded-full border border-border">2</span><span>Assinatura</span>
        </div>
        <div v-if="loading" class="mb-5 flex items-center gap-3 rounded-lg border border-[#c8d9ce] bg-[#eef3ee] p-3 text-sm text-[#376056]"><Loader2 class="h-4 w-4 animate-spin" /><span>{{ statusMsg }}</span></div>
        <form class="space-y-4" @submit.prevent="cadastrar">
            <div v-if="erro" class="flex items-start gap-3 rounded-lg border border-[#e4c1b3] bg-[#fff8f4] p-3 text-sm text-[#a95639]" role="alert"><AlertCircle class="mt-0.5 h-4 w-4 shrink-0" /><span>{{ erro }}</span></div>
            <FormGroup id="cadastro-razao" label="Nome da empresa">
                <div class="relative"><Building2 class="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input id="cadastro-razao" v-model="form.razao_social" class="pl-9" placeholder="Ex.: Oficina do João" required /></div>
            </FormGroup>
            <div class="grid gap-4 sm:grid-cols-2">
                <FormGroup id="cadastro-documento" label="CPF ou CNPJ"><div class="relative"><FileText class="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input id="cadastro-documento" v-model="form.documento" class="pl-9" placeholder="00.000.000/0001-00" required /></div></FormGroup>
                <FormGroup id="cadastro-nome" label="Seu nome"><div class="relative"><User class="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input id="cadastro-nome" v-model="form.nome" class="pl-9" placeholder="Nome completo" required /></div></FormGroup>
            </div>
            <FormGroup id="cadastro-email" label="E-mail de acesso"><div class="relative"><Mail class="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input id="cadastro-email" v-model="form.email" class="pl-9" type="email" autocomplete="email" placeholder="voce@empresa.com" required /></div></FormGroup>
            <FormGroup id="cadastro-senha" label="Senha" description="Use pelo menos 6 caracteres."><div class="relative"><LockKeyhole class="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input id="cadastro-senha" v-model="form.senha" class="pl-9" type="password" autocomplete="new-password" placeholder="Crie uma senha" minlength="6" required /></div></FormGroup>
            <Button class="h-11 w-full justify-between bg-primary px-4 hover:bg-[#26564d]" :disabled="loading" type="submit"><span>{{ loading ? 'Configurando...' : 'Continuar para assinatura' }}</span><Loader2 v-if="loading" class="h-4 w-4 animate-spin" /><ArrowRight v-else class="h-4 w-4" /></Button>
        </form>
        <p class="mt-7 border-t border-border pt-5 text-center text-sm text-muted-foreground">Já possui uma conta? <RouterLink to="/login" class="font-semibold text-primary hover:text-destructive">Entrar</RouterLink></p>
    </PublicAuthShell>
</template>
