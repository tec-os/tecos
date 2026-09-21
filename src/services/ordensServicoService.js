import { supabase } from './supabase';

function exigirEmpresa(empresaId) {
    if (!empresaId) {
        throw new Error('Empresa nao identificada.');
    }
}

export async function listarOrdensServico(empresaId, { pagina = 1, porPagina = 20, busca = '' } = {}) {
    exigirEmpresa(empresaId);

    const inicio = (pagina - 1) * porPagina;
    const fim = inicio + porPagina - 1;
    const termo = busca.trim().replace(/[,.()]/g, ' ');
    let consulta = supabase
        .from('ordens_servico')
        .select('id, numero_os, status, created_at, valor_total, equipamento_id, clientes(nome), equipamentos(tipo, marca, modelo)', { count: 'exact' })
        .eq('empresa_id', empresaId)
        .is('deleted_at', null)
        .order('numero_os', { ascending: false })
        .range(inicio, fim);

    if (termo) {
        const numero = Number(termo);
        if (Number.isInteger(numero)) {
            consulta = consulta.eq('numero_os', numero);
        } else {
            consulta = consulta.ilike('clientes.nome', `%${termo}%`);
        }
    }

    const { data, error, count } = await consulta;

    if (error) throw error;
    return { items: data || [], total: count || 0 };
}

export async function criarOrdemServico(empresaId, ordem) {
    exigirEmpresa(empresaId);

    const { data, error } = await supabase
        .from('ordens_servico')
        .insert({ ...ordem, empresa_id: empresaId })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function excluirOrdemServico(ordemId) {
    const { data, error } = await supabase
        .from('ordens_servico')
        .delete()
        .eq('id', ordemId)
        .select('id')
        .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('OS nao encontrada ou exclusao nao autorizada.');
    return data;
}

export async function atualizarStatusOrdemServico(ordemId, status) {
    const { data, error } = await supabase
        .from('ordens_servico')
        .update({ status })
        .eq('id', ordemId)
        .select('id, numero_os, status, valor_total, created_at, clientes(nome)')
        .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('OS nao encontrada ou alteracao nao autorizada.');
    return data;
}

export async function buscarOrdemServico(ordemId) {
    const { data, error } = await supabase
        .from('ordens_servico')
        .select('id, numero_os, status, cliente_id, equipamento_id, descricao_problema, diagnostico, solucao_executada, obs_interna, data_aprovacao, data_reprovacao, motivo_reprovacao, equipamentos(tipo, marca, modelo, numero_serie, identificacao), clientes(nome, celular)')
        .eq('id', ordemId)
        .single();

    if (error) throw error;
    return data;
}

export async function listarItensOrdemServico(ordemId) {
    const { data, error } = await supabase
        .from('os_itens')
        .select('id, os_id, tipo, descricao, quantidade, valor_unitario, created_at')
        .eq('os_id', ordemId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
}

export async function listarHistoricoOrdemServico(ordemId) {
    const { data, error } = await supabase
        .from('os_historico')
        .select('id, os_id, usuario_id, evento, detalhes, created_at, usuarios(nome)')
        .eq('os_id', ordemId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function criarItemOrdemServico(empresaId, ordemId, item) {
    exigirEmpresa(empresaId);

    const { data, error } = await supabase
        .from('os_itens')
        .insert({ ...item, empresa_id: empresaId, os_id: ordemId })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function atualizarItemOrdemServico(itemId, item) {
    const { data, error } = await supabase
        .from('os_itens')
        .update(item)
        .eq('id', itemId)
        .select()
        .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Item nao encontrado ou alteracao nao autorizada.');
    return data;
}

export async function excluirItemOrdemServico(itemId) {
    const { data, error } = await supabase
        .from('os_itens')
        .delete()
        .eq('id', itemId)
        .select('id')
        .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Item nao encontrado ou exclusao nao autorizada.');
    return data;
}

export async function atualizarOrdemServico(ordemId, dados) {
    const { data, error } = await supabase
        .from('ordens_servico')
        .update(dados)
        .eq('id', ordemId)
        .select()
        .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('OS nao encontrada ou alteracao nao autorizada.');
    return data;
}

export async function aprovarOrcamento(ordemId) {
    const { data, error } = await supabase
        .from('ordens_servico')
        .update({ 
            status: 'em_andamento', 
            data_aprovacao: new Date().toISOString() 
        })
        .eq('id', ordemId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function reprovarOrcamento(ordemId, motivo) {
    const { data, error } = await supabase
        .from('ordens_servico')
        .update({ 
            status: 'orcamento_reprovado', 
            data_reprovacao: new Date().toISOString(),
            motivo_reprovacao: motivo
        })
        .eq('id', ordemId)
        .select()
        .single();

    if (error) throw error;
    return data;
}
