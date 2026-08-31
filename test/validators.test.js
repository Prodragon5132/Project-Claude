import test from 'node:test';
import assert from 'node:assert/strict';
import * as V from '../public/assets/js/engine/validators.js';

test('luhn accepts known-good test card numbers', () => {
  for (const n of ['4111111111111111', '4012888888881881', '5555555555554444',
    '5105105105105100', '378282246310005', '6011111111111117', '3530111333300000']) {
    assert.ok(V.luhn(n), `${n} should pass Luhn`);
  }
});

test('luhn rejects near-miss numbers', () => {
  for (const n of ['4111111111111112', '1234567812345678', '0000000000000001']) {
    assert.ok(!V.luhn(n), `${n} should fail Luhn`);
  }
});

test('iban validates real-format IBANs and rejects corrupted ones', () => {
  assert.ok(V.iban('GB82 WEST 1234 5698 7654 32'));
  assert.ok(V.iban('DE89370400440532013000'));
  assert.ok(V.iban('FR1420041010050500013M02606'));
  assert.ok(V.iban('NL91ABNA0417164300'));
  assert.ok(!V.iban('GB82WEST12345698765433'), 'checksum corruption must fail');
  assert.ok(!V.iban('GB82WEST123456987654'), 'wrong length for GB must fail');
  assert.ok(!V.iban('XX00NOTANIBAN'));
});

test('ssn applies SSA allocation rules', () => {
  assert.ok(V.ssn('123-45-6789'));
  assert.ok(V.ssn('078051120'));
  assert.ok(!V.ssn('000-45-6789'), 'area 000 was never issued');
  assert.ok(!V.ssn('666-45-6789'), 'area 666 was never issued');
  assert.ok(!V.ssn('900-45-6789'), 'area 9xx was never issued');
  assert.ok(!V.ssn('123-00-6789'), 'group 00 was never issued');
  assert.ok(!V.ssn('123-45-0000'), 'serial 0000 was never issued');
  assert.ok(!V.ssn('111111111'), 'repeated digits are a placeholder');
});

test('routing validates ABA checksum', () => {
  assert.ok(V.routing('021000021'), 'JPMorgan Chase NY');
  assert.ok(V.routing('011401533'), 'a valid published routing number');
  assert.ok(!V.routing('021000022'));
  assert.ok(!V.routing('000000000'));
});

test('nhs validates mod-11', () => {
  assert.ok(V.nhs('943 476 5919'), 'NHS published example number');
  assert.ok(!V.nhs('943 476 5918'));
  assert.ok(!V.nhs('1111111111'));
});

test('npi validates Luhn over the 80840 prefix', () => {
  assert.ok(V.npi('1234567893'), 'CMS published example NPI');
  assert.ok(!V.npi('1234567890'));
  assert.ok(!V.npi('3234567893'), 'NPIs start with 1 or 2');
});

test('sin validates Canadian SIN', () => {
  assert.ok(V.sin('130 692 544'), 'Luhn-valid with an assigned leading digit');
  assert.ok(!V.sin('130 692 545'), 'checksum corruption');
  assert.ok(!V.sin('046 454 286'), 'no SIN is issued starting with 0');
  assert.ok(!V.sin('846 454 286'), 'no SIN is issued starting with 8');
  assert.ok(!V.sin('000000000'));
});

test('abn validates Australian business numbers', () => {
  assert.ok(V.abn('51 824 753 556'), 'ATO published example ABN');
  assert.ok(!V.abn('51 824 753 557'));
});

test('vin validates the ISO 3779 check digit', () => {
  assert.ok(V.vin('1M8GDM9AXKP042788'), 'the standard worked example');
  assert.ok(V.vin('11111111111111111'), 'all-ones is a valid check by construction');
  assert.ok(!V.vin('1M8GDM9A1KP042788'), 'wrong check digit');
  assert.ok(!V.vin('1M8GDM9AXKP04278'), 'too short');
  assert.ok(!V.vin('1M8GDM9AXKP04278I'), 'I is not a legal VIN character');
});

test('nino applies prefix rules', () => {
  assert.ok(V.nino('JK123456C'));
  assert.ok(V.nino('AB 12 34 56 A'));
  assert.ok(!V.nino('QQ123456C'), 'Q is not allowed as a first letter');
  assert.ok(!V.nino('BG123456A'), 'BG is a disallowed prefix');
  assert.ok(!V.nino('DA123456A'), 'D is not allowed as a first letter');
  assert.ok(!V.nino('AO123456A'), 'O is not allowed as a second letter');
});

test('entropy separates prose from random strings', () => {
  assert.ok(V.entropy('aaaaaaaa') < 1);
  assert.ok(V.entropy('Kj8#mQ2vXp9!Lz4w') > 3.5);
  assert.ok(V.looksRandom('aG9sZHRoaXNzZWNyZXQ0Mg'));
  assert.ok(!V.looksRandom('hunter2'), 'too short to judge');
  assert.ok(!V.looksRandom('the quick brown fox'), 'whitespace means prose');
});

test('validDate rejects impossible calendar dates', () => {
  assert.ok(V.validDate(2024, 2, 29), '2024 is a leap year');
  assert.ok(!V.validDate(2023, 2, 29), '2023 is not');
  assert.ok(!V.validDate(2024, 13, 1));
  assert.ok(!V.validDate(1800, 1, 1));
});
