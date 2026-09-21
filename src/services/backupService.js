/**
 * Serviço de Gestão de Backups (Client-Side)
 *
 * Responsável por empacotar a operação do Tenant em formato estruturado (JSON).
 * Este módulo coleta todos os registros atrelados ao `empresa_id` sob as regras
 * do RLS (Row Level Security) logado, garantindo que o usuário só consiga
 * exportar os dados da própria assinatura.
 *
 * Nota de Manutenção: A restauração destes dados só pode ser realizada pelo
 * painel do SuperAdmin usando RPCs seguras que contornam colunas geradas.
 */
import { supabase } from './supabase'

/**
 * Coleta iterativamente todas as tabelas operacionais da empresa logada
 * Retorna um snapshot completo do momento atual.
 */
export async function gerarBackupEmpresa(empresaId) {
  const tabelas = [
    'clientes',
    'equipamentos',
    'catalogo_itens',
    'ordens_servico',
    'os_itens',
    'os_historico',
    'estoque_movimentacoes',
    'recebimentos',
    'agendamentos',
    'lembretes',
  ]

  const backupData = {
    meta: {
      gerado_em: new Date().toISOString(),
      empresa_id: empresaId,
      versao_sistema: '1.0',
    },
    dados: {},
  }

  // Busca dados de todas as tabelas
  for (const tabela of tabelas) {
    const { data, error } = await supabase.from(tabela).select('*').limit(100000) // Limite alto para garantir que pegue tudo no MVP

    if (error) {
      console.error(`Erro ao fazer backup da tabela ${tabela}:`, error)
      throw new Error(`Falha ao exportar dados de ${tabela}`)
    }

    backupData.dados[tabela] = data || []
  }

  return backupData
}

/**
 * Atualiza a data do último backup na tabela empresas
 */
export async function registrarDataBackup(empresaId) {
  const { error } = await supabase
    .from('empresas')
    .update({ ultimo_backup: new Date().toISOString() })
    .eq('id', empresaId)

  if (error) throw error
}

/**
 * Executa o fluxo completo: Gera o JSON, faz o download no navegador e atualiza o banco
 */
export async function executarFluxoBackupCompleto(empresaId) {
  // 1. Gera os dados
  const backupData = await gerarBackupEmpresa(empresaId)

  // 2. Cria o arquivo Blob
  const jsonString = JSON.stringify(backupData, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })

  // 3. Cria o link de download e clica dinamicamente
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `backup_tecos_${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()

  // 4. Limpa o link
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  // 5. Registra que o backup foi feito
  await registrarDataBackup(empresaId)
}
