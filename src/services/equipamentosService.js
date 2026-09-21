import { supabase } from './supabase';

const campos = 'id, empresa_id, cliente_id, tipo, marca, modelo, numero_serie, identificacao, observacoes, ativo, created_at, updated_at, clientes(nome)';

function exigirEmpresa(empresaId) {
    if (!empresaId) throw new Error('Empresa nao identificada.');
}

export async function listarEquipamentos(empresaId, { pagina = 1, porPagina = 20, busca = '', clienteId = '' } = {}) {
    exigirEmpresa(empresaId);
    const inicio = (Math.max(1, pagina) - 1) * porPagina;
    const termo = busca.trim();
    let consulta = supabase
        .from('equipamentos')
        .select(campos, { count: 'exact' })
        .eq('empresa_id', empresaId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(inicio, inicio + porPagina - 1);

    if (clienteId) consulta = consulta.eq('cliente_id', clienteId);
    if (termo) consulta = consulta.or(`tipo.ilike.%${termo}%,marca.ilike.%${termo}%,modelo.ilike.%${termo}%,numero_serie.ilike.%${termo}%,identificacao.ilike.%${termo}%`);

    const { data, error, count } = await consulta;
    if (error) throw error;
    return { items: data || [], total: count || 0 };
}

export async function listarClientesParaEquipamentos(empresaId) {
    exigirEmpresa(empresaId);
    const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, documento')
        .eq('empresa_id', empresaId)
        .is('deleted_at', null)
        .order('nome', { ascending: true })
        .limit(1000);
    if (error) throw error;
    return data || [];
}

export async function listarEquipamentosDoCliente(empresaId, clienteId) {
    exigirEmpresa(empresaId);
    if (!clienteId) return [];

    const { data, error } = await supabase
        .from('equipamentos')
        .select('id, cliente_id, tipo, marca, modelo, numero_serie, identificacao')
        .eq('empresa_id', empresaId)
        .eq('cliente_id', clienteId)
        .is('deleted_at', null)
        .order('tipo', { ascending: true });

    if (error) throw error;
    return data || [];
}

export async function criarEquipamento(empresaId, equipamento) {
    exigirEmpresa(empresaId);
    const { data, error } = await supabase.from('equipamentos').insert({ ...equipamento, empresa_id: empresaId }).select(campos).single();
    if (error) throw error;
    return data;
}

export async function atualizarEquipamento(equipamentoId, equipamento) {
    const { data, error } = await supabase.from('equipamentos').update(equipamento).eq('id', equipamentoId).select(campos).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Equipamento nao encontrado ou alteracao nao autorizada.');
    return data;
}

export async function excluirEquipamento(equipamentoId) {
    const { data, error } = await supabase.from('equipamentos').update({ deleted_at: new Date().toISOString() }).eq('id', equipamentoId).select('id').maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Equipamento nao encontrado ou exclusao nao autorizada.');
    return data;
}

export async function listarHistoricoEquipamento(equipamentoId) {
    if (!equipamentoId) throw new Error('Equipamento nao identificado.');

    const { data, error } = await supabase
        .from('ordens_servico')
        .select('id, numero_os, status, descricao_problema, valor_total, created_at, data_conclusao')
        .eq('equipamento_id', equipamentoId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}
