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
import { Campaign } from '@/types'
import { formatCurrency, formatPercentSafe } from '@/lib/utils'
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
}

type SortField = 'status' | 'campanha' | 'roi' | 'gasto' | 'ganho' | 'lucro_prejuizo' | 'cpc' | 'ctr' | 'ecpm' | 'orcamento_diario'
type SortOrder = 'asc' | 'desc'

export function CampaignTable({ campaigns }: CampaignTableProps) {
  const [sortField, setSortField] = useState<SortField>('roi')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

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
      <div className="flex items-center">
        {children}
        <SortIcon field={field} />
      </div>
    </TableHead>
  )

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Exibindo {campaigns.length} campanhas
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-blue-600 hover:bg-blue-600">
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
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Nenhuma campanha encontrada
                </TableCell>
              </TableRow>
            ) : (
              sortedCampaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(campaign.status)}`}>
                      {campaign.status}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{campaign.campanha}</TableCell>
                  <TableCell className={`text-center ${getROIColor(campaign.roi ?? 0)}`}>
                    {formatPercentSafe(campaign.roi)}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(campaign.gasto)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(campaign.ganho)}</TableCell>
                  <TableCell className={`text-right ${getLucroColor(campaign.lucro_prejuizo ?? 0)}`}>
                    {formatCurrency(campaign.lucro_prejuizo)}
                  </TableCell>
                  <TableCell className={`text-center ${getCPCColor(campaign.cpc ?? 0)}`}>
                    {formatCurrency(campaign.cpc)}
                  </TableCell>
                  <TableCell className={`text-center ${getCTRColor(campaign.ctr ?? 0)}`}>
                    {formatPercentSafe(campaign.ctr ?? 0)}
                  </TableCell>
                  <TableCell className={`text-center ${getECPMColor(campaign.ecpm ?? 0)}`}>
                    {formatCurrency(campaign.ecpm)}
                  </TableCell>
                  <TableCell className="text-center">
                    {formatCurrency(campaign.orcamento_diario)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
