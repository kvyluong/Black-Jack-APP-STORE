import { useEffect, useState } from 'react';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert, Linking, Text } from 'react-native';

import { privacyOptionsRequired, showPrivacyOptions } from '../ads/init';
import { Button, H2, P, Panel, Screen, Segmented, ToggleRow } from '../components/ui';
import { useRemoveAds } from '../purchases/RemoveAds';
import { COUNTING_SYSTEMS, CountingSystem, SYSTEM_NAME } from '../engine/counting';
import { LANGUAGE_NAME, LanguageSetting, localized } from '../i18n/lang';
import { useSettings } from '../state/settings';
import { colors } from '../theme';

const T = localized({
  en: {
    signals: 'Hand signals',
    signalsHint: 'Play like at a real table: tap the felt to hit, swipe sideways to stand. The buttons stay for doubles, splits and surrender.',
    system: 'Counting system',
    systemHint: 'Hi-Lo is the best place to start. KO needs no true count. Hi-Opt I and Omega II are for experienced counters. Count plays use Hi-Lo numbers.',
    resetTitle: 'Reset progress?',
    resetBody: 'This clears your stats, levels, unlocked tables, lesson progress and chips. You start again with 1,000 chips.',
    cancel: 'Cancel',
    reset: 'Reset',
    coaching: 'Coaching',
    showHints: 'Show hints',
    showHintsHint: 'Highlight the best play before you act',
    explain: 'Explain mistakes',
    explainHint: 'After a wrong play, show the correct one and why',
    showCount: 'Show the count',
    showCountHint: 'Display running count, decks left and true count at the table',
    quizzes: 'Count pop quizzes',
    quizzesHint: 'Sometimes ask for the running count between hands',
    deviations: 'Count-based advice',
    deviationsHint: 'Coach uses Hi-Lo index plays and insurance at +3',
    sound: 'Sound effects',
    soundHint: "Card, chip and win/lose sounds (follows your phone's silent switch)",
    haptics: 'Haptics',
    hapticsHint: 'A light tap as your cards land, a buzz when you win',
    effects: 'Big effects',
    effectsHint: 'Screen shake, chip bursts and score pop-ups',
    accessibility: 'Accessibility',
    colorblind: 'Color-blind mode',
    colorblindHint: 'Blue and orange instead of green and red. Count tags always show ▲ ● ▼ too.',
    replayTour: 'Replay the welcome tour',
    table: 'The table',
    handsYouPlay: 'Hands you play',
    oneHand: '1 hand',
    twoHands: '2 hands',
    others: 'Other players',
    othersHint: 'Players sit down and leave like a real casino table. Their cards count too.',
    rules: 'Table rules',
    decks: 'Decks',
    bjPays: 'Blackjack pays',
    h17: 'Dealer hits soft 17',
    das: 'Double after split',
    ls: 'Late surrender',
    rulesNote: 'The strategy chart and coach are tuned for multi-deck games. Changing rules starts a new shoe.',
    removeAds: 'Remove ads',
    adsRemoved: '✓ Ads removed. Thanks for supporting Blackjack Coach!',
    bringBack: 'Bring ads back (development only)',
    removeAdsInfo:
      'A one-time purchase that removes the banner and the ads between hands, on every device signed in to your store account. The optional bonus-chip videos stay, since you choose when to watch those.',
    opening: 'Opening the store…',
    removeAdsSimulated: 'Remove ads (simulated in development)',
    appsOnly: 'Available in the iPhone and Android apps.',
    checking: 'Checking…',
    restore: 'Restore purchase',
    data: 'Data',
    privacy: 'Ad privacy choices',
    resetButton: 'Reset progress and chips',
    privacyPolicy: 'Privacy policy',
    about: 'About',
    aboutText:
      'Blackjack Coach is a training tool for entertainment and education. It uses play money only and offers no real-money gambling or prizes. Card counting is legal, but casinos may refuse service to players they suspect of counting. If gambling stops being fun, get help: in the US call 1-800-GAMBLER.',
  },
  es: {
    signals: 'Señas con la mano',
    signalsHint: 'Juega como en una mesa real: toca el paño para pedir y desliza de lado para plantarte. Los botones siguen ahí para doblar, dividir y rendirte.',
    system: 'Sistema de conteo',
    systemHint: 'Hi-Lo es el mejor para empezar. KO no necesita conteo real. Hi-Opt I y Omega II son para contadores con experiencia. Las jugadas por conteo usan los números de Hi-Lo.',
    resetTitle: '¿Reiniciar el progreso?',
    resetBody:
      'Esto borra tus estadísticas, niveles, mesas desbloqueadas, progreso de lecciones y fichas. Empiezas de nuevo con 1,000 fichas.',
    cancel: 'Cancelar',
    reset: 'Reiniciar',
    coaching: 'Coach',
    showHints: 'Mostrar pistas',
    showHintsHint: 'Resalta la mejor jugada antes de que actúes',
    explain: 'Explicar errores',
    explainHint: 'Tras una jugada incorrecta, muestra la correcta y por qué',
    showCount: 'Mostrar el conteo',
    showCountHint: 'Muestra el conteo continuo, las barajas restantes y el conteo real en la mesa',
    quizzes: 'Preguntas sorpresa de conteo',
    quizzesHint: 'A veces te pregunta el conteo continuo entre manos',
    deviations: 'Consejos según el conteo',
    deviationsHint: 'El coach usa jugadas por conteo Hi-Lo y el seguro a +3',
    sound: 'Efectos de sonido',
    soundHint: 'Sonidos de cartas, fichas y de ganar/perder (respeta el modo silencio de tu teléfono)',
    haptics: 'Vibración',
    hapticsHint: 'Un toque suave al caer tus cartas y una vibración cuando ganas',
    effects: 'Efectos grandes',
    effectsHint: 'Sacudidas de pantalla, explosiones de fichas y puntos emergentes',
    accessibility: 'Accesibilidad',
    colorblind: 'Modo daltónico',
    colorblindHint: 'Azul y naranja en lugar de verde y rojo. Las etiquetas del conteo siempre muestran ▲ ● ▼ también.',
    replayTour: 'Repetir el tour de bienvenida',
    table: 'La mesa',
    handsYouPlay: 'Manos que juegas',
    oneHand: '1 mano',
    twoHands: '2 manos',
    others: 'Otros jugadores',
    othersHint: 'Los jugadores se sientan y se van como en una mesa de casino real. Sus cartas también cuentan.',
    rules: 'Reglas de la mesa',
    decks: 'Barajas',
    bjPays: 'El blackjack paga',
    h17: 'El crupier pide con 17 blando',
    das: 'Doblar después de dividir',
    ls: 'Rendición tardía',
    rulesNote: 'La tabla de estrategia y el coach están pensados para juegos de varias barajas. Cambiar las reglas inicia un zapato nuevo.',
    removeAds: 'Quitar anuncios',
    adsRemoved: '✓ Anuncios quitados. ¡Gracias por apoyar a Blackjack Coach!',
    bringBack: 'Volver a mostrar anuncios (solo desarrollo)',
    removeAdsInfo:
      'Una compra única que quita el banner y los anuncios entre manos, en todos los dispositivos con tu cuenta de la tienda. Los videos opcionales de fichas extra se quedan, ya que tú eliges cuándo verlos.',
    opening: 'Abriendo la tienda…',
    removeAdsSimulated: 'Quitar anuncios (simulado en desarrollo)',
    appsOnly: 'Disponible en las apps de iPhone y Android.',
    checking: 'Verificando…',
    restore: 'Restaurar compra',
    data: 'Datos',
    privacy: 'Opciones de privacidad de anuncios',
    resetButton: 'Reiniciar progreso y fichas',
    privacyPolicy: 'Política de privacidad',
    about: 'Acerca de',
    aboutText:
      'Blackjack Coach es una herramienta de entrenamiento para entretenimiento y aprendizaje. Usa solo dinero de juego y no ofrece apuestas con dinero real ni premios. Contar cartas es legal, pero los casinos pueden negarse a atender a quienes sospechen que cuentan. Si apostar deja de ser divertido, busca ayuda: en EE. UU. llama al 1-800-GAMBLER.',
  },
});

/** The website (app.json `extra.website`) hosts the privacy policy in both languages. */
const website = (Constants.expoConfig?.extra?.website as string | undefined)?.replace(/\/$/, '');
const privacyUrl = (base: string, lang: string) => `${base}/${lang === 'es' ? 'es/privacidad.html' : 'privacy.html'}`;

export default function SettingsScreen() {
  const { lang, settings, updateSettings, updateStats, updateRules, resetProgress } = useSettings();
  const { rules } = settings;
  const [showPrivacy, setShowPrivacy] = useState(false);
  const removeAds = useRemoveAds();

  useEffect(() => {
    privacyOptionsRequired().then(setShowPrivacy);
  }, []);

  const confirmReset = () =>
    Alert.alert(T.resetTitle, T.resetBody, [
      { text: T.cancel, style: 'cancel' },
      { text: T.reset, style: 'destructive', onPress: resetProgress },
    ]);

  return (
    <Screen>
      <H2>Language · Idioma</H2>
      <Panel>
        <Segmented<LanguageSetting>
          options={[
            { label: 'System · Sistema', value: 'system' },
            { label: LANGUAGE_NAME.en, value: 'en' },
            { label: LANGUAGE_NAME.es, value: 'es' },
          ]}
          value={settings.language}
          onChange={(v) => updateSettings({ language: v })}
        />
      </Panel>

      <H2>{T.coaching}</H2>
      <Panel>
        <ToggleRow
          label={T.showHints}
          hint={T.showHintsHint}
          value={settings.showHints}
          onChange={(v) => updateSettings({ showHints: v })}
        />
        <ToggleRow
          label={T.explain}
          hint={T.explainHint}
          value={settings.correctMistakes}
          onChange={(v) => updateSettings({ correctMistakes: v })}
        />
        <ToggleRow
          label={T.showCount}
          hint={T.showCountHint}
          value={settings.showCount}
          onChange={(v) => updateSettings({ showCount: v })}
        />
        <ToggleRow
          label={T.quizzes}
          hint={T.quizzesHint}
          value={settings.countQuizzes}
          onChange={(v) => updateSettings({ countQuizzes: v })}
        />
        <ToggleRow
          label={T.deviations}
          hint={T.deviationsHint}
          value={settings.useDeviations}
          onChange={(v) => updateSettings({ useDeviations: v })}
        />
        <ToggleRow
          label={T.sound}
          hint={T.soundHint}
          value={settings.soundEffects}
          onChange={(v) => updateSettings({ soundEffects: v })}
        />
        <ToggleRow
          label={T.haptics}
          hint={T.hapticsHint}
          value={settings.haptics}
          onChange={(v) => updateSettings({ haptics: v })}
        />
        <ToggleRow
          label={T.effects}
          hint={T.effectsHint}
          value={settings.bigEffects}
          onChange={(v) => updateSettings({ bigEffects: v })}
        />
      </Panel>

      <H2>{T.accessibility}</H2>
      <Panel>
        <ToggleRow
          label={T.colorblind}
          hint={T.colorblindHint}
          value={settings.colorblind}
          onChange={(v) => updateSettings({ colorblind: v })}
        />
        <Button
          title={T.replayTour}
          variant="secondary"
          onPress={() => {
            updateStats((s) => ({ ...s, onboarded: false }));
            router.push('/welcome');
          }}
        />
      </Panel>

      <H2>{T.table}</H2>
      <Panel>
        <Text style={{ color: colors.text, fontWeight: '600' }}>{T.handsYouPlay}</Text>
        <Segmented
          options={[
            { label: T.oneHand, value: 1 },
            { label: T.twoHands, value: 2 },
          ]}
          value={settings.yourHands}
          onChange={(v) => updateSettings({ yourHands: v })}
        />
        <ToggleRow
          label={T.others}
          hint={T.othersHint}
          value={settings.otherPlayers}
          onChange={(v) => updateSettings({ otherPlayers: v })}
        />
        <ToggleRow
          label={T.signals}
          hint={T.signalsHint}
          value={settings.handSignals}
          onChange={(v) => updateSettings({ handSignals: v })}
        />
        <Text style={{ color: colors.text, fontWeight: '600' }}>{T.system}</Text>
        <Segmented<CountingSystem>
          options={COUNTING_SYSTEMS.map((c) => ({ label: SYSTEM_NAME[c], value: c }))}
          value={settings.countingSystem}
          onChange={(v) => updateSettings({ countingSystem: v })}
        />
        <P muted style={{ fontSize: 13 }}>{T.systemHint}</P>
      </Panel>

      <H2>{T.rules}</H2>
      <Panel>
        <Text style={{ color: colors.text, fontWeight: '600' }}>{T.decks}</Text>
        <Segmented
          options={[1, 2, 6, 8].map((d) => ({ label: String(d), value: d }))}
          value={rules.decks}
          onChange={(d) => updateRules({ decks: d })}
        />
        <Text style={{ color: colors.text, fontWeight: '600' }}>{T.bjPays}</Text>
        <Segmented
          options={[
            { label: '3:2', value: 1.5 },
            { label: '6:5', value: 1.2 },
          ]}
          value={rules.blackjackPayout}
          onChange={(v) => updateRules({ blackjackPayout: v })}
        />
        <ToggleRow label={T.h17} value={rules.dealerHitsSoft17} onChange={(v) => updateRules({ dealerHitsSoft17: v })} />
        <ToggleRow label={T.das} value={rules.doubleAfterSplit} onChange={(v) => updateRules({ doubleAfterSplit: v })} />
        <ToggleRow label={T.ls} value={rules.lateSurrender} onChange={(v) => updateRules({ lateSurrender: v })} />
        <P muted style={{ fontSize: 13 }}>
          {T.rulesNote}
        </P>
      </Panel>

      <H2>{T.removeAds}</H2>
      <Panel>
        {settings.adsRemoved ? (
          <>
            <P>{T.adsRemoved}</P>
            {__DEV__ && !removeAds.available && (
              <Button title={T.bringBack} variant="ghost" onPress={() => updateSettings({ adsRemoved: false })} />
            )}
          </>
        ) : (
          <>
            <P muted style={{ fontSize: 14 }}>
              {T.removeAdsInfo}
            </P>
            {removeAds.available || __DEV__ ? (
              <Button
                title={
                  removeAds.status === 'buying'
                    ? T.opening
                    : removeAds.available
                      ? `${T.removeAds}${removeAds.price ? ` · ${removeAds.price}` : ''}`
                      : T.removeAdsSimulated
                }
                disabled={removeAds.status !== 'idle'}
                onPress={removeAds.buy}
              />
            ) : (
              <P muted style={{ fontSize: 14 }}>{T.appsOnly}</P>
            )}
          </>
        )}
        {removeAds.available && !settings.adsRemoved && (
          <Button
            title={removeAds.status === 'restoring' ? T.checking : T.restore}
            variant="ghost"
            disabled={removeAds.status !== 'idle'}
            onPress={removeAds.restore}
          />
        )}
        {removeAds.message && <P muted style={{ fontSize: 14 }}>{removeAds.message}</P>}
      </Panel>

      <H2>{T.data}</H2>
      <Panel>
        {showPrivacy && <Button title={T.privacy} variant="secondary" onPress={showPrivacyOptions} />}
        <Button title={T.resetButton} variant="danger" onPress={confirmReset} />
      </Panel>

      <H2>{T.about}</H2>
      <P muted>
        {T.aboutText}
      </P>
      {website && (
        <Text style={{ color: colors.gold, textDecorationLine: 'underline' }} accessibilityRole="link" onPress={() => Linking.openURL(privacyUrl(website, lang))}>
          {T.privacyPolicy}
        </Text>
      )}
    </Screen>
  );
}
