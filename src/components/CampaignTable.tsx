'use client'

import { useState, useMemo } from 'react'
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
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

interface CampaignTableProps {
  campaigns: Campaign[]
  onRefresh?: () => void
}

type SortField = 'status' | 'campanha' | 'roi' | 'gasto' | 'ganho' | 'lucro_prejuizo' | 'cpc' | 'ctr' | 'ecpm' | 'orcamento_diario'
type SortOrder = 'asc' | 'desc'

export function CampaignTable({ campaigns, onRefresh }: CampaignTableProps) {
  const [sortField, setSortField] = useState<SortField>('roi')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

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

  // Ordenar campanhas
  const sortedCampaigns = useMemo(() => {
    const sorted = [...campaigns]
    sorted.sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })
    return sorted
  }, [campaigns, sortField, sortOrder])

  // Função para alternar ordenação
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  // Componente do ícone de ordenação
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />
    }
    return sortOrder === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />
  }

  // Cabeçalho clicável
  const SortableHeader = ({ field, children }: { field: SortField, children: React.ReactNode }) => (
    <TableHead 
      className="text-white font-bold cursor-pointer hover:bg-blue-700 transition-colors select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center text-white">
        {children}
        <SortIcon field={field} />
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
              <SortableHeader field="roi">ROI</SortableHeader>
              <SortableHeader field="gasto">GASTO</SortableHeader>
              <SortableHeader field="ganho">GANHO</SortableHeader>
              <SortableHeader field="lucro_prejuizo">LUCRO/PREJUÍZO</SortableHeader>
              <SortableHeader field="cpc">CPC</SortableHeader>
              <SortableHeader field="ctr">CTR</SortableHeader>
              <SortableHeader field="ecpm">eCPM</SortableHeader>
              <SortableHeader field="orcamento_diario">ORÇAM. DIÁRIO</SortableHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCampaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
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
                      {campaignId && (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectOne(campaignId, checked as boolean)}
                        />
                      )}
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
                    <TableCell className="font-medium">{campaign.campanha}</TableCell>
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
