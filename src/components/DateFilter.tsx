'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Calendar, RefreshCw } from 'lucide-react'
import { getTodayBR } from '@/lib/date-utils'

interface DateFilterProps {
  onDateChange: (startDate: string, endDate: string) => void
  isLoading?: boolean
}

export function DateFilter({ onDateChange, isLoading }: DateFilterProps) {
  const today = getTodayBR()
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)

  const handleApply = () => {
    onDateChange(startDate, endDate)
  }

  // Atalhos rápidos
  const setToday = () => {
    const today = getTodayBR()
    setStartDate(today)
    setEndDate(today)
    onDateChange(today, today)
  }

  const setLast7Days = () => {
    const end = getTodayBR()
    const start = new Date()
    start.setDate(start.getDate() - 6)
    const startStr = start.toISOString().split('T')[0]
    setStartDate(startStr)
    setEndDate(end)
    onDateChange(startStr, end)
  }

  const setLast30Days = () => {
    const end = getTodayBR()
    const start = new Date()
    start.setDate(start.getDate() - 29)
    const startStr = start.toISOString().split('T')[0]
    setStartDate(startStr)
    setEndDate(end)
    onDateChange(startStr, end)
  }

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-36"
          />
          <span className="text-muted-foreground">até</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-36"
          />
        </div>
        <Button onClick={handleApply} size="sm" disabled={isLoading}>
          {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Aplicar'}
        </Button>
      </div>
      
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={setToday}>Hoje</Button>
        <Button variant="outline" size="sm" onClick={setLast7Days}>7 dias</Button>
        <Button variant="outline" size="sm" onClick={setLast30Days}>30 dias</Button>
      </div>
    </div>
  )
}

