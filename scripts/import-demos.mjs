import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, extname, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';

// Import a static snapshot of the Praxis story site: production builds do not need the source repo.
// /demos is the story page, /demos/company the company page.
const source = resolve(process.argv[2] || '../praxis-website/demo-site');
const target = resolve('public/demos');
const temp = await mkdtemp(join(tmpdir(), 'praxis-story-'));
const textTypes = new Set(['.html', '.js', '.css', '.json', '.svg']);
async function walk(dir, fn) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const file = join(dir, e.name);
    if (e.isDirectory()) await walk(file, fn); else await fn(file);
  }
}
try {
  for (const name of ['src', 'public', 'story', 'company', 'package.json']) {
    await cp(join(source, name), join(temp, name), { recursive: true, filter: f => !/\.bak/.test(f) });
  }
  // Use installed build tools without copying dependencies or local credentials.
  execFileSync('ln', ['-s', join(source, 'node_modules'), join(temp, 'node_modules')]);
  await writeFile(join(temp, 'vite.config.js'), `import { defineConfig } from 'vite'
export default defineConfig({ appType: 'mpa', build: { rollupOptions: { input: { story: 'story/index.html', company: 'company/index.html' } } } })
`);
  execFileSync(join(source, 'node_modules/.bin/vite'), ['build', '--target', 'esnext', '--base', '/demos/'], { cwd: temp, stdio: 'inherit' });
  const dist = join(temp, 'dist');
  // Classic (non-module) scripts are left unbundled by Vite: copy them across as-is.
  for (const page of ['story', 'company']) {
    const html = await readFile(join(dist, page, 'index.html'), 'utf8');
    for (const [, src] of html.matchAll(/<script(?![^>]*type="module")[^>]*src="\/(src\/[^"]+)"/g)) {
      await mkdir(dirname(join(dist, src)), { recursive: true });
      await cp(join(temp, src), join(dist, src));
    }
  }
  // The story page is the /demos landing page.
  await cp(join(dist, 'story/index.html'), join(dist, 'index.html'));
  await rm(join(dist, 'story'), { recursive: true, force: true });
  // Vite handles imported assets; runtime templates and the prebuilt PRIA app
  // also contain root-relative URLs that need the deployment prefix.
  await walk(dist, async file => {
    if (!textTypes.has(extname(file))) return;
    let text = await readFile(file, 'utf8');
    text = text.replace(/http:\/\/127\.0\.0\.1:3002\/pria\/([a-z-]+)/g, (_, view) => `/demos/pria/#${({twins:'assistants',convo:'voice'})[view] || view}`);
    // The live PRIA chat needs the local bridge; publicly it points at /demos and shows as offline.
    text = text.replace(/http:\/\/(127\.0\.0\.1|localhost):3002/g, '/demos');
    text = text.replace(/(["'`(=])\/story\/(?=["'`?#])/g, '$1/demos/');
    text = text.replace(/(["'`(=])\/company\/(?=["'`?#])/g, '$1/demos/company/');
    text = text.replace(/(["'`(=])\/(assets|fonts|pria|src)(?=[/"'`?#])/g, '$1/demos/$2');
    text = text.replace(/(href=["'])\/(?=["'#])/g, '$1/demos/');
    text = text.replace(/(\.href\s*=\s*["'])\/(?=["'])/g, '$1/demos/');
    text = text.replace(/(["'`])\/(creation-concepts)\//g, '$1/demos/pria/$2/');
    if (extname(file) === '.html') {
      text = text.replace('</body>', `<script>
// Concept-only marketing links must not navigate into the portfolio.
document.addEventListener('click', function (event) {
  const link = event.target.closest('a[href]');
  if (!link) return;
  const url = new URL(link.href, location.href);
  if (url.origin === location.origin && !url.pathname.startsWith('/demos')) {
    event.preventDefault();
    alert('This is a design concept. This destination is not part of the demo.');
  }
});
</script></body>`);
    }
    await writeFile(file, text);
  });
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  await cp(dist, target, { recursive: true });
  console.log(`Imported the story site into ${target}`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
