import { useSettingsStore } from "../stores/settingsStore";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioCtx) {
        audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === "suspended") {
        void audioCtx.resume();
    }
    return audioCtx;
}

function playShutterOnContext(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const sampleRate = ctx.sampleRate;

    // Helper: generate white noise buffer
    const createNoiseBuffer = (durationSec: number) => {
        const bufferSize = Math.floor(sampleRate * durationSec);
        const noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        return noiseBuffer;
    };

    const noiseBuffer = createNoiseBuffer(0.12);

    // ==========================================
    // Phase 1: Shutter Blade Open ("tcha-")
    // ==========================================
    const t1 = now;

    // 1a. High-frequency crisp metallic snap
    const noise1 = ctx.createBufferSource();
    noise1.buffer = noiseBuffer;
    const filter1 = ctx.createBiquadFilter();
    filter1.type = "highpass";
    filter1.frequency.setValueAtTime(2800, t1);

    const gain1 = ctx.createGain();
    gain1.gain.setValueAtTime(0.35, t1);
    gain1.gain.exponentialRampToValueAtTime(0.001, t1 + 0.022);

    noise1.connect(filter1);
    filter1.connect(gain1);
    gain1.connect(ctx.destination);
    noise1.start(t1);
    noise1.stop(t1 + 0.025);

    // 1b. Blade release transient click
    const osc1 = ctx.createOscillator();
    const oscGain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(2200, t1);
    osc1.frequency.exponentialRampToValueAtTime(450, t1 + 0.015);
    oscGain1.gain.setValueAtTime(0.25, t1);
    oscGain1.gain.exponentialRampToValueAtTime(0.001, t1 + 0.015);
    osc1.connect(oscGain1);
    oscGain1.connect(ctx.destination);
    osc1.start(t1);
    osc1.stop(t1 + 0.018);

    // ==========================================
    // Phase 2: Curtain Close & Chassis Slap ("-clik")
    // 32ms exposure gap for authentic two-part shutter rhythm
    // ==========================================
    const t2 = now + 0.032;

    // 2a. Camera body acoustic thud (gives real camera weight/chassis resonance)
    const bodyOsc = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    bodyOsc.type = "triangle";
    bodyOsc.frequency.setValueAtTime(180, t2);
    bodyOsc.frequency.exponentialRampToValueAtTime(60, t2 + 0.045);
    bodyGain.gain.setValueAtTime(0.3, t2);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, t2 + 0.045);
    bodyOsc.connect(bodyGain);
    bodyGain.connect(ctx.destination);
    bodyOsc.start(t2);
    bodyOsc.stop(t2 + 0.05);

    // 2b. Shutter curtain crunch (textured bandpass noise)
    const noise2 = ctx.createBufferSource();
    noise2.buffer = noiseBuffer;
    const filter2 = ctx.createBiquadFilter();
    filter2.type = "bandpass";
    filter2.frequency.setValueAtTime(1600, t2);
    filter2.Q.setValueAtTime(1.8, t2);

    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.42, t2);
    gain2.gain.exponentialRampToValueAtTime(0.005, t2 + 0.042);

    noise2.connect(filter2);
    filter2.connect(gain2);
    gain2.connect(ctx.destination);
    noise2.start(t2);
    noise2.stop(t2 + 0.048);

    // 2c. Sharp metallic latch click (closing latch)
    const osc2 = ctx.createOscillator();
    const oscGain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(3200, t2);
    osc2.frequency.exponentialRampToValueAtTime(800, t2 + 0.018);
    oscGain2.gain.setValueAtTime(0.28, t2);
    oscGain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.018);
    osc2.connect(oscGain2);
    oscGain2.connect(ctx.destination);
    osc2.start(t2);
    osc2.stop(t2 + 0.02);
}

// Toggle for shutter sound: disabled per user request, keeping full synthesis code intact
const ENABLE_SHUTTER_SOUND = false;

/**
 * Mechanical camera shutter click sound synthesis using Web Audio API:
 * Short metallic bandpass white noise burst (~40ms) + high-frequency impulse click.
 * No external audio assets required.
 */
export function playCameraShutterSound(): void {
    if (!ENABLE_SHUTTER_SOUND) return;
    const s = useSettingsStore.getState();
    if (!s.enableFlashEffect && !s.enableShutterFlash) return;

    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        if (ctx.state === "suspended") {
            void ctx
                .resume()
                .then(() => {
                    playShutterOnContext(ctx);
                })
                .catch(() => {
                    playShutterOnContext(ctx);
                });
        } else {
            playShutterOnContext(ctx);
        }
    } catch (err) {
        console.warn("[soundEffects] Failed to play shutter sound:", err);
    }
}

function playPopOnContext(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.065);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.07);
}

/**
 * Tactile pop feedback sound using Web Audio API:
 * Smooth pitch-dropping sine wave (620Hz -> 280Hz) with natural decay envelope.
 * Used for clipboard copy, color hex sampling, and quick confirmations.
 */
export function playPopFeedbackSound(): void {
    const s = useSettingsStore.getState();
    if (!s.enableFlashEffect && !s.enableShutterFlash) return;

    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        if (ctx.state === "suspended") {
            void ctx
                .resume()
                .then(() => {
                    playPopOnContext(ctx);
                })
                .catch(() => {
                    playPopOnContext(ctx);
                });
        } else {
            playPopOnContext(ctx);
        }
    } catch (err) {
        console.warn("[soundEffects] Failed to play pop feedback sound:", err);
    }
}
