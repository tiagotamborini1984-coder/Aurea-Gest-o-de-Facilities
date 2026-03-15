import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CadastroSimples } from '@/components/gestao-terceiros/CadastroSimples'

export default function Cadastro() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Master Data (Cadastro)
        </h2>
        <p className="text-muted-foreground mt-1">Gerencie os dados base para a operação.</p>
      </div>

      <Tabs defaultValue="plants" className="w-full">
        <TabsList className="bg-white border mb-4 h-12 p-1">
          <TabsTrigger value="plants" className="h-full rounded-md px-6">
            Plantas
          </TabsTrigger>
          <TabsTrigger value="locations" className="h-full rounded-md px-6">
            Locais
          </TabsTrigger>
          <TabsTrigger value="functions" className="h-full rounded-md px-6">
            Funções
          </TabsTrigger>
          <TabsTrigger value="goals" className="h-full rounded-md px-6">
            Book de Metas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plants">
          <CadastroSimples
            type="plants"
            title="Plantas"
            fields={[
              { name: 'name', label: 'Nome da Planta' },
              { name: 'code', label: 'Código' },
              { name: 'city', label: 'Cidade' },
            ]}
          />
        </TabsContent>

        <TabsContent value="locations">
          <CadastroSimples
            type="locations"
            title="Locais"
            fields={[
              { name: 'name', label: 'Nome do Local' },
              { name: 'description', label: 'Descrição' },
            ]}
          />
        </TabsContent>

        <TabsContent value="functions">
          <CadastroSimples
            type="functions"
            title="Funções"
            fields={[
              { name: 'name', label: 'Nome da Função' },
              { name: 'description', label: 'Descrição' },
            ]}
          />
        </TabsContent>

        <TabsContent value="goals">
          <CadastroSimples
            type="goals_book"
            title="Book de Metas"
            fields={[
              { name: 'name', label: 'Nome da Meta' },
              { name: 'description', label: 'Descrição' },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
