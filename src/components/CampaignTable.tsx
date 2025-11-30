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
import { formatCurrency, formatPercent } from '@/lib/utils'
import {
  getROIColor,
  getCPCColor,
  getCTRColor,
  getECPMColor,
  getLucroColor,
  getStatusColor,
} from '@/lib/calculations'
import { CampaignFilters } from './CampaignFilters'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

interface CampaignTableProps {
  campaigns: Campaign[]
}

type SortField = 'status' | 'campanha' | 'roi' | 'gasto' | 'ganho' | 'lucro_prejuizo' | 'cpc' | 'ctr' | 'ecpm'
type SortOrder = 'asc' | 'desc'

// Extrair criador do nome da campanha (ex: GUP-01-SDM-AH52-291125-SAKC -> AH)
function extractCriador(campanha: string): string {
  const parts = campanha.split('-')
  if (parts.length >= 4) {
    // Pegar a parte após SDM e extrair as letras (ex: AH52 -> AH)
    const criadorPart = parts[3]
    const match = criadorPart.match(/^([A-Z]+)/i)
    return match ? match[1].toUpperCase() : ''
  }
  return ''
}

// Extrair nicho do nome da campanha (ex: GUP-01-SDM-AH52-291125-SAKC -> SAKC)
function extractNicho(campanha: string): string {
  const parts = campanha.split('-')
  if (parts.length >= 6) {
    return parts[5].toUpperCase()
  }
  return ''
}

export function CampaignTable({ campaigns }: CampaignTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [criadorFilter, setCriadorFilter] = useState('todos')
  const [nichoFilter, setNichoFilter] = useState('todos')
  const [roiFilter, setRoiFilter] = useState('todos')
  const [sortField, setSortField] = useState<SortField>('roi')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  // Extrair criadores e nichos únicos
  const criadores = useMemo(() => {
    const set = new Set<string>()
    campaigns.forEach(c => {
      const criador = extractCriador(c.campanha)
      if (criador) set.add(criador)
    })
    return Array.from(set).sort()
  }, [campaigns])

  const nichos = useMemo(() => {
    const set = new Set<string>()
    campaigns.forEach(c => {
      const nicho = extractNicho(c.campanha)
      if (nicho) set.add(nicho)
    })
    return Array.from(set).sort()
  }, [campaigns])

  // Filtrar e ordenar campanhas
  const filteredCampaigns = useMemo(() => {
    let filtered = [...campaigns]

    // Busca por nome
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(c => 
        c.campanha.toLowerCase().includes(searchLower)
      )
    }

    // Filtro de status
    if (statusFilter !== 'todos') {
      filtered = filtered.filter(c => c.status === statusFilter)
    }

    // Filtro de criador
    if (criadorFilter !== 'todos') {
      filtered = filtered.filter(c => extractCriador(c.campanha) === criadorFilter)
    }

    // Filtro de nicho
    if (nichoFilter !== 'todos') {
      filtered = filtered.filter(c => extractNicho(c.campanha) === nichoFilter)
    }

    // Filtro de ROI
    if (roiFilter === 'positivo') {
      filtered = filtered.filter(c => c.roi >= 0)
    } else if (roiFilter === 'negativo') {
      filtered = filtered.filter(c => c.roi < 0)
    }

    // Ordenação
    filtered.sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      // Tratamento para strings
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

    return filtered
  }, [campaigns, search, statusFilter, criadorFilter, nichoFilter, roiFilter, sortField, sortOrder])

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
      <CampaignFilters
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        criadorFilter={criadorFilter}
        onCriadorChange={setCriadorFilter}
        nichoFilter={nichoFilter}
        onNichoChange={setNichoFilter}
        roiFilter={roiFilter}
        onRoiChange={setRoiFilter}
        criadores={criadores}
        nichos={nichos}
      />

      <div className="text-sm text-muted-foreground">
        Exibindo {filteredCampaigns.length} de {campaigns.length} campanhas
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCampaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Nenhuma campanha encontrada com os filtros selecionados
                </TableCell>
              </TableRow>
            ) : (
              filteredCampaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(campaign.status)}`}>
                      {campaign.status}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{campaign.campanha}</TableCell>
                  <TableCell className={`text-center ${getROIColor(campaign.roi)}`}>
                    {formatPercent(campaign.roi)}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(campaign.gasto)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(campaign.ganho)}</TableCell>
                  <TableCell className={`text-right ${getLucroColor(campaign.lucro_prejuizo)}`}>
                    {formatCurrency(campaign.lucro_prejuizo)}
                  </TableCell>
                  <TableCell className={`text-center ${getCPCColor(campaign.cpc)}`}>
                    {formatCurrency(campaign.cpc)}
                  </TableCell>
                  <TableCell className={`text-center ${getCTRColor(campaign.ctr)}`}>
                    {formatPercent(campaign.ctr * 100)}
                  </TableCell>
                  <TableCell className={`text-center ${getECPMColor(campaign.ecpm)}`}>
                    {formatCurrency(campaign.ecpm)}
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
