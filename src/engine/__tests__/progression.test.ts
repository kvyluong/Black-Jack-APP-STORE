import {
  PRACTICE_BUDGET,
  PRACTICE_STAKE,
  TABLES,
  isUnlocked,
  levelInfo,
  localDay,
  newlyUnlocked,
  nextUnlock,
  roundXp,
  xpForLevel,
} from '../progression';

describe('tables', () => {
  it('starts you at the Main Floor with the rest locked', () => {
    expect(TABLES[0].unlockLevel).toBe(1);
    expect(nextUnlock(1)?.id).toBe('downtown');
    expect(isUnlocked(TABLES[1], 2)).toBe(false);
    expect(isUnlocked(TABLES[1], 3)).toBe(true);
  });

  it('unlocks tables as your level crosses each threshold', () => {
    expect(newlyUnlocked(2, 5).map((t) => t.id)).toEqual(['downtown', 'strip']);
    expect(newlyUnlocked(5, 6)).toEqual([]);
    expect(nextUnlock(99)).toBeUndefined();
  });

  it('unlock levels rise from table to table', () => {
    for (let i = 1; i < TABLES.length; i++) expect(TABLES[i].unlockLevel).toBeGreaterThan(TABLES[i - 1].unlockLevel);
  });

  it('never shows money: names and blurbs have no amounts', () => {
    for (const t of TABLES) expect(`${t.name} ${t.blurb}`).not.toMatch(/\$|\d/);
  });

  it('keeps the hidden practice stake far below the budget', () => {
    expect(PRACTICE_STAKE).toBe(1);
    expect(PRACTICE_BUDGET / PRACTICE_STAKE).toBeGreaterThan(10000);
  });
});

describe('levels', () => {
  it('follows the XP curve', () => {
    expect([1, 2, 3, 4, 5].map(xpForLevel)).toEqual([0, 100, 300, 600, 1000]);
    expect(levelInfo(0)).toMatchObject({ level: 1, title: 'Rookie', into: 0, span: 100 });
    expect(levelInfo(350)).toMatchObject({ level: 3, title: 'Regular', into: 50, span: 300 });
    expect(levelInfo(xpForLevel(16)).title).toBe('Legend');
  });

  it('awards XP for hands and correct calls', () => {
    expect(roundXp(2, 3)).toBe(35);
  });
});

describe('dates', () => {
  it('formats the local day', () => {
    expect(localDay(new Date(2026, 9, 5, 0, 5))).toBe('2026-10-05');
  });
});
