import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { recipient_email, recipient_name, protocol_number, sender, arrival_date, plant_name } =
      await req.json()

    // Simulate email dispatch
    console.log(`[Package Notification] Simulating email delivery to ${recipient_email}...`)
    console.log(`SUBJECT: Você tem uma nova encomenda aguardando retirada (${protocol_number})`)
    console.log(`Olá ${recipient_name},\n`)
    console.log(
      `Uma nova encomenda/correspondência foi registrada para você na unidade ${plant_name}.`,
    )
    console.log(`Protocolo: ${protocol_number}`)
    console.log(`Remetente: ${sender}`)
    console.log(`Data de Chegada: ${arrival_date.split('-').reverse().join('/')}\n`)
    console.log(`Por favor, dirija-se à recepção para realizar a retirada.\n`)

    return new Response(
      JSON.stringify({ success: true, message: 'Notification email successfully simulated.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
