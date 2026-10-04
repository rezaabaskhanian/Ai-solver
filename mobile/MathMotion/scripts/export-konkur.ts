/**
 * Exports the bundled konkur content (src/content/konkur/*) as
 * konkur-export.json, ready for POST /admin/konkur/import.
 *
 * Run (no dependency is added; npx fetches tsx on demand):
 *   npx tsx scripts/export-konkur.ts [--figure-base-url=/uploads/konkur] [--out=konkur-export.json]
 *
 * Bundled `figure: require('./figures/x.png')` becomes
 * `figureUrl: "<figure-base-url>/x.png"`. The files in
 * src/content/konkur/figures/ must be uploaded to the server so that
 * they are served at that URL (a path relative to the API host, or an
 * absolute URL). Default base: /uploads/konkur.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import fs from 'fs';
import path from 'path';

// Metro turns require('x.png') into an image asset; here we only need to
// know which file it was, so .png requires resolve to {__file: name}.
const nodeRequire = require as NodeJS.Require & { extensions: Record<string, (m: NodeModule, f: string) => void> };
nodeRequire.extensions['.png'] = (module, filename) => {
  module.exports = { __file: path.basename(filename) };
};

function arg(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  const found = process.argv.find(a => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

const figureBase = arg('figure-base-url', '/uploads/konkur').replace(/\/+$/, '');
const outFile = path.resolve(process.cwd(), arg('out', 'konkur-export.json'));

const { KONKUR_TIPS, KONKUR_QUESTIONS } = require('../src/content/konkur/index');

const questions = KONKUR_QUESTIONS.map((q: Record<string, unknown>) => {
  const { figure, ...rest } = q;
  if (!figure) {
    return rest;
  }
  const file = (figure as { __file?: string }).__file;
  if (!file) {
    throw new Error(`Question ${String(q.id)}: cannot map figure to a file`);
  }
  return { ...rest, figureUrl: `${figureBase}/${file}` };
});

fs.writeFileSync(outFile, JSON.stringify({ tips: KONKUR_TIPS, questions }, null, 2));
console.log(`Wrote ${outFile}: ${KONKUR_TIPS.length} tips, ${questions.length} questions.`);
console.log(`Upload src/content/konkur/figures/*.png so they are served under ${figureBase}/`);
