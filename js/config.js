const STORAGE_KEY = 'formula_manager_2026_save_v10';
const BASE_CAREER_YEARS = 7;
const BUDGET_CAP_2026 = 200.0;
const FOM_PRIZE_POOL = [135.0, 122.0, 112.0, 102.0, 94.0, 86.0, 79.0, 73.0, 68.0, 64.0, 60.0];

const SPONSOR_OPTIONS = [
  {
    id: 'apex_tech',
    name: 'Apex Global Tech',
    tagline: 'Contratto bilanciato: buona firma iniziale, rata costante e premi a punti',
    upfront: 18.0,
    perRace: 2.2,
    podiumBonus: 3.5,
    winBonus: 6.0,
    pointsBonus: 0.9
  },
  {
    id: 'solaris_bank',
    name: 'Solaris Private Bank',
    tagline: 'Massima liquidita garantita subito e a ogni GP (ideale per coprire il Budget Cap)',
    upfront: 30.0,
    perRace: 2.8,
    podiumBonus: 2.0,
    winBonus: 4.0,
    pointsBonus: 0.5
  },
  {
    id: 'veloce_fuel',
    name: 'Veloce Energy & Fuel',
    tagline: 'Fisso piu basso, ma premi altissimi su punti, podi e vittorie (da Top Team)',
    upfront: 12.0,
    perRace: 1.6,
    podiumBonus: 5.5,
    winBonus: 9.5,
    pointsBonus: 1.4
  }
];

const INITIAL_TEAMS = [
  { id: 'ferrari', name: 'Scuderia Rossa', short: 'ROS', color: '#e10600', budget: 226.0, aero: 89, pu: 88, chassis: 88, rel: 86, objective: 2, prestige: 94, dna: 'balanced', hierarchy: 'equal', fanPassion: 96, tpName: 'F. Vasseurini' },
  { id: 'redbull', name: 'Toro Alato Racing', short: 'TAR', color: '#1e41ff', budget: 228.0, aero: 91, pu: 90, chassis: 89, rel: 88, objective: 1, prestige: 95, dna: 'downforce', hierarchy: '1st_2nd', fanPassion: 85, tpName: 'C. Hornerino' },
  { id: 'mclaren', name: 'Papaia Racing', short: 'PAP', color: '#ff8000', budget: 218.0, aero: 90, pu: 89, chassis: 89, rel: 87, objective: 2, prestige: 91, dna: 'balanced', hierarchy: 'equal', fanPassion: 88, tpName: 'A. Stellone' },
  { id: 'mercedes', name: 'Argento GP', short: 'ARG', color: '#00d2be', budget: 222.0, aero: 87, pu: 90, chassis: 88, rel: 89, objective: 3, prestige: 93, dna: 'topSpeed', hierarchy: '1st_2nd', fanPassion: 86, tpName: 'T. Wolffini' },
  { id: 'aston', name: 'Verde Britannico', short: 'VER', color: '#006f62', budget: 192.0, aero: 84, pu: 86, chassis: 84, rel: 84, objective: 5, prestige: 80, dna: 'downforce', hierarchy: '1st_2nd', fanPassion: 74, tpName: 'M. Kracko' },
  { id: 'audi', name: 'Quattro Anelli Audi', short: 'AUD', color: '#c0c0c0', budget: 188.0, aero: 82, pu: 81, chassis: 83, rel: 80, objective: 6, prestige: 84, dna: 'balanced', hierarchy: '1st_2nd', fanPassion: 82, tpName: 'M. Binottini' },
  { id: 'williams', name: 'Grove Azzurra', short: 'GRO', color: '#005aff', budget: 172.0, aero: 79, pu: 85, chassis: 79, rel: 81, objective: 7, prestige: 77, dna: 'topSpeed', hierarchy: '1st_2nd', fanPassion: 79, tpName: 'J. Vowlesi' },
  { id: 'alpine', name: 'Blu Alpino F1', short: 'ALP', color: '#ff69b4', budget: 170.0, aero: 80, pu: 82, chassis: 81, rel: 80, objective: 7, prestige: 75, dna: 'topSpeed', hierarchy: '1st_2nd', fanPassion: 72, tpName: 'O. Oakesi' },
  { id: 'cadillac', name: 'Stella Cadillac', short: 'CAD', color: '#eab308', budget: 168.0, aero: 77, pu: 79, chassis: 78, rel: 77, objective: 8, prestige: 76, dna: 'topSpeed', hierarchy: 'equal', fanPassion: 77, tpName: 'G. Lowdoni' },
  { id: 'vcarb', name: 'Faenza Toro', short: 'FAE', color: '#2b4562', budget: 154.0, aero: 78, pu: 84, chassis: 78, rel: 82, objective: 8, prestige: 70, dna: 'balanced', hierarchy: 'equal', fanPassion: 66, tpName: 'L. Mekkiesi' },
  { id: 'haas', name: 'Stella Americana', short: 'AME', color: '#b6babd', budget: 148.0, aero: 76, pu: 83, chassis: 76, rel: 79, objective: 9, prestige: 66, dna: 'balanced', hierarchy: 'equal', fanPassion: 64, tpName: 'A. Komatsui' }
];

const DRIVER_TRAITS = {
  attacker: { id: 'attacker', label: 'Attaccante', icon: '⚔️', desc: 'Feroce nei duelli e sul giro secco, ma piu esigente sulle gomme.' },
  team_player: { id: 'team_player', label: 'Uomo Squadra', icon: '🤝', desc: 'Accetta piu facilmente i ruoli e collabora agli ordini del muretto.' },
  tactician: { id: 'tactician', label: 'Tattico', icon: '🧠', desc: 'Lettura pulita del degrado e costanza sul passo gara.' },
  hothead: { id: 'hothead', label: 'Testa Calda', icon: '🔥', desc: 'Scintille alte in rivalita e reazioni forti se declassato o superato.' },
  wet_ace: { id: 'wet_ace', label: 'Mago del Bagno', icon: '🌧️', desc: 'Sensibilita superiore su asfalto umido o bagnato.' }
};

const INITIAL_DRIVERS = [
  { id: 'lec', name: 'Carletto Leclaire', code: 'LEC', number: 16, teamId: 'ferrari', role: 'co_lead', ovr: 91, potential: 94, pace: 92, cons: 89, tyreMgmt: 88, age: 28, contract: 2, salary: 24.0, mood: 68, fatigue: 15, trainingBoost: 0, trait: 'attacker', preferredDna: 'balanced', acceptsSupport: false, transferRequest: false },
  { id: 'ham', name: 'Luigi Amilton', code: 'HAM', number: 44, teamId: 'ferrari', role: 'co_lead', ovr: 90, potential: 91, pace: 89, cons: 91, tyreMgmt: 92, age: 41, contract: 1, salary: 28.0, mood: 70, fatigue: 20, trainingBoost: 0, trait: 'tactician', preferredDna: 'balanced', acceptsSupport: false, transferRequest: false },
  { id: 'ver', name: 'Massimo Verstappo', code: 'VER', number: 1, teamId: 'redbull', role: 'lead', ovr: 95, potential: 97, pace: 96, cons: 94, tyreMgmt: 93, age: 28, contract: 3, salary: 32.0, mood: 74, fatigue: 15, trainingBoost: 0, trait: 'attacker', preferredDna: 'downforce', acceptsSupport: false, transferRequest: false },
  { id: 'law', name: 'Liamos Lavson', code: 'LAW', number: 30, teamId: 'redbull', role: 'support', ovr: 82, potential: 88, pace: 83, cons: 81, tyreMgmt: 80, age: 24, contract: 1, salary: 4.5, mood: 64, fatigue: 15, trainingBoost: 0, trait: 'hothead', preferredDna: 'downforce', acceptsSupport: true, transferRequest: false },
  { id: 'nor', name: 'Lando Norri', code: 'NOR', number: 4, teamId: 'mclaren', role: 'co_lead', ovr: 91, potential: 95, pace: 92, cons: 90, tyreMgmt: 89, age: 26, contract: 2, salary: 20.0, mood: 72, fatigue: 15, trainingBoost: 0, trait: 'tactician', preferredDna: 'balanced', acceptsSupport: false, transferRequest: false },
  { id: 'pia', name: 'Oscar Piastrello', code: 'PIA', number: 81, teamId: 'mclaren', role: 'co_lead', ovr: 88, potential: 94, pace: 89, cons: 88, tyreMgmt: 87, age: 25, contract: 2, salary: 12.0, mood: 67, fatigue: 15, trainingBoost: 0, trait: 'tactician', preferredDna: 'balanced', acceptsSupport: false, transferRequest: false },
  { id: 'rus', name: 'Giorgio Russi', code: 'RUS', number: 63, teamId: 'mercedes', role: 'lead', ovr: 89, potential: 92, pace: 90, cons: 89, tyreMgmt: 87, age: 28, contract: 1, salary: 16.0, mood: 66, fatigue: 15, trainingBoost: 0, trait: 'tactician', preferredDna: 'topSpeed', acceptsSupport: false, transferRequest: false },
  { id: 'ant', name: 'Kimi Antonelli', code: 'ANT', number: 12, teamId: 'mercedes', role: 'support', ovr: 83, potential: 93, pace: 85, cons: 81, tyreMgmt: 82, age: 19, contract: 2, salary: 5.0, mood: 69, fatigue: 12, trainingBoost: 0, trait: 'attacker', preferredDna: 'topSpeed', acceptsSupport: true, transferRequest: false },
  { id: 'alo', name: 'Fernando Alonsino', code: 'ALO', number: 14, teamId: 'aston', role: 'lead', ovr: 89, potential: 90, pace: 88, cons: 92, tyreMgmt: 91, age: 44, contract: 1, salary: 18.0, mood: 65, fatigue: 22, trainingBoost: 0, trait: 'wet_ace', preferredDna: 'downforce', acceptsSupport: false, transferRequest: false },
  { id: 'str', name: 'Lance Strollo', code: 'STR', number: 18, teamId: 'aston', role: 'support', ovr: 79, potential: 81, pace: 78, cons: 79, tyreMgmt: 81, age: 27, contract: 2, salary: 5.5, mood: 58, fatigue: 15, trainingBoost: 0, trait: 'team_player', preferredDna: 'downforce', acceptsSupport: true, transferRequest: false },
  { id: 'gas', name: 'Pietro Gaslini', code: 'GAS', number: 10, teamId: 'alpine', role: 'lead', ovr: 85, potential: 88, pace: 86, cons: 85, tyreMgmt: 84, age: 30, contract: 1, salary: 8.5, mood: 62, fatigue: 15, trainingBoost: 0, trait: 'attacker', preferredDna: 'topSpeed', acceptsSupport: false, transferRequest: false },
  { id: 'dooh', name: 'Jack Duan', code: 'DUA', number: 7, teamId: 'alpine', role: 'support', ovr: 78, potential: 85, pace: 79, cons: 77, tyreMgmt: 78, age: 23, contract: 1, salary: 2.5, mood: 61, fatigue: 15, trainingBoost: 0, trait: 'team_player', preferredDna: 'topSpeed', acceptsSupport: true, transferRequest: false },
  { id: 'sai', name: 'Carlos Sainzino', code: 'SAI', number: 55, teamId: 'williams', role: 'lead', ovr: 88, potential: 90, pace: 88, cons: 89, tyreMgmt: 88, age: 31, contract: 2, salary: 14.0, mood: 66, fatigue: 15, trainingBoost: 0, trait: 'tactician', preferredDna: 'topSpeed', acceptsSupport: false, transferRequest: false },
  { id: 'alb', name: 'Alex Alboni', code: 'ALB', number: 23, teamId: 'williams', role: 'support', ovr: 85, potential: 88, pace: 85, cons: 85, tyreMgmt: 86, age: 30, contract: 1, salary: 8.0, mood: 65, fatigue: 15, trainingBoost: 0, trait: 'team_player', preferredDna: 'topSpeed', acceptsSupport: true, transferRequest: false },
  { id: 'tsu', name: 'Yuki Tsunodini', code: 'TSU', number: 22, teamId: 'vcarb', role: 'co_lead', ovr: 82, potential: 86, pace: 84, cons: 80, tyreMgmt: 80, age: 25, contract: 1, salary: 3.5, mood: 63, fatigue: 15, trainingBoost: 0, trait: 'hothead', preferredDna: 'balanced', acceptsSupport: false, transferRequest: false },
  { id: 'had', name: 'Isack Adjar', code: 'ADJ', number: 6, teamId: 'vcarb', role: 'co_lead', ovr: 79, potential: 89, pace: 81, cons: 78, tyreMgmt: 78, age: 21, contract: 1, salary: 2.0, mood: 64, fatigue: 15, trainingBoost: 0, trait: 'attacker', preferredDna: 'balanced', acceptsSupport: true, transferRequest: false },
  { id: 'oco', name: 'Esteban Oconni', code: 'OCO', number: 31, teamId: 'haas', role: 'co_lead', ovr: 83, potential: 85, pace: 83, cons: 84, tyreMgmt: 83, age: 29, contract: 1, salary: 6.5, mood: 60, fatigue: 15, trainingBoost: 0, trait: 'hothead', preferredDna: 'balanced', acceptsSupport: false, transferRequest: false },
  { id: 'bea', name: 'Oliver Bermanno', code: 'BER', number: 87, teamId: 'haas', role: 'co_lead', ovr: 80, potential: 90, pace: 81, cons: 79, tyreMgmt: 80, age: 21, contract: 2, salary: 2.5, mood: 63, fatigue: 15, trainingBoost: 0, trait: 'attacker', preferredDna: 'balanced', acceptsSupport: true, transferRequest: false },
  { id: 'hul', name: 'Nico Hulkenbergio', code: 'HUL', number: 27, teamId: 'audi', role: 'lead', ovr: 84, potential: 85, pace: 84, cons: 85, tyreMgmt: 84, age: 38, contract: 1, salary: 7.5, mood: 66, fatigue: 18, trainingBoost: 0, trait: 'tactician', preferredDna: 'balanced', acceptsSupport: true, transferRequest: false },
  { id: 'bor', name: 'Gabriel Bortoletti', code: 'BOR', number: 5, teamId: 'audi', role: 'support', ovr: 80, potential: 91, pace: 82, cons: 79, tyreMgmt: 80, age: 21, contract: 2, salary: 3.0, mood: 67, fatigue: 14, trainingBoost: 0, trait: 'wet_ace', preferredDna: 'balanced', acceptsSupport: true, transferRequest: false },
  { id: 'bot', name: 'Valtteri Bottini', code: 'BOT', number: 77, teamId: 'cadillac', role: 'co_lead', ovr: 82, potential: 83, pace: 81, cons: 84, tyreMgmt: 83, age: 36, contract: 1, salary: 6.0, mood: 64, fatigue: 18, trainingBoost: 0, trait: 'team_player', preferredDna: 'topSpeed', acceptsSupport: true, transferRequest: false },
  { id: 'per', name: 'Sergio Perezi', code: 'PER', number: 11, teamId: 'cadillac', role: 'co_lead', ovr: 81, potential: 82, pace: 80, cons: 81, tyreMgmt: 85, age: 36, contract: 1, salary: 6.5, mood: 62, fatigue: 18, trainingBoost: 0, trait: 'wet_ace', preferredDna: 'topSpeed', acceptsSupport: true, transferRequest: false }
];

const FREE_AGENTS_POOL = [
  { id: 'ric', name: 'Daniel Ricciardone', code: 'RIC', number: 3, ovr: 81, potential: 82, pace: 81, cons: 82, tyreMgmt: 82, age: 36, contract: 1, salary: 5.0, mood: 63, fatigue: 12, trainingBoost: 0, trait: 'attacker', preferredDna: 'balanced', acceptsSupport: true, transferRequest: false },
  { id: 'mag', name: 'Kevin Magnusseni', code: 'MAG', number: 20, ovr: 79, potential: 80, pace: 80, cons: 78, tyreMgmt: 79, age: 33, contract: 1, salary: 4.0, mood: 60, fatigue: 12, trainingBoost: 0, trait: 'hothead', preferredDna: 'balanced', acceptsSupport: true, transferRequest: false },
  { id: 'col', name: 'Franco Colapintino', code: 'COL', number: 43, ovr: 80, potential: 89, pace: 82, cons: 79, tyreMgmt: 79, age: 22, contract: 2, salary: 2.2, mood: 66, fatigue: 10, trainingBoost: 0, trait: 'attacker', preferredDna: 'topSpeed', acceptsSupport: false, transferRequest: false },
  { id: 'pour', name: 'Theo Pourchairetti', code: 'POU', number: 98, ovr: 78, potential: 86, pace: 79, cons: 78, tyreMgmt: 78, age: 22, contract: 1, salary: 1.8, mood: 62, fatigue: 12, trainingBoost: 0, trait: 'tactician', preferredDna: 'balanced', acceptsSupport: true, transferRequest: false },
  { id: 'dru', name: 'Felipe Drugovichi', code: 'DRU', number: 34, ovr: 77, potential: 83, pace: 78, cons: 78, tyreMgmt: 77, age: 25, contract: 1, salary: 1.6, mood: 60, fatigue: 12, trainingBoost: 0, trait: 'team_player', preferredDna: 'downforce', acceptsSupport: true, transferRequest: false }
];

const CALENDAR_2026 = [
  { round: 1, startMonth: 3, startDay: 6, endDay: 8, dateLabel: '6-8 Mar', name: 'Australia', circuit: 'Albert Park', flag: '🇦🇺', laps: 58, baseLap: 79.5, downforce: 7, topSpeed: 7, tyreDeg: 2, rainChance: 0.20, hasSprint: false, path: 'M 150,130 L 82,130 C 48,130 34,104 52,82 L 84,48 C 102,30 132,36 144,58 L 164,84 C 176,96 196,74 186,52 C 178,34 214,28 242,46 C 268,64 268,104 244,122 C 226,134 192,130 150,130 Z' },
  { round: 2, startMonth: 3, startDay: 13, endDay: 15, dateLabel: '13-15 Mar', name: 'Cina', circuit: 'Shanghai', flag: '🇨🇳', laps: 56, baseLap: 95.0, downforce: 6, topSpeed: 8, tyreDeg: 3, rainChance: 0.15, hasSprint: true, path: 'M 150,130 L 74,130 C 46,130 38,96 58,72 L 96,42 C 122,24 156,36 152,64 C 148,84 182,92 204,68 L 228,44 C 252,32 270,58 262,94 C 254,124 220,130 150,130 Z' },
  { round: 3, startMonth: 3, startDay: 27, endDay: 29, dateLabel: '27-29 Mar', name: 'Giappone', circuit: 'Suzuka', flag: '🇯🇵', laps: 53, baseLap: 90.5, downforce: 9, topSpeed: 7, tyreDeg: 3, rainChance: 0.25, hasSprint: false, path: 'M 150,130 L 86,130 C 56,130 48,104 72,90 L 118,74 C 134,68 112,50 86,52 C 62,54 68,28 106,28 C 144,28 158,56 188,68 C 218,80 258,64 264,92 C 270,122 238,130 150,130 Z' },
  { round: 4, startMonth: 4, startDay: 10, endDay: 12, dateLabel: '10-12 Apr', name: 'Bahrain', circuit: 'Sakhir', flag: '🇧🇭', laps: 57, baseLap: 91.2, downforce: 5, topSpeed: 8, tyreDeg: 3, rainChance: 0.02, hasSprint: false, path: 'M 150,130 L 78,130 L 44,104 L 84,76 L 136,44 L 224,38 L 262,68 L 244,108 L 214,130 Z' },
  { round: 5, startMonth: 4, startDay: 17, endDay: 19, dateLabel: '17-19 Apr', name: 'Arabia Saudita', circuit: 'Jeddah', flag: '🇸🇦', laps: 50, baseLap: 89.8, downforce: 4, topSpeed: 9, tyreDeg: 2, rainChance: 0.02, hasSprint: false, path: 'M 150,130 L 72,130 C 42,130 38,98 62,80 L 128,46 L 236,38 C 266,42 270,78 248,98 L 218,130 Z' },
  { round: 6, startMonth: 5, startDay: 1, endDay: 3, dateLabel: '1-3 Mag', name: 'Miami', circuit: 'Miami Autodrome', flag: '🇺🇸', laps: 57, baseLap: 89.4, downforce: 6, topSpeed: 8, tyreDeg: 2, rainChance: 0.22, hasSprint: true, path: 'M 150,130 L 74,130 L 42,108 L 46,56 L 128,36 L 248,38 L 264,74 L 238,104 L 212,130 Z' },
  { round: 7, startMonth: 5, startDay: 15, endDay: 17, dateLabel: '15-17 Mag', name: 'Emilia-Romagna', circuit: 'Imola', flag: '🇮🇹', laps: 63, baseLap: 77.2, downforce: 8, topSpeed: 7, tyreDeg: 2, rainChance: 0.20, hasSprint: false, path: 'M 150,130 L 76,130 C 44,130 38,96 64,74 L 118,40 C 146,26 172,56 196,62 C 222,68 242,38 262,56 C 276,72 262,116 224,130 Z' },
  { round: 8, startMonth: 5, startDay: 22, endDay: 24, dateLabel: '22-24 Mag', name: 'Monaco', circuit: 'Monte Carlo', flag: '🇲🇨', laps: 78, baseLap: 73.1, downforce: 10, topSpeed: 4, tyreDeg: 1, rainChance: 0.18, hasSprint: false, path: 'M 150,130 L 74,130 C 44,130 40,94 68,82 L 56,56 C 48,38 78,28 112,38 L 154,52 C 176,58 184,32 222,36 C 258,40 268,78 246,104 L 214,130 Z' },
  { round: 9, startMonth: 6, startDay: 5, endDay: 7, dateLabel: '5-7 Giu', name: 'Spagna', circuit: 'Barcellona', flag: '🇪🇸', laps: 66, baseLap: 75.4, downforce: 8, topSpeed: 7, tyreDeg: 3, rainChance: 0.10, hasSprint: false, path: 'M 150,130 L 76,130 L 42,106 L 54,48 L 164,34 L 256,48 L 262,92 L 226,118 L 208,130 Z' },
  { round: 10, startMonth: 6, startDay: 12, endDay: 14, dateLabel: '12-14 Giu', name: 'Canada', circuit: 'Montreal', flag: '🇨🇦', laps: 70, baseLap: 74.2, downforce: 5, topSpeed: 9, tyreDeg: 2, rainChance: 0.28, hasSprint: true, path: 'M 150,130 L 74,130 L 42,104 L 82,42 L 222,40 L 264,76 L 232,114 L 208,130 Z' },
  { round: 11, startMonth: 6, startDay: 26, endDay: 28, dateLabel: '26-28 Giu', name: 'Austria', circuit: 'Red Bull Ring', flag: '🇦🇹', laps: 71, baseLap: 66.8, downforce: 6, topSpeed: 9, tyreDeg: 2, rainChance: 0.25, hasSprint: false, path: 'M 150,130 L 76,130 L 52,88 L 128,38 L 252,54 L 242,118 L 208,130 Z' },
  { round: 12, startMonth: 7, startDay: 3, endDay: 5, dateLabel: '3-5 Lug', name: 'Gran Bretagna', circuit: 'Silverstone', flag: '🇬🇧', laps: 52, baseLap: 87.9, downforce: 9, topSpeed: 8, tyreDeg: 3, rainChance: 0.35, hasSprint: true, path: 'M 150,130 L 76,130 C 42,130 42,92 68,72 L 124,36 C 166,24 224,34 256,58 C 272,72 264,114 224,130 Z' },
  { round: 13, startMonth: 7, startDay: 17, endDay: 19, dateLabel: '17-19 Lug', name: 'Belgio', circuit: 'Spa-Francorchamps', flag: '🇧🇪', laps: 44, baseLap: 105.2, downforce: 6, topSpeed: 9, tyreDeg: 3, rainChance: 0.42, hasSprint: false, path: 'M 150,130 L 74,130 C 42,130 38,94 64,72 L 106,36 C 138,24 166,68 196,64 C 224,60 242,34 262,54 C 274,74 260,118 218,130 Z' },
  { round: 14, startMonth: 7, startDay: 24, endDay: 26, dateLabel: '24-26 Lug', name: 'Ungheria', circuit: 'Hungaroring', flag: '🇭🇺', laps: 70, baseLap: 78.5, downforce: 9, topSpeed: 5, tyreDeg: 2, rainChance: 0.18, hasSprint: false, path: 'M 150,130 L 74,130 C 42,130 38,94 66,72 L 114,34 C 154,24 188,68 218,64 C 242,60 256,38 266,64 C 274,94 252,124 212,130 Z' },
  { round: 15, startMonth: 8, startDay: 21, endDay: 23, dateLabel: '21-23 Ago', name: 'Olanda', circuit: 'Zandvoort', flag: '🇳🇱', laps: 72, baseLap: 72.4, downforce: 9, topSpeed: 6, tyreDeg: 2, rainChance: 0.32, hasSprint: true, path: 'M 150,130 L 74,130 C 40,130 38,92 66,70 L 118,34 C 162,24 194,74 224,68 C 246,64 258,42 266,70 C 272,102 248,126 210,130 Z' },
  { round: 16, startMonth: 9, startDay: 4, endDay: 6, dateLabel: '4-6 Set', name: 'Italia', circuit: 'Monza', flag: '🇮🇹', laps: 53, baseLap: 80.8, downforce: 2, topSpeed: 10, tyreDeg: 2, rainChance: 0.14, hasSprint: false, path: 'M 150,130 L 74,130 L 42,110 L 52,44 L 248,44 L 260,110 L 222,130 Z' },
  { round: 17, startMonth: 9, startDay: 11, endDay: 13, dateLabel: '11-13 Set', name: 'Madrid', circuit: 'IFEMA Madrid', flag: '🇪🇸', laps: 57, baseLap: 85.0, downforce: 7, topSpeed: 7, tyreDeg: 2, rainChance: 0.10, hasSprint: false, path: 'M 150,130 L 76,130 L 42,104 L 78,40 L 188,36 L 258,64 L 244,120 L 210,130 Z' },
  { round: 18, startMonth: 9, startDay: 25, endDay: 27, dateLabel: '25-27 Set', name: 'Azerbaijan', circuit: 'Baku', flag: '🇦🇿', laps: 51, baseLap: 103.0, downforce: 4, topSpeed: 10, tyreDeg: 1, rainChance: 0.08, hasSprint: false, path: 'M 150,130 L 74,130 L 44,116 L 46,42 L 168,38 L 174,84 L 256,84 L 254,126 L 214,130 Z' },
  { round: 19, startMonth: 10, startDay: 9, endDay: 11, dateLabel: '9-11 Ott', name: 'Singapore', circuit: 'Marina Bay', flag: '🇸🇬', laps: 62, baseLap: 93.8, downforce: 10, topSpeed: 5, tyreDeg: 2, rainChance: 0.30, hasSprint: true, path: 'M 150,130 L 74,130 L 42,114 L 46,48 L 122,38 L 134,82 L 216,40 L 260,72 L 240,124 L 210,130 Z' },
  { round: 20, startMonth: 10, startDay: 23, endDay: 25, dateLabel: '23-25 Ott', name: 'Stati Uniti', circuit: 'Austin COTA', flag: '🇺🇸', laps: 56, baseLap: 96.4, downforce: 8, topSpeed: 8, tyreDeg: 3, rainChance: 0.16, hasSprint: false, path: 'M 150,130 L 74,130 C 42,130 42,92 68,72 L 122,36 C 162,28 186,74 218,64 C 244,56 258,38 266,68 C 272,98 248,124 212,130 Z' },
  { round: 21, startMonth: 10, startDay: 30, endDay: 32, dateLabel: '30 Ott-1 Nov', name: 'Messico', circuit: 'Hermanos Rodriguez', flag: '🇲🇽', laps: 71, baseLap: 78.9, downforce: 8, topSpeed: 8, tyreDeg: 2, rainChance: 0.12, hasSprint: false, path: 'M 150,130 L 74,130 L 44,106 L 62,44 L 178,38 L 252,62 L 232,124 L 208,130 Z' },
  { round: 22, startMonth: 11, startDay: 6, endDay: 8, dateLabel: '6-8 Nov', name: 'Brasile', circuit: 'Interlagos', flag: '🇧🇷', laps: 71, baseLap: 72.1, downforce: 7, topSpeed: 8, tyreDeg: 2, rainChance: 0.34, hasSprint: false, path: 'M 150,130 L 74,130 L 42,102 L 96,42 L 232,46 L 258,94 L 216,128 L 204,130 Z' },
  { round: 23, startMonth: 11, startDay: 19, endDay: 21, dateLabel: '19-21 Nov', name: 'Las Vegas', circuit: 'Las Vegas Strip', flag: '🇺🇸', laps: 50, baseLap: 94.6, downforce: 3, topSpeed: 10, tyreDeg: 1, rainChance: 0.05, hasSprint: false, path: 'M 150,130 L 74,130 L 44,114 L 50,40 L 250,40 L 258,114 L 218,130 Z' },
  { round: 24, startMonth: 11, startDay: 27, endDay: 29, dateLabel: '27-29 Nov', name: 'Qatar', circuit: 'Lusail', flag: '🇶🇦', laps: 57, baseLap: 84.3, downforce: 9, topSpeed: 8, tyreDeg: 3, rainChance: 0.02, hasSprint: false, path: 'M 150,130 L 76,130 C 42,130 42,92 68,72 L 126,34 C 182,24 246,38 262,72 C 272,98 252,126 212,130 Z' }
];

const TYRE_COMPOUNDS = {
  S: { id: 'S', name: 'Soft', short: 'S', color: '#ff3b30', text: '#ffffff', paceBonus: -1.15, degRate: 4.35, wet: 0 },
  M: { id: 'M', name: 'Medium', short: 'M', color: '#ffcc00', text: '#000000', paceBonus: -0.45, degRate: 2.75, wet: 0 },
  H: { id: 'H', name: 'Hard', short: 'H', color: '#f2f2f7', text: '#000000', paceBonus: 0.10, degRate: 1.85, wet: 0 },
  I: { id: 'I', name: 'Inter', short: 'I', color: '#34c759', text: '#ffffff', paceBonus: 1.75, degRate: 2.25, wet: 1 },
  W: { id: 'W', name: 'Wet', short: 'W', color: '#007aff', text: '#ffffff', paceBonus: 3.30, degRate: 1.75, wet: 2 }
};

const RND_TIERS = {
  minor: { id: 'minor', label: 'Minore', cost: 4.5, days: 4, gain: 1.4, desc: 'Aggiornamento rapido (4 gg)' },
  standard: { id: 'standard', label: 'Standard', cost: 9.0, days: 8, gain: 2.8, desc: 'Pacchetto bilanciato (8 gg)' },
  major: { id: 'major', label: 'Evoluzione', cost: 15.5, days: 13, gain: 4.6, desc: 'Grande sviluppo (13 gg)' }
};
