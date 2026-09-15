import type { APIRoute } from 'astro';
import { llmsFull } from '../lib/llms-map';

/* Build-time /llms-full.txt - the index plus every article's full text, see
   src/lib/llms-map.ts. */
export const GET: APIRoute = ({ site }) => {
  const origin = (site?.href ?? 'https://www.sisiwroclaw.pl/').replace(/\/$/, '');
  return new Response(llmsFull(origin), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
