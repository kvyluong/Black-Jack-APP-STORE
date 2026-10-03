"""Synthesizes the game's sound effects into assets/sounds/*.wav.

Everything is generated from code, so there are no third-party audio licenses
to track. Re-run after tweaking:  python3 scripts/make-sounds.py
"""
import math
import random
import struct
import wave
from pathlib import Path

RATE = 22050
OUT = Path(__file__).resolve().parent.parent / "assets" / "sounds"
rng = random.Random(21)


def silence(seconds):
    return [0.0] * int(RATE * seconds)


def mix(base, layer, offset=0.0, gain=1.0):
    start = int(offset * RATE)
    if len(base) < start + len(layer):
        base.extend([0.0] * (start + len(layer) - len(base)))
    for i, s in enumerate(layer):
        base[start + i] += s * gain
    return base


def noise_burst(seconds, decay, lowpass=0.5):
    """Filtered white noise with an exponential decay: the 'snap' of a card."""
    out, prev = [], 0.0
    n = int(RATE * seconds)
    for i in range(n):
        prev = prev + lowpass * (rng.uniform(-1, 1) - prev)
        out.append(prev * math.exp(-i / (RATE * decay)))
    return out


def tone(freq, seconds, decay, harmonics=((1, 1.0),), attack=0.004):
    out = []
    n = int(RATE * seconds)
    for i in range(n):
        t = i / RATE
        env = min(1.0, t / attack) * math.exp(-t / decay)
        out.append(env * sum(a * math.sin(2 * math.pi * freq * h * t) for h, a in harmonics))
    return out


def card():
    return noise_burst(0.09, 0.018, lowpass=0.35)


def flip():
    s = noise_burst(0.05, 0.010, lowpass=0.45)
    return mix(s, noise_burst(0.06, 0.014, lowpass=0.3), offset=0.045, gain=0.9)


def chips():
    s = []
    for k, (f, off) in enumerate([(4200, 0.0), (5100, 0.06), (3800, 0.11), (4700, 0.15)]):
        clink = tone(f, 0.12, 0.025, harmonics=((1, 1.0), (2.7, 0.35)))
        mix(s, clink, offset=off, gain=0.35 - k * 0.04)
        mix(s, noise_burst(0.02, 0.004, lowpass=0.8), offset=off, gain=0.25)
    return s


def bell(freq, seconds=0.5, decay=0.18):
    return tone(freq, seconds, decay, harmonics=((1, 1.0), (2, 0.3), (3, 0.12)))


def arpeggio(freqs, spacing, gain=0.32, tail=0.45):
    s = []
    for i, f in enumerate(freqs):
        mix(s, bell(f, tail), offset=i * spacing, gain=gain)
    return s


def win():
    return arpeggio([523.25, 659.25, 783.99], 0.09)


def blackjack():
    s = arpeggio([523.25, 659.25, 783.99, 1046.5], 0.08, gain=0.3, tail=0.6)
    return mix(s, chips(), offset=0.3, gain=0.6)


def lose():
    s = []
    mix(s, tone(311.13, 0.35, 0.16, harmonics=((1, 1.0), (2, 0.2))), gain=0.3)
    mix(s, tone(233.08, 0.45, 0.2, harmonics=((1, 1.0), (2, 0.2))), offset=0.14, gain=0.3)
    return s


def push():
    s = []
    mix(s, bell(587.33, 0.3, 0.1), gain=0.25)
    mix(s, bell(587.33, 0.3, 0.1), offset=0.12, gain=0.2)
    return s


def shuffle():
    """A riffle: a fast train of tiny card snaps that speeds up and fades."""
    s, t = [], 0.0
    while t < 0.55:
        mix(s, noise_burst(0.02, 0.004, lowpass=0.4), offset=t, gain=0.6 * (1 - t / 0.7))
        t += 0.012 + 0.01 * rng.random()
    return mix(s, noise_burst(0.12, 0.03, lowpass=0.25), offset=0.55, gain=0.8)


def bust():
    """A heavy thud: a falling low sine plus a dull noise hit."""
    s, n = [], int(RATE * 0.45)
    for i in range(n):
        t = i / RATE
        f = 140 * math.exp(-t * 4) + 45
        s.append(math.sin(2 * math.pi * f * t) * math.exp(-t / 0.12) * 0.9)
    return mix(s, noise_burst(0.15, 0.03, lowpass=0.12), gain=0.9)


def correct():
    """A short bright chime. The game raises its pitch as a streak grows."""
    s = []
    mix(s, bell(1046.5, 0.35, 0.09), gain=0.35)
    mix(s, bell(1567.98, 0.3, 0.07), offset=0.045, gain=0.25)
    return s


def wrong():
    s = []
    buzz = ((1, 1.0), (3, 0.3), (5, 0.15))
    mix(s, tone(196.0, 0.16, 0.08, harmonics=buzz), gain=0.3)
    mix(s, tone(174.6, 0.22, 0.1, harmonics=buzz), offset=0.11, gain=0.3)
    return s


def tick():
    """A tiny coin click for the bankroll counting up."""
    s = tone(2637.0, 0.06, 0.012, harmonics=((1, 1.0), (2.4, 0.4)))
    return mix(s, noise_burst(0.01, 0.002, lowpass=0.9), gain=0.3)


def write(name, samples):
    peak = max(1e-9, max(abs(x) for x in samples))
    scale = 0.85 / peak if peak > 0.85 else 1.0
    fade = int(0.005 * RATE)
    with wave.open(str(OUT / f"{name}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        frames = bytearray()
        for i, x in enumerate(samples):
            if i > len(samples) - fade:
                x *= (len(samples) - i) / fade
            frames += struct.pack("<h", int(max(-1.0, min(1.0, x * scale)) * 32767))
        w.writeframes(bytes(frames))


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for name, fn in [("card", card), ("flip", flip), ("chips", chips), ("win", win),
                     ("blackjack", blackjack), ("lose", lose), ("push", push), ("shuffle", shuffle),
                     ("bust", bust), ("correct", correct), ("wrong", wrong), ("tick", tick)]:
        write(name, fn())
        print(f"wrote assets/sounds/{name}.wav")
