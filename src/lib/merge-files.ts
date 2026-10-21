import { PDFDocument } from 'pdf-lib'

/**
 * Mescla múltiplos arquivos (PDFs e/ou imagens jpg/png) num ÚNICO PDF,
 * preservando a ordem de seleção. Usado no anexo de listas de presença
 * divididas em mais de um arquivo.
 */
export async function mergeFilesToPdf(files: File[]): Promise<File> {
  if (files.length === 0) throw new Error('Nenhum arquivo selecionado.')
  if (files.length === 1 && files[0].type === 'application/pdf') return files[0]

  const out = await PDFDocument.create()
  for (const file of files) {
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
    if (isPdf) {
      const bytes = await file.arrayBuffer()
      const src = await PDFDocument.load(bytes)
      const pages = await out.copyPages(src, src.getPageIndices())
      pages.forEach((p) => out.addPage(p))
    } else if (/^image\/(jpeg|png)$/.test(file.type)) {
      const bytes = await file.arrayBuffer()
      const img = file.type === 'image/png' ? await out.embedPng(bytes) : await out.embedJpg(bytes)
      const page = out.addPage([img.width, img.height])
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height })
    } else {
      throw new Error(`Formato não suportado: ${file.name}`)
    }
  }
  const mergedBytes = await out.save()
  return new File([mergedBytes as unknown as BlobPart], 'lista_unificada.pdf', {
    type: 'application/pdf',
  })
}
