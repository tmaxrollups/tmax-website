'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const submission = require('../netlify/functions/submission-created.js');

test('server computes authoritative garage price from width and height', () => {
  assert.equal(submission.calculateGarageEstimate('10', '8'), 3531);
  assert.equal(submission.calculateGarageEstimate('18.5', '9'), 5860);
});

test('10 to 12 foot heights require a quote instead of an automatic price', () => {
  assert.equal(submission.calculateGarageEstimate('3', '10'), null);
  assert.equal(submission.calculateGarageEstimate('18.5', '12'), null);
});

test('invalid garage dimensions are rejected', () => {
  assert.throws(() => submission.calculateGarageEstimate('20', '8'), /Invalid garage width/);
  assert.throws(() => submission.calculateGarageEstimate('10', '13'), /Invalid garage height/);
});

test('garage slat and rail colors use separate catalog allowlists', () => {
  assert.equal(submission.validateGarageColor('Brown'), 'Brown');
  assert.equal(submission.validateGarageColor('Light Wood'), 'Light Wood');
  assert.equal(submission.validateGarageColor('Dark Wood'), 'Dark Wood');
  assert.throws(() => submission.validateGarageColor('Bronze'), /Invalid garage door color/);
  assert.throws(() => submission.validateGarageColor('Custom Color'), /Invalid garage door color/);

  assert.equal(submission.validateRailColor('Bronze'), 'Bronze');
  assert.equal(submission.validateRailColor('Brown'), 'Brown');
  assert.throws(() => submission.validateRailColor('Beige'), /Invalid rail\/housing color/);
});

test('garage submission ignores tampered browser price and injects server verified estimate', () => {
  const validated = submission.validateSubmission({
    form_name: 'quote-garage-doors',
    data: {
      name: 'Test Customer',
      email: 'test@example.com',
      selected_color: 'Black',
      rail_housing_color: 'Bronze',
      selected_width: '10',
      selected_height: '8',
      calculated_price: '$1'
    }
  });

  assert.equal(validated.data.selected_color, 'Black');
  assert.equal(validated.data.rail_housing_color, 'Bronze');
  assert.equal(validated.data.selected_width, '10');
  assert.equal(validated.data.selected_height, '8');
  assert.equal(validated.data.server_verified_estimate, '$3,531');
  assert.equal(validated.data.pricing_table_version, '2026-08-30');
  assert.equal(Object.hasOwn(validated.data, 'calculated_price'), false);
});

test('garage quote-only heights are marked for manual quote', () => {
  const validated = submission.validateSubmission({
    form_name: 'quote-garage-doors',
    data: {
      email: 'test@example.com',
      selected_color: 'White',
      rail_housing_color: 'Black',
      selected_width: '12',
      selected_height: '10',
      calculated_price: '$5'
    }
  });

  assert.equal(validated.data.server_verified_estimate, 'Request quote');
  assert.equal(Object.hasOwn(validated.data, 'calculated_price'), false);
});
