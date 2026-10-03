import { Card, Rank, createShoe, seededRng } from '../cards';
import { dealSchedule } from '../dealSchedule';
import { GameState, act, newGame, startRound } from '../game';
import { countUpTicks, roundFanfare, streakPitch } from '../juice';
import { DEFAULT_RULES } from '../rules';

const c = (rank: Rank): Card => ({ rank, suit: '♦' });
function rigged(draws: Rank[]): GameState {
  const g = newGame(DEFAULT_RULES, 1000, seededRng(1));
  g.shoe = [...createShoe(6, seededRng(2)).slice(0, 200), ...draws.map(c).reverse()];
  g.shoeSize = 312;
  return g;
}

describe('roundFanfare', () => {
  it('is null mid-round', () => {
    expect(roundFanfare(startRound(rigged(['10', '6', '7', '9']), 10))).toBeNull();
  });

  it('celebrates a natural blackjack the most', () => {
    const f = roundFanfare(startRound(rigged(['A', '9', 'K', '7']), 10))!;
    expect(f.tier).toBe('blackjack');
    expect(f.net).toBe(15);
    expect(f.particles).toBeGreaterThan(30);
  });

  it('calls a won double a big win', () => {
    // 6,5 vs dealer 6 (hole 10); double draws 10 = 21; dealer draws 10 and busts.
    const g = act(startRound(rigged(['6', '6', '5', '10', '10', '10']), 10), 'double');
    const f = roundFanfare(g)!;
    expect(f.tier).toBe('bigWin');
    expect(f.label).toBe('BIG WIN +$20');
  });

  it('shakes on a bust and plays the bust sound', () => {
    const g1 = startRound(rigged(['10', '6', '6', '9', 'K']), 10);
    const g2 = act(g1, 'hit');
    expect(roundFanfare(g2)!.tier).toBe('bust');
    expect(roundFanfare(g2)!.shake).toBeGreaterThan(0);
    expect(dealSchedule(g1, g2).sounds.at(-1)?.name).toBe('bust');
  });

  it('labels a plain loss and a surrender', () => {
    const lose = act(startRound(rigged(['10', '10', '7', '9']), 10), 'stand');
    expect(roundFanfare(lose)!.label).toBe('−$10');
    const sur = act(startRound(rigged(['10', '10', '6', '7']), 10), 'surrender');
    expect(roundFanfare(sur)!.tier).toBe('surrender');
  });
});

describe('streakPitch and countUpTicks', () => {
  it('climbs a semitone per streak step up to an octave', () => {
    expect(streakPitch(1)).toBe(1);
    expect(streakPitch(13)).toBeCloseTo(2);
    expect(streakPitch(50)).toBeCloseTo(2);
  });

  it('ticks more for bigger wins, within limits', () => {
    expect(countUpTicks(0)).toBe(0);
    expect(countUpTicks(5)).toBeGreaterThanOrEqual(3);
    expect(countUpTicks(10000)).toBe(10);
  });
});
