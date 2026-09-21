import { ref } from 'vue';
import { listarLembretesPendentes } from '@/services/lembretesService';
import { toast } from '@/composables/useToast';

const lembretesPendentes = ref([]);
const totalPendentes = ref(0);
const carregando = ref(false);
let intervalo = null;
let primeiraConsulta = true;
const idsNotificados = new Set();

function formatarData(valor) {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(valor));
}

async function atualizar(empresaId, usuarioId) {
    if (!empresaId || !usuarioId) return;
    carregando.value = true;
    try {
        const resultado = await listarLembretesPendentes(empresaId, usuarioId);
        lembretesPendentes.value = resultado.items;
        totalPendentes.value = resultado.total;

        if (!primeiraConsulta) {
            resultado.items
                .filter((lembrete) => !idsNotificados.has(lembrete.id) && new Date(lembrete.data_alvo) <= new Date())
                .forEach((lembrete) => {
                    toast.default('Lembrete vencido', `${lembrete.mensagem} · ${formatarData(lembrete.data_alvo)}`, Infinity);
                    idsNotificados.add(lembrete.id);
                });
        }

        resultado.items.forEach((lembrete) => {
            if (new Date(lembrete.data_alvo) > new Date()) idsNotificados.delete(lembrete.id);
        });
        primeiraConsulta = false;
    } catch (error) {
        console.error('Erro ao atualizar notificacoes de lembretes:', error);
    } finally {
        carregando.value = false;
    }
}

function iniciar(empresaId, usuarioId) {
    parar();
    primeiraConsulta = true;
    atualizar(empresaId, usuarioId);
    intervalo = setInterval(() => atualizar(empresaId, usuarioId), 30000);
}

function parar() {
    if (intervalo) clearInterval(intervalo);
    intervalo = null;
}

export function useLembretesNotifications() {
    return { lembretesPendentes, totalPendentes, carregando, atualizar, iniciar, parar };
}