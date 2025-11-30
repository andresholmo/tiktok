'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search } from 'lucide-react'

interface CampaignFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  statusFilter: string
  onStatusChange: (value: string) => void
  criadorFilter: string
  onCriadorChange: (value: string) => void
  nichoFilter: string
  onNichoChange: (value: string) => void
  roiFilter: string
  onRoiChange: (value: string) => void
  criadores: string[]
  nichos: string[]
}

export function CampaignFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  criadorFilter,
  onCriadorChange,
  nichoFilter,
  onNichoChange,
  roiFilter,
  onRoiChange,
  criadores,
  nichos,
}: CampaignFiltersProps) {
  return (
    <div className="space-y-4 bg-white p-4 rounded-lg border">
      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar campanha..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 bg-white"
        />
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent className="bg-white border shadow-lg z-50">
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ATIVO">Ativo</SelectItem>
              <SelectItem value="PAUSADO">Pausado</SelectItem>
              <SelectItem value="SEM DADOS">Sem Dados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Criador</Label>
          <Select value={criadorFilter} onValueChange={onCriadorChange}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent className="bg-white border shadow-lg z-50">
              <SelectItem value="todos">Todos</SelectItem>
              {criadores.map((criador) => (
                <SelectItem key={criador} value={criador}>
                  {criador}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Nicho</Label>
          <Select value={nichoFilter} onValueChange={onNichoChange}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent className="bg-white border shadow-lg z-50">
              <SelectItem value="todos">Todos</SelectItem>
              {nichos.map((nicho) => (
                <SelectItem key={nicho} value={nicho}>
                  {nicho}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">ROI</Label>
          <Select value={roiFilter} onValueChange={onRoiChange}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent className="bg-white border shadow-lg z-50">
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="positivo">Positivo</SelectItem>
              <SelectItem value="negativo">Negativo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
