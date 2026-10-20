import { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3, Tag } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts'

export interface CategoryComplianceItem {
  id: string
  name: string
  color: string
  totalQuestions: number
  evaluatedQuestions: number
  obtainedScore: number
  maxPossibleScore: number
  compliancePercentage: number
}

interface AuditCategoryComplianceChartProps {
  items: Array<{
    action: {
      id: string
      title: string
      weight?: number | null
      category_id?: string | null
      category?: {
        id: string
        name: string
        color?: string | null
      } | null
    }
    score: number | null | undefined
  }>
  categories?: Array<{
    id: string
    name: string
    color?: string | null
  }>
  maxScorePerQuestion?: number // geralmente 5
  className?: string
}

export function AuditCategoryComplianceChart({
  items,
  categories = [],
  maxScorePerQuestion = 5,
  className = '',
}: AuditCategoryComplianceChartProps) {
  const categoryMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string; color: string }>()
    categories.forEach((c) => {
      map.set(c.id, {
        id: c.id,
        name: c.name,
        color: c.color || '#3b82f6',
      })
    })
    return map
  }, [categories])

  const stats = useMemo(() => {
    // Agrupar por category_id
    const groups = new Map<
      string,
      {
        id: string
        name: string
        color: string
        totalQuestions: number
        evaluatedQuestions: number
        obtainedScore: number
        maxPossibleScore: number
      }
    >()

    items.forEach((item) => {
      const catId = item.action.category_id || item.action.category?.id || 'uncategorized'
      const knownCat =
        categoryMap.get(catId) ||
        (item.action.category
          ? {
              id: item.action.category.id,
              name: item.action.category.name,
              color: item.action.category.color || '#3b82f6',
            }
          : null)

      const name = knownCat ? knownCat.name : catId === 'uncategorized' ? 'Sem categoria' : 'Outra'
      const color = knownCat ? knownCat.color : '#94a3b8' // slate-400 para sem categoria

      let group = groups.get(catId)
      if (!group) {
        group = {
          id: catId,
          name,
          color,
          totalQuestions: 0,
          evaluatedQuestions: 0,
          obtainedScore: 0,
          maxPossibleScore: 0,
        }
        groups.set(catId, group)
      }

      const weight = Number(item.action.weight) > 0 ? Number(item.action.weight) : 1
      group.totalQuestions += 1

      if (item.score !== null && item.score !== undefined) {
        group.evaluatedQuestions += 1
        group.obtainedScore += Number(item.score) * weight
        group.maxPossibleScore += maxScorePerQuestion * weight
      }
    })

    const list: CategoryComplianceItem[] = []
    groups.forEach((g) => {
      const percentage =
        g.maxPossibleScore > 0 ? Math.round((g.obtainedScore / g.maxPossibleScore) * 100) : 0
      list.push({
        ...g,
        compliancePercentage: percentage,
      })
    })

    // Ordena: Sem categoria por último; demais por % de conformidade crescente para ver gargalos primeiro
    list.sort((a, b) => {
      if (a.id === 'uncategorized') return 1
      if (b.id === 'uncategorized') return -1
      return b.compliancePercentage - a.compliancePercentage
    })

    return list
  }, [items, categoryMap, maxScorePerQuestion])

  if (stats.length === 0) {
    return null
  }

  // Altura dinâmica baseada na quantidade de categorias
  const chartHeight = Math.max(220, stats.length * 48 + 50)

  return (
    <Card className={`border shadow-sm print:break-inside-avoid ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Conformidade por Categoria
            </CardTitle>
            <CardDescription>
              Percentual ponderado de conformidade obtido em cada agrupamento de perguntas.
            </CardDescription>
          </div>
          <Badge variant="outline" className="hidden sm:inline-flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-primary" />
            {stats.length} {stats.length === 1 ? 'categoria' : 'categorias'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Gráfico de barras horizontais */}
        <div style={{ height: chartHeight }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={stats}
              layout="vertical"
              margin={{ top: 8, right: 30, left: 20, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis
                type="number"
                domain={[0, 100]}
                unit="%"
                tick={{ fontSize: 12, fill: '#64748b' }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={160}
                tick={{ fontSize: 12, fill: '#334155' }}
              />
              <Tooltip
                formatter={(value: any, _name: any, entry: any) => {
                  const item = entry.payload as CategoryComplianceItem
                  return [
                    `${value}% (${item.obtainedScore}/${item.maxPossibleScore} pts - ${item.evaluatedQuestions}/${item.totalQuestions} itens)`,
                    'Conformidade',
                  ]
                }}
                contentStyle={{
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Bar dataKey="compliancePercentage" radius={[0, 6, 6, 0]} barSize={20}>
                {stats.map((entry) => (
                  <Cell key={entry.id} fill={entry.color || '#3b82f6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Resumo em cards/chips */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t">
          {stats.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <div className="truncate">
                  <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {cat.name}
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    {cat.evaluatedQuestions}/{cat.totalQuestions} itens
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span
                  className={`text-sm font-bold ${
                    cat.compliancePercentage >= 80
                      ? 'text-green-600'
                      : cat.compliancePercentage >= 50
                        ? 'text-amber-600'
                        : 'text-red-600'
                  }`}
                >
                  {cat.compliancePercentage}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
