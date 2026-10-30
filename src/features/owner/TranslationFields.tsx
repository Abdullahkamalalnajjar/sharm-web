import { ChevronDown, Languages } from 'lucide-react';
import { useState } from 'react';

import { TextArea, TextField } from '@/components/ui';
import { t } from '@/lib/i18n';

/** English, Russian, Turkish and Italian versions of a name (and optionally a description). Empty = falls back to Arabic. */
export interface TranslationValues {
  nameEn: string;
  nameRu: string;
  nameTr: string;
  nameIt: string;
  descriptionEn: string;
  descriptionRu: string;
  descriptionTr: string;
  descriptionIt: string;
}

export const translationValues = (v?: {
  nameEn?: string | null;
  nameRu?: string | null;
  nameTr?: string | null;
  nameIt?: string | null;
  descriptionEn?: string | null;
  descriptionRu?: string | null;
  descriptionTr?: string | null;
  descriptionIt?: string | null;
}): TranslationValues => ({
  nameEn: v?.nameEn ?? '',
  nameRu: v?.nameRu ?? '',
  nameTr: v?.nameTr ?? '',
  nameIt: v?.nameIt ?? '',
  descriptionEn: v?.descriptionEn ?? '',
  descriptionRu: v?.descriptionRu ?? '',
  descriptionTr: v?.descriptionTr ?? '',
  descriptionIt: v?.descriptionIt ?? '',
});

/** Trimmed values for the API; an empty string clears a translation. */
export const translationInput = (v: TranslationValues) => ({
  nameEn: v.nameEn.trim(),
  nameRu: v.nameRu.trim(),
  nameTr: v.nameTr.trim(),
  nameIt: v.nameIt.trim(),
  descriptionEn: v.descriptionEn.trim(),
  descriptionRu: v.descriptionRu.trim(),
  descriptionTr: v.descriptionTr.trim(),
  descriptionIt: v.descriptionIt.trim(),
});

/** Collapsible "الترجمة للسياح" section. */
export function TranslationFields({
  value,
  onChange,
  withDescription = true,
  nameLabels = ['Name (English)', 'Название (Русский)', 'Ad (Türkçe)', 'Nome (Italiano)'],
  nameMaxLength = 200,
}: {
  value: TranslationValues;
  onChange: (v: TranslationValues) => void;
  withDescription?: boolean;
  /** The English, Russian, Turkish and Italian labels of the name fields (e.g. "Title" for an offer). */
  nameLabels?: [string, string, string, string];
  nameMaxLength?: number;
}) {
  const hasAny = Object.values(value).some((x) => x.trim() !== '');
  const [open, setOpen] = useState(hasAny);
  const set = (key: keyof TranslationValues) => (e: { target: { value: string } }) => onChange({ ...value, [key]: e.target.value });

  return (
    <div className="rounded-2xl border border-line">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 p-3 text-start">
        <Languages className="size-5 text-brand" />
        <span className="flex-1">
          <span className="block text-sm font-extrabold text-ink">{t('الترجمة للسياح')}</span>
          <span className="block text-xs text-ink-3">{t('English • Русский • Türkçe • Italiano — اختياري، لو فاضي هيظهر العربي')}</span>
        </span>
        <ChevronDown className={`size-5 text-ink-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="flex flex-col gap-3 px-3 pb-3">
          <TextField name="nameEn" ltr maxLength={nameMaxLength} label={nameLabels[0]} value={value.nameEn} onChange={set('nameEn')} />
          <TextField name="nameRu" ltr maxLength={nameMaxLength} label={nameLabels[1]} value={value.nameRu} onChange={set('nameRu')} />
          <TextField name="nameTr" ltr maxLength={nameMaxLength} label={nameLabels[2]} value={value.nameTr} onChange={set('nameTr')} />
          <TextField name="nameIt" ltr maxLength={nameMaxLength} label={nameLabels[3]} value={value.nameIt} onChange={set('nameIt')} />
          {withDescription && (
            <>
              <TextArea name="descriptionEn" dir="ltr" rows={2} label="Description (English)" value={value.descriptionEn} onChange={set('descriptionEn')} />
              <TextArea name="descriptionRu" dir="ltr" rows={2} label="Описание (Русский)" value={value.descriptionRu} onChange={set('descriptionRu')} />
              <TextArea name="descriptionTr" dir="ltr" rows={2} label="Açıklama (Türkçe)" value={value.descriptionTr} onChange={set('descriptionTr')} />
              <TextArea name="descriptionIt" dir="ltr" rows={2} label="Descrizione (Italiano)" value={value.descriptionIt} onChange={set('descriptionIt')} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
