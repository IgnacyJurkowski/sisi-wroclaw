import test from 'node:test';
import assert from 'node:assert/strict';
import { assertCorporateForm, assertRobots } from './smoke-host.mjs';

const validForm = `<form name="b2b-enquiry" method="POST" data-netlify="true" netlify-honeypot="bot-field">
  <input type="hidden" name="form-name" value="b2b-enquiry">
  <input type="text" name="bot-field">
</form>`;
const processedForm = validForm
  .replace(' data-netlify="true"', '')
  .replace(' netlify-honeypot="bot-field"', '');
const processedSingleQuotedForm = processedForm.replaceAll('"', "'");

test('robots validation ignores comments and requires one active directive', () => {
  const commentedExpected = '<!-- <meta name="robots" content="index, follow"> -->';
  assert.throws(
    () => assertRobots(`${commentedExpected}<meta name="robots" content="noindex, follow">`, 'index, follow', '/pl/'),
    /wrong robots directive/,
  );
  assert.throws(
    () => assertRobots(
      '<meta name="robots" content="index, follow"><meta name="robots" content="noindex, follow">',
      'index, follow',
      '/pl/',
    ),
    /exactly one active robots directive/,
  );
  assert.doesNotThrow(() => assertRobots(`${commentedExpected}<meta name="robots" content="index, follow">`, 'index, follow', '/pl/'));
});

test('robots validation can require the directive to be absent', () => {
  const directive = '<meta name="robots" content="index, follow">';
  assert.doesNotThrow(() => assertRobots('<title>Canonical page</title>', null, '/pl/'));
  assert.throws(
    () => assertRobots(directive, null, '/pl/'),
    /must omit the robots directive/,
  );
});

test('form validation ignores commented and otherwise inert form markup', () => {
  assert.throws(() => assertCorporateForm(`<!-- ${validForm} -->`), /exactly one active detected/);
  assert.throws(() => assertCorporateForm(`<template>${validForm}</template>`), /exactly one active detected/);
  assert.throws(() => assertCorporateForm(`<script type="text/plain">${validForm}</script>`), /exactly one active detected/);
  assert.doesNotThrow(() => assertCorporateForm(`<!-- ${validForm} -->${validForm}`));
});

test('form validation distinguishes source markup from Netlify post-processing', () => {
  assert.doesNotThrow(() => assertCorporateForm(validForm, false));
  assert.doesNotThrow(() => assertCorporateForm(processedForm, true));
  assert.doesNotThrow(() => assertCorporateForm(processedSingleQuotedForm, true));
  assert.throws(() => assertCorporateForm(processedForm, false), /enable Netlify detection/);
  assert.throws(() => assertCorporateForm(validForm, true), /must strip Netlify detection/);
});
