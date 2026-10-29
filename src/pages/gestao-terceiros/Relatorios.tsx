import { useState, useEffect, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { FileSpreadsheet, Loader2, Printer, Briefcase } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useMasterData } from '@/hooks/use-master-data'
import { exportToCSV } from '@/lib/export'
import { format, subDays, subMonths, addMonths, differenceInDays, startOfDay } from 'date-fns'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/AppContext'
import RelatorioCargos from './components/RelatorioCargos'
import { useCargoCalculations } from './hooks/useCargoCalculations'

export default function Relatorios() {
  const { profile, selectedMasterClient } = useAppStore()
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 14), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  // Para a aba por cargo, default de período de 6 meses para visualização mensal
  const [cargoDateFrom, setCargoDateFrom] = useState(format(subMonths(new Date(), 6), 'yyyy-MM-01'))
  const [cargoDateTo, setCargoDateTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedPlants, setSelectedPlants] = useState<string[]>([])
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState('colaborador')
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const { toast } = useToast()
  const {
    plants,
    employees,
    functions,
    locations,
    equipment,
    contracted,
    companies,
    employeeTrainingRecords,
    trainings,
  } = useMasterData()

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true)
      let query = supabase.from('daily_logs').select('*').gte('date', dateFrom).lte('date', dateTo)

      if (profile?.role === 'Master' && selectedMasterClient !== 'all') {
        query = query.eq('client_id', selectedMasterClient)
      } else if (profile?.role !== 'Master' && profile?.client_id) {
        query = query.eq('client_id', profile.client_id)
      }

      const { data } = await query
      setLogs(data || [])
      setLoading(false)
    }
    if (plants.length > 0 && activeTab !== 'treinamentos' && activeTab !== 'cargo') fetchLogs()
  }, [dateFrom, dateTo, plants, activeTab, profile, selectedMasterClient])

  const availableCompanies = useMemo(() => {
    const empsInPlants = employees.filter(
      (e) => selectedPlants.length === 0 || selectedPlants.includes(e.plant_id),
    )
    const compSet = new Set<string>()
    empsInPlants.forEach((e) => {
      const name = e.company_name?.trim()
      if (name) compSet.add(name)
    })
    companies.forEach((c) => {
      const name = c.name?.trim()
      if (name) compSet.add(name)
    })
    return Array.from(compSet).sort((a, b) => a.localeCompare(b))
  }, [employees, selectedPlants, companies])

  const handleCompanyChange = (c: string, checked: boolean) => {
    if (selectedCompanies.length === 0) {
      setSelectedCompanies(availableCompanies.filter((x) => x !== c) as string[])
    } else if (checked) {
      const next = [...selectedCompanies, c]
      setSelectedCompanies(next.length === availableCompanies.length ? [] : next)
    } else {
      setSelectedCompanies(selectedCompanies.filter((x) => x !== c))
    }
  }

  const reportData = useMemo(() => {
    // Normalização dos identificadores e nomes de empresas aceitos
    const acceptedCompanyIdentifiers = new Set<string>()
    if (selectedCompanies.length > 0) {
      selectedCompanies.forEach((val) => {
        acceptedCompanyIdentifiers.add(val)
        const matchedComp = companies.find((c) => c.id === val || c.name === val)
        if (matchedComp) {
          if (matchedComp.id) acceptedCompanyIdentifiers.add(matchedComp.id)
          if (matchedComp.name) acceptedCompanyIdentifiers.add(matchedComp.name)
        }
      })
      employees.forEach((e) => {
        if (
          (e.company_id && acceptedCompanyIdentifiers.has(e.company_id)) ||
          (e.company_name && acceptedCompanyIdentifiers.has(e.company_name))
        ) {
          if (e.company_id) acceptedCompanyIdentifiers.add(e.company_id)
          if (e.company_name) acceptedCompanyIdentifiers.add(e.company_name)
        }
      })
    }

    const matchesCompany = (companyId?: string | null, companyName?: string | null): boolean => {
      if (selectedCompanies.length === 0) return true
      if (companyId && acceptedCompanyIdentifiers.has(companyId)) return true
      if (companyName && acceptedCompanyIdentifiers.has(companyName)) return true
      return false
    }

    const allowedPlantIds = new Set(plants.map((p) => p.id))
    const effectiveSelectedPlants =
      selectedPlants.length > 0
        ? selectedPlants.filter((id) => allowedPlantIds.has(id))
        : plants.map((p) => p.id)

    const validLogs = logs.filter((l) => effectiveSelectedPlants.includes(l.plant_id))
    const validDates = new Set(validLogs.map((l) => l.date))
    const validDays = Math.max(1, validDates.size)

    let result: any[] = []

    if (activeTab === 'colaborador') {
      const targets = employees.filter(
        (e) =>
          effectiveSelectedPlants.includes(e.plant_id) &&
          matchesCompany(e.company_id, e.company_name),
      )
      result = targets.map((emp) => {
        const eLogs = validLogs.filter((l) => l.type === 'staff' && l.reference_id === emp.id)
        const pres = eLogs.filter((l) => l.status).length
        const faltas = eLogs.filter((l) => !l.status).length
        const mPres = pres / validDays
        const mFaltas = faltas / validDays
        const cont = 1
        return {
          Entidade: emp.name,
          'Média Presenças': mPres,
          'Média Faltas': mFaltas,
          Contratado: cont,
          'Taxa Presença': (mPres / cont) * 100,
          Absenteísmo: (mFaltas / cont) * 100,
        }
      })
    } else if (activeTab === 'local') {
      const targets = locations.filter((l) => effectiveSelectedPlants.includes(l.plant_id))
      result = targets.map((loc) => {
        const empIds = employees
          .filter((e) => e.location_id === loc.id && matchesCompany(e.company_id, e.company_name))
          .map((e) => e.id)
        const eLogs = validLogs.filter((l) => l.type === 'staff' && empIds.includes(l.reference_id))
        const pres = eLogs.filter((l) => l.status).length
        const faltas = eLogs.filter((l) => !l.status).length
        const mPres = pres / validDays
        const mFaltas = faltas / validDays
        const cont = contracted
          .filter((c) => {
            if (c.location_id !== loc.id || c.type !== 'colaborador') return false
            if (selectedCompanies.length > 0) {
              if (!c.company_id) return false
              if (!matchesCompany(c.company_id, null)) return false
            }
            return true
          })
          .reduce((a, b) => a + b.quantity, 0)
        return {
          Entidade: loc.name,
          'Média Presenças': mPres,
          'Média Faltas': mFaltas,
          Contratado: cont,
          'Taxa Presença': cont > 0 ? (mPres / cont) * 100 : 0,
          Absenteísmo: cont > 0 ? (mFaltas / cont) * 100 : 0,
        }
      })
    } else if (activeTab === 'planta') {
      const targets = plants.filter((p) => effectiveSelectedPlants.includes(p.id))
      result = targets.map((p) => {
        const empIds = employees
          .filter((e) => e.plant_id === p.id && matchesCompany(e.company_id, e.company_name))
          .map((e) => e.id)
        const eLogs = validLogs.filter((l) => l.type === 'staff' && empIds.includes(l.reference_id))
        const pres = eLogs.filter((l) => l.status).length
        const faltas = eLogs.filter((l) => !l.status).length
        const mPres = pres / validDays
        const mFaltas = faltas / validDays
        const cont = contracted
          .filter((c) => {
            if (c.plant_id !== p.id || c.type !== 'colaborador') return false
            if (selectedCompanies.length > 0) {
              if (!c.company_id) return false
              if (!matchesCompany(c.company_id, null)) return false
            }
            return true
          })
          .reduce((a, b) => a + b.quantity, 0)
        return {
          Entidade: p.name,
          'Média Presenças': mPres,
          'Média Faltas': mFaltas,
          Contratado: cont,
          'Taxa Presença': cont > 0 ? (mPres / cont) * 100 : 0,
          Absenteísmo: cont > 0 ? (mFaltas / cont) * 100 : 0,
        }
      })
    } else if (activeTab === 'equipamento') {
      const targets = equipment.filter((e) => effectiveSelectedPlants.includes(e.plant_id))
      result = targets.map((eq) => {
        const eLogs = validLogs.filter((l) => l.type === 'equipment' && l.reference_id === eq.id)
        const pres = eLogs.filter((l) => l.status).length
        const faltas = eLogs.filter((l) => !l.status).length
        const mPres = pres / validDays
        const mFaltas = faltas / validDays
        const cont =
          contracted
            .filter((c) => c.equipment_id === eq.id && c.type === 'equipamento')
            .reduce((a, b) => a + b.quantity, 0) || eq.quantity
        return {
          Entidade: eq.name,
          'Média Presenças': mPres,
          'Média Faltas': mFaltas,
          Contratado: cont,
          'Taxa Presença': cont > 0 ? (mPres / cont) * 100 : 0,
          Absenteísmo: cont > 0 ? (mFaltas / cont) * 100 : 0,
        }
      })
    } else if (activeTab === 'treinamentos') {
      const today = startOfDay(new Date())

      const targets = employees.filter(
        (e) =>
          effectiveSelectedPlants.includes(e.plant_id) &&
          matchesCompany(e.company_id, e.company_name),
      )
      const targetIds = targets.map((e) => e.id)

      employeeTrainingRecords.forEach((record) => {
        if (!targetIds.includes(record.employee_id)) return

        const training = trainings.find((t) => t.id === record.training_id)
        if (!training || !training.validity_months) return

        const completionDate = new Date(record.completion_date + 'T12:00:00')
        const expirationDate = addMonths(completionDate, training.validity_months)

        const daysRemaining = differenceInDays(expirationDate, today)

        if (daysRemaining <= 30) {
          const emp = targets.find((e) => e.id === record.employee_id)
          result.push({
            'Nome do Colaborador': emp?.name || '',
            Treinamento: training.name,
            'Data de Vencimento': format(expirationDate, 'dd/MM/yyyy'),
            'Dias para o Vencimento': daysRemaining,
            _days: daysRemaining,
          })
        }
      })

      result.sort((a, b) => a._days - b._days)
      result.forEach((r) => delete r._days)
      return result
    }

    if (activeTab === 'treinamentos') return result

    return result.filter(
      (r) => r['Média Presenças'] > 0 || r['Média Faltas'] > 0 || r.Contratado > 0,
    )
  }, [
    logs,
    selectedPlants,
    selectedCompanies,
    activeTab,
    employees,
    locations,
    plants,
    equipment,
    contracted,
    employeeTrainingRecords,
    trainings,
    companies,
  ])

  // Hook auxiliar para exportação CSV dos dados por cargo
  const { cargos: cargosCalculados } = useCargoCalculations({
    employees,
    contracted,
    functions,
    plants,
    companies,
    selectedPlants,
    selectedFunctionId: 'all',
    selectedCompanies,
    dateFrom: cargoDateFrom,
    dateTo: cargoDateTo,
  })

  const handleExportCSV = () => {
    if (activeTab === 'cargo') {
      if (cargosCalculados.length === 0) return
      // Exporta formato expandido: uma linha por cargo por mês
      const rows: any[] = []
      cargosCalculados.forEach((c) => {
        c.series.forEach((s) => {
          rows.push({
            Cargo: c.functionName,
            Mês: s.monthLabel,
            'Efetivo Ativo': s.efetivo,
            'Quadro Ideal': s.quadroIdeal > 0 ? s.quadroIdeal : 'Não definido',
            Déficit: s.deficit,
            'Abaixo do Quadro': s.isAbaixoDoQuadro ? 'SIM' : 'NÃO',
            Admissões: s.admissoes,
            Desligamentos: s.desligamentos,
            'Tempo Reposição (dias)':
              s.tempoMedioReposicaoDias !== null ? s.tempoMedioReposicaoDias : '—',
          })
        })
      })
      exportToCSV(`Relatorio_Por_Cargo_${format(new Date(), 'yyyy-MM-dd')}.csv`, rows)
      toast({ title: 'Relatório por cargo exportado para Excel' })
      return
    }

    if (reportData.length > 0) {
      const exportData = reportData.map((row) => {
        const newRow: any = {}
        Object.keys(row).forEach((key) => {
          if (
            typeof row[key] === 'number' &&
            key !== 'Contratado' &&
            key !== 'Dias para o Vencimento'
          ) {
            newRow[key] =
              row[key].toFixed(1) + (key.includes('Taxa') || key.includes('Absenteísmo') ? '%' : '')
          } else {
            newRow[key] = row[key]
          }
        })
        return newRow
      })
      exportToCSV(`Relatorio_${activeTab}_${format(new Date(), 'yyyy-MM-dd')}.csv`, exportData)
      toast({ title: 'Relatório exportado para Excel' })
    }
  }

  const handleExportPDF = () => {
    window.print()
  }

  const entityKey =
    activeTab === 'colaborador'
      ? 'Colaborador'
      : activeTab === 'local'
        ? 'Local'
        : activeTab === 'planta'
          ? 'Planta'
          : 'Equipamento'

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12 animate-fade-in print:max-w-none print:w-full">
      <div className="print:text-center print:mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-brand-graphite">Relatórios</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {activeTab === 'treinamentos'
            ? 'Acompanhamento de vencimentos de treinamentos e certificações'
            : activeTab === 'cargo'
              ? 'Histórico de efetivo por cargo, déficit em relação ao quadro ideal e tempo médio de reposição'
              : `Presenças e faltas por ${activeTab} (${format(new Date(dateFrom), 'dd/MM/yyyy')} a ${format(new Date(dateTo), 'dd/MM/yyyy')})`}
        </p>
      </div>

      {/* Bloco de Filtros Globais unificado (compartilhado e sincronizado entre todas as abas) */}
      <Card className="shadow-sm border-gray-100 overflow-hidden print:hidden">
        <CardContent className="p-6 space-y-6 bg-white">
          {activeTab !== 'treinamentos' && activeTab !== 'cargo' && (
            <div className="flex flex-wrap gap-6">
              <div className="space-y-1.5">
                <Label
                  className="text-xs text-slate-700 uppercase font-bold tracking-wider"
                  translate="no"
                >
                  Data Inicial
                </Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-[160px] h-10 border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  className="text-xs text-slate-700 uppercase font-bold tracking-wider"
                  translate="no"
                >
                  Data Final
                </Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-[160px] h-10 border-slate-200"
                />
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Label className="text-xs text-slate-700 uppercase font-bold tracking-wider">
              Filtrar por Planta (múltipla seleção)
            </Label>
            <div className="flex flex-wrap gap-5 p-4 bg-slate-50 rounded-xl border border-gray-200">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="all-plants-report"
                  checked={selectedPlants.length === 0}
                  onCheckedChange={() => setSelectedPlants([])}
                  className="w-5 h-5 rounded border-slate-300"
                />
                <Label
                  htmlFor="all-plants-report"
                  className="font-medium cursor-pointer text-sm text-slate-800"
                >
                  Todas as Plantas
                </Label>
              </div>
              {plants.map((p) => (
                <div key={p.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`plant-${p.id}`}
                    checked={selectedPlants.includes(p.id)}
                    onCheckedChange={(checked) => {
                      if (checked) setSelectedPlants([...selectedPlants, p.id])
                      else setSelectedPlants(selectedPlants.filter((id) => id !== p.id))
                    }}
                    className="w-5 h-5 rounded border-slate-300"
                  />
                  <Label
                    htmlFor={`plant-${p.id}`}
                    className="font-medium cursor-pointer text-sm text-slate-800"
                  >
                    {p.name}
                  </Label>
                </div>
              ))}
              {plants.length === 0 && (
                <span className="text-sm text-slate-600">Nenhuma planta cadastrada.</span>
              )}
            </div>
          </div>

          {activeTab !== 'equipamento' && availableCompanies.length > 0 && (
            <>
              <div className="h-px bg-slate-100 my-4" />
              <div className="space-y-3">
                <Label className="text-xs text-slate-700 uppercase font-bold tracking-wider">
                  Filtrar por Empresa (múltipla seleção)
                </Label>
                <div className="flex flex-wrap gap-5 p-4 bg-slate-50 rounded-xl border border-gray-200">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="all-companies-report"
                      checked={
                        selectedCompanies.length === 0 ||
                        selectedCompanies.length === availableCompanies.length
                      }
                      onCheckedChange={() => setSelectedCompanies([])}
                      className="w-5 h-5 rounded border-slate-300"
                    />
                    <Label
                      htmlFor="all-companies-report"
                      className="font-medium cursor-pointer text-sm text-slate-800"
                    >
                      Todas as empresas
                    </Label>
                  </div>
                  {availableCompanies.map((c: any) => (
                    <div key={c} className="flex items-center space-x-2">
                      <Checkbox
                        id={`company-${c}`}
                        checked={
                          selectedCompanies.length === 0 ? true : selectedCompanies.includes(c)
                        }
                        onCheckedChange={(checked) => handleCompanyChange(c, checked as boolean)}
                        className="w-5 h-5 rounded border-slate-300"
                      />
                      <Label
                        htmlFor={`company-${c}`}
                        className="font-medium cursor-pointer text-sm text-slate-700"
                      >
                        {c}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList className="bg-white border border-gray-200 p-1 flex-wrap sm:flex-nowrap h-auto w-full sm:w-auto">
            <TabsTrigger
              value="colaborador"
              className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 text-slate-600"
            >
              Por Colaborador
            </TabsTrigger>
            <TabsTrigger
              value="local"
              className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 text-slate-600"
            >
              Por Local
            </TabsTrigger>
            <TabsTrigger
              value="planta"
              className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 text-slate-600"
            >
              Por Planta
            </TabsTrigger>
            <TabsTrigger
              value="equipamento"
              className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 text-slate-600"
            >
              Por Equipamento
            </TabsTrigger>
            <TabsTrigger
              value="treinamentos"
              className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 text-slate-600"
            >
              Treinamentos a Vencer
            </TabsTrigger>
            <TabsTrigger
              value="cargo"
              className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 text-slate-600 font-semibold"
            >
              <Briefcase className="h-3.5 w-3.5 mr-1 text-brand-deepBlue" />
              Por Cargo
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportPDF}
            disabled={
              activeTab === 'cargo' ? cargosCalculados.length === 0 : reportData.length === 0
            }
            className="bg-white hover:bg-slate-50 border-gray-300 text-slate-700"
          >
            <Printer className="h-4 w-4 mr-2" /> Exportar para PDF
          </Button>
          <Button
            variant="outline"
            onClick={handleExportCSV}
            disabled={
              activeTab === 'cargo' ? cargosCalculados.length === 0 : reportData.length === 0
            }
            className="bg-white hover:bg-slate-50 border-gray-300 text-slate-700"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Exportar para Excel
          </Button>
        </div>
      </div>

      {activeTab === 'cargo' ? (
        <RelatorioCargos
          employees={employees}
          contracted={contracted}
          functions={functions}
          plants={plants}
          companies={companies}
          selectedPlants={selectedPlants}
          selectedCompanies={selectedCompanies}
          onCompanyChange={handleCompanyChange}
          onClearCompanies={() => setSelectedCompanies([])}
          dateFrom={cargoDateFrom}
          dateTo={cargoDateTo}
          onDateFromChange={setCargoDateFrom}
          onDateToChange={setCargoDateTo}
        />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:border-none print:shadow-none">
          <Table className="print:border-collapse print:w-full">
            <TableHeader className="bg-slate-50/80 border-b border-gray-200 print:bg-transparent print:border-b-2 print:border-slate-800">
              {activeTab === 'treinamentos' ? (
                <TableRow>
                  <TableHead className="font-semibold text-slate-800 h-12 print:text-black print:p-2">
                    Nome do Colaborador
                  </TableHead>
                  <TableHead className="font-semibold text-slate-800 print:text-black print:p-2">
                    Treinamento
                  </TableHead>
                  <TableHead className="font-semibold text-slate-800 text-center print:text-black print:p-2">
                    Data de Vencimento
                  </TableHead>
                  <TableHead className="font-semibold text-slate-800 text-center print:text-black print:p-2">
                    Dias para o Vencimento
                  </TableHead>
                </TableRow>
              ) : (
                <TableRow>
                  <TableHead className="font-semibold text-slate-800 h-12 print:text-black print:p-2">
                    {entityKey}
                  </TableHead>
                  <TableHead className="font-semibold text-slate-800 text-center print:text-black print:p-2">
                    Média Presenças
                  </TableHead>
                  <TableHead className="font-semibold text-slate-800 text-center print:text-black print:p-2">
                    Média Faltas
                  </TableHead>
                  <TableHead className="font-semibold text-slate-800 text-center print:text-black print:p-2">
                    Contratado
                  </TableHead>
                  <TableHead className="font-semibold text-slate-800 text-center print:text-black print:p-2">
                    Taxa Presença
                  </TableHead>
                  <TableHead className="font-semibold text-slate-800 text-center print:text-black print:p-2">
                    Absenteísmo
                  </TableHead>
                </TableRow>
              )}
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={activeTab === 'treinamentos' ? 4 : 6}
                    className="text-center py-12"
                  >
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-brand-deepBlue" />
                  </TableCell>
                </TableRow>
              ) : reportData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={activeTab === 'treinamentos' ? 4 : 6}
                    className="text-center py-12 text-slate-600"
                  >
                    Sem dados para exibir no período selecionado.
                  </TableCell>
                </TableRow>
              ) : activeTab === 'treinamentos' ? (
                reportData.map((row, i) => (
                  <TableRow
                    key={i}
                    className="hover:bg-slate-50/50 border-gray-100 print:border-b print:border-slate-200"
                  >
                    <TableCell className="font-medium text-slate-800 print:text-black print:p-2 print:break-inside-avoid">
                      {row['Nome do Colaborador']}
                    </TableCell>
                    <TableCell className="text-slate-700 print:text-black print:p-2 print:break-inside-avoid">
                      {row['Treinamento']}
                    </TableCell>
                    <TableCell className="text-center font-medium text-slate-700 print:text-black print:p-2 print:break-inside-avoid">
                      {row['Data de Vencimento']}
                    </TableCell>
                    <TableCell className="text-center print:p-2 print:break-inside-avoid">
                      <span
                        className={cn(
                          'inline-flex items-center px-2.5 py-1 rounded text-xs font-bold print:bg-transparent print:text-black',
                          row['Dias para o Vencimento'] < 0
                            ? 'bg-red-100 text-red-800'
                            : row['Dias para o Vencimento'] <= 15
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-green-100 text-green-800',
                        )}
                      >
                        {row['Dias para o Vencimento'] < 0
                          ? 'Vencido'
                          : `${row['Dias para o Vencimento']} dias`}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                reportData.map((row, i) => (
                  <TableRow
                    key={i}
                    className="hover:bg-slate-50/50 border-gray-100 print:border-b print:border-slate-200"
                  >
                    <TableCell className="font-medium text-slate-800 print:text-black print:p-2 print:break-inside-avoid">
                      {row.Entidade}
                    </TableCell>
                    <TableCell className="text-center print:p-2 print:break-inside-avoid">
                      <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-green-100 text-green-800 print:bg-transparent print:text-black">
                        {Number(row['Média Presenças']).toFixed(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center print:p-2 print:break-inside-avoid">
                      <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-red-100 text-red-800 print:bg-transparent print:text-black">
                        {Number(row['Média Faltas']).toFixed(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center font-bold text-slate-800 print:text-black print:p-2 print:break-inside-avoid">
                      {row.Contratado}
                    </TableCell>
                    <TableCell className="text-center font-medium text-slate-700 print:text-black print:p-2 print:break-inside-avoid">
                      {Number(row['Taxa Presença']).toFixed(1)}%
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-center font-semibold print:text-black print:p-2 print:break-inside-avoid',
                        Number(row.Absenteísmo) > 0
                          ? 'text-red-700 print:text-black'
                          : 'text-slate-700 print:text-black',
                      )}
                    >
                      {Number(row.Absenteísmo).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
