export interface Rules {
  decks: number;
  /** Dealer hits soft 17 (H17). False means dealer stands on all 17s (S17). */
  dealerHitsSoft17: boolean;
  /** Double after split allowed. */
  doubleAfterSplit: boolean;
  /** Late surrender (after dealer checks for blackjack). */
  lateSurrender: boolean;
  /** Blackjack payout multiplier, e.g. 1.5 for 3:2 or 1.2 for 6:5. */
  blackjackPayout: number;
  /** Max number of hands a player can split up to. */
  maxHands: number;
  /** Fraction of the shoe dealt before reshuffling. */
  penetration: number;
}

export const DEFAULT_RULES: Rules = {
  decks: 6,
  dealerHitsSoft17: false,
  doubleAfterSplit: true,
  lateSurrender: true,
  blackjackPayout: 1.5,
  maxHands: 4,
  penetration: 0.75,
};
