import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../public/workspace.css', import.meta.url), 'utf8');

function deckFragment(deck) {
  const cardClass = deck === 'A' ? 'deck-a-control-card' : 'deck-b-control-card';
  const start = html.indexOf(cardClass);
  assert.ok(start >= 0, `missing ${deck} control card`);
  const end = html.indexOf('</section></section>', start);
  assert.ok(end > start, `missing ${deck} control card end`);
  return html.slice(start, end);
}

test('motion controls are ordered before generator and color rows in both decks', () => {
  for (const deck of ['A', 'B']) {
    const fragment = deckFragment(deck);
    const motion = fragment.indexOf(`aria-label="Deck ${deck} motion controls"`);
    const generator = fragment.indexOf('class="visual-mode-field"');
    const colors = fragment.indexOf('class="visual-color-pair"');
    assert.ok(motion >= 0, `Deck ${deck} motion row missing`);
    assert.ok(generator > motion, `Deck ${deck} generator must follow motion row`);
    assert.ok(colors > generator, `Deck ${deck} colors must follow generator row`);
  }
});

test('DPI-normalized channel layout reserves a concrete visible control height', () => {
  assert.match(css, /v0\.4\.29 — motion controls must be visible/);
  assert.match(css, /grid-template-rows:minmax\(118px,1fr\) 310px!important/);
  assert.match(css, /grid-template-rows:minmax\(108px,1fr\) 300px!important/);
  assert.match(css, /\.console-control-card \.deck-motion-row\{[\s\S]*grid-row:2!important/);
});
