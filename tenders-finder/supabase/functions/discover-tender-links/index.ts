const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_LINKS = [
  { url: 'https://www.gebiz.gov.sg/', name: 'GeBIZ' },
  { url: 'https://www.tendersontime.com/singapore-tenders/', name: 'Tenders On Time' },
  { url: 'https://www.biddetail.com/singapore-tenders', name: 'Bid Detail' },
  { url: 'https://www.tendersinfo.com/global-singapore-tenders.php', name: 'Tenders Info' },
  { url: 'https://www.globaltenders.com/government-tenders-singapore', name: 'Global Tenders' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({ success: true, links: DEFAULT_LINKS }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
