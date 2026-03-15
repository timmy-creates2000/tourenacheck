/**
 * @file games.js
 * Master list of 150+ video game titles organized by platform/category.
 * Used in tournament creation, search filters, and profile game tags.
 *
 * Each entry: { name, platform, category }
 * platform: 'mobile' | 'pc' | 'console' | 'cross_platform' | 'board' | 'sports'
 * category: genre label for grouping in UI
 */

export const GAMES = [
  // ── Mobile ──────────────────────────────────────────────────────────────
  { name: 'PUBG Mobile',              platform: 'mobile',         category: 'Battle Royale' },
  { name: 'Free Fire',                platform: 'mobile',         category: 'Battle Royale' },
  { name: 'Free Fire MAX',            platform: 'mobile',         category: 'Battle Royale' },
  { name: 'Call of Duty Mobile',      platform: 'mobile',         category: 'FPS' },
  { name: 'Mobile Legends',           platform: 'mobile',         category: 'MOBA' },
  { name: 'Arena of Valor',           platform: 'mobile',         category: 'MOBA' },
  { name: 'Honor of Kings',           platform: 'mobile',         category: 'MOBA' },
  { name: 'Wild Rift',                platform: 'mobile',         category: 'MOBA' },
  { name: 'Clash Royale',             platform: 'mobile',         category: 'Strategy' },
  { name: 'Clash of Clans',           platform: 'mobile',         category: 'Strategy' },
  { name: 'Brawl Stars',              platform: 'mobile',         category: 'Action' },
  { name: 'Candy Crush Saga',         platform: 'mobile',         category: 'Puzzle' },
  { name: 'Subway Surfers',           platform: 'mobile',         category: 'Runner' },
  { name: 'Among Us',                 platform: 'mobile',         category: 'Social Deduction' },
  { name: 'Roblox',                   platform: 'mobile',         category: 'Sandbox' },
  { name: 'Minecraft PE',             platform: 'mobile',         category: 'Sandbox' },
  { name: 'Genshin Impact',           platform: 'mobile',         category: 'RPG' },
  { name: 'Pokémon GO',               platform: 'mobile',         category: 'AR' },
  { name: 'Hearthstone',              platform: 'mobile',         category: 'Card Game' },
  { name: 'Magic: The Gathering Arena', platform: 'mobile',       category: 'Card Game' },
  { name: 'Legends of Runeterra',     platform: 'mobile',         category: 'Card Game' },
  { name: 'Teamfight Tactics Mobile', platform: 'mobile',         category: 'Auto Battler' },
  { name: 'Stumble Guys',             platform: 'mobile',         category: 'Party' },
  { name: 'Ludo King',                platform: 'mobile',         category: 'Board' },
  { name: 'Chess.com',                platform: 'mobile',         category: 'Chess' },
  { name: 'Lichess',                  platform: 'mobile',         category: 'Chess' },
  { name: 'Carrom Pool',              platform: 'mobile',         category: 'Board' },
  { name: 'Scrabble GO',              platform: 'mobile',         category: 'Word' },
  { name: 'Words With Friends',       platform: 'mobile',         category: 'Word' },
  { name: 'Sniper 3D',                platform: 'mobile',         category: 'FPS' },
  { name: 'Critical Ops',             platform: 'mobile',         category: 'FPS' },
  { name: 'Modern Combat 5',          platform: 'mobile',         category: 'FPS' },
  { name: 'Shadowgun Legends',        platform: 'mobile',         category: 'FPS' },
  { name: 'Standoff 2',               platform: 'mobile',         category: 'FPS' },
  { name: 'Garena AOV',               platform: 'mobile',         category: 'MOBA' },
  { name: 'Pokémon UNITE',            platform: 'mobile',         category: 'MOBA' },
  { name: 'Teamfight Tactics',        platform: 'mobile',         category: 'Auto Battler' },
  { name: 'FIFA Mobile',              platform: 'mobile',         category: 'Sports' },
  { name: 'eFootball Mobile',         platform: 'mobile',         category: 'Sports' },
  { name: 'NBA Live Mobile',          platform: 'mobile',         category: 'Sports' },
  { name: 'NBA 2K Mobile',            platform: 'mobile',         category: 'Sports' },
  { name: 'Real Racing 3',            platform: 'mobile',         category: 'Racing' },
  { name: 'Asphalt 9',                platform: 'mobile',         category: 'Racing' },
  { name: 'Asphalt 8',                platform: 'mobile',         category: 'Racing' },
  { name: 'Mortal Kombat Mobile',     platform: 'mobile',         category: 'Fighting' },
  { name: 'Street Fighter IV CE',     platform: 'mobile',         category: 'Fighting' },
  { name: 'Shadow Fight 3',           platform: 'mobile',         category: 'Fighting' },
  { name: 'Shadow Fight 4',           platform: 'mobile',         category: 'Fighting' },
  { name: 'Injustice 2 Mobile',       platform: 'mobile',         category: 'Fighting' },
  { name: 'Fortnite Mobile',          platform: 'mobile',         category: 'Battle Royale' },
  { name: 'Apex Legends Mobile',      platform: 'mobile',         category: 'Battle Royale' },

  // ── PC ──────────────────────────────────────────────────────────────────
  { name: 'Counter-Strike 2',         platform: 'pc',             category: 'FPS' },
  { name: 'CS:GO',                    platform: 'pc',             category: 'FPS' },
  { name: 'Valorant',                 platform: 'pc',             category: 'FPS' },
  { name: 'Overwatch 2',              platform: 'pc',             category: 'FPS' },
  { name: 'Rainbow Six Siege',        platform: 'pc',             category: 'FPS' },
  { name: 'Apex Legends',             platform: 'pc',             category: 'Battle Royale' },
  { name: 'Fortnite',                 platform: 'pc',             category: 'Battle Royale' },
  { name: 'PUBG PC',                  platform: 'pc',             category: 'Battle Royale' },
  { name: 'Warzone',                  platform: 'pc',             category: 'Battle Royale' },
  { name: 'League of Legends',        platform: 'pc',             category: 'MOBA' },
  { name: 'Dota 2',                   platform: 'pc',             category: 'MOBA' },
  { name: 'Smite',                    platform: 'pc',             category: 'MOBA' },
  { name: 'Heroes of the Storm',      platform: 'pc',             category: 'MOBA' },
  { name: 'StarCraft II',             platform: 'pc',             category: 'RTS' },
  { name: 'Age of Empires IV',        platform: 'pc',             category: 'RTS' },
  { name: 'Warcraft III',             platform: 'pc',             category: 'RTS' },
  { name: 'Hearthstone',              platform: 'pc',             category: 'Card Game' },
  { name: 'Teamfight Tactics',        platform: 'pc',             category: 'Auto Battler' },
  { name: 'Legends of Runeterra',     platform: 'pc',             category: 'Card Game' },
  { name: 'Gwent',                    platform: 'pc',             category: 'Card Game' },
  { name: 'Rocket League',            platform: 'pc',             category: 'Sports' },
  { name: 'FIFA 24',                  platform: 'pc',             category: 'Sports' },
  { name: 'eFootball 2024',           platform: 'pc',             category: 'Sports' },
  { name: 'NBA 2K24',                 platform: 'pc',             category: 'Sports' },
  { name: 'Minecraft',                platform: 'pc',             category: 'Sandbox' },
  { name: 'Roblox',                   platform: 'pc',             category: 'Sandbox' },
  { name: 'Genshin Impact',           platform: 'pc',             category: 'RPG' },
  { name: 'Path of Exile',            platform: 'pc',             category: 'RPG' },
  { name: 'World of Warcraft',        platform: 'pc',             category: 'MMO' },
  { name: 'Final Fantasy XIV',        platform: 'pc',             category: 'MMO' },
  { name: 'Chess.com',                platform: 'pc',             category: 'Chess' },
  { name: 'Lichess',                  platform: 'pc',             category: 'Chess' },
  { name: 'Mortal Kombat 1',          platform: 'pc',             category: 'Fighting' },
  { name: 'Street Fighter 6',         platform: 'pc',             category: 'Fighting' },
  { name: 'Tekken 8',                 platform: 'pc',             category: 'Fighting' },
  { name: 'Guilty Gear Strive',       platform: 'pc',             category: 'Fighting' },
  { name: 'Fall Guys',                platform: 'pc',             category: 'Party' },
  { name: 'Among Us',                 platform: 'pc',             category: 'Social Deduction' },
  { name: 'Escape from Tarkov',       platform: 'pc',             category: 'FPS' },
  { name: 'Hunt: Showdown',           platform: 'pc',             category: 'FPS' },

  // ── Console ─────────────────────────────────────────────────────────────
  { name: 'FIFA 24 (Console)',         platform: 'console',        category: 'Sports' },
  { name: 'eFootball 2024 (Console)', platform: 'console',        category: 'Sports' },
  { name: 'NBA 2K24 (Console)',        platform: 'console',        category: 'Sports' },
  { name: 'Madden NFL 24',            platform: 'console',        category: 'Sports' },
  { name: 'WWE 2K24',                 platform: 'console',        category: 'Sports' },
  { name: 'Mortal Kombat 1 (Console)',platform: 'console',        category: 'Fighting' },
  { name: 'Street Fighter 6 (Console)',platform: 'console',       category: 'Fighting' },
  { name: 'Tekken 8 (Console)',        platform: 'console',        category: 'Fighting' },
  { name: 'Super Smash Bros. Ultimate',platform: 'console',       category: 'Fighting' },
  { name: 'Fortnite (Console)',        platform: 'console',        category: 'Battle Royale' },
  { name: 'Warzone (Console)',         platform: 'console',        category: 'Battle Royale' },
  { name: 'Apex Legends (Console)',    platform: 'console',        category: 'Battle Royale' },
  { name: 'Rocket League (Console)',   platform: 'console',        category: 'Sports' },
  { name: 'Gran Turismo 7',           platform: 'console',        category: 'Racing' },
  { name: 'Forza Motorsport',         platform: 'console',        category: 'Racing' },
  { name: 'Mario Kart 8 Deluxe',      platform: 'console',        category: 'Racing' },
  { name: 'Halo Infinite',            platform: 'console',        category: 'FPS' },
  { name: 'Destiny 2 (Console)',       platform: 'console',        category: 'FPS' },
  { name: 'Overwatch 2 (Console)',     platform: 'console',        category: 'FPS' },
  { name: 'Rainbow Six Siege (Console)',platform: 'console',      category: 'FPS' },
  { name: 'Minecraft (Console)',       platform: 'console',        category: 'Sandbox' },
  { name: 'Roblox (Console)',          platform: 'console',        category: 'Sandbox' },
  { name: 'Fall Guys (Console)',       platform: 'console',        category: 'Party' },
  { name: 'Splatoon 3',               platform: 'console',        category: 'Shooter' },
  { name: 'Pokémon Scarlet/Violet',   platform: 'console',        category: 'RPG' },

  // ── Cross-Platform ───────────────────────────────────────────────────────
  { name: 'Fortnite (Cross-Platform)', platform: 'cross_platform', category: 'Battle Royale' },
  { name: 'Warzone (Cross-Platform)',  platform: 'cross_platform', category: 'Battle Royale' },
  { name: 'Apex Legends (Cross)',      platform: 'cross_platform', category: 'Battle Royale' },
  { name: 'Rocket League (Cross)',     platform: 'cross_platform', category: 'Sports' },
  { name: 'Minecraft (Cross)',         platform: 'cross_platform', category: 'Sandbox' },
  { name: 'Among Us (Cross)',          platform: 'cross_platform', category: 'Social Deduction' },
  { name: 'Fall Guys (Cross)',         platform: 'cross_platform', category: 'Party' },
  { name: 'Genshin Impact (Cross)',    platform: 'cross_platform', category: 'RPG' },
  { name: 'Overwatch 2 (Cross)',       platform: 'cross_platform', category: 'FPS' },
  { name: 'Destiny 2 (Cross)',         platform: 'cross_platform', category: 'FPS' },

  // ── Board / Card / Classic ───────────────────────────────────────────────
  { name: 'Chess',                    platform: 'board',          category: 'Chess' },
  { name: 'Checkers',                 platform: 'board',          category: 'Board' },
  { name: 'Draughts',                 platform: 'board',          category: 'Board' },
  { name: 'Ludo',                     platform: 'board',          category: 'Board' },
  { name: 'Scrabble',                 platform: 'board',          category: 'Word' },
  { name: 'Monopoly',                 platform: 'board',          category: 'Board' },
  { name: 'Uno',                      platform: 'board',          category: 'Card Game' },
  { name: 'Poker',                    platform: 'board',          category: 'Card Game' },
  { name: 'Whot',                     platform: 'board',          category: 'Card Game' },
  { name: 'Oware',                    platform: 'board',          category: 'Board' },
  { name: 'Ayo',                      platform: 'board',          category: 'Board' },
  { name: 'Draughts (Nigerian)',       platform: 'board',          category: 'Board' },
  { name: 'Backgammon',               platform: 'board',          category: 'Board' },
  { name: 'Dominoes',                 platform: 'board',          category: 'Board' },

  // ── Sports / Esports ────────────────────────────────────────────────────
  { name: 'FIFA (Any Edition)',        platform: 'sports',         category: 'Football' },
  { name: 'eFootball',                platform: 'sports',         category: 'Football' },
  { name: 'NBA 2K (Any Edition)',      platform: 'sports',         category: 'Basketball' },
  { name: 'Madden NFL',               platform: 'sports',         category: 'American Football' },
  { name: 'WWE 2K',                   platform: 'sports',         category: 'Wrestling' },
  { name: 'UFC 5',                    platform: 'sports',         category: 'MMA' },
  { name: 'EA Sports FC 24',          platform: 'sports',         category: 'Football' },
  { name: 'Rocket League',            platform: 'sports',         category: 'Rocket Football' },
  { name: 'Gran Turismo',             platform: 'sports',         category: 'Racing' },
  { name: 'F1 24',                    platform: 'sports',         category: 'Racing' },
  { name: 'Other',                    platform: 'other',          category: 'Other' },
]

/**
 * Get unique platform options from the games list.
 * @returns {string[]}
 */
export const GAME_PLATFORMS = [...new Set(GAMES.map(g => g.platform))]

/**
 * Get unique category options from the games list.
 * @returns {string[]}
 */
export const GAME_CATEGORIES = [...new Set(GAMES.map(g => g.category))].sort()

/**
 * Get all game names as a flat sorted array for dropdowns.
 * @returns {string[]}
 */
export const GAME_NAMES = [...new Set(GAMES.map(g => g.name))].sort()

/**
 * Filter games by platform.
 * @param {string} platform
 * @returns {typeof GAMES}
 */
export function getGamesByPlatform(platform) {
  return GAMES.filter(g => g.platform === platform)
}

/**
 * Filter games by category.
 * @param {string} category
 * @returns {typeof GAMES}
 */
export function getGamesByCategory(category) {
  return GAMES.filter(g => g.category === category)
}

/**
 * Search games by name (case-insensitive).
 * @param {string} query
 * @returns {typeof GAMES}
 */
export function searchGames(query) {
  const q = query.toLowerCase()
  return GAMES.filter(g => g.name.toLowerCase().includes(q))
}
