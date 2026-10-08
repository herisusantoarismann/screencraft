import React from "react";
import { Sparkles, X, Download, RotateCw, Calendar } from "lucide-react";
import { useAutoUpdater } from "../../hooks/useAutoUpdater";

export const UpdateModal: React.FC = () => {
  const {
    isUpdateAvailable,
    isDownloading,
    downloadProgress,
    updateDetails,
    downloadAndInstallUpdate,
    closeUpdateModal,
  } = useAutoUpdater();

  if (!isUpdateAvailable || !updateDetails) return null;

  const formattedDate = updateDetails.date
    ? new Date(updateDetails.date).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div
      onClick={(e) => {
        if (!isDownloading && e.target === e.currentTarget) {
          closeUpdateModal();
        }
      }}
      className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4 select-none animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-neutral-900/95 border border-neutral-700/80 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col text-white animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-neutral-100">
                Pembaruan Tersedia
              </h3>
              <p className="text-[11px] text-neutral-400">
                Versi baru siap diinstal
              </p>
            </div>
          </div>
          {!isDownloading && (
            <button
              type="button"
              onClick={closeUpdateModal}
              className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5 flex flex-col gap-4">
          {/* Version Pill Banner */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950/60 border border-neutral-800">
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400">Versi Saat Ini:</span>
              <span className="text-xs font-mono font-medium text-neutral-300">
                v{updateDetails.currentVersion}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/40">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold font-mono text-indigo-300">
                v{updateDetails.version}
              </span>
            </div>
          </div>

          {/* Release Date if available */}
          {formattedDate && (
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 -mt-1 px-1">
              <Calendar className="w-3.5 h-3.5 text-neutral-500" />
              <span>Dirilis pada {formattedDate}</span>
            </div>
          )}

          {/* Changelog Card */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-neutral-300">
              Catatan Rilis (Changelog):
            </span>
            <div className="max-h-36 overflow-y-auto p-3 rounded-xl bg-neutral-950/80 border border-neutral-800/90 text-xs text-neutral-300 leading-relaxed font-sans whitespace-pre-wrap [scrollbar-width:thin] [scrollbar-color:#404040_transparent]">
              {updateDetails.body}
            </div>
          </div>

          {/* Progress Bar (when downloading) */}
          {isDownloading && (
            <div className="flex flex-col gap-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-indigo-300 font-medium flex items-center gap-1.5">
                  <RotateCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  Mengunduh & Menyiapkan Instalasi...
                </span>
                <span className="font-mono font-bold text-neutral-200">
                  {downloadProgress}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300 rounded-full shadow-[0_0_12px_rgba(99,102,241,0.6)]"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-neutral-800 bg-neutral-950/70">
          {!isDownloading && (
            <button
              type="button"
              onClick={closeUpdateModal}
              className="px-3.5 py-1.5 text-xs font-medium text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Nanti Saja
            </button>
          )}

          <button
            type="button"
            disabled={isDownloading}
            onClick={() => void downloadAndInstallUpdate()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            {isDownloading ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Memproses ({downloadProgress}%)...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Update & Relaunch</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

