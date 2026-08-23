// Central translation registry for all static UI text.
// Dynamic AI content (narratives, team names, etc.) stays in English.

export type Language = 'EN' | 'KU'

const translations = {
  // ── Navigation ──────────────────────────────────────────────────────────────
  nav_home:        { EN: 'Predictions',   KU: 'پێشبینیەکان' },
  nav_explore:     { EN: 'Explore',       KU: 'گەڕان' },
  nav_leaderboard: { EN: 'Leaderboard',   KU: 'پلەبەندی' },
  nav_about:       { EN: 'About',         KU: 'دەربارە' },
  nav_login:       { EN: 'Login',         KU: 'چوونەژوورەوە' },
  nav_sign_out:    { EN: 'Sign Out',      KU: 'چوونەدەرەوە' },

  // ── Hero ────────────────────────────────────────────────────────────────────
  hero_badge:    { EN: 'Powered by AI', KU: 'بە هوشی دەستکرد' },
  hero_subtitle: {
    EN: 'Real-time AI predictions for every Premier League 2026-27 match',
    KU: 'پێشبینی هوشی دەستکرد بۆ هەموو یارییەکانی پرێمیەر لیگ ٢٠٢٦-٢٧',
  },
  hero_cta:   { EN: 'Explore Predictions', KU: 'پێشبینیەکان بپشکنە' },
  stat_matches: { EN: 'Matches',      KU: 'یاری' },
  stat_teams:   { EN: 'Clubs',        KU: 'باشگە' },
  stat_hosts:   { EN: 'Gameweeks',    KU: 'هەفتەکان' },

  // ── Matches ─────────────────────────────────────────────────────────────────
  matches_title:   { EN: "Today's Matches",                   KU: 'یارییەکانی ئەمڕۆ' },
  matches_count:   { EN: 'matches',                           KU: 'یاری' },
  no_matches:      { EN: 'No matches scheduled for today',    KU: 'هیچ یاری ئەمڕۆ بەرنامەریزی نەکراوە' },
  match_live:      { EN: '🔴 LIVE',                           KU: '🔴 ڕاستەوخۆ' },
  match_finished:  { EN: 'Full Time',                         KU: 'تەواوبوو' },
  match_upcoming:  { EN: 'Upcoming',                          KU: 'داهاتوو' },
  match_home:      { EN: 'Home',                              KU: 'ماڵ' },
  match_draw:      { EN: 'Draw',                              KU: 'یەکسان' },
  match_away:      { EN: 'Away',                              KU: 'دەرەوە' },

  // ── Confidence levels ────────────────────────────────────────────────────────
  conf_high:   { EN: 'High Confidence',     KU: 'زۆر دڵنیا' },
  conf_medium: { EN: 'Moderate Confidence', KU: 'دڵنیا' },
  conf_low:    { EN: 'Low Confidence',      KU: 'نادڵنیا' },

  // ── Match detail ─────────────────────────────────────────────────────────────
  back:              { EN: '← All Matches',              KU: '← هەموو یارییەکان' },
  match_prediction:  { EN: 'AI Analysis',                KU: 'شیکاری AI' },
  shap_title:        { EN: 'Key Prediction Factors',     KU: 'هۆکارەکانی پێشبینی' },
  shap_sub:          { EN: 'Powered by SHAP explainability', KU: 'بە هێزی SHAP' },
  scoreline_title:   { EN: 'Most Likely Scorelines',     KU: 'ئەنجامە پێشبینیکراوەکان' },
  momentum_title:    { EN: 'Team Momentum',              KU: 'مۆمێنتەمی تیمەکان' },
  key_player_title:  { EN: 'Key Player Spotlight',       KU: 'لاعبی گرنگ' },
  impact_score:      { EN: 'Impact Score',               KU: 'خەمەی کاریگەری' },
  post_match_title:  { EN: 'Post-Match Analysis',        KU: 'شیکاری دوای یاری' },
  narrative:         { EN: 'AI Match Narrative',         KU: 'چیرۆکی یاری بە AI' },
  no_data:           { EN: 'Prediction data not yet available for this match.', KU: 'داتای پێشبینی بۆ ئەم یارییە بەردەست نیە.' },

  // ── Share card ───────────────────────────────────────────────────────────────
  btn_share_card:  { EN: 'Share Prediction Card', KU: 'کارتی پێشبینی بەشبکە' },
  share_loading:   { EN: 'Generating…',           KU: 'ئامادەکردن…' },
  share_copied:    { EN: 'Link copied!',           KU: 'لینک کۆپی کرا!' },
  btn_share:       { EN: 'Share',                  KU: 'بەشبکە' },
  btn_download:    { EN: 'Download Card',          KU: 'داگرتن' },
  btn_close:       { EN: 'Close',                  KU: 'داخستن' },

  // ── User prediction ──────────────────────────────────────────────────────────
  user_prediction:    { EN: 'Your Prediction',         KU: 'پێشبینیەکەت' },
  home_win:           { EN: 'Home Win',                KU: 'مەیدانەکە دەبەرێت' },
  draw_outcome:       { EN: 'Draw',                    KU: 'یەکسان' },
  away_win:           { EN: 'Away Win',                KU: 'میوان دەبەرێت' },
  predicted_score:    { EN: 'Predicted Score',         KU: 'ئەنجامی پێشبینیکراو' },
  lock_prediction:    { EN: 'Lock My Prediction',      KU: 'پێشبینیەکەم قووڵ بکە' },
  prediction_locked:  { EN: 'Prediction Locked ✓',    KU: 'پێشبینی قووڵکراو ✓' },
  prediction_saving:  { EN: 'Saving…',                 KU: 'پاراستن…' },
  past_kickoff:       { EN: 'Predictions closed',      KU: 'پێشبینی داخرابوو' },
  login_hint:         { EN: 'Login to save your prediction', KU: 'بچە ژوورەوە بۆ پاراستنی پێشبینیەکەت' },
  btn_login:          { EN: 'Login',                   KU: 'چوونەژوورەوە' },

  // ── Luck scores ──────────────────────────────────────────────────────────────
  luck_title:    { EN: "Yesterday's Luck Scores",  KU: 'خەمەی خۆشبەختی دوێنێ' },
  luck_lucky:    { EN: 'Luckiest Teams',            KU: 'تیمە خۆشبەختەکان' },
  luck_unlucky:  { EN: 'Unluckiest Teams',          KU: 'تیمە خراپبەختەکان' },
  luck_deserved: { EN: 'Most Deserved Win',         KU: 'پێویستترین بردنەوە' },

  // ── Explore ──────────────────────────────────────────────────────────────────
  explore_title:      { EN: 'Fixtures & Results', KU: 'یارییەکان و ئەنجامەکان' },
  explore_subtitle:   { EN: '380 matches · 20 clubs · Premier League 2026-27', KU: '٣٨٠ یاری · ٢٠ باشگە · پرێمیەر لیگ ٢٠٢٦-٢٧' },
  search_placeholder: { EN: 'Search team…', KU: 'گەڕان بۆ تیم…' },
  filter_all:         { EN: 'All',             KU: 'هەموو' },
  no_results:         { EN: 'No teams match your search', KU: 'هیچ تیمێک نەدۆزرایەوە' },
  loading_teams:      { EN: 'Loading teams…', KU: 'تیمەکان باردەکرێن…' },

  // ── Leaderboard ──────────────────────────────────────────────────────────────
  leaderboard_title:    { EN: 'Leaderboard',        KU: 'پلەبەندی' },
  leaderboard_subtitle: { EN: 'Top predictors competing against AI · Premier League 2026-27', KU: 'باشترین پێشبینیکەران دژ بە AI · پرێمیەر لیگ ٢٠٢٦-٢٧' },
  tab_weekly:           { EN: 'This Week',           KU: 'ئەم هەفتەیە' },
  tab_total:            { EN: 'Tournament Total',    KU: 'کۆی تورنووان' },
  rank_col:             { EN: 'Rank',                KU: 'پلە' },
  player_col:           { EN: 'Player',              KU: 'یاریزان' },
  points_col:           { EN: 'Points',              KU: 'خاڵ' },
  streak_col:           { EN: 'Streak',              KU: 'زنجیرە' },
  beat_ai_col:          { EN: 'Beat AI',             KU: 'دژ AI' },
  share_rank:           { EN: 'Share My Rank',       KU: 'پلەکەم بەشبکە' },
  share_rank_loading:   { EN: 'Generating…',         KU: 'ئامادەکردن…' },
  share_rank_copied:    { EN: 'Copied!',             KU: 'کۆپیکرا!' },
  your_ranking:         { EN: 'Your Ranking',        KU: 'شوێنەکەت' },
  no_predictions_yet:   { EN: 'No predictions submitted yet — be the first!', KU: 'هیچ پێشبینیەک نەناردراوە — یەکەم بە!' },
  login_leaderboard:    { EN: 'Login to track your rank and compete on the leaderboard', KU: 'بچە ژوورەوە بۆ شوێنپێگیری پلەکەت' },
  you_label:            { EN: 'You',                 KU: 'تۆ' },

  // ── Footer ───────────────────────────────────────────────────────────────────
  footer_brand:     { EN: 'Ennovera AI',  KU: 'ئینۆڤێرا AI' },
  footer_copyright: { EN: '© 2026 Ennovera · AI predictions for entertainment purposes.', KU: 'هەموو حوقوقەکان پارێزراون © ٢٠٢٦ Ennovera' },
  footer_about:     { EN: 'About',               KU: 'دەربارە' },

  // ── Auth modal ───────────────────────────────────────────────────────────────
  auth_title:       { EN: 'Sign in to Ennovera AI',         KU: 'چوونەژوورەوە بۆ ئینۆڤێرا AI' },
  auth_subtitle:    { EN: 'Save predictions · Climb the leaderboard · Compete with AI', KU: 'پێشبینیەکانت بپارێزە · لە پلەبەندی بەرزبە · دژ بە AI بپێوێ' },
  auth_google:      { EN: 'Continue with Google',    KU: 'بەردەوامبوون بە Google' },
  auth_facebook:    { EN: 'Continue with Facebook',  KU: 'بەردەوامبوون بە Facebook' },
  auth_coming_soon: { EN: 'Coming soon',             KU: 'بەمزوانە' },
  auth_note:        { EN: 'All match data and predictions remain visible without an account.', KU: 'هەموو داتاو پێشبینیەکان بەبێ ئەکاونت دەبینرێن.' },
  auth_terms:       { EN: 'By continuing you agree to our Terms of Service.', KU: 'بەردەوامبوون بەواتای ڕازیبوون بە مەرجەکانی خزمەتگوزارییە.' },
  auth_close:       { EN: 'Close',                   KU: 'داخستن' },

  // ── About ────────────────────────────────────────────────────────────────────
  about_back:     { EN: '← Home',   KU: '← سەرەکی' },
  about_title:    { EN: 'About Ennovera AI', KU: 'دەربارەی ئینۆڤێرا AI' },
  about_tagline:  { EN: 'AI-powered Premier League 2026-27 predictions', KU: 'پێشبینی پرێمیەر لیگ ٢٠٢٦-٢٧ بە هوشی دەستکرد' },
} as const

export type TranslationKey = keyof typeof translations

export function tr(key: TranslationKey, lang: Language): string {
  return translations[key][lang]
}

export default translations
