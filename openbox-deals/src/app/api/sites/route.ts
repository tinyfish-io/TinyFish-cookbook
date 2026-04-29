import { SITES } from '@/lib/sites';

export async function GET() {
  return Response.json({
    sites: Object.entries(SITES).map(([key, config]) => ({
      key,
      name: config.name,
    })),
  });
}
