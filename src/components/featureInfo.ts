// Names, icons and screens for the features in the Practice tab and "New" badges.
import { Href } from 'expo-router';

import { SYSTEM_NAME, getCountingSystem } from '../engine/counting';
import { Feature } from '../engine/unlocks';
import { localized } from '../i18n/lang';

type Info = { title: string; body: string };

const T = localized<Record<Exclude<Feature, 'tableCount'>, Info> & { countBody: (system: string) => string }>({
  en: {
    lessons: { title: 'Lessons', body: 'From the rules to card counting, ten short lessons' },
    tables: { title: 'Casino Floor', body: 'Play with a coach and win chips' },
    academy: { title: 'Counting Academy', body: 'Learn the count your way: see it, hear it, tap it, chunk it or read it' },
    strategyDrill: { title: 'Basic Strategy', body: 'Random hands: choose the best play and see why' },
    countDrill: { title: 'Running Count', body: '' },
    trueCountDrill: { title: 'True Count', body: 'Convert the running count using the decks left' },
    decksDrill: { title: 'Deck Estimation', body: 'Read the discard tray and judge the decks left' },
    deviations: { title: 'Count Plays', body: 'The Illustrious 18 and Fab 4, as flash cards that come back until you know them' },
    leaks: { title: 'Your Leaks', body: 'The decisions you miss most, and a drill aimed at them' },
    exam: { title: 'Casino Conditions', body: 'The final exam: a full shoe with no help on screen' },
    chart: { title: 'Strategy Chart', body: 'The best play for every hand, for your rules' },
    simulator: { title: 'Bankroll Simulator', body: 'What a bet spread is worth, and the risk of going broke' },
    ready: { title: 'Road to the Casino', body: 'Your casino-ready score and what to practice next' },
    progress: { title: 'Your Progress', body: 'Accuracy and speed over time' },
    countBody: (system: string) => `Cards flash by: keep the ${system} count`,
  },
  es: {
    lessons: { title: 'Lecciones', body: 'De las reglas a contar cartas, en diez lecciones cortas' },
    tables: { title: 'Sala del casino', body: 'Juega con un coach y gana fichas' },
    academy: { title: 'Academia de conteo', body: 'Aprende el conteo a tu manera: míralo, escúchalo, tócalo, agrúpalo o léelo' },
    strategyDrill: { title: 'Estrategia básica', body: 'Manos al azar: elige la mejor jugada y descubre por qué' },
    countDrill: { title: 'Conteo continuo', body: '' },
    trueCountDrill: { title: 'Conteo real', body: 'Convierte el conteo continuo según las barajas que quedan' },
    decksDrill: { title: 'Estimar barajas', body: 'Mira la bandeja de descartes y calcula las barajas que quedan' },
    deviations: { title: 'Jugadas por conteo', body: 'Las Ilustres 18 y las Fab 4, en tarjetas que vuelven hasta que te las sepas' },
    leaks: { title: 'Tus fugas', body: 'Las decisiones que más fallas y un ejercicio enfocado en ellas' },
    exam: { title: 'Condiciones de casino', body: 'El examen final: un zapato completo sin ayudas en pantalla' },
    chart: { title: 'Tabla de estrategia', body: 'La mejor jugada para cada mano, con tus reglas' },
    simulator: { title: 'Simulador de banca', body: 'Cuánto vale un rango de apuestas y el riesgo de quiebra' },
    ready: { title: 'Camino al casino', body: 'Tu puntaje para el casino y qué practicar después' },
    progress: { title: 'Tu progreso', body: 'Precisión y velocidad a lo largo del tiempo' },
    countBody: (system: string) => `Las cartas pasan rápido: lleva el conteo ${system}`,
  },
});

const ROUTES: Record<Exclude<Feature, 'tableCount'>, { href: Href; icon: string }> = {
  lessons: { href: '/learn', icon: '📘' },
  tables: { href: '/tables', icon: '🃏' },
  academy: { href: '/academy', icon: '🧠' },
  strategyDrill: { href: '/drills/strategy', icon: '🎯' },
  countDrill: { href: '/drills/count', icon: '🔢' },
  trueCountDrill: { href: '/drills/true-count', icon: '➗' },
  decksDrill: { href: '/drills/decks', icon: '🗂️' },
  deviations: { href: '/drills/deviations', icon: '📇' },
  leaks: { href: '/leaks', icon: '🔍' },
  exam: { href: '/exam', icon: '🎓' },
  chart: { href: '/chart', icon: '📊' },
  simulator: { href: '/simulator', icon: '🧮' },
  ready: { href: '/ready', icon: '🏆' },
  progress: { href: '/progress', icon: '📈' },
};

export type ListedFeature = Exclude<Feature, 'tableCount'>;

export function featureInfo(f: ListedFeature): Info & { href: Href; icon: string } {
  const info = T[f];
  const body = f === 'countDrill' ? T.countBody(SYSTEM_NAME[getCountingSystem()]) : info.body;
  return { ...info, body, ...ROUTES[f] };
}
