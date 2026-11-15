import test from 'node:test';
import assert from 'node:assert/strict';
import { validateReading } from '../src/utils/validation.js';

const today = new Date();
const date = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

test('requires a glucose value', () => {
  assert.equal(validateReading({ date, slot: 'morning' }), 'Please enter a glucose value.');
});

test('rejects values outside 40–600 and decimals', () => {
  assert.equal(validateReading({ value: 39, date, slot: 'morning' }), 'Value must be between 40 and 600 mg/dl.');
  assert.equal(validateReading({ value: 100.5, date, slot: 'morning' }), 'Value must be between 40 and 600 mg/dl.');
});

test('accepts a valid reading', () => {
  assert.equal(validateReading({ value: 110, date, slot: 'morning' }), null);
});

test('rejects future dates', () => {
  assert.equal(validateReading({ value: 110, date: '2999-01-01', slot: 'morning' }), 'Date cannot be in the future.');
});
