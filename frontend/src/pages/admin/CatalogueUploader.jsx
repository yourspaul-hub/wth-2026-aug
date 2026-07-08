import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { FileText, Upload, Trash2, ExternalLink, CheckCircle2 } from 'lucide-react';
import { API_BASE, fetchPublicSettings, adminUploadCatalogue, adminDeleteCatalogue } from '../../lib/api';

/**
 * Product catalogue uploader for the Design admin tab.
 * Uploads a PDF (or similar) — the storefront's "Download Catalogue" button
 * then serves this file via /api/catalogue.
 */
const CatalogueUploader = () => {
  const [current, setCurrent] = useState({ url: '', filename: '' });
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef(null);

  const refresh = () => fetchPublicSettings().then(r => setCurrent(r?.catalogue || { url: '', filename: '' })).catch(() => {});
  useEffect(() => { refresh(); }, []);

  const onFile = async (file) => {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { toast.error('File too large — 50MB max'); return; }
    setUploading(true); setProgress(0);
    try {
      await adminUploadCatalogue(file, setProgress);
      toast.success(`Catalogue uploaded — ${file.name}`);
      await refresh();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false); setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onDelete = async () => {
    if (!window.confirm('Remove the current catalogue file? The "Download Catalogue" button on the storefront will fall back to placeholder.')) return;
    try {
      await adminDeleteCatalogue();
      toast.success('Catalogue removed');
      await refresh();
    } catch {
      toast.error('Delete failed');
    }
  };

  const publicUrl = current.url ? (current.url.startsWith('http') ? current.url : `${API_BASE.replace(/\/api$/, '')}${current.url}`) : '';

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-6 mb-4" data-testid="design-catalogue-uploader">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-[#FDF3EB] flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5 text-[#B4593F]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">Product catalogue</div>
          <div className="text-[11px] text-neutral-500 mt-0.5">Powers the &quot;Download Catalogue&quot; button on the home page (About story block). PDF recommended — 50MB max.</div>

          {current.filename ? (
            <div className="mt-4 flex flex-wrap items-center gap-3 p-3 bg-[#FDF3EB] rounded-xl border border-[#EBD9CE]">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" data-testid="catalogue-current-filename">{current.filename}</div>
                <a href={publicUrl} target="_blank" rel="noreferrer" className="text-[11px] text-[#B4593F] inline-flex items-center gap-1 hover:underline">
                  Open <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <button onClick={onDelete} className="inline-flex items-center gap-1 text-[11px] uppercase tracking-widest text-neutral-500 hover:text-red-500" data-testid="catalogue-delete-btn">
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            </div>
          ) : (
            <div className="mt-4 text-[11px] text-neutral-500 italic">No catalogue uploaded yet — the button on the home page currently does nothing.</div>
          )}

          <label className="mt-4 inline-flex items-center gap-2 bg-[#B4593F] hover:bg-[#9E4B32] text-white px-5 py-2.5 rounded-full text-[11px] uppercase tracking-[0.2em] cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5" />
            {uploading ? `Uploading ${progress}%` : (current.filename ? 'Replace catalogue' : 'Upload catalogue')}
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              disabled={uploading}
              onChange={e => onFile(e.target.files?.[0])}
              data-testid="catalogue-file-input"
            />
          </label>

          {uploading && (
            <div className="mt-3 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#B4593F] transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CatalogueUploader;
