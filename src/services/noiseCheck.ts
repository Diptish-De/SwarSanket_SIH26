/**
 * Ambient noise pre-flight
 * ========================
 * Measures the room before recording starts, so a screening is not attempted in
 * conditions that will corrupt it.
 *
 * WHY THIS EXISTS
 * ---------------
 * Every acoustic biomarker this app computes - pause structure, F0 variability,
 * jitter, shimmer, harmonics-to-noise ratio - degrades with background noise,
 * and Whisper's word timings degrade with it too. A screening recorded beside a
 * ceiling fan does not produce a slightly worse score; it produces a confidently
 * wrong one, because the noise floor raises measured silence thresholds and
 * lowers measured harmonicity in exactly the directions that mimic impairment.
 *
 * The honest response is to refuse before recording rather than to score badly
 * afterwards. This mirrors the sample-sufficiency gate in the backend: both
 * decline to produce a number rather than produce an unreliable one.
 *
 * CRITICAL: the measurement stream disables echoCancellation, noiseSuppression
 * and autoGainControl. The recording path deliberately enables them, but for
 * measurement they are fatal - the browser would suppress the very noise being
 * measured and report a quiet room in front of a running fan.
 */

/** How loud the room is, and whether that is workable. */
export type NoiseVerdict = "quiet" | "fair" | "noisy" | "unknown"

export interface NoiseReading {
  verdict: NoiseVerdict

  /** Noise floor in dBFS. Roughly -60 in a quiet room, above -45 in a loud one. */
  noiseFloorDb: number

  /** Loudest moment observed, dBFS. A gap from the floor means intermittent noise. */
  peakDb: number

  /**
   * Signal-to-noise ratio a normal speaking voice would achieve in this room,
   * in dB. Derived, not measured: it assumes a typical close-microphone speech
   * level, since the person has not spoken yet.
   */
  projectedSnrDb: number

  /** A steady low-frequency drone - fan, air conditioner, motor. */
  steadyHum: boolean

  /** Intermittent loud events - traffic, voices, doors. */
  intermittent: boolean

  /** Plain-language reason, written for a patient rather than an engineer. */
  message: string

  /** Set when the check could not run at all (permission denied, no mic). */
  error?: string
}

/**
 * Typical dBFS of conversational speech at phone-holding distance. Used only to
 * project an SNR before the person has spoken; it is a constant, and labelled
 * as a projection everywhere it surfaces.
 */
const NOMINAL_SPEECH_DBFS = -26

// Thresholds on the measured noise floor. Chosen so that a normal living room
// passes, a room with a fan warns, and a room where a projected SNR would drop
// under about 15 dB fails - below that, pause detection and harmonicity are no
// longer trustworthy.
const QUIET_FLOOR_DB = -55
const FAIR_FLOOR_DB = -45

/** Energy below this is where fans, air conditioners and motors live. */
const HUM_CUTOFF_HZ = 300

/** Above this share of low-frequency energy, with little variation, reads as a drone. */
const HUM_ENERGY_SHARE = 0.62
const HUM_STABILITY = 0.18

function toDb(amplitude: number): number {
  if (!(amplitude > 0)) return -100
  return Math.max(-100, 20 * Math.log10(amplitude))
}

/**
 * Turns measured room acoustics into a verdict and a sentence for the patient.
 *
 * Exported separately from the measurement so the thresholds can be tested
 * without a browser, microphone or user present - the numbers below are the
 * part most likely to need tuning against real rooms.
 */
export function classifyRoom(
  reading: Omit<NoiseReading, "message" | "verdict">,
): {
  verdict: NoiseVerdict
  message: string
} {
  if (reading.noiseFloorDb > FAIR_FLOOR_DB) {
    if (reading.steadyHum) {
      return {
        verdict: "noisy",
        message:
          "There is a fan or machine running nearby. Please switch it off, or move to a quieter room.",
      }
    }
    if (reading.intermittent) {
      return {
        verdict: "noisy",
        message:
          "There is noise coming and going around you. Please move somewhere quieter, away from traffic or other people talking.",
      }
    }
    return {
      verdict: "noisy",
      message:
        "This room is quite noisy. Please move somewhere quieter before we begin.",
    }
  }

  if (reading.noiseFloorDb > QUIET_FLOOR_DB) {
    if (reading.steadyHum) {
      return {
        verdict: "fair",
        message:
          "We can hear a fan in the background. It will work, but switching it off gives a clearer result.",
      }
    }
    return {
      verdict: "fair",
      message:
        "There is a little background noise. You can carry on, or move somewhere quieter for a clearer result.",
    }
  }

  return {
    verdict: "quiet",
    message: "This room is nice and quiet. You are ready to begin.",
  }
}

/**
 * Listens to the room for `durationMs` and reports whether it is fit to record in.
 *
 * Never throws. A denied permission or missing microphone returns
 * verdict "unknown" with an error set, and the caller is expected to let the
 * person continue - refusing to record because the check itself failed would be
 * worse than recording in an unmeasured room.
 */
export async function measureAmbientNoise(
  durationMs = 3000,
  onProgress?: (elapsedFraction: number, instantDb: number) => void,
): Promise<NoiseReading> {
  const failed = (error: string): NoiseReading => ({
    verdict: "unknown",
    noiseFloorDb: -100,
    peakDb: -100,
    projectedSnrDb: 0,
    steadyHum: false,
    intermittent: false,
    message: "We could not check the room. You can still continue.",
    error,
  })

  if (!navigator.mediaDevices?.getUserMedia) {
    return failed("Microphone API unavailable in this environment.")
  }

  let stream: MediaStream | null = null
  let context: AudioContext | null = null

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        // All three MUST stay off. With them on the browser removes the noise
        // this function exists to measure.
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    })

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext

    context = new AudioCtx()
    const source = context.createMediaStreamSource(stream)
    const analyser = context.createAnalyser()

    // 2048 gives ~23 Hz resolution at 48 kHz, enough to separate a mains hum
    // from speech fundamentals. No smoothing: it would blur the very
    // frame-to-frame variation used to tell a steady drone from traffic.
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0
    source.connect(analyser)

    const timeBuffer = new Float32Array(analyser.fftSize)
    const freqBuffer = new Uint8Array(analyser.frequencyBinCount)

    const frameLevels: number[] = []
    const humShares: number[] = []

    const sampleRate = context.sampleRate
    const nyquist = sampleRate / 2
    const humBins = Math.max(
      1,
      Math.round((HUM_CUTOFF_HZ / nyquist) * analyser.frequencyBinCount),
    )

    const started = performance.now()

    await new Promise<void>((resolve) => {
      const tick = () => {
        const elapsed = performance.now() - started
        if (elapsed >= durationMs) {
          resolve()
          return
        }

        analyser.getFloatTimeDomainData(timeBuffer)
        let sumSquares = 0
        for (let i = 0; i < timeBuffer.length; i++) {
          sumSquares += timeBuffer[i] * timeBuffer[i]
        }
        const rms = Math.sqrt(sumSquares / timeBuffer.length)
        const db = toDb(rms)
        frameLevels.push(db)

        analyser.getByteFrequencyData(freqBuffer)
        let low = 0
        let total = 0
        for (let i = 0; i < freqBuffer.length; i++) {
          total += freqBuffer[i]
          if (i < humBins) low += freqBuffer[i]
        }
        humShares.push(total > 0 ? low / total : 0)

        onProgress?.(Math.min(1, elapsed / durationMs), db)
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })

    if (frameLevels.length < 5) {
      return failed("Too few samples captured to judge the room.")
    }

    const sorted = [...frameLevels].sort((a, b) => a - b)
    const at = (q: number) =>
      sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]

    // The floor is the quiet 10th percentile rather than the mean, so one cough
    // or passing vehicle does not condemn an otherwise usable room.
    const noiseFloorDb = at(0.1)
    const peakDb = sorted[sorted.length - 1]

    const meanHumShare =
      humShares.reduce((a, b) => a + b, 0) / (humShares.length || 1)

    const meanLevel =
      frameLevels.reduce((a, b) => a + b, 0) / frameLevels.length
    const variance =
      frameLevels.reduce((a, b) => a + (b - meanLevel) ** 2, 0) /
      frameLevels.length
    const stability = Math.sqrt(variance) / Math.max(1, Math.abs(meanLevel))

    // A fan is loud in the low bands AND barely varies. Traffic is low too, but
    // swings; requiring both conditions keeps them apart.
    const steadyHum =
      meanHumShare > HUM_ENERGY_SHARE && stability < HUM_STABILITY

    // A wide gap between the quiet floor and the loudest moment means something
    // is intruding periodically rather than droning continuously.
    const intermittent = peakDb - noiseFloorDb > 18

    const projectedSnrDb = Math.round(NOMINAL_SPEECH_DBFS - noiseFloorDb)

    const partial = {
      noiseFloorDb: Math.round(noiseFloorDb * 10) / 10,
      peakDb: Math.round(peakDb * 10) / 10,
      projectedSnrDb,
      steadyHum,
      intermittent,
    }

    return { ...partial, ...classifyRoom(partial) }
  } catch (err: unknown) {
    const name = (err as { name?: string })?.name
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return failed("Microphone permission was declined.")
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return failed("No microphone was found on this device.")
    }
    return failed(
      err instanceof Error ? err.message : "Unknown microphone error.",
    )
  } finally {
    // Release the microphone promptly. Leaving the track live keeps the
    // browser's recording indicator lit, which is alarming to a patient who has
    // been told the check is finished.
    stream?.getTracks().forEach((t) => t.stop())
    if (context && context.state !== "closed") {
      void context.close().catch(() => {})
    }
  }
}
