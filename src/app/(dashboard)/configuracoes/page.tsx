'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Building2 } from 'lucide-react'
import { TikTokConnect } from '@/components/TikTokConnect'
import { TikTokSync } from '@/components/TikTokSync'
import { GAMConnect } from '@/components/GAMConnect'
import { GAMSync } from '@/components/GAMSync'
import { ImportConsolidated } from '@/components/ImportConsolidated'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, AlertCircle } from 'lucide-react'

interface TikTokAccount {
  id: string
  name: string
  advertiser_id: string
  is_active: boolean
}

export default function ConfiguracoesPage() {
  const [accounts, setAccounts] = useState<TikTokAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAdvertiserId, setNewAdvertiserId] = useState('')
  const [error, setError] = useState('')
  const [tiktokConnected, setTiktokConnected] = useState(false)
  const searchParams = useSearchParams()
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    fetchAccounts()
    
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success === 'tiktok_connected') {
      setMessage({ type: 'success', text: 'TikTok conectado com sucesso!' })
    } else if (error === 'no_code') {
      setMessage({ type: 'error', text: 'Erro: código de autorização não recebido' })
    } else if (error === 'token') {
      setMessage({ type: 'error', text: 'Erro ao obter token do TikTok' })
    } else if (error) {
      setMessage({ type: 'error', text: 'Erro ao conectar com TikTok' })
    }
  }, [searchParams])

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/tiktok/accounts')
      const data = await res.json()
      setAccounts(data.accounts || [])
    } catch (error) {
      console.error('Erro ao carregar contas:', error)
    } finally {
      setLoading(false)
    }
  }

  const addAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!newName.trim() || !newAdvertiserId.trim()) {
      setError('Preencha todos os campos')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/tiktok/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newName.trim(), 
          advertiser_id: newAdvertiserId.trim() 
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erro ao adicionar conta')
        return
      }

      setAccounts(prev => [...prev, data.account])
      setNewName('')
      setNewAdvertiserId('')
    } catch (error) {
      setError('Erro ao adicionar conta')
    } finally {
      setSaving(false)
    }
  }

  const deleteAccount = async (accountId: string) => {
    if (!confirm('Tem certeza que deseja remover esta conta?')) return

    try {
      const res = await fetch(`/api/tiktok/accounts?id=${accountId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setAccounts(prev => prev.filter(a => a.id !== accountId))
      }
    } catch (error) {
      console.error('Erro ao remover conta:', error)
    }
  }

  const setActiveAccount = async (accountId: string) => {
    try {
      const res = await fetch('/api/tiktok/accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      })

      if (res.ok) {
        setAccounts(prev => prev.map(a => ({
          ...a,
          is_active: a.id === accountId
        })))
      }
    } catch (error) {
      console.error('Erro ao ativar conta:', error)
    }
  }

  const handleTikTokSync = (data: any) => {
    console.log('TikTok sync complete:', data)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>

        {message && (
          <div className={`flex items-center gap-2 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Seção Contas TikTok */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="text-gray-600" size={20} />
            <h2 className="text-lg font-semibold text-gray-900">Contas TikTok</h2>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            Cadastre suas contas de anúncio do TikTok para alternar entre elas no dashboard.
          </p>

          {/* Lista de contas */}
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map(i => (
                <div key={i} className="h-14 bg-gray-100 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : accounts.length > 0 ? (
            <div className="space-y-2 mb-6">
              {accounts.map(account => (
                <div
                  key={account.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    account.is_active 
                      ? 'border-orange-200 bg-orange-50' 
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="activeAccount"
                    checked={account.is_active}
                    onChange={() => setActiveAccount(account.id)}
                    className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{account.name}</p>
                    <p className="text-sm text-gray-500 font-mono">{account.advertiser_id}</p>
                  </div>
                  <button
                    onClick={() => deleteAccount(account.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remover conta"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500 mb-6">
              Nenhuma conta cadastrada
            </div>
          )}

          {/* Formulário para adicionar */}
          <form onSubmit={addAccount} className="border-t border-gray-200 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Adicionar nova conta</p>
            
            {error && (
              <div className="mb-3 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nome da conta"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
              <input
                type="text"
                placeholder="Advertiser ID"
                value={newAdvertiserId}
                onChange={e => setNewAdvertiserId(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
              >
                <Plus size={16} />
                Adicionar
              </button>
            </div>
          </form>
        </div>

        {/* Conexão e Sincronização TikTok */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TikTokConnect onConnectionChange={setTiktokConnected} />
          <TikTokSync isConnected={tiktokConnected} onSyncComplete={handleTikTokSync} />
        </div>

        {/* Conexão e Sincronização GAM */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GAMConnect />
          <GAMSync onSyncComplete={(data) => console.log('GAM Data:', data)} />
        </div>

        {/* Importação Consolidada + ROI */}
        <ImportConsolidated />

        {/* Link para voltar */}
        <div className="mt-6 text-center">
          <a href="/" className="text-orange-600 hover:text-orange-700 text-sm">
            ← Voltar ao Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
