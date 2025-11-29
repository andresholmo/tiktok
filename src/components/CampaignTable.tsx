'use client'

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

interface CampaignTableProps {
  campaigns: Campaign[]
}

export function CampaignTable({ campaigns }: CampaignTableProps) {
  const sortedCampaigns = [...campaigns].sort((a, b) => a.roi - b.roi)

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-blue-600">
            <TableHead className="text-white font-bold">STATUS</TableHead>
            <TableHead className="text-white font-bold">CAMPANHA</TableHead>
            <TableHead className="text-white font-bold text-center">ROI</TableHead>
            <TableHead className="text-white font-bold text-right">GASTO</TableHead>
            <TableHead className="text-white font-bold text-right">GANHO</TableHead>
            <TableHead className="text-white font-bold text-right">LUCRO/PREJUÍZO</TableHead>
            <TableHead className="text-white font-bold text-center">CPC</TableHead>
            <TableHead className="text-white font-bold text-center">CTR</TableHead>
            <TableHead className="text-white font-bold text-center">eCPM</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedCampaigns.map((campaign) => (
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
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
