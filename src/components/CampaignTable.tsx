'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { BulkActions } from './BulkActions'
import { Campaign } from '@/types'
import { formatCurrencyBRL, formatPercentSafe } from '@/lib/utils'
import {
  getROIColor,
  getCPCColor,
  getCTRColor,
  getECPMColor,
  getLucroColor,
  getStatusColor,
} from '@/lib/calculations'
import { ArrowUpDown, ArrowUp, ArrowDown, Copy } from 'lucide-react'
import { toast } from 'sonner'

interface CampaignTableProps {
  campaigns: Campaign[]
  onRefresh?: () => void
  onSelectionChange?: (selectedIds: string[]) => void
}

type SortField = 'status' | 'campanha' | 'roi' | 'gasto' | 'ganho' | 'lucro_prejuizo' | 'cpc' | 'ctr' | 'ecpm' | 'cost_per_conversion' | 'conversion_rate' | 'orcamento_diario'
type SortOrder = 'asc' | 'desc'

export function CampaignTable({ campaigns, onRefresh, onSelectionChange }: CampaignTableProps) {
  const [sortField, setSortField] = useState<SortField>('roi')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Notificar o Dashboard quando a seleção mudar
  useEffect(() => {
    onSelectionChange?.(selectedIds)
  }, [selectedIds, onSelectionChange])

  // Selecionar/deselecionar todas
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = campaigns
        .filter(c => c.tiktok_campaign_id)
        .map(c => c.tiktok_campaign_id!)
      setSelectedIds(allIds)
    } else {
      setSelectedIds([])
    }
  }

  // Selecionar/deselecionar uma campanha
  const handleSelectOne = (campaignId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, campaignId])
    } else {
      setSelectedIds(prev => prev.filter(id => id !== campaignId))
    }
  }

  // Verificar se todas estão selecionadas
  const allSelected = campaigns.length > 0 && 
    campaigns.filter(c => c.tiktok_campaign_id).every(c => selectedIds.includes(c.tiktok_campaign_id!))

  // Callback após ação em massa
  const handleActionComplete = () => {
    setSelectedIds([])
    if (onRefresh) onRefresh()
  }

  // Função para copiar texto para clipboard
  const copyToClipboard = async (text: string, message?: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(message || 'Copiado!')
    } catch (err) {
      toast.error('Erro ao copiar')
    }
  }

  // Ordenar campanhas
  const sortedCampaigns = useMemo(() => {
    if (!campaigns || campaigns.length === 0) return []

    return [...campaigns].sort((a, b) => {
      let aValue: number = 0
      let bValue: number = 0

      // Mapear o nome da coluna para o campo correto
      switch (sortField) {
        case 'roi':
          aValue = a.roi ?? 0
          bValue = b.roi ?? 0
          break
        case 'gasto':
          aValue = a.gasto ?? 0
          bValue = b.gasto ?? 0
          break
        case 'ganho':
          aValue = a.ganho ?? 0
          bValue = b.ganho ?? 0
          break
        case 'lucro_prejuizo':
          aValue = a.lucro_prejuizo ?? 0
          bValue = b.lucro_prejuizo ?? 0
          break
        case 'cpc':
          aValue = a.cpc ?? 0
          bValue = b.cpc ?? 0
          break
        case 'ctr':
          aValue = a.ctr ?? 0
          bValue = b.ctr ?? 0
          break
        case 'ecpm':
          aValue = a.ecpm ?? 0
          bValue = b.ecpm ?? 0
          break
        case 'cost_per_conversion':
          aValue = a.cost_per_conversion ?? 0
          bValue = b.cost_per_conversion ?? 0
          break
        case 'conversion_rate':
          aValue = a.conversion_rate ?? 0
          bValue = b.conversion_rate ?? 0
          break
        case 'orcamento_diario':
          aValue = a.orcamento_diario ?? 0
          bValue = b.orcamento_diario ?? 0
          break
        case 'campanha':
          // Ordenação alfabética
          const nameA = a.campanha || ''
          const nameB = b.campanha || ''
          if (sortOrder === 'asc') {
            return nameA.localeCompare(nameB)
          } else {
            return nameB.localeCompare(nameA)
          }
        case 'status':
          const statusA = a.status || ''
          const statusB = b.status || ''
          if (sortOrder === 'asc') {
            return statusA.localeCompare(statusB)
          } else {
            return statusB.localeCompare(statusA)
          }
        default:
          aValue = a.roi ?? 0
          bValue = b.roi ?? 0
      }

      // Ordenação numérica
      if (sortOrder === 'asc') {
        return aValue - bValue
      } else {
        return bValue - aValue  // Decrescente: maior primeiro
      }
    })
  }, [campaigns, sortField, sortOrder])

  // Função para alternar ordenação
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  // Cabeçalho clicável
  const SortableHeader = ({ field, children, className = '' }: { field: SortField, children: React.ReactNode, className?: string }) => (
    <TableHead 
      className={`text-white font-bold cursor-pointer hover:bg-blue-700 transition-colors select-none ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1 text-white">
        {children}
        {sortField === field && (
          <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
        )}
      </div>
    </TableHead>
  )

  return (
    <div className="space-y-4">
      {/* Header com ações */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Exibindo {campaigns.length} campanhas
          {selectedIds.length > 0 && (
            <span className="ml-2 text-primary font-medium">
              ({selectedIds.length} selecionada{selectedIds.length > 1 ? 's' : ''})
            </span>
          )}
        </div>
        <BulkActions 
          selectedCampaigns={selectedIds}
          campaigns={campaigns}
          onActionComplete={handleActionComplete}
        />
      </div>

      {/* Tabela */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-blue-600 hover:bg-blue-600">
              <TableHead className="w-12 text-white">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  className="border-white data-[state=checked]:bg-white data-[state=checked]:text-blue-600"
                />
              </TableHead>
              <SortableHeader field="status">STATUS</SortableHeader>
              <SortableHeader field="campanha">CAMPANHA</SortableHeader>
              <SortableHeader field="roi" className="text-right">ROI</SortableHeader>
              <SortableHeader field="gasto" className="text-right">GASTO</SortableHeader>
              <SortableHeader field="ganho" className="text-right">GANHO</SortableHeader>
              <SortableHeader field="lucro_prejuizo" className="text-right">LUCRO/PREJUÍZO</SortableHeader>
              <SortableHeader field="cpc" className="text-right">CPC</SortableHeader>
              <SortableHeader field="ctr" className="text-right">CTR</SortableHeader>
              <SortableHeader field="ecpm" className="text-right">eCPM</SortableHeader>
              <SortableHeader field="cost_per_conversion" className="text-right">CPA</SortableHeader>
              <SortableHeader field="conversion_rate" className="text-right">CVR</SortableHeader>
              <SortableHeader field="orcamento_diario" className="text-right">ORÇAM. DIÁRIO</SortableHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCampaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                  Nenhuma campanha encontrada
                </TableCell>
              </TableRow>
            ) : (
              sortedCampaigns.map((campaign, index) => {
                const campaignId = campaign.tiktok_campaign_id
                const isSelected = campaignId ? selectedIds.includes(campaignId) : false
                
                return (
                  <TableRow 
                    key={campaign.id || index}
                    className={isSelected ? 'bg-blue-50' : ''}
                  >
                    <TableCell>
                      {campaignId && !campaign.is_smart_plus ? (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectOne(campaignId, checked as boolean)}
                        />
                      ) : campaign.is_smart_plus ? (
                        <span className="text-xs text-muted-foreground" title="Smart Plus não editável">
                          —
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        campaign.status === 'ATIVO' || campaign.status === 'ENABLE' 
                          ? 'bg-green-100 text-green-700'
                          : campaign.status === 'PAUSADO' || campaign.status === 'DISABLE'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {campaign.status === 'ENABLE' ? 'ATIVO' : 
                         campaign.status === 'DISABLE' ? 'PAUSADO' : 
                         campaign.status}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1 group">
                        {campaign.is_smart_plus && (
                          <span 
                            className="inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-red-600 bg-red-100 rounded-full flex-shrink-0" 
                            title="Smart Plus - Não editável via API"
                          >
                            +
                          </span>
                        )}
                        <span 
                          className="cursor-pointer hover:text-primary hover:underline flex items-center gap-1"
                          onClick={() => copyToClipboard(campaign.campanha, `"${campaign.campanha}" copiado!`)}
                          title="Clique para copiar"
                        >
                          {campaign.campanha}
                          <Copy className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity flex-shrink-0" />
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className={`text-center ${getROIColor(campaign.roi ?? 0)}`}>
                      {formatPercentSafe(campaign.roi)}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrencyBRL(campaign.gasto ?? 0)}</TableCell>
                    <TableCell className="text-right">{formatCurrencyBRL(campaign.ganho ?? 0)}</TableCell>
                    <TableCell className={`text-right ${getLucroColor(campaign.lucro_prejuizo ?? 0)}`}>
                      {formatCurrencyBRL(campaign.lucro_prejuizo ?? 0)}
                    </TableCell>
                    <TableCell className={`text-center ${getCPCColor(campaign.cpc ?? 0)}`}>
                      {formatCurrencyBRL(campaign.cpc ?? 0)}
                    </TableCell>
                    <TableCell className={`text-center ${getCTRColor(campaign.ctr ?? 0)}`}>
                      {formatPercentSafe(campaign.ctr ?? 0)}
                    </TableCell>
                    <TableCell className={`text-center ${getECPMColor(campaign.ecpm ?? 0)}`}>
                      {formatCurrencyBRL(campaign.ecpm ?? 0)}
                    </TableCell>
                    {/* Custo por Conversão (CPA) - Azul claro */}
                    <TableCell className="text-right bg-blue-50 text-blue-700">
                      {formatCurrencyBRL(campaign.cost_per_conversion ?? 0)}
                    </TableCell>
                    {/* Taxa de Conversão (CVR) - Roxo claro */}
                    <TableCell className="text-right bg-purple-50 text-purple-700">
                      {formatPercentSafe(campaign.conversion_rate ?? 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      {formatCurrencyBRL(campaign.orcamento_diario ?? 0)}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
