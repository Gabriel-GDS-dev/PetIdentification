import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../frontend/app.js', import.meta.url), 'utf8');
function context(feedback = []) {
  const ctx = vm.createContext({
    state: { feedback },
    escapeHTML: value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;'),
    formatDateTime: value => value
  });
  vm.runInContext(source.slice(source.indexOf('const FEEDBACK_LIKERT_OPTIONS'), source.indexOf('const now ='))
    + source.slice(source.indexOf('function feedbackView()'), source.indexOf('function settingsView()'))
    + '\nglobalThis.sections = FEEDBACK_LIKERT_SECTIONS;', ctx);
  return ctx;
}

test('new responses survive JSON persistence with non-use separate from numeric scores', () => {
  const ctx = context();
  const section = ctx.sections[0];
  const data = {};
  section.questions.forEach((question, i) => {
    data[ctx.feedbackLikertFieldName(section, question)] = i === 0 ? 'not_used' : String(i);
    data[ctx.feedbackLikertCommentFieldName(section, question)] = '<experiência>';
  });
  const saved = JSON.parse(ctx.serializeFeedbackLikertSection(data, section));
  assert.equal(saved.version, 3);
  assert.equal(saved.ratings.walletClarity, 'not_used');
  assert.equal(saved.comments.walletClarity, '');
  assert.equal(saved.ratings.vaccineRegistration, 1);
  assert.equal(saved.comments.vaccineRegistration, '<experiência>');
  assert.equal(ctx.formatLikertValue('not_used'), 'Não utilizei');
  assert.equal(ctx.formatLikertValue(0), 'Sem resposta');
});

test('historical feedback keeps its original meaning and does not prefill new questions or stars', () => {
  const legacy = JSON.stringify({ type: 'likert', version: 2, ratings: { petWalletInfo: 5 }, comments: {} });
  const ctx = context([{ improvements: legacy, suggestions: legacy, appRating: 4 }]);
  const html = ctx.feedbackView();
  assert.match(html, /formulário anterior/);
  assert.match(html, /O que pode ficar melhor\?/);
  assert.match(html, /5\/5 Concordo totalmente/);
  assert.doesNotMatch(html, / checked|star-button active/);
  assert.match(ctx.renderFeedbackLikertSummary({ improvements: '<texto antigo>' }), /&lt;texto antigo>/);
});

test('new form renders eight independent questions and supports non-use on every item', () => {
  const ctx = context();
  const html = ctx.feedbackView();
  assert.equal((html.match(/role="radiogroup"/g) || []).length, 8);
  assert.equal((html.match(/value="not_used"/g) || []).length, 8);
  assert.equal((html.match(/type="radio"/g) || []).length, 48);
  assert.doesNotMatch(html, /qualidade do atendimento veterinário|Sugestões e melhorias/);
});

test('comments remain optional for low and high scores; non-use disables them', () => {
  const ctx = context();
  const panel = {};
  const textarea = { value: 'Experiência', required: true };
  const question = { querySelector: selector => selector.includes('panel') ? panel : textarea };
  for (const value of ['1', '5', 'not_used']) {
    ctx.updateLikertCommentField({ value, closest: () => question });
    assert.equal(textarea.required, false);
    assert.equal(textarea.disabled, value === 'not_used');
    assert.equal(panel.hidden, value === 'not_used');
  }
});
