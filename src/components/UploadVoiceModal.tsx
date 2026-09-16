import React, { useEffect, useRef, useState } from "react"
import {
  UploadCloud,
  FileAudio,
  Play,
  Pause,
  AlertTriangle,
  CheckCircle2,
  X,
  Sparkles,
  RefreshCw,
  Sliders,
  Volume2,
} from "lucide-react"

interface UploadVoiceModalProps {
  isOpen: boolean
  onClose: () => void
  onStartAnalysis: (file: File, task: string, durationSeconds: number) => void
  patientName?: string
  initialFile?: File | null
  fontFamily?: string
}

export const getAudioFileDuration = async (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const audio = document.createElement("audio")
    const url = URL.createObjectURL(file)
    audio.preload = "metadata"
    audio.src = url

    const cleanup = () => {
      URL.revokeObjectURL(url)
      audio.remove()
    }

    audio.onloadedmetadata = () => {
      const dur = audio.duration
      cleanup()
      if (Number.isFinite(dur) && dur > 0) {
        resolve(dur)
      } else {
        decodeDurationWithAudioContext(file).then(resolve)
      }
    }

    audio.onerror = () => {
      cleanup()
      decodeDurationWithAudioContext(file).then(resolve)
    }

    setTimeout(() => {
      cleanup()
      resolve(15)
    }, 2500)
  })
}

async function decodeDurationWithAudioContext(file: File): Promise<number> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    if (!AudioCtx) return 15
    const ctx = new AudioCtx()
    const buffer = await ctx.decodeAudioData(arrayBuffer)
    const dur = buffer.duration
    await ctx.close()
    return Number.isFinite(dur) && dur > 0 ? dur : 15
  } catch {
    return 15
  }
}

export default function UploadVoiceModal({
  isOpen,
  onClose,
  onStartAnalysis,
  patientName,
  initialFile = null,
  fontFamily,
}: UploadVoiceModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(initialFile)
  const [fileDuration, setFileDuration] = useState<number | null>(null)
  const [isLoadingDuration, setIsLoadingDuration] = useState(false)
  const [task, setTask] = useState<string>("picture")
  const [isDragging, setIsDragging] = useState(false)

  // Audio player state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (initialFile) {
      handleFileSelected(initialFile)
    }
  }, [initialFile])

  useEffect(() => {
    if (!isOpen) {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      setIsPlaying(false)
      setCurrentTime(0)
    }
  }, [isOpen])

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  const handleFileSelected = async (file: File) => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    const newUrl = URL.createObjectURL(file)
    setSelectedFile(file)
    setAudioUrl(newUrl)
    setIsLoadingDuration(true)
    setIsPlaying(false)
    setCurrentTime(0)

    try {
      const dur = await getAudioFileDuration(file)
      setFileDuration(dur)
    } catch {
      setFileDuration(15)
    } finally {
      setIsLoadingDuration(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (
      file &&
      (file.type.startsWith("audio/") || isValidAudioExtension(file.name))
    ) {
      handleFileSelected(file)
    }
  }

  const isValidAudioExtension = (filename: string) => {
    const ext = filename.toLowerCase()
    return (
      ext.endsWith(".wav") ||
      ext.endsWith(".mp3") ||
      ext.endsWith(".m4a") ||
      ext.endsWith(".webm") ||
      ext.endsWith(".ogg") ||
      ext.endsWith(".flac") ||
      ext.endsWith(".aac")
    )
  }

  const togglePlayPause = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play().catch(() => {})
      setIsPlaying(true)
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleAudioEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value)
    setCurrentTime(time)
    if (audioRef.current) {
      audioRef.current.currentTime = time
    }
  }

  const formatSeconds = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const handleStart = () => {
    if (!selectedFile) return
    if (audioRef.current) {
      audioRef.current.pause()
    }
    const duration = fileDuration ?? 15
    onStartAnalysis(selectedFile, task, duration)
    onClose()
  }

  if (!isOpen) return null

  const isDurationValid = (fileDuration ?? 0) >= 10

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-scale-up"
        style={{ fontFamily }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-blue-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0F62FE] text-white flex items-center justify-center shadow-sm">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-slate-900 leading-tight">
                Upload Patient Voice
              </h2>
              <p className="text-[12px] text-slate-500">
                {patientName
                  ? `Analyzing recording for ${patientName}`
                  : "Pre-recorded audio screening"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-5 overflow-y-auto space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileSelected(file)
            }}
            accept="audio/*,.wav,.mp3,.m4a,.webm,.ogg,.flac,.aac"
            className="hidden"
          />

          {!selectedFile ? (
            /* Upload Dropzone */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 group ${
                isDragging
                  ? "border-[#0F62FE] bg-blue-50/60 scale-[1.01]"
                  : "border-slate-200 hover:border-[#0F62FE]/70 hover:bg-blue-50/30"
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0F62FE] flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileAudio className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Click to browse or drag & drop
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supported: WAV, MP3, M4A, WebM, OGG, FLAC
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                {["WAV", "MP3", "M4A", "WebM"].map((fmt) => (
                  <span
                    key={fmt}
                    className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold tracking-wide"
                  >
                    .{fmt.toLowerCase()}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            /* Selected File Preview & Audio Player */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0F62FE] flex items-center justify-center shrink-0">
                      <FileAudio className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4
                        className="text-xs font-bold text-slate-900 truncate"
                        title={selectedFile.name}
                      >
                        {selectedFile.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {formatFileSize(selectedFile.size)} •{" "}
                        {isLoadingDuration
                          ? "Calculating duration..."
                          : `${Math.round(fileDuration ?? 0)}s duration`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-medium text-[#0F62FE] hover:underline flex items-center gap-1 shrink-0"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Change
                  </button>
                </div>

                {/* In-modal Audio Player */}
                {audioUrl && (
                  <div className="mt-3 pt-3 border-t border-slate-200/80">
                    <audio
                      ref={audioRef}
                      src={audioUrl}
                      onTimeUpdate={handleTimeUpdate}
                      onEnded={handleAudioEnded}
                      preload="auto"
                    />
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={togglePlayPause}
                        className="w-8 h-8 rounded-full bg-[#0F62FE] hover:bg-[#0353e9] text-white flex items-center justify-center shrink-0 shadow-xs transition-transform active:scale-95"
                      >
                        {isPlaying ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4 ml-0.5" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <input
                          type="range"
                          min="0"
                          max={
                            fileDuration ?? (audioRef.current?.duration || 100)
                          }
                          step="0.1"
                          value={currentTime}
                          onChange={handleSeek}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0F62FE]"
                        />
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                          <span>{formatSeconds(currentTime)}</span>
                          <span>{formatSeconds(fileDuration ?? 0)}</span>
                        </div>
                      </div>

                      <Volume2 className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>
                  </div>
                )}
              </div>

              {/* Quality & Duration Status Indicator */}
              {fileDuration !== null && !isLoadingDuration && (
                <div
                  className={`p-3 rounded-xl flex items-start gap-2.5 text-xs ${
                    isDurationValid
                      ? "bg-emerald-50/80 border border-emerald-200/70 text-emerald-800"
                      : "bg-amber-50/90 border border-amber-200 text-amber-800"
                  }`}
                >
                  {isDurationValid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-semibold">
                      {isDurationValid
                        ? `Valid clinical duration (${Math.round(fileDuration)}s)`
                        : `Short recording (${Math.round(fileDuration)}s)`}
                    </span>
                    <p className="text-[11px] mt-0.5 leading-snug">
                      {isDurationValid
                        ? "Sufficient length to extract all 22 acoustic biomarkers and perform 8-qubit quantum classification."
                        : "Recordings under 10 seconds may yield lower confidence. 10–60 seconds of continuous speech is recommended."}
                    </p>
                  </div>
                </div>
              )}

              {/* Screening Task Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#0F62FE]" />
                  Screening Model & Task Mode
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => setTask("picture")}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-start justify-between gap-2 ${
                      task === "picture"
                        ? "border-[#0F62FE] bg-blue-50/50 text-[#0F62FE]"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">
                        Full Cognitive Biomarker Screening
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        22 acoustic features + PennyLane 8-Qubit VQC quantum
                        model
                      </div>
                    </div>
                    {task === "picture" && (
                      <span className="px-2 py-0.5 rounded-full bg-[#0F62FE] text-white text-[10px] font-bold">
                        Active
                      </span>
                    )}
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTask("fluency")}
                      className={`p-2 rounded-xl border text-left transition-all ${
                        task === "fluency"
                          ? "border-[#0F62FE] bg-blue-50/50 text-[#0F62FE]"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <div className="text-xs font-bold">Verbal Fluency</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Animal naming count
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTask("recall")}
                      className={`p-2 rounded-xl border text-left transition-all ${
                        task === "recall"
                          ? "border-[#0F62FE] bg-blue-50/50 text-[#0F62FE]"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <div className="text-xs font-bold">Word Recall</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Delayed memory test
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Clinical Tip */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px] leading-relaxed">
            <span className="font-semibold text-slate-900">Clinical Tip: </span>
            Ensure the audio has clear voice without loud background music or
            television noise for optimal acoustic feature extraction.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleStart}
            disabled={!selectedFile || isLoadingDuration}
            className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all ${
              !selectedFile || isLoadingDuration
                ? "bg-slate-300 cursor-not-allowed opacity-60"
                : "bg-[#0F62FE] hover:bg-[#0353e9] active:scale-95 shadow-blue-500/20"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Start AI Screening</span>
          </button>
        </div>
      </div>
    </div>
  )
}
