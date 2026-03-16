import { cn } from '@/lib/utils'

export default function DashboardGoals({ goalsData, metrics, brandSecondary }: any) {
  return (
    <div className="space-y-4 max-w-4xl mx-auto animate-in slide-in-from-bottom-4 duration-500 mt-6">
      <div
        className="flex items-center justify-between bg-card border border-border rounded-lg p-4 shadow-sm border-l-4"
        style={{ borderLeftColor: brandSecondary }}
      >
        <div>
          <h3 className="font-bold text-foreground text-base lg:text-lg">Absenteísmo</h3>
          <p className="text-[10px] lg:text-xs text-muted-foreground mt-1">
            Automático — absenteísmo &lt; 4% = 100% | ≥ 4% = 0% | Calc:{' '}
            {Number(metrics.absenteismo).toFixed(1)}%
          </p>
        </div>
        <div
          className={cn(
            'text-2xl lg:text-3xl font-black',
            goalsData.absAchieved === 100 ? 'text-green-500' : 'text-red-500',
          )}
        >
          {goalsData.absAchieved}%
        </div>
      </div>
      <div
        className="flex items-center justify-between bg-card border border-border rounded-lg p-4 shadow-sm border-l-4"
        style={{ borderLeftColor: '#eab308' }}
      >
        <div>
          <h3 className="font-bold text-foreground text-base lg:text-lg">
            Disponibilidade de Equipamentos
          </h3>
          <p className="text-[10px] lg:text-xs text-muted-foreground mt-1">
            Automático — média disponíveis / contratado
          </p>
        </div>
        <div className="text-2xl lg:text-3xl font-black text-amber-500">
          {goalsData.equipDisp.toFixed(0)}%
        </div>
      </div>
      {goalsData.manualGoals.map((g: any) => (
        <div
          key={g.id}
          className="flex items-center justify-between bg-card border border-border rounded-lg p-4 shadow-sm border-l-4 border-l-muted"
        >
          <div className="pr-4">
            <h3 className="font-bold text-foreground text-base lg:text-lg">{g.name}</h3>
            {g.description && (
              <p className="text-[10px] lg:text-xs text-muted-foreground mt-1">{g.description}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            {g.avg !== null ? (
              <div className="text-xl lg:text-2xl font-black text-foreground">
                {Number(g.avg).toFixed(1)}%
              </div>
            ) : (
              <div className="text-xs text-muted-foreground/80 font-medium">Sem lançamento</div>
            )}
          </div>
        </div>
      ))}
      <div
        className="flex items-center justify-between bg-muted/50 border border-border rounded-lg p-5 lg:p-6 shadow-sm mt-6 lg:mt-8 border-l-[6px] lg:border-l-8"
        style={{ borderLeftColor: brandSecondary }}
      >
        <div>
          <h3 className="font-black text-foreground text-lg lg:text-xl">Nota Geral</h3>
          <p className="text-xs lg:text-sm text-muted-foreground mt-1">Média de atingimento</p>
        </div>
        <div
          className={cn(
            'text-4xl lg:text-5xl font-black',
            Number(goalsData.notaGeral) >= 80
              ? 'text-green-500'
              : Number(goalsData.notaGeral) >= 50
                ? 'text-amber-500'
                : 'text-red-500',
          )}
        >
          {goalsData.notaGeral}%
        </div>
      </div>
    </div>
  )
}
