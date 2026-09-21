import { supabase } from './supabase';

function exigirEmpresa(empresaId) {
    if (!empresaId) {
        throw new Error('Empresa não identificada.');
    }
}

export async function buscarAssinaturaEmpresa(empresaId) {
    exigirEmpresa(empresaId);

    const { data, error } = await supabase
        .from('assinaturas')
        .select(`
            id, 
            status, 
            inicio_teste, 
            fim_teste, 
            proximo_vencimento, 
            url_pagamento,
            planos (
                nome, 
                periodicidade, 
                valor, 
                limite_usuarios
            )
        `)
        .eq('empresa_id', empresaId)
        .single();

    if (error) {
        console.error('Erro ao buscar assinatura da empresa:', error);
        throw new Error('Não foi possível carregar os dados da assinatura.');
    }

    return data;
}

