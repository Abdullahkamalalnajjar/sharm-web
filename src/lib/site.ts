// Site-wide links and copy used by the app banner, header and footer.
// Fill these in when the app is published / the contact channels exist. Anything left null is hidden.

export const SITE = {
  name: 'شرم',
  tagline: 'شرم بين إيديك! مطاعم، سوبر ماركت وصيدليات لحد باب البيت في شرم الشيخ.',
  footerNote: 'حمّل التطبيق واطلب من مطاعم ومحلات شرم، وتابع حالة طلبك بالإشعارات أول بأول.',
  year: new Date().getFullYear(),
};

/** Store links of the mobile app. null = badge is hidden. */
export const APP_LINKS: { android: string | null; ios: string | null } = {
  android: null,
  ios: null,
};

/** Contact and social channels shown in the footer. null = hidden. */
export const CONTACT: { phone: string | null; whatsapp: string | null; facebook: string | null; instagram: string | null } = {
  phone: null,
  whatsapp: null,
  facebook: null,
  instagram: null,
};

export const hasAppLinks = () => APP_LINKS.android !== null || APP_LINKS.ios !== null;
