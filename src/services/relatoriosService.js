import { supabase } from './supabase';

function exigirEmpresa(empresaId) {
    if (!empresaId) throw new Error('Empresa nao identificada.');
}

function limitesDoPeriodo(dataInicio, dataFim) {
    const inicio = new Date(`${dataInicio}T00:00:00`);
    const fim = new Date(`${dataFim}T00:00:00`);
    fim.setDate(fim.getDate() + 1);
    return { inicio: inicio.toISOString(), fim: fim.toISOString() };
}

export async function carregarRelatorioOS(empresaId, { dataInicio, dataFim }) {
    exigirEmpresa(empresaId);
    const limites = limitesDoPeriodo(dataInicio, dataFim);
    const { data, error } = await supabase
        .from('ordens_servico')
        .select('id, status, valor_total, data_previsao, data_conclusao, created_at')
        .eq('empresa_id', empresaId)
        .is('deleted_at', null)
        .gte('created_at', limites.inicio)
        .lt('created_at', limites.fim)
        .order('created_at', { ascending: false });

    if (error) throw error;

    const ordens = data || [];
    const porStatus = ordens.reduce((resultado, ordem) => {
        resultado[ordem.status] = (resultado[ordem.status] || 0) + 1;
        return resultado;
    }, {});
    const concluidas = ordens.filter((ordem) => ordem.status === 'concluida');
    const faturamento = concluidas.reduce((total, ordem) => total + (Number(ordem.valor_total) || 0), 0);
    const foraDoPrazo = ordens.filter((ordem) => {
        if (!ordem.data_previsao) return false;
        const previsao = new Date(ordem.data_previsao);
        const dataFinal = ordem.data_conclusao ? new Date(ordem.data_conclusao) : new Date();
        return dataFinal > previsao && ordem.status !== 'cancelada';
    }).length;

    return {
        total: ordens.length,
        porStatus,
        faturamento,
        ticketMedio: concluidas.length ? faturamento / concluidas.length : 0,
        concluidas: concluidas.length,
        foraDoPrazo,
    };
}
