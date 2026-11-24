let gameState = null;
window.gameState = null;
let simTimer = null;
let animFrameId = null;
let lastAnimTimestamp = 0;

function formatLapTime(sec) {
  if (!sec || typeof sec !== 'number' || !isFinite(sec) || sec >= 890 || sec <= 0) return '--:--.---';
  const totalMs = Math.round(sec * 1000);
  const mins = Math.floor(totalMs / 60000);
  const remMs = totalMs % 60000;
  const wholeSecs = Math.floor(remMs / 1000);
  const millis = remMs % 1000;
  return `${mins}:${String(wholeSecs).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

function getEstimatedStints(track, rules) {
  const trackDegMult = track.tyreDeg === 3 ? 1.24 : track.tyreDeg === 2 ? 1.0 : 0.84;
  const ruleMult = (rules && rules.extraDegMultiplier) ? rules.extraDegMultiplier : 1.0;

  const calcRange = (compoundKey) => {
    const comp = TYRE_COMPOUNDS[compoundKey];
    const rate = comp.degRate * trackDegMult * ruleMult;
    const avgLaps = Math.max(5, Math.round(66 / rate));
    const minLaps = Math.max(4, Math.min(Math.max(6, track.laps - 4), avgLaps - 2));
    const maxLaps = Math.max(minLaps + 2, Math.min(Math.max(8, track.laps - 3), avgLaps + 2));
    return `${minLaps}-${maxLaps}`;
  };

  return { S: calcRange('S'), M: calcRange('M'), H: calcRange('H') };
}

function getMoodMeta(moodValue) {
  const val = Math.max(0, Math.min(100, Number(moodValue ?? 65)));
  if (val >= 82) return { label: 'Euforico', emoji: '🔥', color: 'text-emerald-400', bg: 'bg-emerald-950/50 border-emerald-500/40', paceDelta: -0.35, degMult: 0.90 };
  if (val >= 62) return { label: 'Motivato', emoji: '😄', color: 'text-sky-300', bg: 'bg-sky-950/40 border-sky-500/35', paceDelta: -0.15, degMult: 0.96 };
  if (val >= 42) return { label: 'Neutro', emoji: '😐', color: 'text-slate-300', bg: 'bg-slate-800/70 border-slate-600/40', paceDelta: 0.0, degMult: 1.0 };
  if (val >= 22) return { label: 'Teso', emoji: '😟', color: 'text-amber-300', bg: 'bg-amber-950/50 border-amber-500/40', paceDelta: 0.22, degMult: 1.07 };
  return { label: 'Frustrato', emoji: '😡', color: 'text-red-400', bg: 'bg-red-950/60 border-red-500/45', paceDelta: 0.45, degMult: 1.15 };
}

function getRivalryKey(idA, idB) {
  return [idA, idB].sort().join('__');
}

function getRivalryValue(idA, idB) {
  if (!gameState || !gameState.rivalries || !idA || !idB || idA === idB) return 0;
  return gameState.rivalries[getRivalryKey(idA, idB)] || 0;
}

function bumpRivalry(idA, idB, delta, note = '') {
  if (!gameState || !idA || !idB || idA === idB) return;
  gameState.rivalries = gameState.rivalries || {};
  const key = getRivalryKey(idA, idB);
  const prev = gameState.rivalries[key] || 0;
  const next = Math.max(0, Math.min(100, Math.round(prev + delta)));
  gameState.rivalries[key] = next;

  const dA = gameState.drivers.find(d => d.id === idA);
  const dB = gameState.drivers.find(d => d.id === idB);
  if (dA && dB && next - prev >= 6 && note) {
    pushMediaQuote('Rivalita', `${dA.code} vs ${dB.code} (${next}/100): ${note}`);
  }
}

function pushMediaQuote(sourceTag, text) {
  if (!gameState) return;
  gameState.mediaFeed = gameState.mediaFeed || [];
  gameState.mediaFeed.unshift({
    id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    round: gameState.round,
    season: gameState.season,
    source: sourceTag,
    text
  });
  if (gameState.mediaFeed.length > 60) gameState.mediaFeed.length = 60;
  gameState.newsFeed.unshift(`[${sourceTag}] ${text}`);
}

function adjustDriverMood(driverId, delta, reasonText = '') {
  if (!gameState) return;
  const driver = gameState.drivers.find(d => d.id === driverId);
  if (!driver) return;
  const prev = driver.mood ?? 65;
  const next = Math.max(0, Math.min(100, Math.round(prev + delta)));
  driver.mood = next;
  const diff = next - prev;
  if (driver.teamId === gameState.userTeamId && Math.abs(diff) >= 2 && reasonText) {
    const sign = diff > 0 ? `+${diff}` : `${diff}`;
    gameState.newsFeed.unshift(`UMORE ${driver.code} (${sign} -> ${next}/100): ${reasonText}`);
  }
}

function createInitialGaragePartsForTeam(team) {
  const basePerf = Math.round(((team.aero + team.pu + team.chassis) / 3) * 40);
  const baseRel = Math.min(96, Math.max(70, team.rel));
  return [
    { id: `${team.id}_pu_1`, slot: 'pu', name: `${team.short} Power Unit v1`, perf: basePerf + 40, rel: baseRel, assignedCar: 1 },
    { id: `${team.id}_pu_2`, slot: 'pu', name: `${team.short} Power Unit v1-B`, perf: basePerf + 15, rel: Math.min(98, baseRel + 3), assignedCar: 2 },
    { id: `${team.id}_ch_1`, slot: 'chassis', name: `${team.short} Telaio Monoscocca v1`, perf: basePerf, rel: baseRel + 1, assignedCar: 1 },
    { id: `${team.id}_ch_2`, slot: 'chassis', name: `${team.short} Telaio Monoscocca v1-B`, perf: basePerf - 10, rel: Math.min(98, baseRel + 2), assignedCar: 2 },
    { id: `${team.id}_st_1`, slot: 'steer', name: `${team.short} Sterzo & Aero Front v1`, perf: basePerf - 15, rel: Math.max(68, baseRel - 2), assignedCar: 1 },
    { id: `${team.id}_st_2`, slot: 'steer', name: `${team.short} Sterzo & Aero Front v1-B`, perf: basePerf - 30, rel: baseRel, assignedCar: 2 }
  ];
}

function syncTeamStatsFromGarage(teamId) {
  const team = getTeam(teamId);
  const parts = gameState.garageParts?.[teamId] || [];
  if (!team || !parts.length) return;
  const avgOfSlot = (slot, field, fallback) => {
    const list = parts.filter(p => p.slot === slot);
    if (!list.length) return fallback;
    return list.reduce((acc, p) => acc + p[field], 0) / list.length;
  };
  const puPerf = avgOfSlot('pu', 'perf', team.pu * 40);
  const chPerf = avgOfSlot('chassis', 'perf', team.chassis * 40);
  const stPerf = avgOfSlot('steer', 'perf', team.aero * 40);
  const avgRel = parts.reduce((acc, p) => acc + p.rel, 0) / parts.length;

  team.pu = Number(Math.max(65, Math.min(99, puPerf / 40)).toFixed(1));
  team.chassis = Number(Math.max(65, Math.min(99, chPerf / 40)).toFixed(1));
  team.aero = Number(Math.max(65, Math.min(99, stPerf / 40)).toFixed(1));
  team.rel = Number(Math.max(65, Math.min(99, avgRel)).toFixed(1));
}

function generatePaddockPressForRound(roundNum) {
  if (!gameState) return;
  const track = CALENDAR_2026[roundNum - 1] || CALENDAR_2026[0];
  const userTeam = getUserTeam();
  const uDrivers = getUserDrivers();
  const sortedTeams = [...gameState.teams].sort((a, b) => b.points - a.points);
  const rivalTeam = sortedTeams.find(t => t.id !== userTeam.id) || sortedTeams[0];
  const rivalDriver = gameState.drivers.find(d => d.teamId === rivalTeam.id);

  const pressureLvl = Math.min(100, Math.max(25, Math.round(userTeam.fanPassion * 0.65 + (11 - userTeam.objective) * 3.5)));
  gameState.paddockPressure = pressureLvl;

  const sprintNote = track.hasSprint ? ' (Weekend Sprint: Venerdi Qualifica Sprint, Sabato FP2 + Sprint + Qualifiche GP)' : '';
  pushMediaQuote('Stampa Pre-GP', `Vigilia GP ${track.name} (${track.dateLabel})${sprintNote}: pressione paddock al ${pressureLvl}%, obiettivo Top ${userTeam.objective}.`);

  if (rivalTeam && rivalDriver) {
    pushMediaQuote('Team Principal', `${rivalTeam.tpName} (${rivalTeam.name}): "A ${track.name} metteremo pressione a ${userTeam.name} in pista."`);
    bumpRivalry(uDrivers[0]?.id, rivalDriver.id, 4, `Dichiarazioni pre-GP a ${track.name}`);
  }
}

function generatePostSessionPress(sessionType, payload = {}) {
  if (!gameState) return;
  const track = CALENDAR_2026[gameState.round - 1] || CALENDAR_2026[0];
  const userTeam = getUserTeam();
  const uDrivers = getUserDrivers();

  if (sessionType === 'quali' && payload.gridOrder) {
    const bestUserIdx = payload.gridOrder.findIndex(e => e.teamId === userTeam.id);
    const bestPos = bestUserIdx >= 0 ? bestUserIdx + 1 : 15;
    if (bestPos <= 3) {
      gameState.paddockPressure = Math.max(20, (gameState.paddockPressure || 65) - 8);
      pushMediaQuote('Stampa Qualifiche', `Grande sabato per ${userTeam.name} a ${track.name}: miglior auto in P${bestPos}!`);
      uDrivers.forEach(d => adjustDriverMood(d.id, 3, 'Ottima qualifica'));
    } else if (bestPos > userTeam.objective * 2 + 4) {
      gameState.paddockPressure = Math.min(100, (gameState.paddockPressure || 65) + 10);
      pushMediaQuote('Stampa Qualifiche', `Qualifiche in salita per ${userTeam.name} (P${bestPos}): la stampa chiede risposte.`);
      uDrivers.forEach(d => adjustDriverMood(d.id, -3, 'Qualifica sotto le attese'));
    }
  }

  if (sessionType === 'race' && payload.classification) {
    const uRows = payload.classification.filter(r => r.isUser);
    const bestRow = uRows[0];
    const bestPos = typeof bestRow?.pos === 'number' ? bestRow.pos : 22;

    if (bestPos === 1) {
      gameState.paddockPressure = Math.max(15, (gameState.paddockPressure || 65) - 15);
      pushMediaQuote('Stampa Post-GP', `VITTORIA ${userTeam.name}! ${bestRow.name} trionfa a ${track.name}.`);
    } else if (bestPos <= 3) {
      gameState.paddockPressure = Math.max(20, (gameState.paddockPressure || 65) - 10);
      pushMediaQuote('Stampa Post-GP', `Podio per ${userTeam.name} con ${bestRow.name} (P${bestPos}) a ${track.name}.`);
    } else if (bestPos <= 10) {
      pushMediaQuote('Stampa Post-GP', `A punti con ${bestRow.name} (P${bestPos}) a ${track.name}: bottino utile per la classifica.`);
    } else {
      gameState.paddockPressure = Math.min(100, (gameState.paddockPressure || 65) + 12);
      pushMediaQuote('Stampa Post-GP', `Domenica difficile per ${userTeam.name} fuori dai punti a ${track.name}: sale la pressione.`);
    }
  }
}

function saveGame() {
  if (!gameState) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
  } catch (e) {
    console.warn('Errore salvataggio locale:', e);
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function resetCareer() {
  stopAllLoops();
  localStorage.removeItem(STORAGE_KEY);
  gameState = null;
  renderApp();
}

function stopAllLoops() {
  if (simTimer) {
    clearInterval(simTimer);
    simTimer = null;
  }
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
}

function getTeam(teamId) {
  return gameState.teams.find(t => t.id === teamId) || gameState.teams[0];
}

function getUserTeam() {
  return getTeam(gameState.userTeamId);
}

function getUserDrivers() {
  return gameState.drivers.filter(d => d.teamId === gameState.userTeamId);
}

function getActiveSponsor() {
  return SPONSOR_OPTIONS.find(s => s.id === gameState.sponsorId) || SPONSOR_OPTIONS[0];
}

function getBudgetCapLimit() {
  return Number((gameState?.budgetCap || BUDGET_CAP_2026).toFixed(1));
}

function getCapSpent() {
  return Number((gameState?.capSpent || 0).toFixed(1));
}

function getRemainingBudgetCap() {
  return Number((getBudgetCapLimit() - getCapSpent()).toFixed(1));
}

function getDriversWageBill(teamId) {
  return Number((gameState?.drivers || [])
    .filter(d => d.teamId === teamId)
    .reduce((sum, d) => sum + Number(d.salary || 0), 0)
    .toFixed(1));
}

function chargeTeamExpense(amount, countsTowardCap = true, label = '') {
  const team = getUserTeam();
  if (!team) return false;
  const cost = Number(amount.toFixed(1));

  if (team.budget < cost) {
    showToast(`Cassa insufficiente (€${team.budget.toFixed(1)}M disponibili, servono €${cost.toFixed(1)}M).`, 'danger');
    return false;
  }

  if (countsTowardCap) {
    const remCap = getRemainingBudgetCap();
    if (remCap < cost) {
      showToast(`Budget Cap FIA esaurito! Restano €${Math.max(0, remCap).toFixed(1)}M su €${getBudgetCapLimit().toFixed(1)}M.`, 'danger');
      return false;
    }
    gameState.capSpent = Number((getCapSpent() + cost).toFixed(1));
  }

  team.budget = Number((team.budget - cost).toFixed(1));
  if (label) {
    const tag = countsTowardCap ? 'Dentro Cap' : 'Fuori Cap';
    gameState.newsFeed.unshift(`FINANZE (-€${cost.toFixed(1)}M • ${tag}): ${label}`);
  }
  return true;
}

function refundTeamExpense(amount, refundedCap = true, label = '') {
  const team = getUserTeam();
  if (!team) return;
  const ref = Number(amount.toFixed(1));
  team.budget = Number((team.budget + ref).toFixed(1));
  if (refundedCap) {
    gameState.capSpent = Math.max(0, Number((getCapSpent() - ref).toFixed(1)));
  }
  if (label) {
    gameState.newsFeed.unshift(`RIMBORSO (+€${ref.toFixed(1)}M): ${label}`);
  }
}

function showToast(msg, type = 'info') {
  const existing = document.getElementById('fm-toast');
  if (existing) existing.remove();
  const colors = {
    info: 'bg-slate-800 border-sky-500/60 text-sky-100',
    success: 'bg-emerald-950 border-emerald-500/70 text-emerald-100',
    danger: 'bg-red-950 border-red-500/70 text-red-100'
  };
  const div = document.createElement('div');
  div.id = 'fm-toast';
  div.className = `fixed top-3 left-1/2 -translate-x-1/2 z-50 px-3.5 py-2 rounded-xl border text-xs font-bold shadow-xl max-w-[92vw] text-center ${colors[type] || colors.info}`;
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3200);
}

function seedInitialRivalries(drivers) {
  const map = {};
  const pairs = [
    ['lec', 'ham', 28],
    ['ver', 'nor', 45],
    ['nor', 'pia', 34],
    ['rus', 'ant', 22],
    ['alo', 'str', 20],
    ['gas', 'oco', 48],
    ['sai', 'alb', 18],
    ['tsu', 'had', 20]
  ];
  pairs.forEach(([a, b, val]) => {
    if (drivers.some(d => d.id === a) && drivers.some(d => d.id === b)) {
      map[getRivalryKey(a, b)] = val;
    }
  });
  return map;
}

function createInitialState(selectedTeamId, selectedSponsorId = 'apex_tech') {
  const teams = JSON.parse(JSON.stringify(INITIAL_TEAMS)).map(t => ({
    ...t,
    points: 0,
    wins: 0,
    podiums: 0
  }));

  const sponsor = SPONSOR_OPTIONS.find(s => s.id === selectedSponsorId) || SPONSOR_OPTIONS[0];
  const userTm = teams.find(t => t.id === selectedTeamId) || teams[0];
  userTm.budget = Number((userTm.budget + sponsor.upfront).toFixed(1));

  const drivers = JSON.parse(JSON.stringify(INITIAL_DRIVERS)).map((d, idx) => ({
    ...d,
    mood: d.mood ?? (62 + ((idx * 7) % 18)),
    fatigue: d.fatigue ?? 15,
    trainingBoost: 0,
    points: 0,
    wins: 0,
    podiums: 0,
    transferRequest: false
  }));

  const freeAgents = JSON.parse(JSON.stringify(FREE_AGENTS_POOL)).map((fa, idx) => ({
    ...fa,
    mood: fa.mood ?? (60 + idx * 3),
    fatigue: fa.fatigue ?? 12,
    trainingBoost: 0,
    transferRequest: false
  }));

  const garageParts = {};
  teams.forEach(t => {
    garageParts[t.id] = createInitialGaragePartsForTeam(t);
  });

  const state = {
    season: 2026,
    maxSeasons: 2026 + BASE_CAREER_YEARS - 1,
    careerDay: 1,
    weekendStartDay: 8,
    round: 1,
    userTeamId: selectedTeamId,
    sponsorId: sponsor.id,
    activeTab: 'hub',
    hubMediaFilter: 'all',
    rndSection: 'garage',
    garageCarTab: 1,
    paddockPressure: 62,
    budgetCap: BUDGET_CAP_2026,
    capSpent: 0.0,
    rules: {
      pointsTop12: false,
      extraDegMultiplier: 1.0
    },
    teams,
    drivers,
    freeAgents,
    garageParts,
    rivalries: seedInitialRivalries(drivers),
    pendingUpgrades: [],
    pendingUpgradeConfirm: null,
    completedRounds: [],
    mediaFeed: [],
    newsFeed: [
      `Stagione 2026 avviata con ${userTm.name} e sponsor ${sponsor.name} (+€${sponsor.upfront.toFixed(1)}M alla firma).`,
      `Budget Cap FIA 2026: €${BUDGET_CAP_2026.toFixed(1)}M per sviluppo e componenti (stipendi piloti e team building fuori Cap).`
    ],
    weekend: initWeekendState(1, selectedTeamId, drivers)
  };

  gameState = state;
  generatePaddockPressForRound(1);
  return gameState;
}

function getWeekendDayBadge(weekend) {
  if (!weekend) return 'GIORNO';
  if (weekend.phase === 'fp') {
    if (weekend.hasSprint) return weekend.fp?.session === 2 ? 'SAB • FP2' : 'VEN • FP1';
    if (weekend.fp?.session === 1) return 'VEN • FP1';
    if (weekend.fp?.session === 2) return 'VEN • FP2';
    return 'SAB • FP3';
  }
  if (weekend.phase === 'sprint_quali') return 'VEN • QUAL. SPRINT';
  if (weekend.phase === 'sprint_race') return 'SAB • SPRINT';
  if (weekend.phase === 'quali') return 'SAB • QUALIFICHE';
  if (weekend.phase === 'strategy') return 'DOM • PRE-GARA';
  if (weekend.phase === 'race' || weekend.phase === 'live_strategy' || weekend.phase === 'summary') return 'DOM • GARA';
  return 'WEEKEND';
}

function selectTeamAndStart(teamId, sponsorId = 'apex_tech') {
  gameState = createInitialState(teamId, sponsorId);
  saveGame();
  renderApp();
}

function setActiveTab(tab) {
  if (!gameState) return;
  gameState.activeTab = tab;
  saveGame();
  renderApp();
}

function setHubMediaFilter(flt) {
  if (!gameState) return;
  gameState.hubMediaFilter = flt;
  saveGame();
  renderApp();
}
