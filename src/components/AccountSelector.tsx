'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Building2 } from 'lucide-react'

interface TikTokAccount {
  id: string
  name: string
  advertiser_id: string
  is_active: boolean
}

interface AccountSelectorProps {
  onAccountChange?: (account: TikTokAccount) => void
}

export function AccountSelector({ onAccountChange }: AccountSelectorProps) {
  const [accounts, setAccounts] = useState<TikTokAccount[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const activeAccount = accounts.find(a => a.is_active)

  useEffect(() => {
    fetchAccounts()
  }, [])

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

  const selectAccount = async (account: TikTokAccount) => {
    if (account.is_active) {
      setIsOpen(false)
      return
    }

    try {
      const res = await fetch('/api/tiktok/accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: account.id }),
      })

      if (res.ok) {
        setAccounts(prev => prev.map(a => ({
          ...a,
          is_active: a.id === account.id
        })))
        onAccountChange?.(account)
        // Recarregar a página para atualizar os dados
        window.location.reload()
      }
    } catch (error) {
      console.error('Erro ao trocar conta:', error)
    }
    
    setIsOpen(false)
  }

  if (loading) {
    return (
      <div className="h-9 w-40 bg-gray-100 animate-pulse rounded-lg" />
    )
  }

  if (accounts.length === 0) {
    return (
      <a 
        href="/configuracoes"
        className="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1"
      >
        <Building2 size={16} />
        Configurar conta
      </a>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Building2 size={16} className="text-gray-500" />
        <span className="max-w-[150px] truncate font-medium">
          {activeAccount?.name || 'Selecionar conta'}
        </span>
        <ChevronDown 
          size={16} 
          className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <>
          {/* Overlay para fechar ao clicar fora */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)} 
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="p-2">
              <p className="text-xs text-gray-500 px-2 py-1 font-medium">
                Contas TikTok
              </p>
              {accounts.map(account => (
                <button
                  key={account.id}
                  onClick={() => selectAccount(account)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 ${
                    account.is_active 
                      ? 'bg-orange-50 text-orange-700' 
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${
                    account.is_active ? 'bg-orange-500' : 'bg-gray-300'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{account.name}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {account.advertiser_id}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            
            <div className="border-t border-gray-100 p-2">
              <a
                href="/configuracoes"
                className="block w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md"
              >
                Gerenciar contas...
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
