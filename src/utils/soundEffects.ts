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

/**
 * Mechanical camera shutter click sound synthesis using Web Audio API:
 * Short metallic bandpass white noise burst (~40ms) + high-frequency impulse click.
 * No external audio assets required.
 */
export function playCameraShutterSound(): void {
    const s = useSettingsStore.getState();
    if (!s.enableFlashEffect && !s.enableShutterFlash) return;

    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;

        // 1. White noise burst through bandpass filter for mechanical shutter texture
        const sampleRate = ctx.sampleRate;
        const bufferSize = Math.floor(sampleRate * 0.04);
        const noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(1400, now);
        filter.Q.setValueAtTime(2.5, now);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.28, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.038);

        whiteNoise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        whiteNoise.start(now);

        // 2. High-frequency impulse click
        const clickOsc = ctx.createOscillator();
        const clickGain = ctx.createGain();
        clickOsc.type = "sine";
        clickOsc.frequency.setValueAtTime(2400, now);
        clickOsc.frequency.exponentialRampToValueAtTime(300, now + 0.035);

        clickGain.gain.setValueAtTime(0.22, now);
        clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

        clickOsc.connect(clickGain);
        clickGain.connect(ctx.destination);

        clickOsc.start(now);
        clickOsc.stop(now + 0.038);
    } catch (err) {
        console.warn("[soundEffects] Failed to play shutter sound:", err);
    }
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

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(620, now);
        osc.frequency.exponentialRampToValueAtTime(280, now + 0.065);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.07);
    } catch (err) {
        console.warn("[soundEffects] Failed to play pop feedback sound:", err);
    }
}
