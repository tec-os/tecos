import { supabase } from './supabase';

function exigirEmpresa(empresaId) {
    if (!empresaId) {
        throw new Error('Empresa nao identificada.');
    }
}

export async function listarClientes(empresaId, { pagina = 1, porPagina = 20, busca = '' } = {}) {
    exigirEmpresa(empresaId);

    const inicio = (pagina - 1) * porPagina;
    const fim = inicio + porPagina - 1;
    const termo = busca.trim().replace(/[,.()]/g, ' ');
    let consulta = supabase
        .from('clientes')
        .select('id, nome, tipo_pessoa, documento, email, telefone, celular, cep, logradouro, numero, bairro, cidade, estado, observacoes', { count: 'exact' })
        .eq('empresa_id', empresaId)
        .is('deleted_at', null)
        .order('nome', { ascending: true })
        .range(inicio, fim);

    if (termo) {
        consulta = consulta.or(`nome.ilike.%${termo}%,documento.ilike.%${termo}%`);
    }

    const { data, error, count } = await consulta;

    if (error) throw error;
    return { items: data || [], total: count || 0 };
}

export async function buscarResumoCliente(empresaId, clienteId) {
    exigirEmpresa(empresaId);
    const [cliente, equipamentos, ordens] = await Promise.all([
        supabase.from('clientes').select('id, nome, tipo_pessoa, documento, email, telefone, celular, cidade, estado, observacoes').eq('empresa_id', empresaId).eq('id', clienteId).is('deleted_at', null).single(),
        supabase.from('equipamentos').select('id, tipo, marca, modelo, numero_serie, identificacao').eq('empresa_id', empresaId).eq('cliente_id', clienteId).is('deleted_at', null).order('created_at', { ascending: false }),
        supabase.from('ordens_servico').select('id, numero_os, status, descricao_problema, valor_total, created_at, equipamento_id').eq('empresa_id', empresaId).eq('cliente_id', clienteId).is('deleted_at', null).order('created_at', { ascending: false }).limit(20),
    ]);
    if (cliente.error) throw cliente.error;
    if (equipamentos.error) throw equipamentos.error;
    if (ordens.error) throw ordens.error;
    return { cliente: cliente.data, equipamentos: equipamentos.data || [], ordens: ordens.data || [] };
}

export async function criarCliente(empresaId, cliente) {
    exigirEmpresa(empresaId);

    const { data, error } = await supabase
        .from('clientes')
        .insert({ ...cliente, empresa_id: empresaId })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function atualizarCliente(clienteId, cliente) {
    const { data, error } = await supabase
        .from('clientes')
        .update(cliente)
        .eq('id', clienteId)
        .select()
        .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Cliente nao encontrado ou alteracao nao autorizada.');
    return data;
}

export async function excluirCliente(clienteId) {
    const { data, error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', clienteId)
        .select('id')
        .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Cliente nao encontrado ou exclusao nao autorizada.');
    return data;
}
