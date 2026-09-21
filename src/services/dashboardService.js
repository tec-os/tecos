import { supabase } from './supabase';

function exigirEmpresa(empresaId) {
    if (!empresaId) {
        throw new Error('Empresa nao identificada.');
    }
}

function exigirSucesso(resposta, contexto) {
    if (resposta.error) {
        throw new Error(`Nao foi possivel carregar ${contexto}.`);
    }
}

export async function carregarResumoDashboard(empresaId, usuarioId, perfil) {
    exigirEmpresa(empresaId);
    if (!usuarioId) throw new Error('Usuário não identificado.');

    const isGerente = ['gerente', 'dono'].includes(perfil);

    // Queries Base (Compartilhadas)
    const promises = [];

    // 0: Clientes (apenas contagem)
    promises.push(
        supabase
            .from('clientes')
            .select('id', { count: 'exact', head: true })
            .eq('empresa_id', empresaId)
            .is('deleted_at', null)
    );

    // 1: OS Abertas Gerais (apenas contagem)
    promises.push(
        supabase
            .from('ordens_servico')
            .select('id', { count: 'exact', head: true })
            .eq('empresa_id', empresaId)
            .is('deleted_at', null)
            .in('status', ['aberta', 'em_andamento', 'aguardando_peca', 'aguardando_aprovacao', 'agendada'])
    );

    // 2: Faturamento (apenas concluidas)
    promises.push(
        isGerente
            ? supabase
                .from('ordens_servico')
                .select('valor_total')
                .eq('empresa_id', empresaId)
                .eq('status', 'concluida')
                .is('deleted_at', null)
            : Promise.resolve({ data: [], error: null }) // Fake resolve for non-managers
    );

    // 3: Minhas OS Abertas (Técnico/Atendente)
    promises.push(
        !isGerente
            ? supabase
                .from('ordens_servico')
                .select('id', { count: 'exact', head: true })
                .eq('empresa_id', empresaId)
                .is('deleted_at', null)
                .eq('tecnico_id', usuarioId)
                .in('status', ['aberta', 'em_andamento', 'aguardando_peca', 'aguardando_aprovacao', 'agendada'])
            : Promise.resolve({ count: 0, error: null })
    );

    // 4: Fila de Atenção (Últimas OS pendentes)
    let queryFila = supabase
        .from('ordens_servico')
        .select('id, numero_os, status, created_at, valor_total, clientes(nome)')
        .eq('empresa_id', empresaId)
        .is('deleted_at', null)
        .in('status', ['aberta', 'aguardando_aprovacao', 'aguardando_peca', 'em_andamento'])
        .order('created_at', { ascending: false })
        .limit(6);
    
    if (!isGerente) {
        queryFila = queryFila.eq('tecnico_id', usuarioId);
    }
    promises.push(queryFila);

    // 5: Lembretes Pendentes do Usuário
    promises.push(
        supabase
            .from('lembretes')
            .select('id, mensagem, data_alvo, tipo, referencia_id, lido')
            .eq('empresa_id', empresaId)
            .eq('usuario_id', usuarioId)
            .eq('lido', false)
            .order('data_alvo', { ascending: true })
            .limit(5)
    );

    // Executar todas
    const [
        clientes, 
        osAbertas, 
        osConcluidas, 
        minhasOS, 
        filaAtencao, 
        lembretes
    ] = await Promise.all(promises);

    exigirSucesso(clientes, 'clientes');
    exigirSucesso(osAbertas, 'ordens em andamento');
    exigirSucesso(osConcluidas, 'faturamento');
    exigirSucesso(minhasOS, 'minhas ordens de servico');
    exigirSucesso(filaAtencao, 'fila de atencao');
    exigirSucesso(lembretes, 'lembretes');

    const valoresConcluidos = osConcluidas.data || [];
    const faturamentoTotal = valoresConcluidos.reduce(
        (total, ordem) => total + (Number(ordem.valor_total) || 0),
        0
    );

    return {
        totalClientes: clientes.count || 0,
        osEmAndamento: osAbertas.count || 0,
        faturamentoTotal,
        ticketMedio: valoresConcluidos.length ? faturamentoTotal / valoresConcluidos.length : 0,
        minhasOsEmAndamento: minhasOS.count || 0,
        filaAtencao: filaAtencao.data || [],
        lembretes: lembretes.data || []
    };
}
