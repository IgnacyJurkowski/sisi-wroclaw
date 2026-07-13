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
  const result = campaignAttribution(`?utm_source=${'x'.repeat(300)}&utm_content=${'y'.repeat(600)}`);
  const values = [...new URLSearchParams(result).values()];
  assert.equal(values.every((value) => value.length <= 100), true);
  assert.equal(result.length <= 512, true);
});

test('returns empty output for non-campaign input', () => assert.equal(campaignAttribution('?email=a%40b.pl'), ''));
