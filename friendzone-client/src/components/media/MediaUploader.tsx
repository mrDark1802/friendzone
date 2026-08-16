import React, { useState, useRef, useEffect } from 'react';
import { mediaApi } from '../../services/api';
import type { MediaAssetResponse } from '../../services/api';
import { Upload, X, FileText, Image as ImageIcon, Video, Music, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

interface MediaUploaderProps {
  mediaCategory: 'PROFILE' | 'CHAT';
  conversationId?: string;
  onUploadSuccess: (mediaAsset: MediaAssetResponse) => void;
  onCancel?: () => void;
  allowedTypes?: Array<'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT'>;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  mediaCategory,
  conversationId,
  onUploadSuccess,
  onCancel,
  allowedTypes = ['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT'],
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<'idle' | 'init' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const detectMediaType = (file: File): 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | null => {
    const type = file.type.toLowerCase();
    if (type.startsWith('image/')) return 'IMAGE';
    if (type.startsWith('video/')) return 'VIDEO';
    if (type.startsWith('audio/')) return 'AUDIO';
    if (type === 'application/pdf' || type === 'text/plain') return 'DOCUMENT';
    return null;
  };

  const handleFileSelect = (selectedFile: File) => {
    setErrorMessage(null);
    const mediaType = detectMediaType(selectedFile);

    if (!mediaType || !allowedTypes.includes(mediaType)) {
      setErrorMessage(`File type ${selectedFile.type || 'unknown'} is not allowed.`);
      return;
    }

    setFile(selectedFile);
    if (mediaType === 'IMAGE' || mediaType === 'VIDEO') {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    }
  };

  const startUpload = async () => {
    if (!file) return;

    const mediaType = detectMediaType(file);
    if (!mediaType) return;

    try {
      setStatus('init');
      setErrorMessage(null);
      setProgress(0);

      // 1. Initialize Direct Upload
      const initRes = await mediaApi.initUpload({
        mediaCategory,
        mediaType,
        mimeType: file.type || 'application/octet-stream',
        originalName: file.name,
        size: file.size,
        conversationId,
      });

      const { mediaId, uploadUrl } = initRes;

      // 2. Direct PUT Upload to Cloudflare R2 with XHR Progress
      setStatus('uploading');
      await mediaApi.uploadToR2(uploadUrl, file, (pct) => setProgress(pct));

      // 3. Complete & Moderation Processing
      setStatus('processing');
      const completeRes = await mediaApi.completeUpload(mediaId);

      setStatus('success');
      onUploadSuccess(completeRes.mediaAsset);
    } catch (err: any) {
      console.error('Media upload error:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Failed to upload media file.');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl text-slate-100">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
      />

      {!file ? (
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-lg p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors bg-slate-950/40"
        >
          <div className="p-3 rounded-full bg-indigo-500/10 text-indigo-400">
            <Upload className="w-6 h-6" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-200">
              Drag & drop media file or <span className="text-indigo-400 underline">browse</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Supports Images (10MB), Videos (50MB), Audio (20MB), PDFs (20MB)
            </p>
          </div>
          <div className="flex gap-3 text-slate-400 mt-1">
            {allowedTypes.includes('IMAGE') && <ImageIcon className="w-4 h-4" />}
            {allowedTypes.includes('VIDEO') && <Video className="w-4 h-4" />}
            {allowedTypes.includes('AUDIO') && <Music className="w-4 h-4" />}
            {allowedTypes.includes('DOCUMENT') && <FileText className="w-4 h-4" />}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between bg-slate-850 p-3 rounded-lg border border-slate-800">
            <div className="flex items-center gap-3 overflow-hidden">
              {previewUrl && file.type.startsWith('image/') ? (
                <img src={previewUrl} alt="Preview" className="w-12 h-12 object-cover rounded-md flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
                  {file.type.startsWith('video/') ? (
                    <Video className="w-6 h-6" />
                  ) : file.type.startsWith('audio/') ? (
                    <Music className="w-6 h-6" />
                  ) : (
                    <FileText className="w-6 h-6" />
                  )}
                </div>
              )}
              <div className="truncate">
                <p className="text-sm font-medium text-slate-200 truncate">{file.name}</p>
                <p className="text-xs text-slate-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            </div>
            {status === 'idle' && (
              <button
                onClick={() => {
                  setFile(null);
                  setPreviewUrl(null);
                }}
                className="p-1.5 hover:bg-slate-700 rounded-full text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Progress Bar & Status Indicators */}
          {status !== 'idle' && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-300">
                <span>
                  {status === 'init' && 'Initializing security check...'}
                  {status === 'uploading' && `Uploading to R2... ${progress}%`}
                  {status === 'processing' && 'Processing & moderating content...'}
                  {status === 'success' && 'Ready!'}
                  {status === 'error' && 'Upload Failed'}
                </span>
                {status === 'uploading' && <span>{progress}%</span>}
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    status === 'error'
                      ? 'bg-rose-500'
                      : status === 'success'
                      ? 'bg-emerald-500'
                      : 'bg-indigo-500'
                  }`}
                  style={{ width: `${status === 'processing' ? 90 : progress}%` }}
                />
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 mt-1">
            {onCancel && (
              <button
                onClick={onCancel}
                disabled={status === 'uploading' || status === 'processing'}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 rounded-lg disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            )}

            {status === 'idle' || status === 'error' ? (
              <button
                onClick={startUpload}
                className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload File
              </button>
            ) : status === 'success' ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium py-2">
                <CheckCircle2 className="w-4 h-4" />
                Upload Complete
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-indigo-300 bg-indigo-500/10 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                Uploading...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
