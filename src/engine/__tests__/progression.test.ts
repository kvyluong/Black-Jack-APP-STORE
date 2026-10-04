import {
  BonusClaims,
  DAILY_BONUS_ADS,
  STARTING_CHIPS,
  bonusAdsLeft,
  bonusChips,
  recordBonusClaim,
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

describe('bonus chips from rewarded ads', () => {
  const day1 = new Date(2026, 9, 4, 22, 0);
  const day2 = new Date(2026, 9, 5, 0, 5);

  it('scales the bonus with your best unlocked table', () => {
    expect(bonusChips(1000)).toBe(500);
    expect(bonusChips(12000)).toBe(2000); // The Strip: 20 x $100
    expect(bonusChips(300000)).toBe(50000);
  });

  it('allows a few ads per day and resets at midnight', () => {
    let claims: BonusClaims | undefined;
    expect(bonusAdsLeft(claims, day1)).toBe(DAILY_BONUS_ADS);
    for (let i = 0; i < DAILY_BONUS_ADS; i++) claims = recordBonusClaim(claims, day1);
    expect(bonusAdsLeft(claims, day1)).toBe(0);
    expect(bonusAdsLeft(claims, day2)).toBe(DAILY_BONUS_ADS);
    expect(recordBonusClaim(claims, day2)).toEqual({ day: '2026-10-05', count: 1 });
  });
});
