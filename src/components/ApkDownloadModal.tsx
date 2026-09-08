import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, ExternalLink, QrCode, CheckCircle2, ShieldCheck, Smartphone, Globe, Copy, Check, X } from "lucide-react";

export const APK_DOWNLOAD_URL = "https://github.com/Diptish-De/SIH-26/releases/latest/download/SwarSanket.apk";
export const GITHUB_RELEASES_URL = "https://github.com/Diptish-De/SIH-26/releases";
export const GITHUB_REPO_URL = "https://github.com/Diptish-De/SIH-26";

interface ApkDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApkDownloadModal: React.FC<ApkDownloadModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"apk" | "pwa">("apk");

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(APK_DOWNLOAD_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#dceef2] bg-gradient-to-r from-[#fdfcf7] via-[#f0f8fa] to-[#e4f4f7]">
          <div className="flex items-center gap-3">
            <img
              src="/logo.jpeg"
              alt="SwarSanket"
              className="w-12 h-12 rounded-2xl shadow-md object-contain border border-[#bce3eb]"
            />
            <div>
              <h2 className="text-xl font-bold text-[#0c1e27]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Download SwarSanket
              </h2>
              <p className="text-xs text-[#5e7380] font-medium">Android Mobile App & PWA Release</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#dceef2] bg-slate-50 px-6 pt-2">
          <button
            onClick={() => setActiveTab("apk")}
            className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm border-b-2 transition-all ${
              activeTab === "apk"
                ? "border-[#02738a] text-[#02738a] bg-white rounded-t-xl"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Download className="w-4 h-4" />
            Direct Android APK
          </button>
          <button
            onClick={() => setActiveTab("pwa")}
            className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm border-b-2 transition-all ${
              activeTab === "pwa"
                ? "border-[#02738a] text-[#02738a] bg-white rounded-t-xl"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Globe className="w-4 h-4" />
            Web App (PWA)
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab === "apk" ? (
            <>
              {/* QR Code section */}
              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-[#f0f8fa] border border-[#cbe6ec]">
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-[#cbe6ec] flex-shrink-0">
                  <QRCodeSVG
                    value={APK_DOWNLOAD_URL}
                    size={132}
                    level="H"
                    includeMargin={false}
                    className="rounded-lg"
                  />
                </div>
                <div className="text-center sm:text-left space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#e4f4f7] text-[#01586a] text-xs font-semibold">
                    <QrCode className="w-3.5 h-3.5" />
                    Scan with Phone
                  </div>
                  <h3 className="font-bold text-slate-900 text-base" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    Scan QR on Android
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Point your Android camera at the QR code to download <span className="font-semibold text-[#02738a]">SwarSanket.apk</span> directly to your phone.
                  </p>
                </div>
              </div>

              {/* Direct Download Button */}
              <div className="space-y-2">
                <a
                  href={APK_DOWNLOAD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#02738a] to-[#015364] hover:from-[#02849f] hover:to-[#02738a] text-white font-bold text-center flex items-center justify-center gap-2.5 shadow-lg shadow-[#02738a]/25 transition-all active:scale-[0.98]"
                >
                  <Download className="w-5 h-5" />
                  Download SwarSanket APK (v1.0.0)
                </a>

                <div className="flex gap-2">
                  <button
                    onClick={handleCopyLink}
                    className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-400" />}
                    {copied ? "Link Copied!" : "Copy APK Download Link"}
                  </button>

                  <a
                    href={GITHUB_RELEASES_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-slate-400" />
                    GitHub Releases
                  </a>
                </div>
              </div>

              {/* Installation steps */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  Easy 3-Step Phone Installation:
                </div>
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-800 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                      1
                    </span>
                    <span>Tap <strong>Download APK</strong> or scan the QR code with your mobile browser.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-800 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                      2
                    </span>
                    <span>If Android asks <em>"File might be harmful"</em>, tap <strong>Download anyway</strong> (standard for direct GitHub releases).</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-800 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                      3
                    </span>
                    <span>Open downloaded file, tap <strong>Install</strong>, and launch SwarSanket.</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200">
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                <span>Built securely with automated GitHub Actions CI/CD.</span>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-cyan-50/60 border border-cyan-100 space-y-3 text-center sm:text-left">
                <div className="w-12 h-12 rounded-2xl bg-cyan-600 text-white flex items-center justify-center mx-auto sm:mx-0">
                  <Globe className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-base" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  Instant Web App (PWA)
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  You can use SwarSanket directly in your mobile browser without installing an APK. It works fully offline with microphone support!
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs text-slate-600">
                <div className="font-bold text-slate-800">How to add to phone home screen:</div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-600 flex-shrink-0 mt-0.5" />
                  <span><strong>On Android (Chrome):</strong> Tap the 3 dots (⋮) in the top right &rarr; tap <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong>.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-600 flex-shrink-0 mt-0.5" />
                  <span><strong>On iPhone (Safari):</strong> Tap the Share button &rarr; tap <strong>"Add to Home Screen"</strong>.</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>GitHub: <strong>Diptish-De/SIH-26</strong></span>
          <button onClick={onClose} className="font-semibold text-cyan-700 hover:underline">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
