import { supabase } from './supabase';

export async function carregarDashboardAdmin() {
    // 1. Busca total de empresas
    const { count: totalEmpresas, error: erroEmpresas } = await supabase
        .from('empresas')
        .select('*', { count: 'exact', head: true });

    if (erroEmpresas) throw erroEmpresas;

    // 2. Busca assinaturas com informações dos planos e empresas
    const { data: assinaturas, error: erroAssinaturas } = await supabase
        .from('assinaturas')
        .select(`
            id,
            status,
            empresas!inner(id, nome_fantasia, razao_social, telefone, ativo),
            planos!inner(id, nome, valor)
        `);

    if (erroAssinaturas) throw erroAssinaturas;

    // Calcular MRR (Monthly Recurring Revenue)
    const assinaturasPagas = assinaturas.filter(a => a.status === 'ativa' || a.status === 'atrasada');
    const mrr = assinaturasPagas.reduce((acc, a) => acc + Number(a.planos.valor || 0), 0);
    const totalAtrasadas = assinaturas.filter(a => a.status === 'atrasada').length;
    
    return {
        totalEmpresas,
        mrr,
        totalAtrasadas,
        assinaturas
    };
}

export async function alternarStatusEmpresa(empresaId, ativar) {
    const { error } = await supabase
        .from('empresas')
        .update({ ativo: ativar })
        .eq('id', empresaId);

    if (error) throw error;
    return true;
}
