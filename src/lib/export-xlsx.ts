const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
    t[i] = c
  }
  return t
})()

function crc32(data: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function colLetter(idx: number): string {
  let s = ''
  idx++
  while (idx > 0) {
    s = String.fromCharCode(64 + (idx % 26 || 26)) + s
    idx = Math.floor((idx - 1) / 26)
  }
  return s
}

function createZip(files: { name: string; data: Uint8Array }[]): Blob {
  const enc = new TextEncoder()
  const parts: Uint8Array[] = []
  const cdParts: Uint8Array[] = []
  let offset = 0

  for (const f of files) {
    const nb = enc.encode(f.name)
    const d = f.data
    const crc = crc32(d)
    const lh = new Uint8Array(30 + nb.length)
    const v = new DataView(lh.buffer)
    v.setUint32(0, 0x04034b50, true)
    v.setUint16(4, 20, true)
    v.setUint16(8, 0, true)
    v.setUint32(14, crc, true)
    v.setUint32(18, d.length, true)
    v.setUint32(22, d.length, true)
    v.setUint16(26, nb.length, true)
    lh.set(nb, 30)
    parts.push(lh, d)

    const cd = new Uint8Array(46 + nb.length)
    const cv = new DataView(cd.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, d.length, true)
    cv.setUint32(24, d.length, true)
    cv.setUint16(28, nb.length, true)
    cv.setUint32(42, offset, true)
    cd.set(nb, 46)
    cdParts.push(cd)
    offset += lh.length + d.length
  }

  const cdSize = cdParts.reduce((s, h) => s + h.length, 0)
  const eocd = new Uint8Array(22)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, files.length, true)
  ev.setUint16(10, files.length, true)
  ev.setUint32(12, cdSize, true)
  ev.setUint32(16, offset, true)

  return new Blob([...parts, ...cdParts, eocd], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export function exportToXlsx(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: (string | number)[][],
): void {
  const all = [...headers, ...rows.flat()]
  const enc = new TextEncoder()

  const ssXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${all.length}" uniqueCount="${all.length}">${all.map((s) => `<si><t xml:space="preserve">${escapeXml(String(s))}</t></si>`).join('')}</sst>`

  const rowXmls = rows
    .map((row, rowIdx) => {
      const r = rowIdx + 1
      const cells = row
        .map(
          (_, colIdx) =>
            `<c r="${colLetter(colIdx)}${r}" t="s"><v>${colIdx + headers.length * rowIdx + (rowIdx === 0 ? 0 : 0)}</v></c>`,
        )
        .join('')
      return `<row r="${r}">${cells}</row>`
    })
    .join('')

  const headerRow = headers.map((_, i) => `<c r="${colLetter(i)}1" t="s"><v>${i}</v></c>`).join('')

  let sharedIdx = headers.length
  const dataRowXmls = rows
    .map((row, rowIdx) => {
      const r = rowIdx + 2
      const cells = row
        .map((_, colIdx) => {
          const idx = sharedIdx
          sharedIdx++
          return `<c r="${colLetter(colIdx)}${r}" t="s"><v>${idx}</v></c>`
        })
        .join('')
      return `<row r="${r}">${cells}</row>`
    })
    .join('')

  const wsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1">${headerRow}</row>${dataRowXmls}</sheetData></worksheet>`

  const ctXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>'

  const relsXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'

  const wbXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`

  const wbRelsXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>'

  const blob = createZip([
    { name: '[Content_Types].xml', data: enc.encode(ctXml) },
    { name: '_rels/.rels', data: enc.encode(relsXml) },
    { name: 'xl/workbook.xml', data: enc.encode(wbXml) },
    { name: 'xl/_rels/workbook.xml.rels', data: enc.encode(wbRelsXml) },
    { name: 'xl/worksheets/sheet1.xml', data: enc.encode(wsXml) },
    { name: 'xl/sharedStrings.xml', data: enc.encode(ssXml) },
  ])

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
