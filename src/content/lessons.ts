import { Rank } from '../engine/cards';
import { getLang, localized } from '../i18n/lang';
import { LESSONS_ES } from './lessons.es';

export interface LessonSection {
  heading?: string;
  body: string;
  /** Example cards to display under the text. */
  cards?: Rank[];
  /** Show Hi-Lo tags under the example cards. */
  showTags?: boolean;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

export type LessonUnit = 'Basics' | 'Strategy' | 'Counting';

/** Display name for each unit (the `unit` field itself is a key, not display text). */
export const UNIT_LABEL: Record<LessonUnit, string> = localized({
  en: { Basics: 'Basics', Strategy: 'Strategy', Counting: 'Counting' },
  es: { Basics: 'Conceptos básicos', Strategy: 'Estrategia', Counting: 'Conteo de cartas' },
});

export interface Lesson {
  id: string;
  unit: LessonUnit;
  title: string;
  summary: string;
  sections: LessonSection[];
  quiz: QuizQuestion[];
  /** Optional practice screen to suggest at the end of the lesson. */
  practice?: { label: string; href: '/play' | '/drills/strategy' | '/drills/count' | '/drills/true-count' | '/chart' };
}

/** English lessons. Spanish versions (same ids, order and answers) are in ./lessons.es.ts. */
export const LESSONS: Lesson[] = [
  {
    id: 'rules',
    unit: 'Basics',
    title: 'How Blackjack Works',
    summary: 'The goal, card values, and how a round plays out.',
    sections: [
      {
        body: 'You play against the dealer, not the other players. The goal is to finish with a higher total than the dealer without going over 21. Going over is a "bust" and you lose right away, even if the dealer busts later.',
      },
      {
        heading: 'Card values',
        body: 'Cards 2–10 are worth their number. Jacks, Queens and Kings are worth 10. An Ace is worth 1 or 11, whichever helps you more.',
        cards: ['7', 'K', 'A'],
      },
      {
        heading: 'Blackjack',
        body: 'An Ace plus any 10-value card as your first two cards is a "blackjack" (or "natural"). It usually pays 3 to 2: bet $10, win $15. Avoid tables that pay 6 to 5; that small change more than triples the house edge.',
        cards: ['A', 'Q'],
      },
      {
        heading: 'How a round goes',
        body: '1. Place your bet.\n2. You get two cards face up. The dealer gets one face up (the "upcard") and one face down (the "hole card").\n3. If the dealer shows an Ace or 10, they check for blackjack.\n4. You play your hand.\n5. The dealer reveals the hole card and must hit until reaching 17 or more. The dealer has no choices; the rules decide every move.',
      },
    ],
    quiz: [
      {
        question: 'You have K and 7. What is your total?',
        options: ['7', '17', '27'],
        answer: 1,
        explanation: 'Face cards are worth 10, so K + 7 = 17.',
      },
      {
        question: 'You bust with 23, then the dealer busts with 24. What happens?',
        options: ['Push (tie)', 'You win', 'You lose'],
        answer: 2,
        explanation: 'You act first, so your bust loses immediately. This is where the house gets its edge.',
      },
    ],
    practice: { label: 'Play a few hands', href: '/play' },
  },
  {
    id: 'soft-hard',
    unit: 'Basics',
    title: 'Soft and Hard Hands',
    summary: 'Why an Ace changes how you play.',
    sections: [
      {
        body: 'A hand with an Ace counted as 11 is "soft". It can\'t bust on the next card, because the Ace can drop back to 1.',
        cards: ['A', '6'],
      },
      {
        body: 'A + 6 is "soft 17". If you hit and draw a 9, the Ace becomes 1 and you have a hard 16. You didn\'t bust.',
        cards: ['A', '6', '9'],
      },
      {
        heading: 'Hard hands',
        body: 'Any hand without an Ace, or where the Ace has to count as 1, is "hard". Hard 12–16 are the "stiff" hands: one card can bust you, and they are the hardest hands to play well.',
        cards: ['10', '6'],
      },
    ],
    quiz: [
      {
        question: 'What is A + 5 + 10?',
        options: ['Soft 16', 'Hard 16', 'Bust (26)'],
        answer: 1,
        explanation: 'Counting the Ace as 11 would make 26, so it counts as 1: a hard 16.',
      },
      {
        question: 'Can a soft 18 bust by taking one card?',
        options: ['Yes', 'No'],
        answer: 1,
        explanation: 'The Ace can always drop from 11 to 1, so a single card never busts a soft hand.',
      },
    ],
  },
  {
    id: 'actions',
    unit: 'Basics',
    title: 'Your Options',
    summary: 'Hit, stand, double, split and surrender.',
    sections: [
      { heading: 'Hit', body: 'Take another card. You can keep hitting until you stand or bust.' },
      { heading: 'Stand', body: 'Keep your total and end your turn.' },
      {
        heading: 'Double down',
        body: 'Double your bet and take exactly one more card. You can only do this on your first two cards. Use it when you\'re likely to win, like 11 against a dealer 6.',
        cards: ['6', '5'],
      },
      {
        heading: 'Split',
        body: 'With a pair, put up a second bet and play each card as its own hand. Each hand gets a second card.',
        cards: ['8', '8'],
      },
      {
        heading: 'Surrender',
        body: 'Some casinos let you give up your first two cards and get half your bet back. It\'s the right play for a few hands that lose very often, like 16 against a 10.',
      },
      {
        heading: 'Insurance',
        body: 'When the dealer shows an Ace, you can bet half your wager that they have blackjack. Without counting cards, it\'s a bad bet: always decline it. Card counters take it when the count is high enough.',
      },
    ],
    quiz: [
      {
        question: 'When are you allowed to double down?',
        options: ['Any time', 'Only on your first two cards', 'Only with a pair'],
        answer: 1,
        explanation: 'Doubling is only offered on your first two cards (and on split hands at most casinos).',
      },
      {
        question: 'Should a basic strategy player take insurance?',
        options: ['Yes, always', 'Only with a good hand', 'No, never'],
        answer: 2,
        explanation: 'Insurance has a big house edge unless you know the deck is rich in 10s, which takes counting.',
      },
    ],
  },
  {
    id: 'basic-strategy',
    unit: 'Strategy',
    title: 'Basic Strategy: The Big Ideas',
    summary: 'The mathematically best play for every hand, explained simply.',
    sections: [
      {
        body: 'Basic strategy is the best play for every combination of your hand and the dealer\'s upcard, worked out by computer. Played perfectly, it cuts the house edge to about 0.5%. You can memorise it from a few simple ideas.',
      },
      {
        heading: '1. Assume the hole card is a 10',
        body: 'About 4 in every 13 cards are worth 10. So when the dealer shows a 7, think "probably 17". Showing a 10, think "probably 20".',
      },
      {
        heading: '2. Dealer 2–6 are "bust cards"',
        body: 'With a 4, 5 or 6 up, the dealer will probably end up with a stiff hand and have to hit it. Against these cards, stand on 12–16 and let the dealer bust. (Against a 2 or 3, hit 12.)',
        cards: ['5'],
      },
      {
        heading: '3. Against 7 through Ace, hit until 17',
        body: 'The dealer probably has a strong hand. Standing on 12–16 usually loses, so keep hitting until you reach 17.',
        cards: ['10'],
      },
      {
        heading: '4. Double when you have the edge',
        body: 'Double 11 against everything but an Ace, 10 against 2–9, and 9 against 3–6. Double soft hands (like A-7) against weak dealer cards.',
      },
      {
        heading: '5. Always and never',
        body: 'Always split Aces and 8s. Never split 10s or 5s. Never take insurance.',
        cards: ['A', 'A'],
      },
    ],
    quiz: [
      {
        question: 'You have 14. The dealer shows a 6. What do you do?',
        options: ['Hit', 'Stand', 'Double'],
        answer: 1,
        explanation: '6 is a bust card. Stand and let the dealer take the risk.',
      },
      {
        question: 'You have 15. The dealer shows a 9. What do you do?',
        options: ['Hit', 'Stand', 'Surrender'],
        answer: 0,
        explanation: 'The dealer probably has 19. Standing on 15 almost always loses, so hit.',
      },
      {
        question: 'You have 10, 10. The dealer shows a 6. What do you do?',
        options: ['Split', 'Stand', 'Double'],
        answer: 1,
        explanation: '20 is a great hand. Never break it up (unless you\'re counting and the count is very high).',
      },
    ],
    practice: { label: 'Drill basic strategy', href: '/drills/strategy' },
  },
  {
    id: 'why-counting',
    unit: 'Counting',
    title: 'Why Card Counting Works',
    summary: 'High cards help you; low cards help the dealer.',
    sections: [
      {
        body: 'Cards that have been played don\'t come back until the shuffle. So the cards left in the shoe change as the game goes on, and so do your odds.',
      },
      {
        heading: 'When lots of 10s and Aces remain',
        body: '• You get more blackjacks, which pay 3 to 2. The dealer gets them too but only wins even money.\n• The dealer busts more often, because they must hit stiff hands.\n• Your double downs win more often.',
        cards: ['10', 'A', 'K'],
      },
      {
        heading: 'When lots of small cards remain',
        body: 'Small cards help the dealer make hands without busting. The game gets worse for you.',
        cards: ['4', '5', '6'],
      },
      {
        heading: 'The plan',
        body: 'Counting tracks whether the remaining cards are rich in high cards or low cards. Bet small when they\'re low, bet bigger when they\'re high. No memorising every card, and it is not illegal. It just takes practice.',
      },
    ],
    quiz: [
      {
        question: 'Which shoe is better for the player?',
        options: ['Rich in small cards', 'Rich in 10s and Aces', 'It doesn\'t matter'],
        answer: 1,
        explanation: 'High cards mean more blackjacks for you and more dealer busts.',
      },
    ],
  },
  {
    id: 'hi-lo',
    unit: 'Counting',
    title: 'The Hi-Lo Count',
    summary: 'The most popular counting system: +1, 0, −1.',
    sections: [
      {
        body: 'Hi-Lo gives every card a tag. Add up the tags of every card you see to get the "running count".',
      },
      { heading: '2 through 6: +1', body: 'Low cards leaving the shoe are good for you.', cards: ['2', '3', '4', '5', '6'], showTags: true },
      { heading: '7, 8, 9: 0', body: 'Neutral cards. Ignore them.', cards: ['7', '8', '9'], showTags: true },
      { heading: '10s and Aces: −1', body: 'High cards leaving the shoe are bad for you.', cards: ['10', 'J', 'Q', 'K', 'A'], showTags: true },
      {
        heading: 'Balanced count',
        body: 'There are 5 plus-cards and 5 minus-cards per suit, so a full deck counts to exactly 0. A great way to practice: count down a real deck and check you finish at 0.',
      },
    ],
    quiz: [
      {
        question: 'What is the Hi-Lo tag for a 9?',
        options: ['+1', '0', '−1'],
        answer: 1,
        explanation: '7, 8 and 9 are neutral.',
      },
      {
        question: 'You see K, 5, 3, A, 6. What is the running count?',
        options: ['+1', '0', '+3'],
        answer: 0,
        explanation: 'K −1, 5 +1, 3 +1, A −1, 6 +1. Total: +1.',
      },
    ],
    practice: { label: 'Practice the running count', href: '/drills/count' },
  },
  {
    id: 'running-count',
    unit: 'Counting',
    title: 'Keeping the Running Count',
    summary: 'Tricks to count fast and accurately.',
    sections: [
      {
        heading: 'Cancel pairs',
        body: 'A high card and a low card cancel out. Don\'t add them one by one. Spot pairs that cancel and only count what\'s left.',
        cards: ['K', '5', '9', '4'],
        showTags: true,
      },
      {
        body: 'Above: K and 5 cancel, 9 is zero, so the whole group is just +1 from the 4.',
      },
      {
        heading: 'Count every card you see',
        body: 'Include other players\' cards, the dealer\'s hole card once it\'s turned over, and every hit card. Keep the count going from hand to hand until the shuffle, then start again at 0.',
      },
      {
        heading: 'Speed goal',
        body: 'Practice until you can count down a full deck in under 30 seconds and finish on 0. Then add distractions, like talking or music.',
      },
    ],
    quiz: [
      {
        question: 'The dealer shuffles. What is the running count now?',
        options: ['Keep the old count', '0', '+1'],
        answer: 1,
        explanation: 'A new shoe resets the count to 0.',
      },
    ],
    practice: { label: 'Practice the running count', href: '/drills/count' },
  },
  {
    id: 'true-count',
    unit: 'Counting',
    title: 'The True Count',
    summary: 'Adjusting for how many decks are left.',
    sections: [
      {
        body: 'A running count of +6 is huge with one deck left, but not much with five decks left. The true count fixes this.',
      },
      {
        heading: 'The formula',
        body: 'True count = running count ÷ decks remaining.\n\nRunning count +6 with 3 decks left → true count +2.\nRunning count +6 with 1.5 decks left → true count +4.',
      },
      {
        heading: 'Estimating decks remaining',
        body: 'Look at the discard tray, estimate how many decks have been played, and subtract that from the total. Half-deck accuracy is good enough. In this app, the table shows the decks remaining so you can practice the math.',
      },
      {
        heading: 'Rounding',
        body: 'For betting, most counters round the true count down (+2.7 becomes +2). That keeps you careful with your bets.',
      },
    ],
    quiz: [
      {
        question: 'Running count +8, 4 decks left. True count?',
        options: ['+2', '+4', '+8'],
        answer: 0,
        explanation: '8 ÷ 4 = +2.',
      },
      {
        question: 'Running count −3, 1 deck left. True count?',
        options: ['−1', '−3', '0'],
        answer: 1,
        explanation: '−3 ÷ 1 = −3. Bet the minimum.',
      },
    ],
    practice: { label: 'Practice true count conversions', href: '/drills/true-count' },
  },
  {
    id: 'betting',
    unit: 'Counting',
    title: 'Betting With the Count',
    summary: 'Turn the count into an edge.',
    sections: [
      {
        body: 'Each +1 of true count is worth about +0.5% to you. In a typical game you start around −0.5%, so you have the edge from about +1 or +2.',
      },
      {
        heading: 'A simple bet spread',
        body: 'True count +1 or less: 1 unit\nTrue count +2: 2 units\nTrue count +3: 4 units\nTrue count +4: 6 units\nTrue count +5 or more: 8 units',
      },
      {
        heading: 'Bankroll',
        body: 'Even with an edge, swings are big. Counters keep a bankroll of hundreds of betting units to avoid going broke during losing streaks. Never bet money you can\'t afford to lose.',
      },
      {
        heading: 'Reality check',
        body: 'Counting is legal, but casinos can refuse your action or ask you to stop playing. Big, obvious bet jumps attract attention. Use this app to learn the skill and the math.',
      },
    ],
    quiz: [
      {
        question: 'True count is +3. Using the spread above, how many units do you bet?',
        options: ['1', '4', '8'],
        answer: 1,
        explanation: '+3 → 4 units.',
      },
    ],
    practice: { label: 'Play with the count shown', href: '/play' },
  },
  {
    id: 'deviations',
    unit: 'Counting',
    title: 'Insurance and Index Plays',
    summary: 'When the count changes how you play your hand.',
    sections: [
      {
        heading: 'Insurance at +3',
        body: 'Insurance pays 2 to 1. It becomes a good bet when more than 1 in 3 remaining cards is a 10. That happens at a Hi-Lo true count of about +3. Take insurance at +3 or higher, never below.',
      },
      {
        heading: 'Index plays',
        body: 'Some basic-strategy plays change with the count. Each one has an "index", the true count at which you switch. The most important ones:\n\n• 16 vs 10: stand at 0 or higher (hit when negative)\n• 15 vs 10: stand at +4\n• 10,10 vs 5: split at +5; vs 6: split at +4\n• 10 vs 10: double at +4\n• 12 vs 3: stand at +2; 12 vs 2: stand at +3\n• 11 vs A: double at +1',
      },
      {
        body: 'Turn on "Count-based advice" in Settings and the coach will use these plays at the table.',
      },
    ],
    quiz: [
      {
        question: 'Dealer shows an Ace. True count is +4. Insurance?',
        options: ['Take it', 'Decline'],
        answer: 0,
        explanation: 'At +3 or higher there are enough 10s left to make insurance profitable.',
      },
      {
        question: '16 vs dealer 10, no surrender, true count +1. Play?',
        options: ['Hit', 'Stand'],
        answer: 1,
        explanation: 'The index for 16 vs 10 is 0. At 0 or above, stand.',
      },
    ],
    practice: { label: 'Play with count-based advice', href: '/play' },
  },
];

/** The lessons in the current language. */
export function getLessons(): Lesson[] {
  return getLang() === 'es' ? LESSONS_ES : LESSONS;
}

/** A lesson in the current language. */
export function getLesson(id: string): Lesson | undefined {
  return getLessons().find((l) => l.id === id);
}
