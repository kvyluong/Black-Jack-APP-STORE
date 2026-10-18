import { REVIEW_RULES, recordReviewAsk, shouldAskForReview } from '../review';

const settled = { handsPlayed: 40, history: [{ day: '2026-10-10' }, { day: '2026-10-12' }] };

describe('rating prompt', () => {
  it('waits until the player has settled in', () => {
    expect(shouldAskForReview({ handsPlayed: 0, history: [] }, '2026-10-18')).toBe(false);
    // Plenty of hands, but all on the first day.
    expect(shouldAskForReview({ handsPlayed: 500, history: [] }, '2026-10-18')).toBe(false);
    // Several days, but too few hands.
    expect(shouldAskForReview({ ...settled, handsPlayed: REVIEW_RULES.minHands - 1 }, '2026-10-18')).toBe(false);
    expect(shouldAskForReview(settled, '2026-10-18')).toBe(true);
  });

  it('today counts as a day used, but only once', () => {
    expect(shouldAskForReview({ handsPlayed: 40, history: [{ day: '2026-10-17' }] }, '2026-10-18')).toBe(true);
    expect(shouldAskForReview({ handsPlayed: 40, history: [{ day: '2026-10-18' }] }, '2026-10-18')).toBe(false);
  });

  it('leaves months between asks', () => {
    const review = recordReviewAsk(undefined, '2026-10-18');
    expect(review).toEqual({ asks: 1, lastAskDay: '2026-10-18' });
    expect(shouldAskForReview({ ...settled, review }, '2026-10-19')).toBe(false);
    expect(shouldAskForReview({ ...settled, review }, '2027-01-15')).toBe(false);
    expect(shouldAskForReview({ ...settled, review }, '2027-02-16')).toBe(true);
  });

  it('stops for good after a few asks', () => {
    const review = { asks: REVIEW_RULES.maxAsks, lastAskDay: '2020-01-01' };
    expect(shouldAskForReview({ ...settled, review }, '2026-10-18')).toBe(false);
  });
});
