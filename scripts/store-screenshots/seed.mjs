// Demo progress for store screenshots: an advanced player about 80% casino-ready.
export function seed(lang) {
  const today = new Date(); const day = (d) => { const t = new Date(today); t.setDate(t.getDate() - d); return t.toISOString().slice(0, 10); };
  const T = day(0);
  const spots = {};
  const addSpot = (label, best, right, total) => (spots[label] = { label, best, right, total });
  addSpot('Soft 18 vs 9', 'hit', 9, 14); addSpot('Hard 12 vs 3', 'hit', 11, 15); addSpot('9,9 vs 7', 'stand', 6, 9);
  addSpot('Hard 16 vs 10', 'hit', 21, 24); addSpot('Soft 17 vs 2', 'hit', 7, 9); addSpot('Hard 11 vs A', 'double', 14, 16);
  addSpot('Hard 13 vs 2', 'stand', 12, 13); addSpot('Hard 10 vs 9', 'double', 18, 19);
  const recent = Array.from({ length: 200 }, (_, i) => !(i === 37 || i === 121));
  const cards = {};
  for (const [i, id] of ['16v10','15v10','TTv5','TTv6','10v10','12v3','12v2','11vA','9v2','10vA','9v7','16v9','13v2','12v4','12v5','12v6','13v3','s15v10','s14v10','s15v9','s15vA','insurance'].entries())
    cards[id] = { box: 2 + (i % 3), due: day(-(i % 4) - 1), right: 6 + (i % 5), total: 7 + (i % 5) };
  const history = []; let h = 300, d = 760, c = 715, dev = 20, pd = 2, tc = 10, de = 6;
  for (let k = 27; k >= 1; k--) {
    const start = { hands: h, decisions: d, correct: c, lessons: 10, devReviews: dev, perfectDecks: pd, trueCount: tc, deckEstimates: de, workout: 0, bestDeckMs: 41000 - (27 - k) * 450 };
    h += 30 + (k % 4) * 6; d += 74 + (k % 5) * 8; c += Math.round((74 + (k % 5) * 8) * (0.93 + (27 - k) * 0.0025)); dev += 6; if (k % 2) pd++; tc += 3; de += 1;
    history.push({ day: day(k), start, values: { ...start, hands: h, decisions: d, correct: Math.min(c, d), devReviews: dev, perfectDecks: pd, trueCount: tc, deckEstimates: de, workout: 1 } });
  }
  const exam = (dd, grade, passed, acc, bet) => ({ day: day(dd), hands: 62, playAccuracy: acc, countGuess: -3, countActual: passed ? -3 : -5, trueGuess: -1, trueActual: passed ? -1 : -2, betScore: bet, deckError: passed ? 0.25 : 0.75, grade, passed });
  const stats = {
    handsPlayed: h, decisions: d, correctDecisions: Math.min(c, d), countDrillsPassed: 31, bestStrategyStreak: 142,
    lessonsCompleted: ['rules','soft-hard','actions','basic-strategy','why-counting','hi-lo','running-count','true-count','betting','deviations'],
    xp: 18450, peakChips: 6240, biggestWin: 600, refills: 0, bonusChipsEarned: 0,
    leaks: { byCategory: { hardLow: { right: 412, total: 421 }, stiff: { right: 655, total: 688 }, hardHigh: { right: 530, total: 531 }, soft: { right: 298, total: 322 }, pair: { right: 171, total: 186 }, insurance: { right: 40, total: 42 } }, spots, recent },
    onboarded: true,
    academy: { pref: 'mix', progress: Object.fromEntries(['tagTap','colorCount','soundCount','pairCancel','readCount'].map((m, i) => [m, { level: 3 + (i % 3), played: 12 + i * 3, bestAccuracy: 0.9 + i * 0.02, box: 2, due: day(-2) }])), streak: 9, lastWorkoutDay: T },
    countRecords: { bestDeckMs: 28900, perfectDecks: pd },
    trueCountDrill: { right: tc - 6, total: tc }, deviations: { cards },
    exams: [exam(9, 64, false, 0.93, 0.71), exam(4, 78, true, 0.96, 0.82), exam(1, 88, true, 0.98, 0.9)],
    deckEstimates: { right: de - 5, total: de, recentErrors: [0.25, 0.5, 0.25, 0, 0.25, 0.5, 0.25, 0, 0.25, 0.25] },
    goals: { day: null, start: null, claimed: [], streak: 9, lastCompleteDay: day(1) },
    history,
    seenFeatures: ['lessons','tables','strategyDrill','chart','leaks','ready','progress','academy','countDrill','trueCountDrill','decksDrill','deviations','exam','simulator','tableCount'],
  };
  const settings = { experienced: true, bankroll: 4875, adsRemoved: true, language: lang, yourHands: 1, tableId: 'floor', showCount: true, showHints: true };
  return JSON.stringify({ settings, stats });
}
