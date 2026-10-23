/**
 * Promo cards of the home page ("أحدث العروض"). The backend has no offers yet, so these are
 * written here. `image` (any URL) replaces the drawn card when set; `endsAt` shows the yellow
 * "ينتهي ..." tag when set.
 */
export interface HomeOffer {
  id: string;
  /** 'custom-order' opens the custom order (طلب خاص) instead of filtering by category. */
  kind?: 'custom-order';
  title: string;
  /** Small tag over the title. */
  subtitle: string;
  /** Line under the title; `highlight` follows it in the highlight color. */
  line?: string;
  /** Big highlighted text, e.g. "توصيل سريع". */
  highlight?: string;
  /** White pill button at the bottom. */
  button?: string;
  /** Filters the store list to the category with this icon key when tapped. null = all. */
  categoryIcon: string | null;
  image?: string;
  endsAt?: string;
  /** CSS gradient of the drawn card. */
  gradient: string;
  emoji: string;
}

export const HOME_OFFERS: HomeOffer[] = [
  {
    id: 'custom-order',
    kind: 'custom-order',
    title: 'مش لاقي اللي نفسك فيه؟',
    subtitle: 'طلب خاص',
    line: 'اكتبلنا عايز إيه، ',
    highlight: 'واحنا نجيبهولك',
    button: 'اطلب دلوقتي',
    categoryIcon: null,
    gradient: 'linear-gradient(135deg, var(--color-brand-light) 0%, var(--color-brand) 45%, var(--color-brand-dark) 100%)',
    emoji: '🛵',
  },
  {
    id: 'market',
    title: 'سوبر ماركت لحد باب البيت',
    subtitle: 'طلبات البيت بتوصل في أسرع وقت',
    highlight: 'توصيل سريع',
    categoryIcon: 'supermarket',
    gradient: 'linear-gradient(135deg, #1f8a4c 0%, #0f4d2a 100%)',
    emoji: '🛒',
  },
  {
    id: 'pharmacy',
    title: 'صيدليات MARID Egypt',
    subtitle: 'دواك يوصلك من أقرب صيدلية',
    highlight: 'على مدار اليوم',
    categoryIcon: 'pharmacy',
    gradient: 'linear-gradient(135deg, #2560c9 0%, #10306b 100%)',
    emoji: '💊',
  },
];
