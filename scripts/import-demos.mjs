import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, extname } from 'node:path';
import { execFileSync } from 'node:child_process';

// Import a static snapshot: production builds do not need the source repository.
const source = resolve(process.argv[2] || '../praxis-website/demo-site');
const target = resolve('public/demos');
const temp = await mkdtemp(join(tmpdir(), 'praxis-demos-'));
const textTypes = new Set(['.html', '.js', '.css', '.json', '.svg']);
async function walk(dir, fn) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const file = join(dir, e.name);
    if (e.isDirectory()) await walk(file, fn); else await fn(file);
  }
}
try {
  for (const name of ['src', 'public', 'index.html', 'vite.config.js', 'package.json', 'warp', 'mercury', 'manual-labor', 'omega', 'shopify', 'v2']) {
    await cp(join(source, name), join(temp, name), { recursive: true });
  }
  // Use installed build tools without copying dependencies or local credentials.
  execFileSync('ln', ['-s', join(source, 'node_modules'), join(temp, 'node_modules')]);
  const motion = join(temp, 'src/shared/motion.js');
  await writeFile(motion, (await readFile(motion, 'utf8')).replace('let alive = false', "container.dataset.live = 'false'; return null;\n  let alive = false"));
  const hub = join(temp, 'index.html');
  let html = await readFile(hub, 'utf8');
  html = html.replace(/<div class="meta">[\s\S]*?<\/div>/, '<div class="meta">Praxis AI · Website concept lab<br/>Static product previews · no sign-in required</div>');
  html = html.replace('internal concept, not for distribution', 'concept demos · not a production product');
  html = html.replace('<footer class="foot">', `<section style="margin-top:40px"><h2>All concepts &amp; reference studies</h2><p style="line-height:2">${['warp', 'mercury', 'manual-labor', 'omega', 'shopify'].map(s => `<a href="/${s}/">${s} v1</a> · <a href="/v2/${s}/">${s} v2</a>`).join(' &nbsp; / &nbsp; ')}</p></section><footer class="foot">`);
  await writeFile(hub, html);
  execFileSync(join(source, 'node_modules/.bin/vite'), ['build', '--target', 'esnext', '--base', '/demos/'], { cwd: temp, stdio: 'inherit' });
  const dist = join(temp, 'dist');
  // Vite handles imported assets; runtime templates and the prebuilt PRIA app
  // also contain root-relative URLs that need the deployment prefix.
  await walk(dist, async file => {
    if (!textTypes.has(extname(file))) return;
    let text = await readFile(file, 'utf8');
    text = text.replace(/http:\/\/127\.0\.0\.1:3002\/pria\/([a-z-]+)/g, (_, view) => `/demos/pria/#${({twins:'assistants',convo:'voice'})[view] || view}`);
    text = text.replace(/http:\/\/127\.0\.0\.1:3002/g, '/demos');
    text = text.replace(/(["'`(=])\/(assets|fonts|pria|v2|warp|mercury|manual-labor|omega|shopify|research)(?=[/"'`?#])/g, '$1/demos/$2');
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
  await mkdir(join(dist, 'research'), { recursive: true });
  await cp(join(source, 'research/reference-sites-research.md'), join(dist, 'research/reference-sites-research.md'));
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  await cp(dist, target, { recursive: true });
  console.log(`Imported all demos into ${target}`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
