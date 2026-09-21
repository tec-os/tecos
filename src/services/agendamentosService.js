import { supabase } from './supabase';

const camposAgendamento = 'id, empresa_id, tecnico_id, cliente_id, os_id, titulo, data_inicio, data_fim, status, created_at, updated_at, tecnico:usuarios!agendamentos_tecnico_id_fkey(nome), clientes(nome), ordens_servico(numero_os)';

function exigirEmpresa(empresaId) {
    if (!empresaId) {
        throw new Error('Empresa nao identificada.');
    }
}

function normalizarPagina(pagina, porPagina) {
    const paginaSegura = Math.max(1, Number(pagina) || 1);
    const porPaginaSeguro = Math.min(100, Math.max(1, Number(porPagina) || 20));
    return {
        inicio: (paginaSegura - 1) * porPaginaSeguro,
        fim: paginaSegura * porPaginaSeguro - 1,
        porPagina: porPaginaSeguro,
    };
}

export async function listarAgendamentos(empresaId, { pagina = 1, porPagina = 20, data = '', dataInicio = '', dataFim = '', busca = '' } = {}) {
    exigirEmpresa(empresaId);
    const { inicio, fim } = normalizarPagina(pagina, porPagina);
    let consulta = supabase
        .from('agendamentos')
        .select(camposAgendamento, { count: 'exact' })
        .eq('empresa_id', empresaId)
        .order('data_inicio', { ascending: true })
        .range(inicio, fim);

    if (data || dataInicio || dataFim) {
        const inicioReferencia = dataInicio || data;
        const fimReferencia = dataFim || data;
        const inicioDia = new Date(`${inicioReferencia}T00:00:00`);
        const fimDia = new Date(`${fimReferencia}T00:00:00`);
        fimDia.setDate(fimDia.getDate() + 1);
        consulta = consulta
            .lt('data_inicio', fimDia.toISOString())
            .gt('data_fim', inicioDia.toISOString());
    }

    const termo = busca.trim();
    if (termo) {
        consulta = consulta.ilike('titulo', `%${termo}%`);
    }

    const { data: items, error, count } = await consulta;
    if (error) throw error;
    return { items: items || [], total: count || 0 };
}

export async function listarAgendamentosDaOrdem(ordemId) {
    if (!ordemId) throw new Error('OS nao identificada.');
    const { data, error } = await supabase
        .from('agendamentos')
        .select('id, tecnico_id, titulo, data_inicio, data_fim, status, tecnico:usuarios!agendamentos_tecnico_id_fkey(nome)')
        .eq('os_id', ordemId)
        .order('data_inicio', { ascending: false });
    if (error) throw error;
    return data || [];
}

export async function listarTecnicos(empresaId) {
    exigirEmpresa(empresaId);

    const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome, perfil, ativo')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .in('perfil', ['gerente', 'tecnico'])
        .order('nome', { ascending: true });

    if (error) throw error;
    return data || [];
}

export async function listarClientesParaAgendamento(empresaId) {
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

export async function listarOrdensParaAgendamento(empresaId) {
    exigirEmpresa(empresaId);

    const { data, error } = await supabase
        .from('ordens_servico')
        .select('id, numero_os, status, clientes(nome)')
        .eq('empresa_id', empresaId)
        .is('deleted_at', null)
        .not('status', 'eq', 'cancelada')
        .order('numero_os', { ascending: false })
        .limit(1000);

    if (error) throw error;
    return data || [];
}

export async function criarAgendamento(empresaId, agendamento) {
    exigirEmpresa(empresaId);

    const { data, error } = await supabase
        .from('agendamentos')
        .insert({ ...agendamento, empresa_id: empresaId })
        .select(camposAgendamento)
        .single();

    if (error) throw error;
    return data;
}

export async function atualizarAgendamento(agendamentoId, agendamento) {
    const { data, error } = await supabase
        .from('agendamentos')
        .update(agendamento)
        .eq('id', agendamentoId)
        .select(camposAgendamento)
        .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Agendamento nao encontrado ou alteracao nao autorizada.');
    return data;
}

export async function excluirAgendamento(agendamentoId) {
    const { data, error } = await supabase
        .from('agendamentos')
        .delete()
        .eq('id', agendamentoId)
        .select('id')
        .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Agendamento nao encontrado ou exclusao nao autorizada.');
    return data;
}
