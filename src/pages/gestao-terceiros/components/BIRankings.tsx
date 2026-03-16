export function RankingList({ items, valueSuffix = '' }: { items: any[]; valueSuffix?: string }) {
  if (!items?.length) {
    return <p className="text-sm text-muted-foreground py-4 text-center">Sem dados no período.</p>
  }

  return (
    <div className="space-y-1.5 mt-2 h-full overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
      {items.map((item, i) => (
        <div
          key={item.id}
          className="flex justify-between items-center p-2.5 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <span
              className={`font-bold w-6 text-right shrink-0 ${
                i === 0
                  ? 'text-amber-500'
                  : i === 1
                    ? 'text-slate-400'
                    : i === 2
                      ? 'text-amber-700'
                      : 'text-muted-foreground'
              }`}
            >
              {i + 1}.
            </span>
            <span className="font-medium text-sm text-foreground truncate" title={item.name}>
              {item.name}
            </span>
          </div>
          <span className="font-semibold text-primary text-sm shrink-0 pl-3">
            {item.value}
            {valueSuffix}
          </span>
        </div>
      ))}
    </div>
  )
}
