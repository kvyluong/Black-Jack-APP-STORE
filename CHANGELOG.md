# Changelog

## 1.0.3

**App Store "What's New" (English):**

```
• A cleaner top bar with a felt back button that matches the table
• Small polish and fixes
```

**App Store "Novedades" (Spanish, Mexico):**

```
• Una barra superior más limpia, con un botón de volver a juego con la mesa
• Pequeñas mejoras y correcciones
```

### Developer notes
- Own top bar: round felt back button with a gold edge (1f492a2)
- Listing (ASO audit, docs/ASO_AUDIT_2026-11.md): subtitle `Basic Strategy & Card Counting`; new keywords without casino, vegas or odds. Spanish keywords drop casino and simulador; Spanish promo text drops "examen de casino".

## 1.0.2

**App Store "What's New" (English):**

```
Practice that comes back to you:

• Daily review: the hands you miss come back the next day, then 3 and 7 days after you get them right
• One streak: finishing your Academy workout now keeps your daily streak too
• Your week: a quick look at last week's hands, accuracy and best deck time when a new week starts
• Smarter reminders that point to your next lesson or the spot you miss most (still one a day at most)
• Welcome back: after a week away, a 5-question warm-up and a button to pick up where you left off
```

**App Store "Novedades" (Spanish, Mexico):**

```
Práctica que vuelve a ti:

• Repaso diario: las manos que fallas vuelven al día siguiente, y luego 3 y 7 días después de acertarlas
• Una sola racha: terminar tu entrenamiento de la Academia ahora también mantiene tu racha diaria
• Tu semana: un vistazo a las manos, la precisión y el mejor tiempo con baraja de la semana pasada al empezar una nueva
• Recordatorios más útiles que te señalan tu siguiente lección o la jugada que más fallas (como máximo uno al día)
• Al volver: tras una semana sin practicar, un calentamiento de 5 preguntas y un botón para seguir donde lo dejaste
```

### Developer notes
- One streak: an Academy workout keeps the daily goal streak; the Academy shows workouts this week (d2f79ce)
- Spaced review of missed spots, engine/leakReview, new daily goal and /drills/review (f1af565)
- Weekly summary card on Home (ec19040)
- Reminder text from nextStep() and the top leak, one line per queued reminder (0163596)
- Welcome-back checkpoint and /warmup after 7+ days away (6095bdd)
- New save fields are all optional (academy.workoutDays, leakReview, weeklySeen, goals.returned); old saves load unchanged
- No native changes or new dependencies

## 1.0.1

**App Store "What's New" (English):**

```
A fresh new look and a few fixes:

• Redesigned table: a real table shape with a wood rail, new cards, and color-coded Hit, Stand, Double and Split buttons
• New Home screen: your next step up front, plus a one-tap Play a hand
• Cleaner Practice and Me tabs: lessons and drills grouped by color, and your level shown as a gold chip
• Daily reminder: pick the time that suits you in Settings
• Clearer streak and streak-freeze wording
• Coach fix: 15 vs Ace now uses the correct surrender index when the dealer hits soft 17
• Round results are now correct after taking insurance
• Better VoiceOver labels
```

**App Store "Novedades" (Spanish, Mexico):**

```
Un nuevo diseño y algunas correcciones:

• Mesa rediseñada: forma de mesa real con borde de madera, cartas nuevas y botones de colores para Pedir, Plantarse, Doblar y Dividir
• Nueva pantalla de inicio: tu siguiente paso primero, y Jugar una mano con un toque
• Pestañas de Práctica y Perfil más claras: lecciones y ejercicios agrupados por color, y tu nivel como una ficha dorada
• Recordatorio diario: elige la hora en Ajustes
• Textos más claros sobre la racha y el protector de racha
• Corrección del coach: 15 contra As usa el índice de rendición correcto cuando el crupier pide con 17 suave
• El resultado de la ronda ahora es correcto después de tomar seguro
• Mejores etiquetas de VoiceOver
```

### Developer notes
- Table, Home, Practice and Me screen redesigns (34ea2b4, c95fb4a, 9205a44, 86e3fc9)
- Reminder time picker and blocked-notifications path (2880be8)
- H17 15 vs A surrender index; round banner ignores the insurance side stake (11ce1b9)
- Goals card says "No streak yet" instead of "0-day streak" (1aa5552)
- Android: blocked unused permissions (1cc650a)

## 1.0.0 (build 13)
First App Store release (Nov 12, 2026).
