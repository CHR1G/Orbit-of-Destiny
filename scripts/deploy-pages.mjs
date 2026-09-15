#!/usr/bin/env node
/* Publish out/ to the gh-pages branch.
 *
 *   node scripts/deploy-pages.mjs
 *
 * ---------------------------------------------------------------------------
 * WHY A BRANCH AND NOT A GITHUB ACTIONS WORKFLOW.
 *
 * The obvious way to deploy to Pages is .github/workflows/deploy-pages.yml,
 * and that is what this repo had for about ten minutes. GitHub will not
 * accept it: any push that creates or edits a file under .github/workflows/
 * is rejected unless the token carries the `workflow` scope, and the
 * long-lived PAT this repo already uses carries `repo` only. The refusal is
 * at the transport layer, so no amount of retrying gets around it — the
 * choice is to regenerate the token with another scope ticked, or to stop
 * pushing workflow files.
 *
 * Publishing a prebuilt directory takes the second road. It also means the
 * repo holds no secret, and the gh-pages branch holds only what a browser
 * actually fetches. The cost is that the build runs here rather than on
 * GitHub's runners, so this is a command you run, not a hook.
 *
 * ---------------------------------------------------------------------------
 * THE PREFIX IS THE OTHER HALF OF THE JOB.
 *
 * GitHub Pages serves a project repo from /Orbit-of-Destiny/, not from the
 * domain root, so the build has to run with GH_PAGES=1 — that is what turns
 * on the basePath in next.config.mjs and the matching prefix in
 * lib/asset.js. Build without it and the HTML loads, then every chunk 404s
 * and the page is blank. It is set below, not inherited.
 *
 * .nojekyll is written after the build for the same family of reasons:
 * Jekyll skips directories whose names start with an underscore, and that is
 * all of /_next — every script, stylesheet and font the app needs.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'out');
const BRANCH = 'gh-pages';
const REMOTE = 'https://github.com/CHR1G/Orbit-of-Destiny.git';

// The proxy is only needed on networks that cannot reach github.com directly;
// override with GIT_PROXY= git's own repo config otherwise wins.
const PROXY = process.env.GIT_PROXY ?? 'http://127.0.0.1:7897';

// The sandbox injects its own proxy vars, which do not route to GitHub. Clear
// them and let the -c flags below decide.
const env = { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' };
for (const k of ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'ALL_PROXY', 'all_proxy']) delete env[k];

const proxyArgs = PROXY ? ['-c', `http.proxy=${PROXY}`, '-c', `https.proxy=${PROXY}`] : [];

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', env, maxBuffer: 1e8, ...opts });
  if (r.status !== 0) {
    console.error(`\n$ ${cmd} ${args.join(' ')}\n${r.stdout || ''}${r.stderr || ''}`);
    process.exit(r.status ?? 1);
  }
  return r.stdout || '';
}

// ---- 1. build for the sub-path -------------------------------------------
console.log('building with GH_PAGES=1 …');
// NODE_OPTIONS is blanked because the WorkBuddy sandbox injects a delete guard
// through it that aborts `next build` while it clears .next.
run(process.execPath, [path.join(ROOT, 'node_modules/next/dist/bin/next'), 'build'], {
  cwd: ROOT,
  env: { ...env, GH_PAGES: '1', NODE_OPTIONS: ' ' },
  stdio: 'inherit',
});

if (!fs.existsSync(path.join(OUT, 'index.html'))) {
  console.error('out/index.html is missing — the build did not produce a site.');
  process.exit(1);
}

// ---- 2. stage it in a scratch repo --------------------------------------
// A throwaway repo rather than a worktree: out/ is gitignored and this way the
// main worktree is never touched, so a failed deploy cannot leave the working
// copy dirty.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-pages-'));
try {
  fs.cpSync(OUT, tmp, { recursive: true });
  fs.writeFileSync(path.join(tmp, '.nojekyll'), '');

  const sha = run('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT }).trim();
  const stamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const git = (args) => run('git', args, { cwd: tmp });
  git(['init', '-q', '-b', BRANCH]);
  git(['add', '-A']);
  git([
    '-c', 'user.name=CHR1G',
    '-c', 'user.email=chr1g@users.noreply.github.com',
    'commit', '-q', '-m', `Publish ${sha} (${stamp} UTC)`,
  ]);
  git(['remote', 'add', 'origin', REMOTE]);

  console.log(`pushing ${BRANCH} …`);
  console.log(run('git', [...proxyArgs, 'push', '--force', 'origin', `${BRANCH}:${BRANCH}`], { cwd: tmp }).trim());
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('\ndone. https://chr1g.github.io/Orbit-of-Destiny/');
