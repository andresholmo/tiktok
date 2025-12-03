'use client'

import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search } from 'lucide-react'

interface Filters {
  search: string
  status: string
  criador: string
  nicho: string
  roi: string
}

interface CampaignFiltersProps {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  options: {
    criadores: string[]
    nichos: string[]
    statuses: string[]
  }
  totalCampaigns: number
  filteredCount: number
}

export function CampaignFiltersNew({
  filters,
  onFiltersChange,
  options,
  totalCampaigns,
  filteredCount,
}: CampaignFiltersProps) {
  const updateFilter = (key: keyof Filters, value: string) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <div className="space-y-4 bg-white p-4 rounded-lg border">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Campanhas ({filteredCount})</h2>
        {filteredCount !== totalCampaigns && (
          <span className="text-sm text-muted-foreground">
            Filtrado de {totalCampaigns} campanhas
          </span>
        )}
      </div>
      
      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar campanha..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="pl-10 bg-white"
        />
      </div>
      
      {/* Filtros em linha */}
      <div className="grid grid-cols-4 gap-4">
        {/* Status */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Status</label>
          <Select value={filters.status} onValueChange={(v) => updateFilter('status', v)}>
            <SelectTrigger className="bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border shadow-lg z-50">
              <SelectItem value="Todos">Todos</SelectItem>
              {options.statuses.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Criador */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Criador</label>
          <Select value={filters.criador} onValueChange={(v) => updateFilter('criador', v)}>
            <SelectTrigger className="bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border shadow-lg z-50">
              <SelectItem value="Todos">Todos</SelectItem>
              {options.criadores.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Nicho */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Nicho</label>
          <Select value={filters.nicho} onValueChange={(v) => updateFilter('nicho', v)}>
            <SelectTrigger className="bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border shadow-lg z-50">
              <SelectItem value="Todos">Todos</SelectItem>
              {options.nichos.map(n => (
                <SelectItem key={n} value={n}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ROI */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">ROI</label>
          <Select value={filters.roi} onValueChange={(v) => updateFilter('roi', v)}>
            <SelectTrigger className="bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border shadow-lg z-50">
              <SelectItem value="Todos">Todos</SelectItem>
              <SelectItem value="Positivo">Positivo</SelectItem>
              <SelectItem value="Negativo">Negativo</SelectItem>
              <SelectItem value="Acima de 50%">Acima de 50%</SelectItem>
              <SelectItem value="Acima de 100%">Acima de 100%</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

