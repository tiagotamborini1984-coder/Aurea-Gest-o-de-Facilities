import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/AppContext'
import { supabase } from '@/lib/supabase/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AccidentForm } from './components/AccidentForm'
import { AccidentAttachments } from './components/AccidentAttachments'
import { AccidentActions } from './components/AccidentActions'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function RegistroAcidente() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { activeClient } = useAppStore()
  const [accident, setAccident] = useState<any>(null)
  const [loading, setLoading] = useState(!!id)

  useEffect(() => {
    if (id && activeClient) {
      supabase
        .from('accidents')
        .select('*')
        .eq('id', id)
        .single()
        .then(({ data }) => {
          setAccident(data)
          setLoading(false)
        })
    }
  }, [id, activeClient])

  if (loading) return <div className="p-6">Carregando...</div>

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/gestao-acidentes/historico')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {id ? 'Editar Acidente' : 'Novo Acidente'}
          </h1>
          <p className="text-gray-500">Preencha os dados do registro de acidente.</p>
        </div>
      </div>

      <Tabs defaultValue="dados" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="dados">Dados do Acidente</TabsTrigger>
          {id && <TabsTrigger value="anexos">Anexos</TabsTrigger>}
          {id && <TabsTrigger value="acoes">Ações (Tarefas)</TabsTrigger>}
        </TabsList>
        <TabsContent value="dados">
          <AccidentForm initialData={accident} />
        </TabsContent>
        {id && (
          <>
            <TabsContent value="anexos">
              <AccidentAttachments accident={accident} onUpdate={(acc) => setAccident(acc)} />
            </TabsContent>
            <TabsContent value="acoes">
              <AccidentActions accidentId={id} plantId={accident?.plant_id} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  )
}
