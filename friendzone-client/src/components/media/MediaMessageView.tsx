import React, { useState, useEffect } from 'react';
import { mediaApi } from '../../services/api';
import type { MediaAssetResponse } from '../../services/api';
import { FileText, Download, AlertTriangle, Eye, Loader2 } from 'lucide-react';

interface MediaMessageViewProps {
  mediaAsset: MediaAssetResponse;
}

export const MediaMessageView: React.FC<MediaMessageViewProps> = ({ mediaAsset }) => {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    if (mediaAsset.uploadStatus === 'READY' && mediaAsset.moderationStatus === 'APPROVED') {
      mediaApi
        .getMediaAccessUrl(mediaAsset.id)
        .then((res) => {
          if (isMounted) {
            setDownloadUrl(res.downloadUrl);
            setThumbnailUrl(res.thumbnailUrl || res.downloadUrl);
            setLoading(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setError(true);
            setLoading(false);
          }
        });
    } else {
      setLoading(false);
    }
    return () => {
      isMounted = false;
    };
  }, [mediaAsset]);

  if (mediaAsset.uploadStatus === 'DELETED') {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 border border-slate-700/60 rounded-lg text-xs text-slate-400 font-medium my-1">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
        <span>Media expired</span>
      </div>
    );
  }

  if (mediaAsset.uploadStatus === 'BLOCKED' || mediaAsset.moderationStatus === 'BLOCKED') {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-300 font-medium my-1">
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>Media unavailable</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg text-xs text-slate-400 my-1">
        <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
        <span>Loading media...</span>
      </div>
    );
  }

  if (error || !downloadUrl) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 rounded-lg text-xs text-slate-400 my-1">
        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
        <span>Failed to load media</span>
      </div>
    );
  }

  const formattedSize = (mediaAsset.size / (1024 * 1024)).toFixed(2) + ' MB';

  return (
    <div className="my-1.5 max-w-sm">
      {/* IMAGE rendering */}
      {mediaAsset.mediaType === 'IMAGE' && (
        <>
          <div
            onClick={() => setLightboxOpen(true)}
            className="relative group cursor-pointer overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900"
          >
            <img
              src={thumbnailUrl || downloadUrl}
              alt={mediaAsset.originalName}
              className="w-full max-h-64 object-cover rounded-xl transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
              <Eye className="w-6 h-6" />
            </div>
          </div>

          {/* Lightbox Modal */}
          {lightboxOpen && (
            <div
              onClick={() => setLightboxOpen(false)}
              className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer animate-fadeIn"
            >
              <img
                src={downloadUrl}
                alt={mediaAsset.originalName}
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              />
            </div>
          )}
        </>
      )}

      {/* VIDEO rendering */}
      {mediaAsset.mediaType === 'VIDEO' && (
        <div className="rounded-xl overflow-hidden border border-slate-700/60 bg-black">
          <video
            controls
            preload="metadata"
            poster={thumbnailUrl || undefined}
            className="w-full max-h-64 rounded-xl"
          >
            <source src={downloadUrl} type={mediaAsset.mimeType} />
            Your browser does not support HTML5 video playback.
          </video>
        </div>
      )}

      {/* AUDIO rendering */}
      {mediaAsset.mediaType === 'AUDIO' && (
        <div className="p-2.5 bg-slate-800/90 border border-slate-700/60 rounded-xl">
          <audio controls preload="metadata" className="w-full h-8">
            <source src={downloadUrl} type={mediaAsset.mimeType} />
            Your browser does not support HTML5 audio playback.
          </audio>
          <div className="flex justify-between text-[10px] text-slate-400 mt-1 px-1">
            <span className="truncate max-w-[200px]">{mediaAsset.originalName}</span>
            <span>{formattedSize}</span>
          </div>
        </div>
      )}

      {/* DOCUMENT rendering */}
      {mediaAsset.mediaType === 'DOCUMENT' && (
        <div className="flex items-center justify-between p-3 bg-slate-800/90 border border-slate-700/60 rounded-xl gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="truncate">
              <p className="text-xs font-medium text-slate-200 truncate">{mediaAsset.originalName}</p>
              <p className="text-[10px] text-slate-400">{formattedSize}</p>
            </div>
          </div>
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={mediaAsset.originalName}
            className="p-2 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors flex-shrink-0"
            title="Download document"
          >
            <Download className="w-4 h-4" />
          </a>
        </div>
      )}
    </div>
  );
};
