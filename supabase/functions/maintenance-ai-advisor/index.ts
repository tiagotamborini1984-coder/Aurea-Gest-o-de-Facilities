import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')

    // Use anon key and pass the user's auth token so RLS policies are applied naturally
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const body = await req.json()
    const { plant_id, client_id } = body
    
    if (!plant_id || !client_id) {
      throw new Error('Missing plant_id or client_id')
    }

    // Find assets without active plans
    const { data: assets, error: assetsError } = await supabaseClient
      .from('maintenance_assets')
      .select('id, name, description')
      .eq('plant_id', plant_id)
      .eq('client_id', client_id)
      .eq('status', 'Ativo')

    if (assetsError) throw assetsError

    const { data: plans, error: plansError } = await supabaseClient
      .from('maintenance_preventive_plans')
      .select('asset_id, area_id')
      .eq('plant_id', plant_id)
      .eq('is_active', true)

    if (plansError) throw plansError

    const assetsWithPlans = new Set(plans?.filter(p => p.asset_id).map(p => p.asset_id))
    const assetsWithoutPlans = assets?.filter(a => !assetsWithPlans.has(a.id)) || []

    const targetAssets = assetsWithoutPlans.slice(0, 5)
    const suggestions = []

    for (const asset of targetAssets) {
      const nameLower = asset.name.toLowerCase()
      let title = `Inspeção Preventiva - ${asset.name}`
      let frequency = 'Mensal'
      let description = 'Plano de manutenção preventiva sugerido pelo Assistente IA para cobrir este equipamento.'
      let checklist = [
        'Verificação geral de integridade estrutural',
        'Limpeza externa do equipamento',
        'Inspeção visual de conexões',
        'Teste funcional de operação'
      ]

      if (nameLower.includes('ar') || nameLower.includes('hvac') || nameLower.includes('condicionado') || nameLower.includes('split')) {
        frequency = 'Mensal'
        title = `Manutenção Preventiva HVAC - ${asset.name}`
        checklist = [
          'Limpeza e higienização dos filtros de ar',
          'Verificação da pressão do gás refrigerante',
          'Inspeção e limpeza do dreno de condensado',
          'Medição da corrente elétrica do compressor',
          'Verificação de isolamento térmico das tubulações'
        ]
      } else if (nameLower.includes('compressor')) {
        frequency = 'Trimestral'
        title = `Revisão Trimestral - ${asset.name}`
        checklist = [
          'Verificação e troca de óleo se necessário',
          'Verificação de vazamentos nas mangueiras e conexões',
          'Teste da válvula de segurança',
          'Drenagem do reservatório de condensado',
          'Limpeza do filtro de admissão'
        ]
      } else if (nameLower.includes('gerador') || nameLower.includes('gmg')) {
        frequency = 'Semanal'
        title = `Teste de Funcionamento e Inspeção - ${asset.name}`
        checklist = [
          'Verificar nível de combustível e óleo lubrificante',
          'Inspecionar baterias e terminais',
          'Testar acionamento em vazio por 15 min',
          'Verificar vazamentos no painel e motor',
          'Checar temperatura do líquido de arrefecimento'
        ]
      } else if (nameLower.includes('bomba') || nameLower.includes('recalque')) {
        frequency = 'Semestral'
        title = `Manutenção Preventiva de Bombas - ${asset.name}`
        checklist = [
          'Verificar ruídos e vibrações anormais',
          'Verificar alinhamento do acoplamento',
          'Inspecionar selo mecânico contra vazamentos',
          'Lubrificar rolamentos do motor',
          'Reaperto de parafusos de fixação'
        ]
      } else if (nameLower.includes('extintor')) {
        frequency = 'Mensal'
        title = `Inspeção Mensal de Extintores - ${asset.name}`
        checklist = [
          'Verificar desobstrução e acesso',
          'Inspecionar manômetro (pressão adequada)',
          'Verificar integridade do lacre e cupilha',
          'Checar validade da carga',
          'Garantir bom estado da mangueira e difusor'
        ]
      }

      suggestions.push({
        scope: 'asset',
        asset_id: asset.id,
        asset_name: asset.name,
        title,
        frequency,
        description,
        checklist
      })
    }

    if (suggestions.length < 5) {
      const { data: areas, error: areasError } = await supabaseClient
        .from('maintenance_areas')
        .select('id, name')
        .eq('plant_id', plant_id)
        .eq('client_id', client_id)

      if (!areasError && areas) {
        const areasWithPlans = new Set(plans?.filter(p => p.area_id).map(p => p.area_id))
        const areasWithoutPlans = areas.filter(a => !areasWithPlans.has(a.id))
        
        const targetAreas = areasWithoutPlans.slice(0, 5 - suggestions.length)
        for (const area of targetAreas) {
          suggestions.push({
            scope: 'area',
            area_id: area.id,
            area_name: area.name,
            title: `Ronda de Conservação Predial - ${area.name}`,
            frequency: 'Semanal',
            description: 'Ronda de conservação estrutural e inspeção visual de anomalias na área.',
            checklist: [
              'Verificar integridade da iluminação (lâmpadas queimadas)',
              'Inspecionar conservação de pintura e paredes',
              'Verificar funcionamento de esquadrias e fechaduras',
              'Checar pontos de infiltrações ou vazamentos',
              'Verificar integridade de interruptores e tomadas'
            ]
          })
        }
      }
    }

    return new Response(JSON.stringify({ success: true, suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
