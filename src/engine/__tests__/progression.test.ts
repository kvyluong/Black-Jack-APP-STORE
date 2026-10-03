import {
  STARTING_CHIPS,
  TABLES,
  bestAffordableTable,
  canSit,
  chipBreakdown,
  formatChips,
  levelInfo,
  needsRefill,
  newlyUnlocked,
  nextUnlock,
  roundXp,
  xpForLevel,
} from '../progression';

describe('tables', () => {
  it('starts you at the Main Floor with the rest locked', () => {
    expect(TABLES[0].unlockAt).toBe(0);
    expect(nextUnlock(STARTING_CHIPS)?.id).toBe('downtown');
    expect(canSit(TABLES[1], 5000, STARTING_CHIPS)).toBe(false); // not unlocked yet
  });

  it('unlocks tables as your peak chips cross each threshold', () => {
    expect(newlyUnlocked(2000, 12000).map((t) => t.id)).toEqual(['downtown', 'strip']);
    expect(newlyUnlocked(12000, 12500)).toEqual([]);
  });

  it('every table has sensible limits and chips', () => {
    for (const t of TABLES) {
      expect(t.maxBet).toBeGreaterThan(t.minBet);
      // The count-based bet ramp tops out at 8 units, which must fit under the max.
      expect(t.minBet * 8).toBeLessThanOrEqual(t.maxBet);
      expect(t.chips.every((c) => c <= t.maxBet)).toBe(true);
    }
  });

  it('moves you down to a table you can afford, and refills only when broke', () => {
    expect(bestAffordableTable(300, 60000)?.id).toBe('downtown');
    expect(bestAffordableTable(3, 60000)).toBeUndefined();
    expect(needsRefill(4)).toBe(true);
    expect(needsRefill(5)).toBe(false);
  });
});

describe('chips', () => {
  it('breaks an amount into the fewest chips', () => {
    expect(chipBreakdown(130)).toEqual([100, 25, 5]);
    expect(chipBreakdown(5000)).toEqual([5000]);
    expect(chipBreakdown(7.5)).toEqual([5, 1, 1]);
  });

  it('formats with separators', () => {
    expect(formatChips(12500)).toBe('12,500');
    expect(formatChips(1007.5)).toBe('1,007.5');
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
