import { supabase } from './supabase';

const camposLembrete = 'id, empresa_id, usuario_id, tipo, referencia_id, mensagem, data_alvo, lido, created_at';

function exigirContexto(empresaId, usuarioId) {
    if (!empresaId || !usuarioId) {
        throw new Error('Usuario ou empresa nao identificados.');
    }
}

export async function listarLembretes(empresaId, usuarioId, { pagina = 1, porPagina = 20, apenasPendentes = false } = {}) {
    exigirContexto(empresaId, usuarioId);
    const paginaSegura = Math.max(1, Number(pagina) || 1);
    const limite = Math.min(100, Math.max(1, Number(porPagina) || 20));
    const inicio = (paginaSegura - 1) * limite;

    let consulta = supabase
        .from('lembretes')
        .select(camposLembrete, { count: 'exact' })
        .eq('empresa_id', empresaId)
        .eq('usuario_id', usuarioId)
        .order('lido', { ascending: true })
        .order('data_alvo', { ascending: true })
        .range(inicio, inicio + limite - 1);

    if (apenasPendentes) {
        consulta = consulta.eq('lido', false);
    }

    const { data, error, count } = await consulta;
    if (error) throw error;
    return { items: data || [], total: count || 0 };
}

export async function listarLembretesPendentes(empresaId, usuarioId, limite = 5) {
    exigirContexto(empresaId, usuarioId);

    const { data, error, count } = await supabase
        .from('lembretes')
        .select('id, tipo, mensagem, data_alvo, lido', { count: 'exact' })
        .eq('empresa_id', empresaId)
        .eq('usuario_id', usuarioId)
        .eq('lido', false)
        .order('data_alvo', { ascending: true })
        .range(0, Math.max(0, limite - 1));

    if (error) throw error;
    return { items: data || [], total: count || 0 };
}

export async function listarLembretesDaReferencia(empresaId, usuarioId, referenciaId) {
    exigirContexto(empresaId, usuarioId);
    if (!referenciaId) throw new Error('Referencia nao identificada.');
    const { data, error } = await supabase
        .from('lembretes')
        .select('id, tipo, mensagem, data_alvo, lido')
        .eq('empresa_id', empresaId)
        .eq('usuario_id', usuarioId)
        .eq('referencia_id', referenciaId)
        .order('data_alvo', { ascending: true });
    if (error) throw error;
    return data || [];
}

export async function marcarLembreteComoLido(lembreteId, usuarioId) {
    if (!lembreteId || !usuarioId) throw new Error('Lembrete ou usuario nao identificado.');

    const { data, error } = await supabase
        .from('lembretes')
        .update({ lido: true })
        .eq('id', lembreteId)
        .eq('usuario_id', usuarioId)
        .select('id, lido')
        .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Lembrete nao encontrado ou alteracao nao autorizada.');
    return data;
}

export async function criarLembrete(empresaId, usuarioId, lembrete) {
    exigirContexto(empresaId, usuarioId);

    const { data, error } = await supabase
        .from('lembretes')
        .insert({ ...lembrete, empresa_id: empresaId, usuario_id: usuarioId })
        .select(camposLembrete)
        .single();

    if (error) throw error;
    return data;
}

export async function atualizarLembrete(lembreteId, usuarioId, lembrete) {
    if (!lembreteId || !usuarioId) throw new Error('Lembrete ou usuario nao identificado.');

    const { data, error } = await supabase
        .from('lembretes')
        .update(lembrete)
        .eq('id', lembreteId)
        .eq('usuario_id', usuarioId)
        .select(camposLembrete)
        .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Lembrete nao encontrado ou alteracao nao autorizada.');
    return data;
}

export async function adiarLembrete(lembreteId, usuarioId, dataAlvo) {
    return atualizarLembrete(lembreteId, usuarioId, {
        data_alvo: new Date(dataAlvo).toISOString(),
        lido: false,
    });
}

export async function excluirLembrete(lembreteId, usuarioId) {
    if (!lembreteId || !usuarioId) throw new Error('Lembrete ou usuario nao identificado.');

    const { data, error } = await supabase
        .from('lembretes')
        .delete()
        .eq('id', lembreteId)
        .eq('usuario_id', usuarioId)
        .select('id')
        .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Lembrete nao encontrado ou exclusao nao autorizada.');
    return data;
}
