import { ChevronDown, Languages } from 'lucide-react';
import { useState } from 'react';

import { TextArea, TextField } from '@/components/ui';

/** English and Russian versions of a name (and optionally a description). Empty = falls back to Arabic. */
export interface TranslationValues {
  nameEn: string;
  nameRu: string;
  descriptionEn: string;
  descriptionRu: string;
}

export const translationValues = (v?: {
  nameEn?: string | null;
  nameRu?: string | null;
  descriptionEn?: string | null;
  descriptionRu?: string | null;
}): TranslationValues => ({
  nameEn: v?.nameEn ?? '',
  nameRu: v?.nameRu ?? '',
  descriptionEn: v?.descriptionEn ?? '',
  descriptionRu: v?.descriptionRu ?? '',
});

/** Trimmed values for the API; an empty string clears a translation. */
export const translationInput = (v: TranslationValues) => ({
  nameEn: v.nameEn.trim(),
  nameRu: v.nameRu.trim(),
  descriptionEn: v.descriptionEn.trim(),
  descriptionRu: v.descriptionRu.trim(),
});

/** Collapsible "الترجمة للسياح" section. */
export function TranslationFields({
  value,
  onChange,
  withDescription = true,
}: {
  value: TranslationValues;
  onChange: (v: TranslationValues) => void;
  withDescription?: boolean;
}) {
  const hasAny = Object.values(value).some((x) => x.trim() !== '');
  const [open, setOpen] = useState(hasAny);
  const set = (key: keyof TranslationValues) => (e: { target: { value: string } }) => onChange({ ...value, [key]: e.target.value });

  return (
    <div className="rounded-2xl border border-line">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 p-3 text-start">
        <Languages className="size-5 text-brand" />
        <span className="flex-1">
          <span className="block text-sm font-extrabold text-ink">الترجمة للسياح</span>
          <span className="block text-xs text-ink-3">English • Русский — اختياري، لو فاضي هيظهر العربي</span>
        </span>
        <ChevronDown className={`size-5 text-ink-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="flex flex-col gap-3 px-3 pb-3">
          <TextField name="nameEn" ltr maxLength={200} label="Name (English)" value={value.nameEn} onChange={set('nameEn')} />
          <TextField name="nameRu" ltr maxLength={200} label="Название (Русский)" value={value.nameRu} onChange={set('nameRu')} />
          {withDescription && (
            <>
              <TextArea name="descriptionEn" dir="ltr" rows={2} label="Description (English)" value={value.descriptionEn} onChange={set('descriptionEn')} />
              <TextArea name="descriptionRu" dir="ltr" rows={2} label="Описание (Русский)" value={value.descriptionRu} onChange={set('descriptionRu')} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
