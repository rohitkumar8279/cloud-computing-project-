import { useEffect, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { MAX_UPLOAD_MB } from '../utils/constants';
import { cn, formatBytes } from '../utils/format';
import { validateImage } from '../utils/validators';

export default function ImageUpload({ file, onChange, disabled, progress }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pick = (f) => {
    if (!f) return;
    const problem = validateImage(f);
    setError(problem);
    if (!problem) onChange(f);
  };

  const clear = () => {
    onChange(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  if (file && preview) {
    return (
      <div className="card flex items-center gap-4 p-3">
        <img src={preview} alt="Selected attachment preview" className="h-20 w-20 rounded-lg object-cover" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900">{file.name}</p>
          <p className="text-xs text-gray-500">{formatBytes(file.size)}</p>
          {typeof progress === 'number' && (
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
        <button type="button" onClick={clear} disabled={disabled} className="btn-ghost p-2" aria-label="Remove image">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          'flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors',
          dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-gray-50',
          error && 'border-red-300',
        )}
      >
        <ImagePlus className="h-8 w-8 text-gray-400" aria-hidden="true" />
        <span className="mt-2 text-sm font-medium text-blue-600">Click to upload or drag an image here</span>
        <span className="mt-1 text-xs text-gray-500">JPEG, PNG or WebP, up to {MAX_UPLOAD_MB} MB (optional)</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
