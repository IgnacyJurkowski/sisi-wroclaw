// The only outbound requests the suite can make, and only when --offline is
// not set: HEAD to allow-listed hosts. Never GET a third party, never POST.

/** ok: reachable and healthy; fail: the resource is gone; unverified: cannot tell. */
export function classifyHead(status) {
  if (status >= 200 && status < 400) return 'ok';
  if ([401, 403, 405, 406, 429, 451].includes(status)) return 'unverified'; // bot walls, policy blocks, HEAD refused
  return 'fail';
}

/** @returns {Promise<{ verdict: 'ok'|'fail'|'unverified', status?: number, error?: string }>} */
export async function headCheck(url, { fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  try {
    const res = await fetchImpl(url, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(timeoutMs) });
    return { verdict: classifyHead(res.status), status: res.status };
  } catch (error) {
    return { verdict: 'unverified', error: error.cause?.code ?? error.message };
  }
}
