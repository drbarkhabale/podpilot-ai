import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const next = require.resolve('next/dist/bin/next');
const run = (command, args, env) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { cwd: root, env, stdio: 'inherit' });
  child.on('error', reject);
  child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Next build exited with ${code}`)));
});

await rm(path.join(root, 'out'), { recursive: true, force: true });
await run(process.execPath, [next, 'build'], { ...process.env, SITE_BUILD: '1', NEXT_TELEMETRY_DISABLED: '1' });
const exportRoot = path.join(root, 'out');
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.webm': 'video/webm', '.mp4': 'video/mp4', '.wav': 'audio/wav', '.mp3': 'audio/mpeg',
  '.pdf': 'application/pdf', '.xml': 'application/xml; charset=utf-8',
};
const assets = {};
let rawBytes = 0;
async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) { await collect(filename); continue; }
    if (!entry.isFile() || entry.name.endsWith('.map') || entry.name.startsWith('.')) continue;
    const buffer = await readFile(filename);
    rawBytes += buffer.length;
    const key = '/' + path.relative(exportRoot, filename).split(path.sep).join('/');
    assets[key] = { body: buffer.toString('base64'), type: mime[path.extname(filename)] || 'application/octet-stream', etag: '"' + createHash('sha256').update(buffer).digest('hex').slice(0, 24) + '"' };
  }
}
await collect(exportRoot);
if (!assets['/index.html']) throw new Error('Next export did not produce out/index.html.');
await rm(path.join(root, 'dist'), { recursive: true, force: true });
await mkdir(path.join(root, 'dist', 'server'), { recursive: true });
await build({
  absWorkingDir: root,
  entryPoints: ['server/worker.ts'],
  outfile: 'dist/server/index.js',
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  legalComments: 'none',
  define: { __PODPILOT_ASSETS__: JSON.stringify(assets) },
});
const output = await stat(path.join(root, 'dist/server/index.js'));
console.log(`Sites Worker ready: ${Object.keys(assets).length} assets, ${(rawBytes / 1024).toFixed(0)} KiB static bytes, ${(output.size / 1024).toFixed(0)} KiB Worker.`);
console.log('The Worker serves the Next.js export and /api routes. Runtime API secrets are supplied by the host, never bundled.');
