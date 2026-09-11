const { validateFactPreservation } = require('../lib/services/fantasyChat/researchGroundingService');

const cases = [
  {
    label: 'Faithful rephrasing (should PASS)',
    original: "Phil Foden was selected in the starting XI. Predicted xP 3.01, ranked #5 of 5 MIDs, price £7.0m.",
    rephrased: "Foden made the starting XI with a predicted 3.01 xP, ranking #5 out of 5 midfielders at a price of £7.0m.",
    required: ['Foden'],
    expect: true,
  },
  {
    label: 'Dropped a number (should FAIL)',
    original: "Phil Foden was selected. Predicted xP 3.01, ranked #5 of 5 MIDs, price £7.0m.",
    rephrased: "Foden was selected with a strong predicted xP, ranking well among midfielders at a fair price.",
    required: ['Foden'],
    expect: false,
  },
  {
    label: 'Invented a number not in the original (should FAIL)',
    original: "Phil Foden's average expected points for GW4 is 3.01.",
    rephrased: "Foden is expected to score around 3.01 points on average, with an upside of 8 points.",
    required: ['Foden'],
    expect: false,
  },
  {
    label: 'Dropped the required player name (should FAIL)',
    original: "Phil Foden's average expected points for GW4 is 3.01.",
    rephrased: "This player's average expected points for GW4 is 3.01.",
    required: ['Foden'],
    expect: false,
  },
  {
    label: 'Silently dropped a negation/caveat (should FAIL)',
    original: "A supplemental range has not been published for this player yet, so no P25/P75/P80 numbers are available.",
    rephrased: "This player has a supplemental range of 2 to 8 points with an 80th percentile of 10.",
    required: [],
    expect: false,
  },
  {
    label: 'Number changed (3.01 -> 3.1, should FAIL)',
    original: "Predicted xP is 3.01 for this gameweek.",
    rephrased: "The predicted expected points figure is 3.1 for this gameweek.",
    required: [],
    expect: false,
  },
];

let failures = 0;
for (const c of cases) {
  const result = validateFactPreservation(c.original, c.rephrased, c.required);
  const ok = result === c.expect;
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${c.label} (validator returned ${result}, expected ${c.expect})`);
  if (!ok) failures++;
}
console.log();
console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
