export function exportToCSV(filename: string, rows: any[]) {
  if (!rows || !rows.length) return
  const keys = Object.keys(rows[0])
  const csvContent = [
    keys.join(','),
    ...rows.map((row) => keys.map((k) => `"${row[k] || ''}"`).join(',')),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
}
