/**
 * Store de Autenticação (Pinia)
 * 
 * Centraliza o estado de sessão, identidade e perfil do usuário logado.
 * Implementa validação contínua (polling de 30s) para deslogar imediatamente 
 * usuários que tenham sido desativados ou cuja assinatura da empresa tenha sido bloqueada.
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../services/supabase'

export const useAuthStore = defineStore('auth', () => {
  // Estado local
  const user = ref(null) // Usuário cru retornado pelo Supabase Auth
  const session = ref(null) // Sessão JWT ativa
  const empresaId = ref(null) // ID da empresa vinculada ao usuário
  const userProfile = ref(null) // Dados consolidados da tabela public.usuarios
  const initialized = ref(false) // Flag de inicialização
  
  let statusCheckTimer = null

  /**
   * Limpa integralmente o estado local (usado em signOut ou expiração)
   */
  function limparEstado() {
    user.value = null
    session.value = null
    userProfile.value = null
    empresaId.value = null
  }

  // Busca o perfil na tabela 'usuarios'
  async function carregarDadosUsuario() {
    if (!user.value) {
      limparEstado()
      return
    }

    const { data, error } = await supabase
      .from('usuarios')
      .select('id, empresa_id, ativo, perfil, nome, is_superadmin, empresas(ativo, ultimo_backup)')
      .eq('id', user.value.id)
      .single()

    if (data && !error) {
      // Se o usuário está desativado ou se a empresa dele está desativada (e não for superadmin)
      if (
        data.ativo === false ||
        (data.empresas && data.empresas.ativo === false && !data.is_superadmin)
      ) {
        await supabase.auth.signOut()
        limparEstado()
        return false
      }

      userProfile.value = data
      empresaId.value = data.empresa_id
      return true
    } else {
      console.error('Erro ao buscar usuário no banco:', error)
      limparEstado()
      return false
    }
  }

  async function verificarUsuarioAtivo() {
    if (!user.value) return false

    const { data, error } = await supabase
      .from('usuarios')
      .select('id, empresa_id, ativo, perfil, nome, is_superadmin, empresas(ativo, ultimo_backup)')
      .eq('id', user.value.id)
      .single()

    if (
      error ||
      !data ||
      data.ativo === false ||
      (data.empresas && data.empresas.ativo === false && !data.is_superadmin)
    ) {
      await supabase.auth.signOut()
      limparEstado()
      return false
    }

    // Verifica a assinatura também no frontend para barrar acessos forçados pela URL
    if (!data.is_superadmin) {
      const { data: assinatura } = await supabase
        .from('assinaturas')
        .select('status, url_pagamento')
        .eq('empresa_id', data.empresa_id)
        .single()

      if (!assinatura || !['ativa', 'teste', 'atrasada'].includes(assinatura.status)) {
        // Apenas retorna false para forçar o router a barrar o acesso.
        // NÃO limpa o estado, pois o usuário precisa estar logado para acessar o checkout.
        return false
      }
    }

    userProfile.value = data
    empresaId.value = data.empresa_id
    return true
  }

  // Carrega sessão e escuta mudanças
  async function carregarSessao() {
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      console.error('Erro ao carregar sessão:', error)
    }
    session.value = data.session
    user.value = data.session?.user || null

    await carregarDadosUsuario() // Busca os dados do DB
    initialized.value = true

    if (!statusCheckTimer && user.value) {
      statusCheckTimer = setInterval(() => {
        verificarUsuarioAtivo()
      }, 30000)
    }

    supabase.auth.onAuthStateChange(async (_, novaSessao) => {
      session.value = novaSessao
      user.value = novaSessao?.user || null
      await carregarDadosUsuario() // Atualiza se mudar a sessão

      if (!novaSessao && statusCheckTimer) {
        clearInterval(statusCheckTimer)
        statusCheckTimer = null
      }
    })
  }

  return {
    user,
    session,
    empresaId,
    userProfile,
    initialized,
    carregarSessao,
    verificarUsuarioAtivo,
  }
})
