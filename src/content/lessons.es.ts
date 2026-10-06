import type { Lesson } from './lessons';

// Spanish lessons. Same ids, cards, answers, hrefs and order as LESSONS in ./lessons.ts
// (quiz `answer` indexes depend on the option order). Only the text is translated.
export const LESSONS_ES: Lesson[] = [
  {
    id: 'rules',
    unit: 'Basics',
    title: 'Cómo se juega al blackjack',
    summary: 'El objetivo, el valor de las cartas y cómo se desarrolla una ronda.',
    sections: [
      {
        body: 'Juegas contra el crupier, no contra los demás jugadores. El objetivo es terminar con un total más alto que el del crupier sin pasarte de 21. Si te pasas, pierdes en ese mismo momento, aunque después el crupier también se pase.',
      },
      {
        heading: 'Valor de las cartas',
        body: 'Las cartas del 2 al 10 valen su número. La J, la Q y la K valen 10. El As vale 1 u 11, lo que más te convenga.',
        cards: ['7', 'K', 'A'],
      },
      {
        heading: 'Blackjack',
        body: 'Un As más cualquier carta que valga 10 como tus dos primeras cartas es un "blackjack" (o "natural"). Normalmente paga 3 a 2: apuestas $10 y ganas $15. Evita las mesas que pagan 6 a 5; ese pequeño cambio más que triplica la ventaja de la casa.',
        cards: ['A', 'Q'],
      },
      {
        heading: 'Cómo es una ronda',
        body: '1. Haz tu apuesta.\n2. Recibes dos cartas boca arriba. El crupier recibe una boca arriba (la "carta visible") y otra boca abajo (la "carta oculta").\n3. Si el crupier muestra un As o un 10, revisa si tiene blackjack.\n4. Juegas tu mano.\n5. El crupier revela la carta oculta y debe pedir hasta llegar a 17 o más. El crupier no decide nada; las reglas marcan cada jugada.',
      },
    ],
    quiz: [
      {
        question: 'Tienes K y 7. ¿Cuál es tu total?',
        options: ['7', '17', '27'],
        answer: 1,
        explanation: 'Las figuras valen 10, así que K + 7 = 17.',
      },
      {
        question: 'Te pasas con 23 y luego el crupier se pasa con 24. ¿Qué pasa?',
        options: ['Empate', 'Ganas', 'Pierdes'],
        answer: 2,
        explanation: 'Tú juegas primero, así que si te pasas pierdes de inmediato. De ahí sale la ventaja de la casa.',
      },
    ],
    practice: { label: 'Juega unas manos', href: '/play' },
  },
  {
    id: 'soft-hard',
    unit: 'Basics',
    title: 'Manos blandas y duras',
    summary: 'Por qué un As cambia tu forma de jugar.',
    sections: [
      {
        body: 'Una mano con un As que cuenta como 11 es "blanda". No puede pasarse con la siguiente carta, porque el As puede volver a valer 1.',
        cards: ['A', '6'],
      },
      {
        body: 'A + 6 es un "17 blando". Si pides y te sale un 9, el As pasa a valer 1 y tienes un 16 duro. No te pasaste.',
        cards: ['A', '6', '9'],
      },
      {
        heading: 'Manos duras',
        body: 'Cualquier mano sin As, o en la que el As tiene que contar como 1, es "dura". Del 12 al 16 duro son las "manos rígidas": una sola carta puede hacer que te pases, y son las manos más difíciles de jugar bien.',
        cards: ['10', '6'],
      },
    ],
    quiz: [
      {
        question: '¿Cuánto es A + 5 + 10?',
        options: ['16 blando', '16 duro', 'Te pasas (26)'],
        answer: 1,
        explanation: 'Si el As contara como 11 serían 26, así que cuenta como 1: un 16 duro.',
      },
      {
        question: '¿Puede pasarse un 18 blando al pedir una carta?',
        options: ['Sí', 'No'],
        answer: 1,
        explanation: 'El As siempre puede bajar de 11 a 1, así que una sola carta nunca hace que una mano blanda se pase.',
      },
    ],
  },
  {
    id: 'actions',
    unit: 'Basics',
    title: 'Tus opciones',
    summary: 'Pedir, plantarse, doblar, dividir y rendirse.',
    sections: [
      { heading: 'Pedir', body: 'Toma otra carta. Puedes seguir pidiendo hasta que te plantes o te pases.' },
      { heading: 'Plantarse', body: 'Te quedas con tu total y terminas tu turno.' },
      {
        heading: 'Doblar',
        body: 'Duplicas tu apuesta y recibes exactamente una carta más. Solo puedes hacerlo con tus dos primeras cartas. Úsalo cuando tienes buenas probabilidades de ganar, como con 11 contra un 6 del crupier.',
        cards: ['6', '5'],
      },
      {
        heading: 'Dividir',
        body: 'Con una pareja, pones una segunda apuesta y juegas cada carta como una mano aparte. Cada mano recibe una segunda carta.',
        cards: ['8', '8'],
      },
      {
        heading: 'Rendirse',
        body: 'Algunos casinos te dejan abandonar tus dos primeras cartas y recuperar la mitad de tu apuesta. Es la jugada correcta en unas pocas manos que pierden muy a menudo, como 16 contra un 10.',
      },
      {
        heading: 'Seguro',
        body: 'Cuando el crupier muestra un As, puedes apostar la mitad de tu apuesta a que tiene blackjack. Si no cuentas cartas, es una mala apuesta: recházalo siempre. Los contadores de cartas lo toman cuando el conteo es lo bastante alto.',
      },
    ],
    quiz: [
      {
        question: '¿Cuándo puedes doblar?',
        options: ['En cualquier momento', 'Solo con tus dos primeras cartas', 'Solo con una pareja'],
        answer: 1,
        explanation: 'Solo puedes doblar con tus dos primeras cartas (y, en la mayoría de los casinos, en manos divididas).',
      },
      {
        question: '¿Debe tomar el seguro alguien que juega con estrategia básica?',
        options: ['Sí, siempre', 'Solo con una buena mano', 'No, nunca'],
        answer: 2,
        explanation: 'El seguro tiene una gran ventaja para la casa, salvo que sepas que quedan muchos 10, y para eso hay que contar.',
      },
    ],
  },
  {
    id: 'basic-strategy',
    unit: 'Strategy',
    title: 'Estrategia básica: las ideas clave',
    summary: 'La jugada matemáticamente óptima para cada mano, explicada de forma sencilla.',
    sections: [
      {
        body: 'La estrategia básica es la mejor jugada para cada combinación de tu mano y la carta visible del crupier, calculada por computadora. Si la juegas a la perfección, reduce la ventaja de la casa a cerca del 0.5%. Puedes memorizarla a partir de unas pocas ideas sencillas.',
      },
      {
        heading: '1. Supón que la carta oculta es un 10',
        body: 'Cerca de 4 de cada 13 cartas valen 10. Así que, cuando el crupier muestra un 7, piensa "seguramente tiene 17". Si muestra un 10, piensa "seguramente tiene 20".',
      },
      {
        heading: '2. Del 2 al 6 del crupier son "cartas de pasarse"',
        body: 'Con un 4, 5 o 6 a la vista, lo más probable es que el crupier termine con una mano rígida y tenga que pedir. Contra estas cartas, plántate con 12–16 y deja que el crupier se pase. (Contra un 2 o un 3, pide con 12).',
        cards: ['5'],
      },
      {
        heading: '3. Contra 7 hasta el As, pide hasta 17',
        body: 'Lo más probable es que el crupier tenga una mano fuerte. Plantarte con 12–16 suele perder, así que sigue pidiendo hasta llegar a 17.',
        cards: ['10'],
      },
      {
        heading: '4. Dobla cuando tienes la ventaja',
        body: 'Dobla con 11 contra todo menos un As, con 10 contra 2–9 y con 9 contra 3–6. Dobla con manos blandas (como A-7) contra cartas débiles del crupier.',
      },
      {
        heading: '5. Siempre y nunca',
        body: 'Divide siempre los Ases y los 8. Nunca dividas los 10 ni los 5. Nunca tomes el seguro.',
        cards: ['A', 'A'],
      },
    ],
    quiz: [
      {
        question: 'Tienes 14. El crupier muestra un 6. ¿Qué haces?',
        options: ['Pedir', 'Plantarse', 'Doblar'],
        answer: 1,
        explanation: 'El 6 es una carta de pasarse. Plántate y deja que el crupier corra el riesgo.',
      },
      {
        question: 'Tienes 15. El crupier muestra un 9. ¿Qué haces?',
        options: ['Pedir', 'Plantarse', 'Rendirse'],
        answer: 0,
        explanation: 'Lo más probable es que el crupier tenga 19. Plantarte con 15 casi siempre pierde, así que pide.',
      },
      {
        question: 'Tienes 10, 10. El crupier muestra un 6. ¿Qué haces?',
        options: ['Dividir', 'Plantarse', 'Doblar'],
        answer: 1,
        explanation: '20 es una gran mano. Nunca la dividas (salvo que estés contando y el conteo sea muy alto).',
      },
    ],
    practice: { label: 'Practica la estrategia básica', href: '/drills/strategy' },
  },
  {
    id: 'why-counting',
    unit: 'Counting',
    title: 'Por qué funciona contar cartas',
    summary: 'Las cartas altas te ayudan a ti; las bajas, al crupier.',
    sections: [
      {
        body: 'Las cartas que ya salieron no vuelven hasta que se baraja. Así que las cartas que quedan en el zapato cambian a medida que avanza el juego, y tus probabilidades también.',
      },
      {
        heading: 'Cuando quedan muchos 10 y Ases',
        body: '• Te salen más blackjacks, que pagan 3 a 2. Al crupier también, pero él solo gana lo apostado (1 a 1).\n• El crupier se pasa más seguido, porque está obligado a pedir con manos rígidas.\n• Tus dobladas ganan más a menudo.',
        cards: ['10', 'A', 'K'],
      },
      {
        heading: 'Cuando quedan muchas cartas bajas',
        body: 'Las cartas bajas ayudan al crupier a formar manos sin pasarse. El juego se vuelve peor para ti.',
        cards: ['4', '5', '6'],
      },
      {
        heading: 'El plan',
        body: 'Contar cartas sirve para saber si las cartas que quedan tienen muchas altas o muchas bajas. Apuesta poco cuando quedan bajas y más cuando quedan altas. No hace falta memorizar cada carta, y no es ilegal. Solo requiere práctica.',
      },
    ],
    quiz: [
      {
        question: '¿Qué zapato es mejor para el jugador?',
        options: ['Uno con muchas cartas bajas', 'Uno con muchos 10 y Ases', 'Da igual'],
        answer: 1,
        explanation: 'Las cartas altas significan más blackjacks para ti y más veces en que el crupier se pasa.',
      },
    ],
  },
  {
    id: 'hi-lo',
    unit: 'Counting',
    title: 'El conteo Hi-Lo',
    summary: 'El sistema de conteo más popular: +1, 0, −1.',
    sections: [
      {
        body: 'Hi-Lo le da un valor a cada carta. Suma los valores de todas las cartas que ves y obtienes el "conteo continuo".',
      },
      { heading: 'Del 2 al 6: +1', body: 'Que salgan cartas bajas del zapato te favorece.', cards: ['2', '3', '4', '5', '6'], showTags: true },
      { heading: '7, 8, 9: 0', body: 'Cartas neutras. Ignóralas.', cards: ['7', '8', '9'], showTags: true },
      { heading: '10 y Ases: −1', body: 'Que salgan cartas altas del zapato te perjudica.', cards: ['10', 'J', 'Q', 'K', 'A'], showTags: true },
      {
        heading: 'Conteo equilibrado',
        body: 'Hay 5 cartas que suman y 5 que restan en cada palo, así que una baraja completa da exactamente 0. Una gran forma de practicar: cuenta una baraja real de principio a fin y comprueba que terminas en 0.',
      },
    ],
    quiz: [
      {
        question: '¿Qué valor Hi-Lo tiene un 9?',
        options: ['+1', '0', '−1'],
        answer: 1,
        explanation: 'El 7, el 8 y el 9 son neutros.',
      },
      {
        question: 'Ves K, 5, 3, A, 6. ¿Cuál es el conteo continuo?',
        options: ['+1', '0', '+3'],
        answer: 0,
        explanation: 'K −1, 5 +1, 3 +1, A −1, 6 +1. Total: +1.',
      },
    ],
    practice: { label: 'Practica el conteo continuo', href: '/drills/count' },
  },
  {
    id: 'running-count',
    unit: 'Counting',
    title: 'Cómo llevar el conteo continuo',
    summary: 'Trucos para contar rápido y sin errores.',
    sections: [
      {
        heading: 'Cancela parejas',
        body: 'Una carta alta y una baja se anulan. No las sumes una por una. Busca las que se cancelan y cuenta solo lo que sobra.',
        cards: ['K', '5', '9', '4'],
        showTags: true,
      },
      {
        body: 'Arriba: la K y el 5 se cancelan y el 9 vale cero, así que todo el grupo es solo +1 por el 4.',
      },
      {
        heading: 'Cuenta todas las cartas que veas',
        body: 'Incluye las cartas de los demás jugadores, la carta oculta del crupier cuando se voltea y cada carta que se pide. Sigue el conteo de una mano a otra hasta que se baraje, y entonces empieza otra vez desde 0.',
      },
      {
        heading: 'Meta de velocidad',
        body: 'Practica hasta que puedas contar una baraja completa en menos de 30 segundos y terminar en 0. Luego agrega distracciones, como conversar o poner música.',
      },
    ],
    quiz: [
      {
        question: 'El crupier baraja. ¿Cuál es ahora el conteo continuo?',
        options: ['Sigue el conteo anterior', '0', '+1'],
        answer: 1,
        explanation: 'Un zapato nuevo reinicia el conteo a 0.',
      },
    ],
    practice: { label: 'Practica el conteo continuo', href: '/drills/count' },
  },
  {
    id: 'true-count',
    unit: 'Counting',
    title: 'El conteo real',
    summary: 'Cómo ajustar según las barajas que quedan.',
    sections: [
      {
        body: 'Un conteo continuo de +6 es enorme cuando queda una baraja, pero no tanto cuando quedan cinco. El conteo real corrige esto.',
      },
      {
        heading: 'La fórmula',
        body: 'Conteo real = conteo continuo ÷ barajas restantes.\n\nConteo continuo +6 con 3 barajas restantes → conteo real +2.\nConteo continuo +6 con 1.5 barajas restantes → conteo real +4.',
      },
      {
        heading: 'Cómo calcular las barajas restantes',
        body: 'Mira la bandeja de descartes, calcula cuántas barajas se han jugado y réstalo del total. Con una precisión de media baraja es suficiente. En esta app, la mesa muestra las barajas restantes para que practiques el cálculo.',
      },
      {
        heading: 'Redondeo',
        body: 'Para apostar, la mayoría de los contadores redondean el conteo real hacia abajo (+2.7 se vuelve +2). Así eres prudente con tus apuestas.',
      },
    ],
    quiz: [
      {
        question: 'Conteo continuo +8, quedan 4 barajas. ¿Conteo real?',
        options: ['+2', '+4', '+8'],
        answer: 0,
        explanation: '8 ÷ 4 = +2.',
      },
      {
        question: 'Conteo continuo −3, queda 1 baraja. ¿Conteo real?',
        options: ['−1', '−3', '0'],
        answer: 1,
        explanation: '−3 ÷ 1 = −3. Apuesta el mínimo.',
      },
    ],
    practice: { label: 'Practica la conversión al conteo real', href: '/drills/true-count' },
  },
  {
    id: 'betting',
    unit: 'Counting',
    title: 'Cómo apostar con el conteo',
    summary: 'Convierte el conteo en una ventaja.',
    sections: [
      {
        body: 'Cada +1 de conteo real vale cerca de +0.5% a tu favor. En un juego típico empiezas alrededor de −0.5%, así que tienes la ventaja a partir de +1 o +2 aproximadamente.',
      },
      {
        heading: 'Una escala de apuestas sencilla',
        body: 'Conteo real +1 o menos: 1 unidad\nConteo real +2: 2 unidades\nConteo real +3: 4 unidades\nConteo real +4: 6 unidades\nConteo real +5 o más: 8 unidades',
      },
      {
        heading: 'Bankroll',
        body: 'Incluso con ventaja, las rachas son muy fuertes. Los contadores mantienen un bankroll de cientos de unidades de apuesta para no quedarse sin dinero en las rachas perdedoras. Nunca apuestes dinero que no puedas permitirte perder.',
      },
      {
        heading: 'Baño de realidad',
        body: 'Contar cartas es legal, pero los casinos pueden rechazar tus apuestas o pedirte que dejes de jugar. Los saltos de apuesta grandes y evidentes llaman la atención. Usa esta app para aprender la habilidad y las matemáticas.',
      },
    ],
    quiz: [
      {
        question: 'El conteo real es +3. Con la escala de arriba, ¿cuántas unidades apuestas?',
        options: ['1', '4', '8'],
        answer: 1,
        explanation: '+3 → 4 unidades.',
      },
    ],
    practice: { label: 'Juega viendo el conteo', href: '/play' },
  },
  {
    id: 'deviations',
    unit: 'Counting',
    title: 'Seguro y jugadas por conteo',
    summary: 'Cuando el conteo cambia cómo juegas tu mano.',
    sections: [
      {
        heading: 'Seguro a partir de +3',
        body: 'El seguro paga 2 a 1. Se vuelve una buena apuesta cuando más de 1 de cada 3 cartas restantes es un 10. Eso ocurre con un conteo real Hi-Lo de alrededor de +3. Toma el seguro con +3 o más, nunca por debajo.',
      },
      {
        heading: 'Jugadas por conteo',
        body: 'Algunas jugadas de la estrategia básica cambian según el conteo. Cada una tiene un "índice", el conteo real a partir del cual cambias de jugada. Las más importantes:\n\n• 16 contra 10: plántate con 0 o más (pide si es negativo)\n• 15 contra 10: plántate con +4\n• 10,10 contra 5: divide con +5; contra 6: divide con +4\n• 10 contra 10: dobla con +4\n• 12 contra 3: plántate con +2; 12 contra 2: plántate con +3\n• 11 contra A: dobla con +1',
      },
      {
        body: 'Activa "Consejos según el conteo" en Ajustes y el coach usará estas jugadas en la mesa.',
      },
    ],
    quiz: [
      {
        question: 'El crupier muestra un As. El conteo real es +4. ¿Seguro?',
        options: ['Tomarlo', 'Rechazarlo'],
        answer: 0,
        explanation: 'Con +3 o más quedan suficientes 10 para que el seguro sea rentable.',
      },
      {
        question: '16 contra un 10 del crupier, sin rendición, conteo real +1. ¿Jugada?',
        options: ['Pedir', 'Plantarse'],
        answer: 1,
        explanation: 'El índice de 16 contra 10 es 0. Con 0 o más, plántate.',
      },
    ],
    practice: { label: 'Juega con consejos según el conteo', href: '/play' },
  },
];
