import React, { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Upload, Link as LinkIcon, X, ExternalLink } from 'lucide-react';
import { adminUploadImageFile, adminUploadImageFromUrl } from '../../lib/api';

/**
 * Image-field editor used inside the admin Design tab for any CMS key with
 * `type: 'image'`. Supports either uploading a file (multipart) or pasting a
 * public URL — both go through the backend resize + WebP pipeline and return
 * a stable `/api/images/{id}` URL that we write back to the field.
 */
const BACKEND = process.env.REACT_APP_BACKEND_URL || '';
const resolve = (u) => (u && u.startsWith('/api/') ? `${BACKEND}${u}` : u);

const ImageFieldEditor = ({ value, onChange, testKey }) => {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');

  const onPick = () => fileRef.current?.click();

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    setUploading(true);
    try {
      const meta = await adminUploadImageFile(file);
      onChange(meta.url);
      toast.success(`Uploaded (${Math.round((meta.size || 0) / 1024)} KB, WebP)`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onSaveUrl = async () => {
    const u = urlDraft.trim();
    if (!u) return;
    setUploading(true);
    try {
      const meta = await adminUploadImageFromUrl(u);
      onChange(meta.url);
      setUrlDraft('');
      setUrlMode(false);
      toast.success('Fetched, optimized and stored');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not fetch that URL');
    } finally {
      setUploading(false);
    }
  };

  const onClear = () => onChange('');

  return (
    <div className="space-y-3" data-testid={`image-field-${testKey}`}>
      <div className="flex items-start gap-4">
        <div className="w-32 h-32 shrink-0 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200 flex items-center justify-center">
          {value ? (
            <img src={resolve(value)} alt="preview" className="w-full h-full object-cover" />
          ) : (
            <div className="text-[11px] uppercase tracking-widest text-neutral-400">No image</div>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onPick}
              disabled={uploading}
              className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest bg-[#1A1A1A] hover:bg-[#B4593F] disabled:opacity-40 text-white px-4 py-2 rounded-full transition-colors"
              data-testid={`image-upload-${testKey}`}
            >
              <Upload className="w-3 h-3" /> {uploading ? 'Working…' : 'Upload file'}
            </button>
            <button
              type="button"
              onClick={() => setUrlMode(m => !m)}
              disabled={uploading}
              className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest bg-white border border-neutral-200 hover:border-[#B4593F] text-[#1A1A1A] px-4 py-2 rounded-full transition-colors"
              data-testid={`image-url-${testKey}`}
            >
              <LinkIcon className="w-3 h-3" /> Use URL
            </button>
            {value && (
              <>
                <a
                  href={resolve(value)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] uppercase tracking-widest text-neutral-500 hover:text-[#B4593F] px-2 py-2"
                >
                  <ExternalLink className="w-3 h-3" /> Open
                </a>
                <button
                  type="button"
                  onClick={onClear}
                  className="inline-flex items-center gap-1 text-[11px] uppercase tracking-widest text-neutral-500 hover:text-rose-600 px-2 py-2"
                  data-testid={`image-clear-${testKey}`}
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              </>
            )}
          </div>

          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />

          {urlMode && (
            <div className="flex gap-2">
              <input
                type="url"
                value={urlDraft}
                onChange={e => setUrlDraft(e.target.value)}
                placeholder="https://…/image.jpg  (or Google Drive share link)"
                className="flex-1 bg-neutral-50 border border-neutral-200 rounded-full px-4 py-2 text-sm outline-none focus:border-[#B4593F]"
                data-testid={`image-url-input-${testKey}`}
              />
              <button
                type="button"
                onClick={onSaveUrl}
                disabled={!urlDraft.trim() || uploading}
                className="text-[11px] uppercase tracking-widest bg-[#B4593F] hover:bg-[#9E4B32] disabled:opacity-40 text-white px-4 py-2 rounded-full transition-colors"
              >
                Fetch
              </button>
            </div>
          )}

          {value && (
            <div className="text-[11px] text-neutral-400 font-mono truncate" title={value}>{value}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageFieldEditor;
