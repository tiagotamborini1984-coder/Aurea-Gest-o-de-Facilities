import { useMemo } from 'react'
import { SignaturePad } from '../SignaturePad'

interface Signature {
  name: string
  dataUrl: string
}

interface SignatureCaptureProps {
  participantsText: string
  signatures: Signature[]
  onChange: (signatures: Signature[]) => void
}

export function SignatureCapture({
  participantsText,
  signatures,
  onChange,
}: SignatureCaptureProps) {
  const participantNames = useMemo(() => {
    if (!participantsText?.trim()) return []
    return participantsText
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean)
  }, [participantsText])

  const handleSignatureChange = (name: string, dataUrl: string | null) => {
    if (!dataUrl) {
      onChange(signatures.filter((s) => s.name !== name))
      return
    }

    const newSignatures = [...signatures]
    const existingIndex = newSignatures.findIndex((s) => s.name === name)
    if (existingIndex >= 0) {
      newSignatures[existingIndex].dataUrl = dataUrl
    } else {
      newSignatures.push({ name, dataUrl })
    }
    onChange(newSignatures)
  }

  if (participantNames.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        Adicione participantes para liberar a assinatura.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium">Assinaturas Obrigatórias</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {participantNames.map((name) => {
          const sig = signatures.find((s) => s.name === name)
          return (
            <div key={name} className="p-4 border rounded-lg bg-muted/20">
              <SignaturePad
                label={`Assinatura: ${name}`}
                value={sig?.dataUrl}
                onChange={(dataUrl) => handleSignatureChange(name, dataUrl)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
