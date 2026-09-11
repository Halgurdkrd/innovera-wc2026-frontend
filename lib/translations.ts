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
  footer_brand:     { EN: 'Ennovera',  KU: 'ئینۆڤێرا' },
  footer_copyright: { EN: '© 2026 Ennovera · AI predictions for entertainment purposes.', KU: 'هەموو حوقوقەکان پارێزراون © ٢٠٢٦ Ennovera' },
  footer_about:     { EN: 'About',               KU: 'دەربارە' },

  // ── Auth modal ───────────────────────────────────────────────────────────────
  auth_title:       { EN: 'Sign in to Ennovera',         KU: 'چوونەژوورەوە بۆ ئینۆڤێرا' },
  auth_subtitle:    { EN: 'Save predictions · Climb the leaderboard · Compete with AI', KU: 'پێشبینیەکانت بپارێزە · لە پلەبەندی بەرزبە · دژ بە AI بپێوێ' },
  auth_google:      { EN: 'Continue with Google',    KU: 'بەردەوامبوون بە Google' },
  auth_facebook:    { EN: 'Continue with Facebook',  KU: 'بەردەوامبوون بە Facebook' },
  auth_coming_soon: { EN: 'Coming soon',             KU: 'بەمزوانە' },
  auth_note:        { EN: 'All match data and predictions remain visible without an account.', KU: 'هەموو داتاو پێشبینیەکان بەبێ ئەکاونت دەبینرێن.' },
  auth_terms:       { EN: 'By continuing you agree to our Terms of Service.', KU: 'بەردەوامبوون بەواتای ڕازیبوون بە مەرجەکانی خزمەتگوزارییە.' },
  auth_close:       { EN: 'Close',                   KU: 'داخستن' },

  // ── About ────────────────────────────────────────────────────────────────────
  about_back:     { EN: '← Home',   KU: '← سەرەکی' },
  about_title:    { EN: 'About Ennovera', KU: 'دەربارەی ئینۆڤێرا' },
  about_tagline:  { EN: 'AI-powered Premier League 2026-27 predictions', KU: 'پێشبینی پرێمیەر لیگ ٢٠٢٦-٢٧ بە هوشی دەستکرد' },

  // ── Fantasy: tabs & page ─────────────────────────────────────────────────────
  fantasy_tab_best_xi:       { EN: 'Best XI',              KU: 'باشترین ١١' },
  fantasy_tab_ai_manager:    { EN: 'AI Manager',           KU: 'بەڕێوەبەری AI' },
  fantasy_tab_blank_slate:   { EN: 'Best £100m Squad',     KU: 'باشترین تیمی ١٠٠ ملیۆن' },
  fantasy_tab_primary:       { EN: 'Optional XI Primary',  KU: 'هەڵبژاردەی سەرەکی' },
  fantasy_tab_opt1:          { EN: 'Optional XI 1',        KU: 'هەڵبژاردەی ١' },
  fantasy_tab_opt2:          { EN: 'Optional XI 2',        KU: 'هەڵبژاردەی ٢' },
  fantasy_tab_opt3:          { EN: 'Optional XI 3',        KU: 'هەڵبژاردەی ٣' },
  fantasy_tab_opt4:          { EN: 'Optional XI 4',        KU: 'هەڵبژاردەی ٤' },
  fantasy_desc_best_xi:      { EN: 'An alternative starting XI. No reserve bench or automatic substitutions.', KU: 'یارمەتی ١١ی جیاواز. بەبێ یەدەگ یان گۆڕینی ئۆتۆماتیکی.' },
  fantasy_desc_ai_manager:   { EN: "Ennovera's own frozen fantasy manager team for this gameweek.", KU: 'تیمی بەڕێوەبەری فەنتازی خۆی ئینۆڤێرا بۆ ئەم هەفتەیە.' },
  fantasy_desc_blank_slate:  { EN: 'A fresh 15-player squad for this gameweek, including starters and substitutes.', KU: 'تیمێکی نوێی ١٥ یاریزان بۆ ئەم هەفتەیە، لەگەڵ سەرەکی و یەدەگ.' },
  fantasy_desc_optional:     { EN: 'An alternative starting XI. No reserve bench or automatic substitutions.', KU: 'یارمەتی ١١ی جیاواز. بەبێ یەدەگ یان گۆڕینی ئۆتۆماتیکی.' },
  fantasy_loading:           { EN: 'Loading…',             KU: 'باردەکرێت…' },
  fantasy_not_available:     { EN: 'Not available yet',    KU: 'هێشتا بەردەست نییە' },
  fantasy_temp_unavailable:  { EN: 'Temporarily unable to load data (a connectivity issue, not a missing forecast).', KU: 'کاتیانە ناتوانرێت داتا باربکرێت (کێشەی پەیوەندی، نەک نەبوونی پێشبینی).' },
  fantasy_retry:             { EN: 'Retry',                KU: 'دووبارە هەوڵدان' },

  // ── Pitch / player card / modal ──────────────────────────────────────────────
  pitch_formation:        { EN: 'Formation',              KU: 'پێکهاتە' },
  pitch_starters:         { EN: 'Starters',                KU: 'یاریزانی سەرەکی' },
  pitch_click_details:    { EN: 'Click player for details', KU: 'کرتە لە یاریزان بکە بۆ وردەکاری' },
  pitch_bench:            { EN: 'Substitutes Bench (Ordered Priority)', KU: 'یاریزانانی یەدەگ (بەپێی ڕیزبەندی)' },
  pitch_price_unavailable:{ EN: 'Price unavailable',       KU: 'نرخ بەردەست نییە' },
  pitch_expected_points:  { EN: 'Expected points',         KU: 'خاڵی پێشبینیکراو' },
  pitch_average_forecast: { EN: 'Average forecast',        KU: 'پێشبینی ناوەند' },
  pitch_not_avail_obj:    { EN: 'Not available for this decision object', KU: 'بۆ ئەم بژاردەیە بەردەست نییە' },
  pitch_fixture:          { EN: 'Fixture',                 KU: 'یاری' },
  pitch_fixture_not_avail:{ EN: 'Fixture data not available for this decision object', KU: 'زانیاری یاری بۆ ئەم بژاردەیە بەردەست نییە' },
  pitch_home:             { EN: 'Home',                    KU: 'ماڵ' },
  pitch_away:             { EN: 'Away',                    KU: 'دەرەوە' },
  pitch_not_started:      { EN: 'Not Started',              KU: 'دەستی پێنەکردووە' },
  pitch_forecast_badge:   { EN: 'Forecast',                KU: 'پێشبینی' },
  pitch_expected_minutes: { EN: 'Expected Minutes',        KU: 'خولەکی پێشبینیکراو' },
  pitch_probability_card: { EN: 'Probability Card',        KU: 'کارتی ئەگەری' },
  pitch_p_start:          { EN: 'P(start)',                KU: 'ئەگەری دەستپێکردن' },
  pitch_p_sub:            { EN: 'P(sub)',                  KU: 'ئەگەری گۆڕین' },
  pitch_p_dnp:            { EN: 'P(DNP)',                  KU: 'ئەگەری یاری نەکردن' },
  pitch_no_prob_fields:   { EN: "No probability-card fields are available for this gameweek's source artifact (historical GW1-3 reconstruction does not include them).", KU: 'زانیاری ئەگەری بۆ ئەم هەفتەیە بەردەست نییە (بۆ GW١-٣ی مێژوویی بەردەست نییە).' },
  pitch_points_outlook:   { EN: 'Points Outlook',          KU: 'پێشبینی مەودای خاڵ' },
  pitch_supplemental:     { EN: 'SUPPLEMENTAL',            KU: 'تەواوکەر' },
  pitch_supplemental_note:{ EN: 'Supplemental estimated outlook -- not part of the original frozen forecast.', KU: 'مەودای پێشبینیکراوی تەواوکەر -- بەشێک نییە لە پێشبینییە جێگیرەکەی سەرەتا.' },
  pitch_likely_range:     { EN: 'Likely range (middle 50%)', KU: 'مەودای ئەگەری (%٥٠ ناوەند)' },
  pitch_upside_p80:       { EN: 'Upside (80th percentile)',  KU: 'بەرزترین ئەگەر (لقی ٨٠)' },
  pitch_outside_range:    { EN: 'Outcomes outside this range remain possible -- P80 is not a maximum or a "most likely score."', KU: 'دەرەنجامی دەرەوەی ئەم مەودایە هێشتا مومکینە -- لقی ٨٠ زۆرترین یان "ئەگەرترین خاڵ" نییە.' },
  pitch_more_detail:      { EN: 'More detail & methodology', KU: 'وردەکاری زیاتر و ڕێبازی کار' },
  pitch_range_not_avail:  { EN: 'Range not available',      KU: 'مەودا بەردەست نییە' },
  pitch_range_not_avail_note: { EN: 'No supplemental outlook has been published for this player/gameweek yet.', KU: 'هێشتا هیچ مەودایەکی تەواوکەر بۆ ئەم یاریزانە/هەفتەیە بڵاونەکراوەتەوە.' },
  squad_outlook_title:    { EN: 'Squad Outlook',            KU: 'پێشبینی مەودای تیم' },
  squad_outlook_mean:     { EN: 'Average expected scored total', KU: 'تێکڕای کۆی خاڵی چاوەڕوانکراو' },
  squad_outlook_not_calibrated: { EN: 'Experimental estimated outlook -- not calibrated. Supplemental analysis, created after the original freeze.', KU: 'پێشبینیکراوی تاقیکارییە -- هێشتا ڕێکنەخراوە (calibrated نییە). شیکارییەکی تەواوکەرە، دروستکراوە دوای جێگیرکردنی سەرەتایی.' },
  squad_outlook_dependence_note: { EN: 'This simulation assumes independent player scores; real match relationships may change the estimated range.', KU: 'ئەم پێشبینیکراوە وا دادەنرێت یاریزانان بە سەربەخۆیی خاڵ وەردەگرن؛ پەیوەندییە ڕاستەقینەکانی یاری لەوانەیە مەودای خەمڵێنراو بگۆڕن.' },
  squad_outlook_autosub_note: { EN: 'Includes automatic substitutions for a non-playing starter and a fixed transfer-hit deduction, where applicable.', KU: 'گۆڕینی خۆکار بۆ یاریزانی سەرەکی کە یاری ناکات و کەمکردنەوەی خاڵی گواستنەوەی جێگیر (ئەگەر پەیوەستبێت) لەخۆدەگرێت.' },
  squad_outlook_raw_xi_note: { EN: "This object's own frozen score does not include captain-doubling -- see raw starting-XI total for the directly comparable figure.", KU: 'خاڵی جێگیری خۆی ئەم بژاردەیە دووبارەکردنەوەی کاپتنی لەخۆناگرێت -- کۆی خاو یاریی سەرەکی بۆ بەراوردی ڕاستەوخۆ ببینە.' },
  own_start_predicted_xi:  { EN: 'Predicted XI total xP',   KU: 'کۆی خاڵی پێشبینیکراوی یاریی سەرەکی' },
  own_start_not_played:    { EN: 'This gameweek has not been played yet -- no actual/net points exist.', KU: 'ئەم هەفتەیە هێشتا یاری نەکراوە -- هیچ خاڵی ڕاستەقینە/نیشتەجێ بوونی نییە.' },
  own_start_net_points:    { EN: 'Net points',              KU: 'کۆی خاڵی نیشتەجێ' },
  own_start_transfer:      { EN: 'Transfer',                KU: 'گواستنەوە' },
  status_connection_issue: { EN: 'Connection issue',        KU: 'کێشەی پەیوەندی' },
  status_not_available:    { EN: 'Not available',           KU: 'بەردەست نییە' },
  status_final_frozen:     { EN: 'Final frozen forecast',   KU: 'پێشبینی کۆتایی جێگیرکراو' },
  status_historical:       { EN: 'Historical reconstruction', KU: 'دووبارەبنیادنانی مێژوویی' },
  final_forecast_not_available: { EN: 'Final forecast not available',  KU: 'پێشبینی کۆتایی بەردەست نییە' },
  object_formation:        { EN: 'Formation',              KU: 'دانانی یاریزانان' },
  object_captain:          { EN: 'Captain',                KU: 'کاپتن' },
  object_vice:             { EN: 'Vice',                   KU: 'جێگری کاپتن' },
  object_predicted_xi_xp:  { EN: 'Predicted XI xP',        KU: 'خاڵی پێشبینیکراوی یاریی سەرەکی' },
  object_final_points:     { EN: 'Final points',           KU: 'کۆی خاڵی کۆتایی' },
  object_not_played_yet:   { EN: 'not played yet',         KU: 'هێشتا یاری نەکراوە' },
  object_selections_unavailable: { EN: 'Player selections unavailable for this decision object at this gameweek. Score shown above is the verified aggregate.', KU: 'هەڵبژاردنی یاریزانان بۆ ئەم بژاردەیە لەم هەفتەیەدا بەردەست نییە. خاڵی سەرەوە کۆی پشتڕاستکراوەیە.' },
} as const

export type TranslationKey = keyof typeof translations

export function tr(key: TranslationKey, lang: Language): string {
  return translations[key][lang]
}

export default translations
