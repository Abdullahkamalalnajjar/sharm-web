import { ImagePlus, Pencil, Trash2, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { AppImage, Sheet } from '@/components/ui';
import { MenuItem } from '@/features/addresses/AddressesPage';

/** What the user did with the image in a form; applied after the form is saved. */
export type ImageEdit = { kind: 'none' } | { kind: 'picked'; file: File } | { kind: 'removed' };

export const noImageEdit: ImageEdit = { kind: 'none' };

/** Image preview with change / remove actions. Shows the picked file, else the current image, else a placeholder. */
export function ImagePickerField({
  label = 'الصورة',
  currentUrl,
  edit,
  onChange,
  placeholderIcon: Placeholder,
  aspect = 'aspect-video',
}: {
  label?: string;
  currentUrl: string | null | undefined;
  edit: ImageEdit;
  onChange: (edit: ImageEdit) => void;
  placeholderIcon: LucideIcon;
  aspect?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (edit.kind !== 'picked') {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(edit.file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [edit]);

  const hasImage = edit.kind === 'picked' || (edit.kind !== 'removed' && Boolean(currentUrl));

  return (
    <div>
      <p className="mb-2 text-sm font-extrabold text-ink">{label}</p>
      <button
        type="button"
        onClick={() => (hasImage ? setMenuOpen(true) : input.current?.click())}
        className={`relative block w-full overflow-hidden rounded-card border border-line bg-surface-alt ${aspect} hover:border-surface-high`}
      >
        {edit.kind === 'picked' && preview ? (
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : edit.kind !== 'removed' && currentUrl ? (
          <AppImage url={currentUrl} fallback={null} />
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-ink-2">
            <Placeholder className="size-9 text-ink-3" />
            <span className="font-semibold">دوس عشان تضيف صورة</span>
            <span className="text-[11px] text-ink-3">JPG أو PNG • لحد 5 ميجا</span>
          </span>
        )}
        {hasImage && (
          <span className="absolute bottom-2.5 end-2.5 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-sm font-bold text-white">
            <Pencil className="size-3.5" />
            تغيير
          </span>
        )}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onChange({ kind: 'picked', file });
          e.target.value = '';
        }}
      />
      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title={label}>
        <div className="flex flex-col">
          <MenuItem
            onClick={() => {
              setMenuOpen(false);
              input.current?.click();
            }}
          >
            <span className="inline-flex items-center gap-2">
              <ImagePlus className="size-5 text-ink-2" />
              اختار صورة
            </span>
          </MenuItem>
          <MenuItem
            danger
            onClick={() => {
              setMenuOpen(false);
              onChange({ kind: 'removed' });
            }}
          >
            <span className="inline-flex items-center gap-2">
              <Trash2 className="size-5" />
              شيل الصورة
            </span>
          </MenuItem>
        </div>
      </Sheet>
    </div>
  );
}
