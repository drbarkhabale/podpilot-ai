import { handleApi, type ApiEnvironment } from './api';

interface StaticAsset { body: string; type: string; etag: string }
/** Replaced with the Next static export at build time. No runtime disk or asset binding is needed. */
declare const __PODPILOT_ASSETS__: Record<string, StaticAsset>;

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), microphone=(self), display-capture=(self)',
};
function serve(asset: StaticAsset, request: Request, path: string, status = 200): Response {
  const headers = new Headers({
    ...securityHeaders,
    'Content-Type': asset.type,
    'Cache-Control': path.startsWith('/_next/static/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    ETag: asset.etag,
  });
  if (status === 200 && request.headers.get('if-none-match') === asset.etag) return new Response(null, { status: 304, headers });
  if (request.method === 'HEAD') return new Response(null, { status, headers });
  const binary = atob(asset.body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Response(bytes, { status, headers });
}

export default {
  async fetch(request: Request, env: ApiEnvironment): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return handleApi(request, env);
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405, headers: { ...securityHeaders, Allow: 'GET, HEAD' } });
    let path: string;
    try { path = decodeURIComponent(url.pathname); } catch { return new Response('Invalid path', { status: 400, headers: securityHeaders }); }
    const directory = path.endsWith('/') ? path : `${path}/`;
    let key = path;
    if (request.headers.get('rsc') === '1') {
      key = [directory + 'index.txt', path + '.txt', path].find(candidate => __PODPILOT_ASSETS__[candidate]) || path;
    } else if (!__PODPILOT_ASSETS__[key]) {
      key = directory + 'index.html';
    }
    const asset = __PODPILOT_ASSETS__[key];
    if (asset) return serve(asset, request, key);
    const missing = __PODPILOT_ASSETS__['/404.html'] || __PODPILOT_ASSETS__['/404/index.html'];
    if (missing) return serve(missing, request, '/404.html', 404);
    return new Response('Page not found', { status: 404, headers: securityHeaders });
  },
};
