const TEAM_ISO2: Record<string, string> = {
  Mexico: 'mx', 'South Korea': 'kr', 'Korea Republic': 'kr',
  'South Africa': 'za', 'Czech Republic': 'cz', Czechia: 'cz',
  Canada: 'ca', Switzerland: 'ch', Qatar: 'qa',
  'Bosnia-Herzegovina': 'ba', 'Bosnia and Herzegovina': 'ba',
  Brazil: 'br', Morocco: 'ma', Scotland: 'gb-sct',
  Haiti: 'ht', USA: 'us', 'United States': 'us',
  Paraguay: 'py', Australia: 'au', Turkey: 'tr', Türkiye: 'tr',
  Germany: 'de', 'Curaçao': 'cw', Curacao: 'cw',
  "Côte d'Ivoire": 'ci', 'Ivory Coast': 'ci',
  Ecuador: 'ec', Netherlands: 'nl', Japan: 'jp',
  Tunisia: 'tn', Sweden: 'se', Belgium: 'be',
  Egypt: 'eg', Iran: 'ir', 'New Zealand': 'nz',
  Spain: 'es', 'Cabo Verde': 'cv', 'Cape Verde': 'cv',
  'Saudi Arabia': 'sa', Uruguay: 'uy', France: 'fr',
  Senegal: 'sn', Norway: 'no', Iraq: 'iq',
  Argentina: 'ar', Algeria: 'dz', Portugal: 'pt',
  Colombia: 'co', Uzbekistan: 'uz', 'Congo DR': 'cd',
  'DR Congo': 'cd', England: 'gb-eng', Ghana: 'gh',
  Panama: 'pa', Croatia: 'hr', Austria: 'at', Jordan: 'jo',
}

export const TEAM_EMOJI: Record<string, string> = {
  Mexico: '🇲🇽', 'South Korea': '🇰🇷', 'Korea Republic': '🇰🇷',
  'South Africa': '🇿🇦', 'Czech Republic': '🇨🇿', Czechia: '🇨🇿',
  Canada: '🇨🇦', Switzerland: '🇨🇭', Qatar: '🇶🇦',
  'Bosnia-Herzegovina': '🇧🇦', 'Bosnia and Herzegovina': '🇧🇦',
  Brazil: '🇧🇷', Morocco: '🇲🇦', Scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  Haiti: '🇭🇹', USA: '🇺🇸', 'United States': '🇺🇸',
  Paraguay: '🇵🇾', Australia: '🇦🇺', Turkey: '🇹🇷', Türkiye: '🇹🇷',
  Germany: '🇩🇪', 'Curaçao': '🇨🇼', Curacao: '🇨🇼',
  "Côte d'Ivoire": '🇨🇮', 'Ivory Coast': '🇨🇮',
  Ecuador: '🇪🇨', Netherlands: '🇳🇱', Japan: '🇯🇵',
  Tunisia: '🇹🇳', Sweden: '🇸🇪', Belgium: '🇧🇪',
  Egypt: '🇪🇬', Iran: '🇮🇷', 'New Zealand': '🇳🇿',
  Spain: '🇪🇸', 'Cabo Verde': '🇨🇻', 'Cape Verde': '🇨🇻',
  'Saudi Arabia': '🇸🇦', Uruguay: '🇺🇾', France: '🇫🇷',
  Senegal: '🇸🇳', Norway: '🇳🇴', Iraq: '🇮🇶',
  Argentina: '🇦🇷', Algeria: '🇩🇿', Portugal: '🇵🇹',
  Colombia: '🇨🇴', Uzbekistan: '🇺🇿', 'Congo DR': '🇨🇩',
  'DR Congo': '🇨🇩', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Ghana: '🇬🇭',
  Panama: '🇵🇦', Croatia: '🇭🇷', Austria: '🇦🇹', Jordan: '🇯🇴',
}

export function teamFlagUrl(name: string): string {
  const iso2 = TEAM_ISO2[name]
  return iso2 ? `https://flagcdn.com/w80/${iso2}.png` : '⚽'
}

export function teamFlagEmoji(name: string): string {
  return TEAM_EMOJI[name] ?? '⚽'
}
