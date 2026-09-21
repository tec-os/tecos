import { supabase } from './supabase';

const campos = 'id, empresa_id, os_id, valor, forma_pagamento, status, vencimento, pago_em, observacoes, created_at, updated_at, ordens_servico(numero_os, clientes(nome))';

function exigirEmpresa(empresaId) {
    if (!empresaId) throw new Error('Empresa nao identificada.');
}

export async function listarRecebimentos(empresaId, { pagina = 1, porPagina = 20, status = '' } = {}) {
    exigirEmpresa(empresaId);
    const inicio = (Math.max(1, pagina) - 1) * porPagina;
    let consulta = supabase.from('recebimentos').select(campos, { count: 'exact' }).eq('empresa_id', empresaId).is('deleted_at', null).order('vencimento', { ascending: true, nullsFirst: false }).range(inicio, inicio + porPagina - 1);
    if (status) consulta = consulta.eq('status', status);
    const { data, error, count } = await consulta;
    if (error) throw error;
    return { items: data || [], total: count || 0 };
}

export async function listarRecebimentosDaOrdem(ordemId) {
    if (!ordemId) throw new Error('OS nao identificada.');
    const { data, error } = await supabase
        .from('recebimentos')
        .select('id, valor, forma_pagamento, status, vencimento, pago_em, observacoes')
        .eq('os_id', ordemId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
}

export async function listarOSParaRecebimento(empresaId) {
    exigirEmpresa(empresaId);
    const { data, error } = await supabase.from('ordens_servico').select('id, numero_os, valor_total, clientes(nome)').eq('empresa_id', empresaId).is('deleted_at', null).not('status', 'eq', 'cancelada').order('numero_os', { ascending: false }).limit(1000);
    if (error) throw error;
    return data || [];
}

export async function criarRecebimento(empresaId, recebimento) {
    exigirEmpresa(empresaId);
    const { data, error } = await supabase.from('recebimentos').insert({ ...recebimento, empresa_id: empresaId }).select(campos).single();
    if (error) throw error;
    return data;
}

export async function atualizarRecebimento(recebimentoId, recebimento) {
    const { data, error } = await supabase.from('recebimentos').update(recebimento).eq('id', recebimentoId).select(campos).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Recebimento nao encontrado ou alteracao nao autorizada.');
    return data;
}

export async function excluirRecebimento(recebimentoId) {
    const { data, error } = await supabase.from('recebimentos').update({ deleted_at: new Date().toISOString() }).eq('id', recebimentoId).select('id').maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Recebimento nao encontrado ou exclusao nao autorizada.');
    return data;
}
