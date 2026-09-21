import { supabase } from './supabase';

function exigirEmpresa(empresaId) {
    if (!empresaId) {
        throw new Error('Empresa nao identificada.');
    }
}

export async function listarEquipe(empresaId, { pagina = 1, porPagina = 20, busca = '' } = {}) {
    exigirEmpresa(empresaId);

    const inicio = (pagina - 1) * porPagina;
    const fim = inicio + porPagina - 1;
    const termo = busca.trim().replace(/[,.()]/g, ' ');
    let consulta = supabase
        .from('usuarios')
        .select('id, nome, perfil, ativo, created_at, updated_at', { count: 'exact' })
        .eq('empresa_id', empresaId)
        .order('nome')
        .range(inicio, fim);

    if (termo) {
        consulta = consulta.ilike('nome', `%${termo}%`);
    }

    const { data, error, count } = await consulta;

    if (error) throw error;
    return { items: data || [], total: count || 0 };
}

export async function atualizarStatusMembro(usuarioId, ativo) {
    const { data, error } = await supabase
        .from('usuarios')
        .update({ ativo })
        .eq('id', usuarioId)
        .select('id, ativo')
        .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Membro nao encontrado ou alteracao nao autorizada.');
    return data;
}

export async function criarMembroEquipe(dados) {
    const { data, error } = await supabase.functions.invoke('criar-usuario-equipe', {
        body: {
            nome: dados.nome,
            email: dados.email,
            password: dados.password,
            perfil: dados.perfil,
        },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
}
