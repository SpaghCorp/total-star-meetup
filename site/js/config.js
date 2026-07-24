/*
 * Total Star Meetup — configuration
 * Plain global (no modules) so the app works on GitHub Pages and file:// alike.
 */
window.GDTSM = window.GDTSM || {};

GDTSM.config = {
  // GDColon's GDBrowser public API. Data source + credit: https://gdbrowser.com
  API_BASE: 'https://gdbrowser.com',

  // How long a fetched profile stays fresh in localStorage before we refetch.
  CACHE_TTL_MS: 15 * 60 * 1000, // 15 minutes

  STORAGE: {
    roster: 'gdtsm:roster',
    profilePrefix: 'gdtsm:profile:',
  },

  // The stats we sum into the group total, in display order.
  // NOTE: global "rank" is deliberately excluded — it is a ranking, not an amount.
  STATS: [
    { key: 'stars',     label: 'Stars',          icon: 'i-star',    cls: 'stars' },
    { key: 'moons',     label: 'Moons',          icon: 'i-moon',    cls: 'moons' },
    { key: 'diamonds',  label: 'Diamonds',       icon: 'i-diamond', cls: 'diamonds' },
    { key: 'coins',     label: 'Secret Coins',   icon: 'i-scoin',   cls: 'scoins' },
    { key: 'userCoins', label: 'User Coins',     icon: 'i-ucoin',   cls: 'ucoins' },
    { key: 'demons',    label: 'Demons',         icon: 'i-demon',   cls: 'demons' },
    { key: 'cp',        label: 'Creator Points', icon: 'i-cp',      cls: 'cp' },
  ],

  // Shown as one-tap examples on the empty state.
  EXAMPLES: ['RobTop', 'Viprin', 'nasgubb', 'TriAxis', 'Serponge'],
};
