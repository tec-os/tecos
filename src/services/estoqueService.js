import { supabase } from './supabase';

function exigirEmpresa(empresaId) {
    if (!empresaId) {
        throw new Error('Empresa nao identificada.');
    }
}

export async function listarMovimentacoesEstoque(empresaId, itemId = null) {
    exigirEmpresa(empresaId);

    let query = supabase
        .from('estoque_movimentacoes')
        .select(`
            id,
            catalogo_item_id,
            tipo,
            quantidade,
            observacoes,
            created_at,
            os_id,
            usuario_id,
            usuarios (nome)
        `)
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });

    if (itemId) {
        query = query.eq('catalogo_item_id', itemId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

export async function registrarMovimentacaoEstoque(empresaId, payload) {
    exigirEmpresa(empresaId);

    // payload: { catalogo_item_id, tipo, quantidade, observacoes, usuario_id }
    const { data, error } = await supabase
        .from('estoque_movimentacoes')
        .insert({ ...payload, empresa_id: empresaId })
        .select()
        .single();

    if (error) throw error;
    return data;
}

