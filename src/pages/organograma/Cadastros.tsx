import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UnidadesList } from './components/UnidadesList'
import { FuncoesList } from './components/FuncoesList'
import { ColaboradoresList } from './components/ColaboradoresList'
import { Building2, Users, Briefcase } from 'lucide-react'

export default function OrgCadastros() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cadastros do Organograma</h1>
        <p className="text-muted-foreground">Gerencie a estrutura organizacional da sua empresa.</p>
      </div>

      <Tabs defaultValue="colaboradores" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="unidades" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Unidades
          </TabsTrigger>
          <TabsTrigger value="funcoes" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" /> Funções
          </TabsTrigger>
          <TabsTrigger value="colaboradores" className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Colaboradores
          </TabsTrigger>
        </TabsList>
        <TabsContent value="unidades">
          <UnidadesList />
        </TabsContent>
        <TabsContent value="funcoes">
          <FuncoesList />
        </TabsContent>
        <TabsContent value="colaboradores">
          <ColaboradoresList />
        </TabsContent>
      </Tabs>
    </div>
  )
}
