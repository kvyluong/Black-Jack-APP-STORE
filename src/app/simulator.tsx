// Bankroll simulator: enter a bet spread, rules and bankroll; see the edge, hourly win, swings and risk of ruin.
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Stepper } from '../components/simulator/Stepper';
import { TcChart } from '../components/simulator/TcChart';
import { H2, P, Panel, Screen, Segmented, ToggleRow } from '../components/ui';
import { useOutcomeColors } from '../components/useColors';
import {
  BetRamp,
  RAMP_PRESETS,
  RampPreset,
  SimInputs,
  SimWarning,
  TcDistribution,
  analyze,
  cachedTrueCounts,
  describe,
  formatMoney,
  formatPercent,
  simulateTrueCountsAsync,
  warnings,
} from '../engine/simulator';
import { localized } from '../i18n/lang';
import { usePrefs } from '../state/settings';
import { colors, radius, spacing } from '../theme';

const T = localized({
  en: {
    intro:
      'See what a counter’s bet spread is worth: your edge, your average hourly win, how big the swings are and how likely you are to lose your whole bankroll.',
    rules: 'Table rules',
    decks: 'Decks',
    pen: 'Penetration (how deep the cut card is)',
    dealer: 'Dealer soft 17',
    payout: 'Blackjack pays',
    das: 'Double after split',
    surrender: 'Late surrender',
    table: 'Table',
    headsUp: 'Heads-up',
    full: 'Full table',
    spread: 'Bet spread',
    spreadHint: 'Units you bet at each true count.',
    presetApp: '1–8 (app)',
    preset12: '1–12',
    presetCons: '1–4',
    presetFlat: 'Flat',
    tcRow: (tc: string) => `True count ${tc}`,
    wong: 'Wong out',
    wongHint: 'Sit out (no bet) when the true count drops below −1.',
    countPlays: 'Count plays',
    countPlaysHint: 'Use the index plays (Illustrious 18, Fab 4, insurance at +3). Off = basic strategy only.',
    money: 'Money',
    unit: 'Unit size',
    bankroll: 'Bankroll',
    perHour: 'Rounds per hour',
    simulating: (p: number) => `Simulating shoes… ${p}%`,
    results: 'Results',
    edge: 'Your edge',
    avgBet: 'Average bet',
    per100: 'Win per 100 hands',
    perHourWin: 'Win per hour',
    sdHour: 'Swings (1 SD) per hour',
    n0: 'N0 (hands)',
    ror: 'Risk of ruin',
    need5: 'Bankroll for 5% risk',
    need1: 'Bankroll for 1% risk',
    houseEdge: (he: string) => `Off-the-top house edge for these rules: ${he}`,
    played: (p: string) => `You bet on ${p} of rounds.`,
    never: 'never',
    units: (u: string) => `${u} units`,
    chart: 'How often each true count comes up',
    warnTitle: 'Watch out',
    warn: {
      sixFive: '6:5 blackjack costs about 1.4% — more than a typical spread can win back. Look for 3:2 tables.',
      losing: 'This game and spread lose money on average. Counting can’t fix bad rules or a too-small spread.',
      ror: 'Your risk of ruin is above 10%. Bet smaller units or bring a bigger bankroll.',
      spread: 'A spread wider than about 1–10 in a shoe game is the kind casinos notice and back off.',
      shallow: 'Shallow penetration: the cut card is too high for the good counts to come up often.',
    } as Record<SimWarning, string>,
    rorNote: 'Risk of ruin uses the standard formula e^(−2·EV·bankroll / variance), the long-run chance of losing this bankroll if you never add to it or change your bet sizes.',
    method:
      'How it works: we deal thousands of real shoes with your decks, penetration and table size to see how often each true count comes up. Each count’s edge comes from the rules plus about 0.5% per true count (more at high counts with count plays), measured with this app’s own game engine; each hand’s variance is about 1.3 squared units. Sources: Griffin, Wong, Schlesinger.',
    disclaimer: 'Estimates for learning only. This is a play-money app: no real money is won or lost here.',
  },
  es: {
    intro:
      'Mira cuánto vale el rango de apuestas de un contador: tu ventaja, tu ganancia promedio por hora, qué tan grandes son los altibajos y qué tan probable es que pierdas toda tu banca.',
    rules: 'Reglas de la mesa',
    decks: 'Barajas',
    pen: 'Penetración (qué tan profunda está la carta de corte)',
    dealer: 'Crupier con 17 blando',
    payout: 'El blackjack paga',
    das: 'Doblar después de dividir',
    surrender: 'Rendirse tardío',
    table: 'Mesa',
    headsUp: 'Mano a mano',
    full: 'Mesa llena',
    spread: 'Rango de apuestas',
    spreadHint: 'Unidades que apuestas en cada conteo real.',
    presetApp: '1–8 (app)',
    preset12: '1–12',
    presetCons: '1–4',
    presetFlat: 'Fija',
    tcRow: (tc: string) => `Conteo real ${tc}`,
    wong: 'Salirse (Wong)',
    wongHint: 'No apuestas cuando el conteo real baja de −1.',
    countPlays: 'Jugadas por conteo',
    countPlaysHint: 'Usa los índices (Illustrious 18, Fab 4, seguro en +3). Apagado = solo estrategia básica.',
    money: 'Dinero',
    unit: 'Tamaño de unidad',
    bankroll: 'Banca',
    perHour: 'Rondas por hora',
    simulating: (p: number) => `Simulando zapatos… ${p}%`,
    results: 'Resultados',
    edge: 'Tu ventaja',
    avgBet: 'Apuesta promedio',
    per100: 'Ganancia por 100 manos',
    perHourWin: 'Ganancia por hora',
    sdHour: 'Altibajos (1 DE) por hora',
    n0: 'N0 (manos)',
    ror: 'Riesgo de quiebra',
    need5: 'Banca para 5% de riesgo',
    need1: 'Banca para 1% de riesgo',
    houseEdge: (he: string) => `Ventaja de la casa sin contar, con estas reglas: ${he}`,
    played: (p: string) => `Apuestas en el ${p} de las rondas.`,
    never: 'nunca',
    units: (u: string) => `${u} unidades`,
    chart: 'Qué tan seguido sale cada conteo real',
    warnTitle: 'Cuidado',
    warn: {
      sixFive: 'El blackjack 6:5 cuesta cerca de 1.4%, más de lo que un rango típico puede recuperar. Busca mesas 3:2.',
      losing: 'Este juego y este rango pierden dinero en promedio. Contar no arregla malas reglas ni un rango muy chico.',
      ror: 'Tu riesgo de quiebra pasa del 10%. Usa unidades más chicas o trae una banca más grande.',
      spread: 'Un rango mayor a 1–10 en un juego de zapato es del tipo que los casinos notan y limitan.',
      shallow: 'Penetración baja: la carta de corte está tan arriba que los conteos buenos salen poco.',
    } as Record<SimWarning, string>,
    rorNote: 'El riesgo de quiebra usa la fórmula estándar e^(−2·EV·banca / varianza): la probabilidad a largo plazo de perder esta banca si nunca le agregas dinero ni cambias el tamaño de tus apuestas.',
    method:
      'Cómo funciona: repartimos miles de zapatos reales con tus barajas, penetración y jugadores para ver qué tan seguido sale cada conteo real. La ventaja en cada conteo sale de las reglas más cerca de 0.5% por cada punto de conteo real (más en conteos altos con jugadas por conteo), medido con el propio motor de juego de esta app; la varianza de cada mano es de unas 1.3 unidades al cuadrado. Fuentes: Griffin, Wong, Schlesinger.',
    disclaimer: 'Estimaciones solo para aprender. Esta app usa dinero de juego: aquí no se gana ni se pierde dinero real.',
  },
});

const DECKS = [1, 2, 4, 6, 8];
const PENS = [0.65, 0.7, 0.75, 0.8, 0.85];
const UNITS = [5, 10, 15, 25, 50, 100, 200, 500];
const BANKROLLS = [500, 1000, 2000, 3000, 5000, 7500, 10000, 15000, 20000, 30000, 50000, 75000, 100000, 200000];
const HANDS = [30, 40, 50, 60, 70, 80, 90, 100, 120, 150, 200];
const RAMP_UNITS = Array.from({ length: 21 }, (_, i) => i);
const TC_ROWS = ['≤ +1', '+2', '+3', '+4', '+5+'];
const FULL_TABLE = 7;

const presetOf = (ramp: BetRamp): RampPreset | null =>
  (Object.keys(RAMP_PRESETS) as RampPreset[]).find((k) => RAMP_PRESETS[k].every((v, i) => v === ramp[i])) ?? null;

export default function SimulatorScreen() {
  const { settings, lang } = usePrefs();
  const { good, bad } = useOutcomeColors();
  const [rules, setRules] = useState(() => ({
    ...settings.rules,
    decks: DECKS.includes(settings.rules.decks) ? settings.rules.decks : 6,
    penetration: PENS.reduce((a, b) => (Math.abs(b - settings.rules.penetration) < Math.abs(a - settings.rules.penetration) ? b : a)),
  }));
  const [ramp, setRamp] = useState<BetRamp>(RAMP_PRESETS.app);
  const [unit, setUnit] = useState(25);
  const [bankroll, setBankroll] = useState(10000);
  const [players, setPlayers] = useState(1);
  const [handsPerHour, setHandsPerHour] = useState(100);
  const [wongOut, setWongOut] = useState(false);
  const [countPlays, setCountPlays] = useState(true);

  // The true-count distribution depends only on decks, penetration and players; it's cached.
  const key = `${rules.decks}|${rules.penetration}|${players}`;
  const [sim, setSim] = useState<{ key: string; dist: TcDistribution | null; progress: number }>({ key: '', dist: null, progress: 0 });
  const dist = cachedTrueCounts(rules.decks, rules.penetration, players) ?? (sim.key === key ? sim.dist : null);
  const progress = sim.key === key ? sim.progress : 0;

  useEffect(() => {
    if (cachedTrueCounts(rules.decks, rules.penetration, players)) return;
    let cancelled = false;
    simulateTrueCountsAsync(
      rules.decks,
      rules.penetration,
      players,
      (p) => !cancelled && setSim({ key, dist: null, progress: p }),
      () => cancelled,
    ).then((d) => {
      if (!cancelled && d) setSim({ key, dist: d, progress: 1 });
    });
    return () => {
      cancelled = true;
    };
  }, [key, rules.decks, rules.penetration, players]);

  const input: SimInputs = useMemo(
    () => ({ rules, ramp, unit, bankroll, handsPerHour, players, wongOut, countPlays }),
    [rules, ramp, unit, bankroll, handsPerHour, players, wongOut, countPlays],
  );
  const result = useMemo(() => (dist ? analyze(input, dist) : null), [input, dist]);
  // `lang` is a dependency so the text follows a language change.
  const text = useMemo(
    () => (result ? { lines: describe(input, result), warns: warnings(input, result) } : null),
    [input, result, lang], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const setRule = (patch: Partial<typeof rules>) => setRules((r) => ({ ...r, ...patch }));
  const setTable = (n: number) => {
    setPlayers(n);
    setHandsPerHour(n === 1 ? 100 : 60);
  };
  const setRampAt = (i: number, v: number) =>
    setRamp((r) => {
      const next = [...r] as BetRamp;
      next[i] = i === 0 ? Math.max(1, v) : v;
      return next;
    });
  const preset = presetOf(ramp);

  return (
    <Screen>
      <P muted>{T.intro}</P>

      <H2>{T.rules}</H2>
      <Panel>
        <Label>{T.decks}</Label>
        <Segmented options={DECKS.map((d) => ({ label: String(d), value: d }))} value={rules.decks} onChange={(decks) => setRule({ decks })} />
        <Label>{T.pen}</Label>
        <Segmented
          options={PENS.map((p) => ({ label: `${Math.round(p * 100)}%`, value: p }))}
          value={rules.penetration}
          onChange={(penetration) => setRule({ penetration })}
        />
        <Label>{T.dealer}</Label>
        <Segmented
          options={[
            { label: 'S17', value: 'S17' },
            { label: 'H17', value: 'H17' },
          ]}
          value={rules.dealerHitsSoft17 ? 'H17' : 'S17'}
          onChange={(v) => setRule({ dealerHitsSoft17: v === 'H17' })}
        />
        <Label>{T.payout}</Label>
        <Segmented
          options={[
            { label: '3:2', value: 1.5 },
            { label: '6:5', value: 1.2 },
          ]}
          value={rules.blackjackPayout < 1.5 ? 1.2 : 1.5}
          onChange={(blackjackPayout) => setRule({ blackjackPayout })}
        />
        <ToggleRow label={T.das} value={rules.doubleAfterSplit} onChange={(doubleAfterSplit) => setRule({ doubleAfterSplit })} />
        <ToggleRow label={T.surrender} value={rules.lateSurrender} onChange={(lateSurrender) => setRule({ lateSurrender })} />
        <Label>{T.table}</Label>
        <Segmented
          options={[
            { label: T.headsUp, value: 1 },
            { label: T.full, value: FULL_TABLE },
          ]}
          value={players}
          onChange={setTable}
        />
      </Panel>

      <H2>{T.spread}</H2>
      <Panel>
        <Segmented<RampPreset | 'custom'>
          options={[
            { label: T.presetApp, value: 'app' },
            { label: T.preset12, value: 'oneTwelve' },
            { label: T.presetCons, value: 'conservative' },
            { label: T.presetFlat, value: 'flat' },
          ]}
          value={preset ?? 'custom'}
          onChange={(p) => p !== 'custom' && setRamp(RAMP_PRESETS[p])}
        />
        <P muted style={styles.hint}>
          {T.spreadHint}
        </P>
        {TC_ROWS.map((tc, i) => (
          <Stepper key={tc} label={T.tcRow(tc)} value={ramp[i]} values={i === 0 ? RAMP_UNITS.slice(1) : RAMP_UNITS} onChange={(v) => setRampAt(i, v)} />
        ))}
        <ToggleRow label={T.wong} hint={T.wongHint} value={wongOut} onChange={setWongOut} />
        <ToggleRow label={T.countPlays} hint={T.countPlaysHint} value={countPlays} onChange={setCountPlays} />
      </Panel>

      <H2>{T.money}</H2>
      <Panel>
        <Stepper label={T.unit} value={unit} values={UNITS} format={formatMoney} onChange={setUnit} />
        <Stepper label={T.bankroll} value={bankroll} values={BANKROLLS} format={formatMoney} onChange={setBankroll} />
        <Stepper label={T.perHour} value={handsPerHour} values={HANDS} onChange={setHandsPerHour} />
      </Panel>

      <H2>{T.results}</H2>
      {!result || !dist || !text ? (
        <Panel style={styles.loading}>
          <ActivityIndicator color={colors.gold} />
          <P muted>{T.simulating(Math.round(progress * 100))}</P>
        </Panel>
      ) : (
        <>
          <Panel>
            <View style={styles.grid}>
              <Stat
                label={T.edge}
                value={`${result.edge > 0 ? '▲ +' : '▼ −'}${Math.abs(result.edge).toFixed(2)}%`}
                color={result.edge > 0 ? good : bad}
              />
              <Stat label={T.avgBet} value={formatMoney(result.avgBet * unit)} sub={T.units(result.avgBet.toFixed(2))} />
              <Stat label={T.per100} value={formatMoney(result.evPer100)} color={result.evPer100 > 0 ? good : bad} />
              <Stat label={T.perHourWin} value={formatMoney(result.evPerHour)} color={result.evPerHour > 0 ? good : bad} />
              <Stat label={T.sdHour} value={`±${formatMoney(result.sdPerHour)}`} />
              <Stat label={T.n0} value={Number.isFinite(result.n0) ? Math.round(result.n0).toLocaleString(lang === 'es' ? 'es-MX' : 'en-US') : '∞'} />
              <Stat label={T.ror} value={formatPercent(result.ror)} color={result.ror > 0.1 ? bad : good} />
              <Stat label={T.need5} value={Number.isFinite(result.bankroll5) ? formatMoney(result.bankroll5) : T.never} />
              <Stat label={T.need1} value={Number.isFinite(result.bankroll1) ? formatMoney(result.bankroll1) : T.never} />
            </View>
            {text.lines.map((l) => (
              <P key={l}>{l}</P>
            ))}
            <P muted style={styles.hint}>
              {T.houseEdge(`${result.houseEdge.toFixed(2)}%`)}
              {wongOut ? ` ${T.played(formatPercent(result.playedShare))}` : ''}
            </P>
          </Panel>

          {text.warns.length > 0 && (
            <Panel style={styles.warnPanel}>
              <Text style={styles.warnTitle}>⚠ {T.warnTitle}</Text>
              {text.warns.map((w) => (
                <P key={w}>• {T.warn[w]}</P>
              ))}
            </Panel>
          )}

          <Panel>
            <Text style={styles.chartTitle}>{T.chart}</Text>
            <TcChart buckets={dist.buckets} houseEdge={result.houseEdge} countPlays={countPlays} sitsOut={(tc) => wongOut && tc < -1} />
          </Panel>
        </>
      )}

      <P muted style={styles.hint}>
        {T.rorNote}
      </P>
      <P muted style={styles.hint}>
        {T.method}
      </P>
      <P muted style={styles.hint}>
        {T.disclaimer}
      </P>
    </Screen>
  );
}

function Label({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}${sub ? `, ${sub}` : ''}`}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
      {sub && <Text style={styles.statSub}>{sub}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.muted, fontSize: 14, fontWeight: '600', marginTop: spacing(0.5) },
  hint: { fontSize: 13, lineHeight: 19 },
  loading: { alignItems: 'center', paddingVertical: spacing(3) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1) },
  stat: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 100,
    backgroundColor: colors.feltDark,
    borderRadius: radius.sm,
    padding: spacing(1),
  },
  statLabel: { color: colors.muted, fontSize: 12 },
  statValue: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 2, fontVariant: ['tabular-nums'] },
  statSub: { color: colors.muted, fontSize: 11 },
  warnPanel: { borderWidth: 1, borderColor: colors.warn },
  warnTitle: { color: colors.warn, fontSize: 16, fontWeight: '800' },
  chartTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
});
