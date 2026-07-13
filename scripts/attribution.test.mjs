import test from 'node:test';
import assert from 'node:assert/strict';
import { campaignAttribution } from '../src/lib/attribution.mjs';

test('keeps only campaign keys in stable order', () => {
  assert.equal(
    campaignAttribution('?email=person%40example.com&utm_campaign=opening&utm_source=instagram&token=secret'),
    'utm_source=instagram&utm_campaign=opening',
  );
});

test('caps values and total output', () => {
  const cappedValue = new URLSearchParams(campaignAttribution(`?utm_source=${'z'.repeat(101)}`));
  assert.equal(cappedValue.get('utm_source'), 'z'.repeat(100));

  const value = `${'x'.repeat(99)}%`;
  const source = new URLSearchParams([
    ['utm_source', value],
    ['utm_medium', value],
    ['utm_campaign', value],
    ['utm_term', value],
    ['utm_content', value],
  ]);
  assert.equal(source.toString().length > 512, true);

  const result = campaignAttribution(`?${source}`);
  const kept = new URLSearchParams(result);
  assert.deepEqual([...kept.keys()], ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term']);
  assert.equal([...kept.values()].every((item) => item.length === 100), true);
  assert.equal(result.length <= 512, true);
});

test('returns empty output for non-campaign input', () => assert.equal(campaignAttribution('?email=a%40b.pl'), ''));
