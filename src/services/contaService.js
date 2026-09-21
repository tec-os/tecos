import { supabase } from './supabase';

export async function buscarAssinaturaDaEmpresa(empresaId) {
    if (!empresaId) {
        throw new Error('Empresa nao identificada.');
    }

    const { data, error } = await supabase
        .from('assinaturas')
        .select('status, url_pagamento')
        .eq('empresa_id', empresaId)
        .single();

    if (error) {
        if (error.code === '42501' || error.status === 403) {
            throw new Error('Acesso a assinatura bloqueado pelo RLS.');
        }
        if (error.code === 'PGRST116') {
            throw new Error('Assinatura nao encontrada para esta empresa.');
        }
        throw new Error('Nao foi possivel consultar a assinatura.');
    }

    return data;
}

export async function buscarEmpresaDoUsuario(usuarioId) {
    if (!usuarioId) {
        throw new Error('Usuario nao identificado.');
    }

    const { data, error } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', usuarioId)
        .single();

    if (error || !data?.empresa_id) {
        throw new Error('Empresa do usuario nao encontrada.');
    }

    return data.empresa_id;
}
