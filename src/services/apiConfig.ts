/**
 * SwarSanket Backend API Configuration Service
 * =============================================
 * Handles dynamic API base URL resolution across environments:
 *   - Local Web Dev: http://127.0.0.1:8001 (or http://localhost:8001)
 *   - Android Emulator: http://10.0.2.2:8001 (maps to host loopback)
 *   - Local Wi-Fi / Physical Device: Host LAN IP (e.g. http://10.54.93.168:8001)
 *   - Production Cloud: HTTPS placeholder (e.g. https://api.swarsanket.org)
 *
 * Persists runtime configuration to localStorage so mobile testers
 * can dynamically point the app to their dev machine or cloud URL.
 */

export const STORAGE_KEY_API_URL = "swarsanket_api_base_url"

export interface ApiPreset {
  id: string

  name: string

  url: string

  description: string
}

export const API_PRESETS: ApiPreset[] = [
  {
    id: "localhost",

    name: "Web Localhost",

    url: "http://127.0.0.1:8001",

    description: "Standard local development for desktop browser testing.",
  },

  {
    id: "android_emulator",

    name: "Android Emulator",

    url: "http://10.0.2.2:8001",

    description:
      "Maps to host development machine from standard Android Emulator.",
  },

  {
    id: "lan_dev",

    name: "Host LAN (Wi-Fi)",

    url: "http://10.54.93.168:8001",

    description: "Connect from real phone over same local Wi-Fi network.",
  },

  {
    id: "cloud_production",

    name: "Cloud HTTPS (Production)",

    url: "https://api.swarsanket.org",

    description:
      "Cloud-hosted production backend placeholder for public release.",
  },
]

interface CapacitorGlobal {
  Capacitor?: {
    getPlatform: () => string

    isNativePlatform: () => boolean
  }
}

export function isCapacitorAndroid(): boolean {
  if (typeof window === "undefined") return false

  // Check Capacitor global or user agent

  const win = window as unknown as CapacitorGlobal

  if (win.Capacitor && typeof win.Capacitor.getPlatform === "function") {
    return win.Capacitor.getPlatform() === "android"
  }

  return /Android/i.test(navigator.userAgent)
}

export function getDefaultApiBaseUrl(): string {
  // 1. Environment variable configured at build time

  if (
    typeof import.meta !== "undefined" &&
    import.meta.env?.VITE_API_BASE_URL
  ) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, "")
  }

  // 2. Android platform defaults

  if (isCapacitorAndroid()) {
    // In Android emulator or physical device, localhost (127.0.0.1) points to the phone itself.

    // Default to LAN host or emulator alias for seamless on-device testing.

    return "http://10.54.93.168:8001"
  }

  // 3. Web localhost default

  return "http://127.0.0.1:8001"
}

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_API_URL)

      if (stored && stored.trim()) {
        return stored.trim().replace(/\/+$/, "")
      }
    } catch {
      // localStorage may be unavailable in restricted webviews
    }
  }

  return getDefaultApiBaseUrl()
}

export function setApiBaseUrl(newUrl: string): string {
  const sanitized = (newUrl || "").trim().replace(/\/+$/, "")

  if (!sanitized) {
    resetApiBaseUrl()

    return getDefaultApiBaseUrl()
  }

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY_API_URL, sanitized)
    } catch {
      // localStorage error fallback
    }
  }

  return sanitized
}

export function resetApiBaseUrl(): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY_API_URL)
    } catch {
      // localStorage error fallback
    }
  }
}

export interface BackendHealthStatus {
  ok: boolean

  message: string

  latencyMs?: number

  pipeline?: string

  url: string
}

export async function checkBackendHealth(
  targetUrl?: string,

  timeoutMs = 4000,
): Promise<BackendHealthStatus> {
  const baseUrl = (targetUrl || getApiBaseUrl()).replace(/\/+$/, "")

  const healthEndpoint = `${baseUrl}/api/health`

  const startTime = Date.now()

  const controller = new AbortController()

  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(healthEndpoint, {
      method: "GET",

      signal: controller.signal,

      headers: { Accept: "application/json" },
    })

    clearTimeout(timeoutId)

    const latencyMs = Date.now() - startTime

    if (!res.ok) {
      return {
        ok: false,

        url: baseUrl,

        message: `HTTP ${res.status}: ${res.statusText}`,

        latencyMs,
      }
    }

    const data = await res.json().catch(() => ({}))

    return {
      ok: data.status === "ok",

      url: baseUrl,

      message:
        data.status === "ok"
          ? "Backend connected and ready"
          : "Unexpected response payload",

      latencyMs,

      pipeline: data.pipeline || "SwarSanket Pipeline",
    }
  } catch (err: unknown) {
    clearTimeout(timeoutId)

    const latencyMs = Date.now() - startTime

    if (err instanceof Error && err.name === "AbortError") {
      return {
        ok: false,

        url: baseUrl,

        message: `Connection timed out after ${timeoutMs / 1000}s`,

        latencyMs,
      }
    }

    const errorMsg = err instanceof Error ? err.message : "Connection failed"

    return {
      ok: false,

      url: baseUrl,

      message: errorMsg.includes("Failed to fetch")
        ? "Unable to reach server. Please check IP/port and ensure backend is running."
        : errorMsg,

      latencyMs,
    }
  }
}
