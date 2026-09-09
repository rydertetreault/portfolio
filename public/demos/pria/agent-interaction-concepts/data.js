/* ── Shared mock data · mirrors AGENT_PLANS in PriaRedesignConcept.jsx ────
   Same plans/tasks/agents so every concept visualizes identical state and
   the comparison is purely about the visualization, not the content.
   Timing fields (t0/t1, in seconds since dispatch) power the timeline and
   replay concepts. "now" is 500s after dispatch. */
window.WS_NOW = 500;

window.WS_PLANS = [
  {
    id: 'plan-microsite', name: 'Launch course microsite', status: 'running',
    origin: 'Dispatched from chat · 8 m ago', t0: 0,
    tasks: [
      {
        id: 'task-deploy', name: 'Build & deploy preview', status: 'running', t0: 10,
        agents: [
          {
            id: 'ag-deploy', name: 'deploy-agent', role: 'Infra · vercel', status: 'running',
            model: 'sonnet-4', t0: 15, t1: null,
            stats: { elapsed: '4m 12s', tokens: 18.4, toolCalls: 9 },
            steps: ['Build', 'Upload assets', 'Provision preview', 'Smoke check', 'Assign domain'],
            thinking: [
              'Build finished cleanly — 42 modules, no type errors.',
              'Preview bundle is 1.8 MB; under the 2 MB budget, skipping the code-split pass.',
              'Uploading static assets to us-east-1 now. Hashing filenames for cache-busting.',
              'Provisioning the Vercel preview deployment with the existing deploy token.',
              'Health check returned 200 in 240 ms — promoting to the production alias.',
              'Alias assigned. Posting preview and production URLs back to the thread.',
            ],
            tools: [
              { t: 40,  tool: 'bash', target: 'npm run build', result: 'exit 0 · 28 s' },
              { t: 90,  tool: 'read', target: 'vercel.json', result: '34 lines' },
              { t: 150, tool: 'bash', target: 'vercel deploy --prebuilt', result: 'preview URL' },
              { t: 300, tool: 'http', target: 'GET /api/health', result: '200 · 240 ms' },
              { t: 430, tool: 'bash', target: 'vercel alias set demo.praxis-ai.com', result: 'running…' },
            ],
            context: ['vercel.json', 'deploy-runbook.md', '.env.production'],
          },
          {
            id: 'ag-qa', name: 'qa-agent', role: 'Smoke tests · playwright', status: 'queued',
            model: 'haiku', t0: null, t1: null,
            stats: { elapsed: '—', tokens: 0.2, toolCalls: 0 },
            steps: ['Boot browser', 'Run suite', 'Report'],
            thinking: ['Waiting for deploy-agent to publish the preview URL before starting the run.'],
            tools: [],
            context: ['smoke.spec.ts', 'qa-checklist.md'],
            blockedOn: 'ag-deploy',
          },
        ],
      },
      {
        id: 'task-copy', name: 'Draft landing copy', status: 'done', t0: 10,
        agents: [
          {
            id: 'ag-copy', name: 'copy-agent', role: 'Drafting · landing page', status: 'done',
            model: 'sonnet-4', t0: 12, t1: 172,
            stats: { elapsed: '2m 40s', tokens: 9.1, toolCalls: 5 },
            steps: ['Outline', 'Draft', 'Tone pass'],
            thinking: [
              'Read the course outline first — three content pillars: hero, curriculum, pricing.',
              'Drafted the hero around the outcome — the brand guide favors outcome-led headlines.',
              'Condensed 12 modules into 3 phases so the page scans; full list in a details fold.',
              'Tone pass complete against the brand voice guide. Copy handed to deploy-agent.',
            ],
            tools: [
              { t: 20,  tool: 'read',  target: 'course-outline.md', result: '210 lines' },
              { t: 45,  tool: 'read',  target: 'brand-voice.md', result: 'vault · 88 lines' },
              { t: 80,  tool: 'write', target: 'landing-copy.md', result: '420 words' },
              { t: 130, tool: 'read',  target: 'landing-copy.md', result: 'tone pass' },
              { t: 160, tool: 'write', target: 'landing-copy.md', result: 'final · v2' },
            ],
            context: ['course-outline.md', 'brand-voice.md'],
          },
        ],
      },
    ],
  },
  {
    id: 'plan-vault', name: 'Vault hygiene sweep', status: 'queued',
    origin: 'Scheduled · nightly', t0: null,
    tasks: [
      {
        id: 'task-reindex', name: 'Reindex embeddings', status: 'queued', t0: null,
        agents: [{
          id: 'ag-index', name: 'index-agent', role: 'Embeddings · 4 files', status: 'queued',
          model: 'haiku', t0: null, t1: null,
          stats: { elapsed: '—', tokens: 0, toolCalls: 0 },
          steps: ['Diff manifest', 'Chunk & embed', 'Swap index'],
          thinking: ['Queued — 4 files changed since the last index run.'],
          tools: [], context: ['vault-manifest.json'],
        }],
      },
      {
        id: 'task-audit', name: 'Stale-content audit', status: 'queued', t0: null,
        agents: [{
          id: 'ag-audit', name: 'audit-agent', role: 'Freshness scan · vault', status: 'queued',
          model: 'haiku', t0: null, t1: null,
          stats: { elapsed: '—', tokens: 0, toolCalls: 0 },
          steps: ['Scan timestamps', 'Flag stale', 'File report'],
          thinking: ['Queued behind reindex — shares the vault read lock.'],
          tools: [], context: ['vault-manifest.json'],
          blockedOn: 'ag-index',
        }],
      },
    ],
  },
  {
    id: 'plan-rubric', name: 'Grade rubric summary', status: 'done',
    origin: 'Dispatched from chat · 31 m ago', t0: -1400,
    tasks: [
      {
        id: 'task-rubric', name: 'Summarize rubric.csv', status: 'done', t0: -1395,
        agents: [{
          id: 'ag-rubric', name: 'summary-agent', role: 'Analysis · rubric.csv', status: 'done',
          model: 'sonnet-4', t0: -1390, t1: -1210,
          stats: { elapsed: '3m 0s', tokens: 12.6, toolCalls: 4 },
          steps: ['Parse CSV', 'Cluster criteria', 'Write summary'],
          thinking: [
            'Parsed 240 rows — 6 criteria groups by column signature.',
            'Clustering rows: three clear bands (mastery / developing / beginning).',
            'Summary drafted with per-band counts and two outlier flags for review.',
          ],
          tools: [
            { t: -1380, tool: 'read',  target: 'rubric.csv', result: '240 rows' },
            { t: -1340, tool: 'bash',  target: 'python cluster.py', result: '3 bands' },
            { t: -1290, tool: 'write', target: 'summary.md', result: '310 words' },
            { t: -1230, tool: 'read',  target: 'summary.md', result: 'final check' },
          ],
          context: ['rubric.csv'],
        }],
      },
    ],
  },
];

/* Flat helpers used by several concepts. */
window.WS_ALL_AGENTS = [];
window.WS_PLANS.forEach(p => p.tasks.forEach(t => t.agents.forEach(a => {
  window.WS_ALL_AGENTS.push({ ...a, plan: p, task: t });
})));

/* Simulated live event stream (for the river + replay concepts): merged,
   time-ordered tool calls + thoughts across all agents. */
window.WS_EVENTS = [];
window.WS_ALL_AGENTS.forEach(a => {
  (a.tools || []).forEach(tc => window.WS_EVENTS.push({
    t: tc.t, kind: 'tool', agentId: a.id, agentName: a.name,
    label: `${tc.tool} · ${tc.target}`, detail: tc.result,
  }));
  (a.thinking || []).forEach((th, i) => window.WS_EVENTS.push({
    t: (a.t0 ?? 0) + 30 + i * 70, kind: 'thought', agentId: a.id, agentName: a.name,
    label: th, detail: null,
  }));
});
window.WS_EVENTS.sort((x, y) => x.t - y.t);
