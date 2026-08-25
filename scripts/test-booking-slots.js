// Check that booking slots are restricted to a restaurant's opening hours.
//
// Run with:  node scripts/test-booking-slots.js
//
// The logic mirrors slotsWithinHours() in App.tsx, including the one-hour
// buffer before closing. It is repeated here rather
// than imported because App.tsx is a React Native module and cannot be loaded
// by plain Node; if the rule in App.tsx changes, change it here too.

const assert = require('assert');

const TIME_SLOTS = ['11:30', '12:30', '13:30', '18:30', '19:30', '20:30'];

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const CLOSING_BUFFER_MINS = 60;

function slotsWithinHours(hours) {
  if (!hours) return TIME_SLOTS;
  if (/24 hours/i.test(hours)) return TIME_SLOTS;

  const range = hours.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  if (range) {
    const open = toMinutes(range[1]);
    let close = toMinutes(range[2]);
    if (close <= open) close += 24 * 60;
    const lastBooking = close - CLOSING_BUFFER_MINS;
    return TIME_SLOTS.filter((slot) => {
      let at = toMinutes(slot);
      if (at < open) at += 24 * 60;
      return at >= open && at <= lastBooking;
    });
  }

  const opensOnly = hours.match(/Opens\s+(\d{1,2}:\d{2})/i);
  if (opensOnly) {
    const open = toMinutes(opensOnly[1]);
    return TIME_SLOTS.filter((slot) => toMinutes(slot) >= open);
  }

  return TIME_SLOTS;
}

const cases = [
  ['Open 24 hours', TIME_SLOTS,                                  'always open (McDonald, Gading, Kungfu Ramen)'],
  ['11:00 - 21:00', ['11:30','12:30','13:30','18:30','19:30'],   'closes 21:00, so 20:30 is inside the one-hour buffer'],
  ['10:00 - 01:00', TIME_SLOTS,                                  'crosses midnight, buffer lands at 00:00 (Craft Cafe)'],
  ['19:00 - 03:00', ['19:30', '20:30'],                          'evening only, crossing midnight (Max Bar)'],
  ['07:00 - 16:00', ['11:30', '12:30', '13:30'],                 'daytime only, buffer at 15:00 (Tai Chong)'],
  ['09:00 - 01:00', TIME_SLOTS,                                  'opens early, closes late (Kashif)'],
  ['11:00 - 23:00', TIME_SLOTS,                                  'buffer at 22:00, every slot still stands (Bingxue)'],
  ['Opens 10:00',   TIME_SLOTS,                                  'only an opening time was published'],
  ['Opens 19:00',   ['19:30', '20:30'],                          'late opener, closing time unknown'],
  [null,            TIME_SLOTS,                                  'hours not confirmed, so nothing is hidden'],
  ['07:00 - 10:00', [],                                          'shut, or nearly shut, at every booking time'],
  ['11:00 - 20:00', ['11:30','12:30','13:30','18:30'],           'buffer removes 19:30 as well as anything later'],
];

let failed = 0;
for (const [hours, expected, note] of cases) {
  const actual = slotsWithinHours(hours);
  try {
    assert.deepStrictEqual(actual, expected);
    console.log(`PASS  ${String(hours).padEnd(15)} -> ${actual.length} slots   ${note}`);
  } catch (e) {
    failed++;
    console.log(`FAIL  ${String(hours).padEnd(15)} -> got [${actual}], expected [${expected}]   ${note}`);
  }
}

// A booking must never be offered outside the stated hours.
const evening = slotsWithinHours('19:00 - 03:00');
assert.ok(!evening.includes('11:30'), 'a lunchtime slot must not be offered by a bar that opens at 19:00');

// Nothing may be offered inside the hour before closing.
assert.ok(!slotsWithinHours('11:00 - 21:00').includes('20:30'), 'the last booking must be an hour before closing');

console.log(failed ? `\n${failed} case(s) failed` : `\nall ${cases.length} cases pass`);
process.exit(failed ? 1 : 0);
