#!/usr/bin/env node
// Builds the single-file app: expands `@include <path>` lines in src/tagwerk.html into dist/tagwerk.html.
// An include line is a whole line holding only a comment: /* @include x.css */, // @include x.js or <!-- @include x.html -->.
// Paths are relative to src/. Fails if a source file is never included or the script has a syntax error.
// Usage: node build.js [--out path]
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = path.join(__dirname, 'src'), ENTRY = path.join(SRC, 'tagwerk.html');
const outArg = process.argv.indexOf('--out');
const OUT = outArg > 0 ? path.resolve(process.argv[outArg + 1]) : path.join(__dirname, 'dist', 'tagwerk.html');
const INCLUDE = /^\s*(?:\/\*|\/\/|<!--)\s*@include\s+([\w./-]+)\s*(?:\*\/|-->)?\s*$/;

const used = new Set();
function expand(file, stack = []){
  if (stack.includes(file)) throw new Error('include cycle: ' + [...stack, file].map(f => path.relative(SRC, f)).join(' -> '));
  used.add(file);
  return fs.readFileSync(file, 'utf8').replace(/\n$/, '').split('\n').map(line => {
    const m = line.match(INCLUDE); if (!m) return line;
    const inc = path.join(SRC, m[1]);
    if (!fs.existsSync(inc)) throw new Error(`${path.relative(SRC, file)}: missing include ${m[1]}`);
    return expand(inc, [...stack, file]);
  }).join('\n');
}

function build(){
  const html = expand(ENTRY) + '\n';
  const walk = d => fs.readdirSync(d, {withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  const orphans = walk(SRC).filter(f => /\.(css|js|html)$/.test(f) && !used.has(f));
  if (orphans.length) throw new Error('not included anywhere: ' + orphans.map(f => path.relative(SRC, f)).join(', '));
  const script = html.split('<script>')[1].split('</script>')[0];
  try { new vm.Script(script, {filename:'tagwerk.html <script>'}); }
  catch (e) {
    const line = +((e.stack.match(/<script>:(\d+)/) || [])[1]) || 0;
    const at = line ? `\n  at built script line ${line}: ${script.split('\n')[line - 1].trim().slice(0, 120)}` : '';
    throw new Error('syntax error: ' + e.message + at);
  }
  fs.mkdirSync(path.dirname(OUT), {recursive:true});
  fs.writeFileSync(OUT, html);
  return {out:OUT, bytes:Buffer.byteLength(html), lines:html.split('\n').length - 1};
}

if (require.main === module) {
  try { const r = build(); console.log(`built ${path.relative(process.cwd(), r.out) || r.out} (${r.lines} lines, ${(r.bytes / 1024).toFixed(1)} KB)`); }
  catch (e) { console.error('build failed: ' + e.message); process.exit(1); }
}
module.exports = {build, OUT};
