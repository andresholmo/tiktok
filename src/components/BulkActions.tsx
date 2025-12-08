'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronDown, Play, Pause, DollarSign, Loader2, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Campaign } from '@/types'

interface BulkActionsProps {
  selectedCampaigns: string[]
  campaigns: Campaign[]
  onActionComplete: () => void
  disabled?: boolean
}

export function BulkActions({ selectedCampaigns, campaigns, onActionComplete, disabled }: BulkActionsProps) {
  const [loading, setLoading] = useState(false)
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false)
  const [newBudget, setNewBudget] = useState('')

  const handleStatusChange = async (status: 'ENABLE' | 'DISABLE') => {
    if (selectedCampaigns.length === 0) {
      toast.error('Selecione pelo menos uma campanha')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/tiktok/campaign/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignIds: selectedCampaigns,
          status,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erro ao atualizar status')
      }

      toast.success(data.message)
      onActionComplete()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyNames = async () => {
    if (selectedCampaigns.length === 0) {
      toast.error('Selecione pelo menos uma campanha')
      return
    }

    const selectedNames = campaigns
      .filter(c => selectedCampaigns.includes(c.tiktok_campaign_id || ''))
      .map(c => c.campanha)
      .join('\n')

    try {
      await navigator.clipboard.writeText(selectedNames)
      toast.success(`${selectedCampaigns.length} campanha(s) copiada(s)!`)
    } catch (err) {
      toast.error('Erro ao copiar')
    }
  }

  const handleBudgetChange = async () => {
    if (selectedCampaigns.length === 0) {
      toast.error('Selecione pelo menos uma campanha')
      return
    }

    const budget = parseFloat(newBudget.replace(',', '.'))
    if (isNaN(budget) || budget < 0) {
      toast.error('Orçamento inválido')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/tiktok/campaign/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignIds: selectedCampaigns,
          budget,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erro ao atualizar orçamento')
      }

      toast.success(data.message)
      setBudgetDialogOpen(false)
      setNewBudget('')
      onActionComplete()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const isDisabled = disabled || loading || selectedCampaigns.length === 0

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={isDisabled}>
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ChevronDown className="h-4 w-4 mr-2" />
            )}
            Ações em Massa
            {selectedCampaigns.length > 0 && (
              <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                {selectedCampaigns.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-white border shadow-lg z-50">
          {/* Copiar Nomes - NOVO */}
          <DropdownMenuItem onClick={handleCopyNames} className="cursor-pointer">
            <Copy className="h-4 w-4 mr-2 text-gray-600" />
            Copiar Nomes
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => handleStatusChange('ENABLE')}
            className="cursor-pointer"
          >
            <Play className="h-4 w-4 mr-2 text-green-600" />
            Continuar
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleStatusChange('DISABLE')}
            className="cursor-pointer"
          >
            <Pause className="h-4 w-4 mr-2 text-yellow-600" />
            Pausar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => setBudgetDialogOpen(true)}
            className="cursor-pointer"
          >
            <DollarSign className="h-4 w-4 mr-2 text-blue-600" />
            Alterar Orçamento Diário
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog para alterar orçamento */}
      <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Alterar Orçamento Diário</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="budget">Novo orçamento para {selectedCampaigns.length} campanha(s)</Label>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-muted-foreground">R$</span>
              <Input
                id="budget"
                type="text"
                placeholder="200,00"
                value={newBudget}
                onChange={(e) => setNewBudget(e.target.value)}
                className="bg-white"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Este valor será aplicado a todas as campanhas selecionadas.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBudgetDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleBudgetChange} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

