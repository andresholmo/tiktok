'use client'

import { useEffect, useState } from 'react'

export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Import } from '@/types'
import { formatCurrency, formatPercent, formatDate } from '@/lib/utils'
import { Trash2, Eye } from 'lucide-react'

export default function HistoricoPage() {
  const [imports, setImports] = useState<Import[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchImports()
  }, [])

  async function fetchImports() {
    try {
      const { data, error } = await supabase
        .from('imports')
        .select('*')
        .order('date', { ascending: false })

      if (!error && data) {
        setImports(data)
      }
    } catch (error) {
      console.error('Erro ao buscar importações:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta importação?')) return

    try {
      const { error } = await supabase
        .from('imports')
        .delete()
        .eq('id', id)

      if (!error) {
        setImports(imports.filter(i => i.id !== id))
      }
    } catch (error) {
      console.error('Erro ao excluir:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Histórico de Importações</h1>

      <Card>
        <CardHeader>
          <CardTitle>Todas as Importações ({imports.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {imports.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma importação encontrada.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Gasto</TableHead>
                  <TableHead className="text-right">Ganho</TableHead>
                  <TableHead className="text-right">Lucro/Prejuízo</TableHead>
                  <TableHead className="text-center">ROI</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.map((imp) => (
                  <TableRow key={imp.id}>
                    <TableCell className="font-medium">
                      {formatDate(imp.date)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(imp.total_gasto))}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(imp.total_ganho))}
                    </TableCell>
                    <TableCell className={`text-right ${Number(imp.total_lucro) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(Number(imp.total_lucro))}
                    </TableCell>
                    <TableCell className={`text-center ${Number(imp.roi_geral) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercent(Number(imp.roi_geral))}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.location.href = `/?import_id=${imp.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(imp.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
