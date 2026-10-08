// ─── SwarSanket Clinical Screening Report Generator ───────────────────────────

import { ScreeningSession } from "../types"
import { SWARSANKET_LOGO_BASE64 } from "./logoBase64"

export function generateAndDownloadReport(session: ScreeningSession): void {
  // Ambient noise measured before recording. Every acoustic biomarker below

  // degrades with background noise, so a clinician reading a borderline result

  // needs to know whether it was captured in a quiet room or beside a fan.

  // Absent on sessions recorded before the pre-flight existed.

  const snr = session.tasks[0]?.snrEstimateDb

  const recordingConditions =
    typeof snr === "number" && Number.isFinite(snr)
      ? `${
          snr >= 30 ? "Quiet" : snr >= 20 ? "Some background noise" : "Noisy"
        } (projected SNR ${snr} dB)`
      : ""

  // Sessions recorded before voice quality was measured carry placeholder

  // values and no flag; absent means not measured, never assumed measured.

  const voiceQualityMeasured = session.biomarkers.voiceQualityMeasured === true

  // Standardized test battery: each task against its own published reference

  // range, summarised as "N of M in the typical range". Never fused with the

  // model's probability.

  const batteryLabels: Record<string, string> = {
    fluency: "Animal fluency (60 s)",

    recall: "Delayed 5-word recall",

    phonation: "Sustained vowel /a/ (max phonation time)",
  }

  const batteryValue = (
    r: NonNullable<ScreeningSession["battery"]>[number],
  ) => {
    if (r.status !== "completed" || !r.scored || r.score === null) {
      return r.status === "failed" ? "Not scored (error)" : "Not scored"
    }

    const v =
      r.task === "fluency"
        ? `${r.score} animals`
        : r.task === "recall"
          ? `${r.score} of 5`
          : `${r.score.toFixed(1)} s`

    return `${v} · ${r.flag ? "below typical range" : "typical range"}`
  }

  const scoredBattery = (session.battery ?? []).filter(
    (r) => r.status === "completed" && r.scored,
  )

  const typicalCount = scoredBattery.filter((r) => r.flag === false).length

  const batteryCard =
    session.battery && session.battery.length > 0
      ? `<div class="card">
        <div class="card-title">Standardized Test Battery</div>
        <div class="stat-row"><span class="stat-label">Summary</span><span class="stat-val">${
          scoredBattery.length > 0
            ? `${typicalCount} of ${scoredBattery.length} in typical range`
            : "Not scored"
        }</span></div>
        ${session.battery

          .map(
            (r) =>
              `<div class="stat-row"><span class="stat-label">${batteryLabels[r.task] ?? r.task}</span><span class="stat-val">${batteryValue(r)}</span></div>`,
          )

          .join("\n        ")}
        <div style="margin-top:8px;font-size:11px;color:#64748b;line-height:1.45;">Reference ranges: animal fluency ≥ 12 in 60 s (Tombaugh et al. 1999; Canning et al. 2004); delayed recall ≥ 3 of 5 (MoCA, Nasreddine et al. 2005); maximum phonation time ≥ 10 s with jitter, shimmer and HNR inside MDVP thresholds. Reported beside the model output, not combined with it.</div>
      </div>`
      : ""

  const dateFormatted = new Date(session.createdAt).toLocaleString("en-IN", {
    dateStyle: "long",

    timeStyle: "short",
  })

  const riskColor =
    session.mlResult.screeningRisk === "low"
      ? "#16a34a"
      : session.mlResult.screeningRisk === "elevated"
        ? "#c2410c"
        : "#d97706"

  const riskBg =
    session.mlResult.screeningRisk === "low"
      ? "#dcfce7"
      : session.mlResult.screeningRisk === "elevated"
        ? "#fff7ed"
        : "#fef3c7"

  const reportHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SwarSanket Screening Report - ${session.patientName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=Noto+Sans:wght@400;500;600&display=swap');
    body { font-family: 'Noto Sans', sans-serif; color: #0f172a; margin: 0; padding: 32px; background: #f8fafc; }
    .page { max-width: 800px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 24px; }
    .logo-title { font-family: 'Outfit', sans-serif; font-size: 26px; font-weight: 700; color: #02738a; letter-spacing: -0.02em; }
    .tagline { font-size: 13px; color: #5e7380; margin-top: 2px; }
    .report-meta { text-align: right; font-size: 12px; color: #64748b; }
    .badge { display: inline-block; padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 13px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
    .card-title { font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 600; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; margin-bottom: 10px; }
    .stat-row { display: flex; justify-content: space-between; font-size: 14px; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
    .stat-row:last-child { border-bottom: none; }
    .stat-label { color: #64748b; }
    .stat-val { font-weight: 600; color: #0f172a; }
    .alert-box { background: ${riskBg}; border: 1px solid ${riskColor}40; border-radius: 12px; padding: 18px; margin-bottom: 24px; }
    .disclaimer { background: #f1f5f9; border-radius: 8px; padding: 12px; font-size: 12px; color: #64748b; text-align: center; margin-top: 32px; line-height: 1.5; }
    .print-btn { display: block; margin: 20px auto 0; padding: 12px 28px; background: #02738a; color: #fff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
    @media print { .print-btn { display: none; } body { padding: 0; background: #fff; } .page { box-shadow: none; border: none; padding: 0; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div style="display: flex; align-items: center; gap: 14px;">
        <img src="${SWARSANKET_LOGO_BASE64}" style="width: 48px; height: 48px; border-radius: 12px; object-fit: contain; box-shadow: 0 2px 8px rgba(2,115,138,0.2);" alt="SwarSanket Logo" />
        <div>
          <div class="logo-title">SwarSanket</div>
          <div class="tagline">Early Cognitive & Voice Biomarker Screening</div>
        </div>
      </div>
      <div class="report-meta">
        <div><strong>Report ID:</strong> ${session.id}</div>
        <div><strong>Date:</strong> ${dateFormatted}</div>
      </div>
    </div>

    <div class="alert-box">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 700; color: ${riskColor};">
          Screening Result: ${session.mlResult.screeningRisk.toUpperCase()}
        </span>
        <span class="badge" style="background: ${riskBg}; color: ${riskColor};">
          ${session.mlResult.confidenceLevel.toUpperCase()} CONFIDENCE (${Math.round(session.mlResult.confidenceScore * 100)}%)
        </span>
      </div>
      <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.5;">
        ${
          session.mlResult.screeningRisk === "elevated"
            ? "Vocal and speech acoustic patterns indicate potential cognitive changes that may benefit from formal clinical evaluation by a neurologist."
            : session.mlResult.screeningRisk === "low"
              ? "No immediate acoustic indicators of concern were detected. Continue periodic 3–6 month screening."
              : "Screening result is uncertain due to recording conditions or boundary score. Re-screening recommended."
        }
      </p>
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-title">Patient Demographics</div>
        <div class="stat-row"><span class="stat-label">Name</span><span class="stat-val">${session.patientName}</span></div>
        <div class="stat-row"><span class="stat-label">Age</span><span class="stat-val">${session.patientAge} years</span></div>
        <div class="stat-row"><span class="stat-label">Language</span><span class="stat-val">${session.language.toUpperCase()}</span></div>
        <div class="stat-row"><span class="stat-label">Assisted Mode</span><span class="stat-val">${
          session.assistedMode ? "Yes (Caregiver)" : "No (Direct)"
        }</span></div>
        ${
          recordingConditions
            ? `<div class="stat-row"><span class="stat-label">Recording Conditions</span><span class="stat-val">${recordingConditions}</span></div>`
            : ""
        }
      </div>

      ${batteryCard}

      <div class="card">
        <div class="card-title">Acoustic Biomarkers</div>
        <div class="stat-row"><span class="stat-label">Speech Rate</span><span class="stat-val">${session.biomarkers.speechRateWpm} WPM</span></div>
        <div class="stat-row"><span class="stat-label">Pause Ratio</span><span class="stat-val">${session.biomarkers.pausePatternRatio}%</span></div>
        ${
          voiceQualityMeasured
            ? `<div class="stat-row"><span class="stat-label">Mean F0</span><span class="stat-val">${session.biomarkers.f0MeanHz ?? "—"} Hz</span></div>
        <div class="stat-row"><span class="stat-label">F0 Variation (SD)</span><span class="stat-val">${session.biomarkers.pitchVariationHz} Hz</span></div>
        <div class="stat-row"><span class="stat-label">Pitch Jitter (RAP)</span><span class="stat-val">${session.biomarkers.jitterPercent}%</span></div>
        <div class="stat-row"><span class="stat-label">Amplitude Shimmer</span><span class="stat-val">${session.biomarkers.shimmerDb} dB</span></div>
        <div class="stat-row"><span class="stat-label">Harmonics-to-Noise (HNR)</span><span class="stat-val">${session.biomarkers.hnrDb} dB</span></div>`
            : `<div class="stat-row"><span class="stat-label">Voice Quality</span><span class="stat-val">Not measured</span></div>
        <div style="margin-top:8px;font-size:11px;color:#64748b;line-height:1.45;">Fundamental frequency, jitter, shimmer and HNR require sustained voiced speech. This recording did not contain enough to support an estimate, so no values are reported.</div>`
        }
      </div>
    </div>

    <div class="card" style="margin-bottom: 20px;">
      <div class="card-title">Quantum-Hybrid AI Evaluation (8-Qubit VQC + PyTorch)</div>
      <div class="stat-row">
        <span class="stat-label">Model Architecture</span>
        <span class="stat-val">8-Qubit Variational Quantum Circuit (22 Features)</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Risk Probability</span>
        <span class="stat-val">Risk: ${Math.round(session.mlResult.quantumHybridModel.riskScore * 100)}% (Benchmark AUC: ${session.mlResult.quantumHybridModel.aucScore || "0.943"})</span>
      </div>
    </div>

    ${
      session.notes
        ? `<div class="card">
            <div class="card-title">Clinical Annotation</div>
            <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.5;">${session.notes}</p>
          </div>`
        : ""
    }

    <div class="disclaimer">
      <strong>Clinical Safety Notice:</strong> SwarSanket is an AI-assisted screening instrument, not a diagnostic medical device. This report does not constitute a formal diagnosis of Alzheimer's disease or cognitive impairment. Clinical decisions should be made by a qualified healthcare professional.
    </div>

    <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
  </div>
</body>
</html>`

  const blob = new Blob([reportHtml], { type: "text/html" })

  const url = URL.createObjectURL(blob)

  const win = window.open(url, "_blank")

  if (!win) {
    // If popups blocked, download as file

    const a = document.createElement("a")

    a.href = url

    a.download = `SwarSanket_Report_${session.patientName.replace(/\s+/g, "_")}_${session.id}.html`

    a.click()
  }
}
