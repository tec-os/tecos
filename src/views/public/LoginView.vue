<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '../../services/supabase';
import { buscarAssinaturaDaEmpresa, buscarEmpresaDoUsuario } from '../../services/contaService';
import { useAuthStore } from '../../stores/auth';

import PublicAuthShell from '@/components/common/PublicAuthShell.vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import FormGroup from '@/components/ui/FormGroup.vue';
import { AlertCircle, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Loader2 } from '@lucide/vue';

const router = useRouter();
const authStore = useAuthStore();
const loading = ref(false);
const erro = ref('');
const mostrarSenha = ref(false);
const form = ref({ email: '', senha: '' });

async function fazerLogin() {
    loading.value = true;
    erro.value = '';
    try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: form.value.email,
            password: form.value.senha,
        });
        if (authError) throw new Error('E-mail ou senha incorretos.');

        await authStore.carregarSessao();
        
        if (!authStore.userProfile || (!authStore.userProfile.ativo && !authStore.userProfile.is_superadmin)) {
            throw new Error('Acesso negado. A loja ou usuário está bloqueado.');
        }

        if (authStore.userProfile?.is_superadmin) {
            router.push('/admin');
            return;
        }

        const empresaId = await buscarEmpresaDoUsuario(authData.user.id);
        const assinaturaData = await buscarAssinaturaDaEmpresa(empresaId);
        
        if (['ativa', 'atrasada', 'teste'].includes(assinaturaData.status)) {
            router.push('/dashboard');
        } else {
            router.push({ name: 'checkout', query: { link: assinaturaData.url_pagamento } });
        }
    } catch (error) {
        erro.value = error.message || 'Não foi possível entrar agora.';
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <PublicAuthShell eyebrow="Acesso da equipe" title="Entre no seu espaço de trabalho" description="Acompanhe clientes, serviços e a rotina da sua assistência em um só lugar.">
        <form class="space-y-5" @submit.prevent="fazerLogin">
            <div v-if="erro" class="flex items-start gap-3 rounded-lg border border-[#e4c1b3] bg-[#fff8f4] p-3 text-sm text-[#a95639]" role="alert">
                <AlertCircle class="mt-0.5 h-4 w-4 shrink-0" />
                <span>{{ erro }}</span>
            </div>
            <FormGroup id="login-email" label="E-mail de acesso">
                <div class="relative"><Mail class="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input id="login-email" v-model="form.email" class="pl-9" type="email" autocomplete="email" placeholder="voce@empresa.com" required /></div>
            </FormGroup>
            <FormGroup id="login-senha" label="Senha">
                <div class="relative"><LockKeyhole class="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input id="login-senha" v-model="form.senha" class="pl-9 pr-10" :type="mostrarSenha ? 'text' : 'password'" autocomplete="current-password" placeholder="Digite sua senha" required /><button type="button" class="absolute right-2 top-1.5 flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted" :aria-label="mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'" @click="mostrarSenha = !mostrarSenha"><EyeOff v-if="mostrarSenha" class="h-4 w-4" /><Eye v-else class="h-4 w-4" /></button></div>
            </FormGroup>
            <Button class="h-11 w-full justify-between bg-primary px-4 hover:bg-[#26564d]" :disabled="loading" type="submit">
                <span>{{ loading ? 'Entrando...' : 'Entrar na operação' }}</span>
                <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
                <ArrowRight v-else class="h-4 w-4" />
            </Button>
        </form>
        <div class="mt-8 border-t border-border pt-5 text-center text-sm text-muted-foreground">
            Ainda não tem uma conta?
            <RouterLink to="/" class="font-semibold text-primary hover:text-destructive">Conheça os planos</RouterLink>
        </div>
    </PublicAuthShell>
</template>
