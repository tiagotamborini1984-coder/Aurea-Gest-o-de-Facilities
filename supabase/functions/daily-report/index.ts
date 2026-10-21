import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const REST_URL = 'https://jjrqqmrauaerfafjgbqj.supabase.co/rest/v1/'
const REST_API_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqcnFxbXJhdWFlcmZhZmpnYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjU4MTk2MiwiZXhwIjoyMTA4MTU3OTYyfQ.YRsMFMrdUztpfAjZwn13wMQQVIxSPySeeMrBLA0Bp8Q'

// Fetch helper from restore
async function fetchAll(table: string): Promise<any[]> {
  const all: any[] = []
  const limit = 1000
  let offset = 0
  while (true) {
    const res = await fetch(`${REST_URL}${table}?select=*&limit=${limit}&offset=${offset}`, {
      headers: {
        apikey: REST_API_KEY,
        Authorization: `Bearer ${REST_API_KEY}`,
      },
    })
    if (!res.ok) {
      throw new Error(`Failed to fetch ${table}: ${res.status} ${await res.text()}`)
    }
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) break
    all.push(...data)
    if (data.length < limit) break
    offset += limit
  }
  return all
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url)
  const step = url.searchParams.get('step') || 'check-fks'

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const prodClient = createClient(supabaseUrl, serviceKey)

  try {
    if (step === 'check-fks') {
      const audits = await fetchAll('audits')
      const auditExecutions = await fetchAll('audit_executions')
      const auditAssignments = await fetchAll('audit_assignments')

      // Check clients in prod
      const clientIds = new Set(audits.map((a) => a.client_id))
      const { data: prodClients } = await prodClient.from('clients').select('id')
      const prodClientIds = new Set((prodClients || []).map((c: any) => c.id))
      const missingClients = [...clientIds].filter((id) => !prodClientIds.has(id))

      // Check plants in prod
      const plantIds = new Set([
        ...auditExecutions.map((e) => e.plant_id).filter(Boolean),
        ...auditAssignments.map((a) => a.plant_id).filter(Boolean),
      ])
      const { data: prodPlants } = await prodClient.from('plants').select('id')
      const prodPlantIds = new Set((prodPlants || []).map((p: any) => p.id))
      const missingPlants = [...plantIds].filter((id) => !prodPlantIds.has(id))

      // Check profiles/assignees in prod
      const profileIds = new Set([
        ...auditExecutions.map((e) => e.assignee_id).filter(Boolean),
        ...auditAssignments.map((a) => a.assignee_id).filter(Boolean),
      ])
      const { data: prodProfiles } = await prodClient.from('profiles').select('id')
      const prodProfileIds = new Set((prodProfiles || []).map((p: any) => p.id))
      const missingProfiles = [...profileIds].filter((id) => !prodProfileIds.has(id))

      // Check tasks referenced in audit_executions
      const taskIds = new Set(auditExecutions.map((e) => e.task_id).filter(Boolean))
      const { data: prodTasks } = await prodClient.from('tasks').select('id')
      const prodTaskIds = new Set((prodTasks || []).map((t: any) => t.id))
      const missingTasks = [...taskIds].filter((id) => !prodTaskIds.has(id))

      return new Response(
        JSON.stringify(
          {
            auditsCount: audits.length,
            executionsCount: auditExecutions.length,
            assignmentsCount: auditAssignments.length,
            clientIdsCount: clientIds.size,
            missingClients,
            plantIdsCount: plantIds.size,
            missingPlants,
            profileIdsCount: profileIds.size,
            missingProfiles,
            taskIdsCount: taskIds.size,
            missingTasksCount: missingTasks.length,
            missingTasksSample: missingTasks.slice(0, 5),
          },
          null,
          2,
        ),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    return new Response(JSON.stringify({ error: 'Unknown step' }), { status: 400 })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
