import { ReactNode, useState } from 'react';
import { LayoutChangeEvent, StyleProp, View, ViewStyle } from 'react-native';

interface Props {
  /**
   * While true (cards dealt, no splits), the content's height is taken as the room this
   * area normally has. Anything taller later, like a seat split into four hands, zooms out
   * to fit that room instead of growing the table off the screen.
   */
  baseline: boolean;
  /** The smallest zoom. Past it, the area grows a little rather than shrink cards to specks. */
  min?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/**
 * Zooms its content out, from the top center, when it gets taller than its usual room.
 * The view tree stays the same at every zoom, so cards already on the table don't remount
 * (and deal in again) when the zoom changes.
 */
export function ZoomToFit({ baseline, min = 0.5, style, children }: Props) {
  const [room, setRoom] = useState(0);
  const [natural, setNatural] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => {
    // Layout ignores transforms, so this is the unzoomed height.
    const h = e.nativeEvent.layout.height;
    if (baseline) setRoom((r) => Math.max(r, h));
    setNatural(h);
  };
  const scale = room > 0 && natural > room ? Math.max(min, room / natural) : 1;
  const zoomed = scale < 1;
  return (
    <View style={zoomed ? { height: natural * scale } : undefined}>
      <View
        onLayout={onLayout}
        style={[
          style,
          zoomed && { position: 'absolute', top: 0, left: 0, right: 0, transform: [{ scale }], transformOrigin: 'top' },
        ]}
      >
        {children}
      </View>
    </View>
  );
}
