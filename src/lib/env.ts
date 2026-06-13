export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
export const AD_GROUP_ID_BANNER = import.meta.env.VITE_AD_GROUP_ID_BANNER ?? "";
export const AD_GROUP_ID_INTERSTITIAL =
  import.meta.env.VITE_AD_GROUP_ID_INTERSTITIAL ?? "";
export const AD_GROUP_ID_REWARDED =
  import.meta.env.VITE_AD_GROUP_ID_REWARDED ?? "";
export const NOTIFY_TEMPLATE_CODE =
  import.meta.env.VITE_NOTIFY_TEMPLATE_CODE ?? "";
export const HAS_SUPABASE = SUPABASE_URL !== "" && SUPABASE_ANON_KEY !== "";
