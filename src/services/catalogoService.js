import { supabase } from './supabase';

const campos = 'id, empresa_id, tipo, nome, descricao, custo, preco, ativo, controlar_estoque, estoque_atual, created_at, updated_at';

function exigirEmpresa(empresaId) {
    if (!empresaId) throw new Error('Empresa nao identificada.');
}

export async function listarCatalogo(empresaId, { busca = '', tipo = '' } = {}) {
    exigirEmpresa(empresaId);
    let consulta = supabase.from('catalogo_itens').select(campos).eq('empresa_id', empresaId).eq('ativo', true).is('deleted_at', null).order('nome', { ascending: true });
    if (tipo) consulta = consulta.eq('tipo', tipo);
    if (busca.trim()) consulta = consulta.ilike('nome', `%${busca.trim()}%`);
    const { data, error } = await consulta;
    if (error) throw error;
    return data || [];
}

export async function criarItemCatalogo(empresaId, item) {
    exigirEmpresa(empresaId);
    const { data, error } = await supabase.from('catalogo_itens').insert({ ...item, empresa_id: empresaId }).select(campos).single();
    if (error) throw error;
    return data;
}

export async function atualizarItemCatalogo(itemId, item) {
    const { data, error } = await supabase.from('catalogo_itens').update(item).eq('id', itemId).select(campos).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Item do catalogo nao encontrado ou alteracao nao autorizada.');
    return data;
}

export async function arquivarItemCatalogo(itemId) {
    const { data, error } = await supabase.from('catalogo_itens').update({ deleted_at: new Date().toISOString(), ativo: false }).eq('id', itemId).select('id').maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Item do catalogo nao encontrado ou arquivamento nao autorizado.');
    return data;
}
