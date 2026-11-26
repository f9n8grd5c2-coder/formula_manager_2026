function initWeekendState(roundNum, userTeamId, drivers) {
  const track = CALENDAR_2026[roundNum - 1] || CALENDAR_2026[0];
  const userDrivers = drivers.filter(d => d.teamId === userTeamId);
  const d1 = userDrivers[0];
  const d2 = userDrivers[1];

  const baseSusp = Math.max(1, Math.min(10, Math.round((track.downforce + (10 - track.topSpeed)) / 2)));
  const baseBrake = Math.max(1, Math.min(10, 11 - track.topSpeed));
  const baseRide = Math.max(1, Math.min(10, track.tyreDeg === 3 ? 6 : (track.downforce >= 8 ? 5 : 7)));
  const baseDiff = Math.max(1, Math.min(10, track.tyreDeg === 3 ? 6 : 5));

  const targetD1 = { wing: track.downforce, susp: baseSusp, brake: baseBrake, ride: baseRide, diff: baseDiff };
  const targetD2 = {
    wing: Math.max(1, Math.min(10, track.downforce - (track.downforce > 6 ? 1 : -1))),
    susp: Math.max(1, Math.min(10, baseSusp + (baseSusp < 8 ? 1 : -1))),
    brake: baseBrake,
    ride: Math.max(1, Math.min(10, baseRide + (baseRide < 9 ? 1 : -1))),
    diff: Math.max(1, Math.min(10, baseDiff - (baseDiff > 2 ? 1 : 0)))
  };

  const makeDriverSetup = (initWing = 5, initSusp = 5, initBrake = 5, initRide = 5, initDiff = 5) => ({
    wing: initWing, susp: initSusp, brake: initBrake, ride: initRide, diff: initDiff,
    confidence: 35,
    plan: 'race', // 'quali' | 'race' | 'tyre'
    programs: { quali: 0, race: 0, tyre: 0 }, // 0..100% conoscenza programma
    fpRunsDone: 0,
    lastError: null,
    feedback: 'Scegli un programma di lavoro, regola assetto ed esegui i run.'
  });

  const w = {
    round: roundNum,
    hasSprint: !!track.hasSprint,
    day: 'friday',
    phase: 'fp',
    targets: { wing: targetD1.wing, susp: targetD1.susp, brake: targetD1.brake, ride: targetD1.ride, diff: targetD1.diff },
    driverTargets: { d1: targetD1, d2: targetD2 },
    fp: {
      session: 1,
      runsLeftInSession: track.hasSprint ? 4 : 3,
      activeSlot: 'd1',
      d1: d1 ? makeDriverSetup(4, 5, 6, 5, 5) : null,
      d2: d2 ? makeDriverSetup(6, 5, 4, 6, 5) : null
    },
    sprintQuali: null,
    sprintStrategy: null,
    sprintRace: null,
    sprintResults: null,
    quali: null,
    preRaceStrategy: createDefaultPreRaceStrategy(track),
    race: null,
    results: null
  };
  if (typeof gameState !== 'undefined' && gameState?.simPrepRound === roundNum && typeof applyCircuitSimPrepToFp === 'function') {
    applyCircuitSimPrepToFp(w, track);
  }
  return w;
}

function buildPilotRecommendedStrategy(track, driver, gridPos = 10, isWet = false) {
  const laps = track.laps || 56;
  const tyreSkill = driver?.tyreMgmt ?? 84;
  const isHighDeg = track.tyreDeg === 3;
  const isLowDeg = track.tyreDeg === 1;

  if (isWet) {
    const p1 = Math.round(laps * 0.50);
    return {
      stints: 2,
      startTyre: 'I',
      pit1Lap: p1,
      pit1Tyre: 'I',
      pit2Lap: Math.min(laps - 3, p1 + 14),
      pit2Tyre: 'M',
      push: 'balanced',
      note: `${driver?.code || 'Pilota'}: "Pista bagnata, partiamo su Intermedie e valutiamo cambio intorno al giro ${p1}."`
    };
  }

  // Circuito ad alto degrado o pilota che consuma molto -> 2 soste (3 stint)
  if (isHighDeg && tyreSkill < 89) {
    const p1 = Math.max(8, Math.round(laps * 0.30));
    const p2 = Math.max(p1 + 10, Math.round(laps * 0.64));
    return {
      stints: 3,
      startTyre: gridPos <= 6 ? 'S' : 'M',
      pit1Lap: p1,
      pit1Tyre: 'H',
      pit2Lap: p2,
      pit2Tyre: 'M',
      push: 'balanced',
      note: `${driver?.code || 'Pilota'}: "Degrado alto qui: consiglio 3 stint (${gridPos <= 6 ? 'S' : 'M'} → H → M) con pit ai giri ${p1} e ${p2}."`
    };
  }

  // Circuito a basso degrado o pilota molto gentile sulle gomme -> 1 sosta aggressiva (2 stint)
  if (isLowDeg || tyreSkill >= 88) {
    const p1 = Math.round(laps * (gridPos <= 8 ? 0.38 : 0.55));
    const s1 = gridPos <= 8 ? 'M' : 'H';
    const s2 = gridPos <= 8 ? 'H' : 'M';
    return {
      stints: 2,
      startTyre: s1,
      pit1Lap: p1,
      pit1Tyre: s2,
      pit2Lap: Math.min(laps - 3, p1 + 14),
      pit2Tyre: 'S',
      push: 'balanced',
      note: `${driver?.code || 'Pilota'}: "Gestisco bene le gomme: 1 sola sosta al giro ${p1} (${s1} → ${s2}) è la scelta più veloce."`
    };
  }

  // Strategia bilanciata standard a 2 stint (1 pit)
  const p1 = Math.round(laps * 0.44);
  return {
    stints: 2,
    startTyre: 'M',
    pit1Lap: p1,
    pit1Tyre: 'H',
    pit2Lap: Math.min(laps - 3, p1 + 14),
    pit2Tyre: 'S',
    push: 'balanced',
    note: `${driver?.code || 'Pilota'}: "Partenza su Medium e passaggio su Hard al giro ${p1} per arrivare in fondo senza cali."`
  };
}

function createDefaultPreRaceStrategy(track) {
  const uDrivers = typeof getUserDrivers === 'function' ? getUserDrivers() : [];
  const grid = gameState?.weekend?.quali?.grid || [];
  const isWet = !!gameState?.weekend?.quali?.isWet;

  const getPos = (drv) => grid.find(g => g.driverId === drv?.id)?.gridPos || 10;
  const rec1 = buildPilotRecommendedStrategy(track, uDrivers[0], getPos(uDrivers[0]), isWet);
  const rec2 = buildPilotRecommendedStrategy(track, uDrivers[1], getPos(uDrivers[1]), isWet);

  return {
    d1: { ...rec1, recommended: { ...rec1 } },
    d2: { ...rec2, recommended: { ...rec2 } }
  };
}

function ensurePreRaceStrategy(track) {
  const w = gameState.weekend;
  if (!w) return createDefaultPreRaceStrategy(track);
  if (!w.preRaceStrategy || !w.preRaceStrategy.d1 || typeof w.preRaceStrategy.d1.stints !== 'number') {
    w.preRaceStrategy = createDefaultPreRaceStrategy(track);
  }
  if (!w.preRaceStrategy.d1.recommended) {
    const fresh = createDefaultPreRaceStrategy(track);
    w.preRaceStrategy.d1.recommended = fresh.d1.recommended;
    w.preRaceStrategy.d2.recommended = fresh.d2.recommended;
  }
  return w.preRaceStrategy;
}

function applyPilotRecommendedStrategy(slotKey) {
  const w = gameState.weekend;
  const track = CALENDAR_2026[gameState.round - 1] || CALENDAR_2026[0];
  if (!w) return;
  const strat = ensurePreRaceStrategy(track);
  const cur = strat[slotKey];
  if (!cur?.recommended) return;
  const rec = cur.recommended;
  strat[slotKey] = {
    ...rec,
    recommended: { ...rec }
  };
  showToast('Strategia consigliata dal pilota applicata!', 'success');
  saveGame();
  renderApp();
}

function getDriverTargetSetup(weekend, slotKey) {
  if (weekend.driverTargets && weekend.driverTargets[slotKey]) {
    return weekend.driverTargets[slotKey];
  }
  return weekend.targets;
}

function updateFpSlider(param, val) {
  const w = gameState.weekend;
  if (!w || w.phase !== 'fp') return;
  const slot = w.fp.activeSlot || 'd1';
  const setup = w.fp[slot];
  if (!setup) return;
  setup[param] = Number(val);
  saveGame();
  renderApp();
}

function setFpActiveSlot(slot) {
  const w = gameState.weekend;
  if (!w || !w.fp[slot]) return;
  w.fp.activeSlot = slot;
  saveGame();
  renderApp();
}

function setFpProgram(slot, programId) {
  const w = gameState.weekend;
  if (!w || w.phase !== 'fp' || !w.fp[slot]) return;
  w.fp[slot].plan = programId;
  saveGame();
  renderApp();
}

function evaluateSingleDriverFpRun(w, slotKey, drv) {
  const setup = w.fp[slotKey];
  if (!setup || !drv) return;
  const target = getDriverTargetSetup(w, slotKey);
  const diffWing = setup.wing - target.wing;
  const diffSusp = setup.susp - target.susp;
  const diffBrake = setup.brake - target.brake;
  const diffRide = setup.ride - target.ride;
  const diffDiff = setup.diff - target.diff;

  const totalErr = Math.abs(diffWing) + Math.abs(diffSusp) + Math.abs(diffBrake) + Math.abs(diffRide) + Math.abs(diffDiff);
  const gain = Math.max(8, Math.min(28, 28 - totalErr * 2));
  setup.confidence = Math.min(100, setup.confidence + gain);
  setup.fpRunsDone = (setup.fpRunsDone || 0) + 1;
  setup.lastError = totalErr;

  // Avanza conoscenza del programma selezionato (Giro Secco, Passo Gara o Gestione Gomme)
  setup.programs = setup.programs || { quali: 0, race: 0, tyre: 0 };
  const progKey = setup.plan || 'race';
  const progGain = Math.max(20, Math.min(40, 38 - totalErr * 2));
  setup.programs[progKey] = Math.min(100, (setup.programs[progKey] || 0) + progGain);

  const progLabels = { quali: 'Giro Secco', race: 'Passo Gara', tyre: 'Gestione Gomme' };
  const hints = [];
  if (Math.abs(diffWing) >= 2) hints.push(diffWing > 0 ? 'ala troppo carica' : 'ala troppo scarica');
  if (Math.abs(diffSusp) >= 2) hints.push(diffSusp > 0 ? 'sospensioni troppo rigide' : 'sospensioni troppo morbide');
  if (Math.abs(diffBrake) >= 2) hints.push(diffBrake > 0 ? 'freni troppo aggressivi' : 'freni troppo conservativi');
  if (Math.abs(diffRide) >= 2) hints.push(diffRide > 0 ? 'assetto troppo alto' : 'assetto troppo basso');
  if (Math.abs(diffDiff) >= 2) hints.push(diffDiff > 0 ? 'differenziale troppo chiuso' : 'differenziale troppo aperto');

  setup.feedback = hints.length
    ? `${drv.code} [${progLabels[progKey]} ${setup.programs[progKey]}%]: feeling ${setup.confidence}% — ${hints.slice(0, 2).join(', ')}.`
    : `${drv.code} [${progLabels[progKey]} ${setup.programs[progKey]}%]: assetto perfetto (${setup.confidence}%)!`;
}

function runFpStint() {
  const w = gameState.weekend;
  if (!w || w.phase !== 'fp') return;
  const uDrivers = getUserDrivers();

  if ((w.fp.runsLeftInSession ?? 0) <= 0) {
    showToast('Run esauriti in questa sessione: passa alla sessione successiva!', 'info');
    return;
  }

  if (uDrivers[0] && w.fp.d1) evaluateSingleDriverFpRun(w, 'd1', uDrivers[0]);
  if (uDrivers[1] && w.fp.d2) evaluateSingleDriverFpRun(w, 'd2', uDrivers[1]);

  w.fp.runsLeftInSession = Math.max(0, w.fp.runsLeftInSession - 1);
  showToast('Run completato per entrambi i piloti: feedback aggiornati!', 'success');
  saveGame();
  renderApp();
}

function advanceFpSession() {
  const w = gameState.weekend;
  if (!w || w.phase !== 'fp') return;
  const maxSessions = w.hasSprint ? 1 : 3;
  const { sat } = getRoundWeekendDates(gameState.round, gameState.season);

  if (w.fp.session < maxSessions) {
    w.fp.session += 1;
    w.fp.runsLeftInSession = 3;

    // Weekend normale: dopo FP2 si passa al Sabato (FP3)
    if (!w.hasSprint && w.fp.session === 3 && gameState.currentDate < sat) {
      advanceSingleDay(true); // Porta al Sabato e aggiorna fatica/R&D
      showToast(`📅 Sabato ${formatCareerDateIT(gameState.currentDate)}: si passa alle FP3!`, 'info');
    } else {
      showToast(`Passati a FP${w.fp.session}!`, 'info');
    }
  } else if (w.hasSprint) {
    initLiveQualifyingSession(true);
    showToast('Venerdì pomeriggio: via alle Qualifiche Sprint (SQ1)!', 'info');
  } else {
    if (gameState.currentDate < sat) advanceSingleDay(true);
    initLiveQualifyingSession(false);
    showToast(`Sabato ${formatCareerDateIT(gameState.currentDate)}: Qualifiche ufficiali Q1!`, 'info');
  }
  saveGame();
  renderApp();
}

function getFpTelemetryPreview(w, slotKey) {
  const setup = w?.fp?.[slotKey];
  if (!setup) {
    return { setupDeltaSec: 0, qualiDeltaSec: 0, raceDeltaSec: 0, tyreWearRedPct: 0, tyreDegDeltaPct: 0 };
  }
  const conf = setup.confidence ?? 35;
  const confScore = ((conf - 50) / 50) * 1.4;
  const qualiPct = setup.programs?.quali ?? 0;
  const racePct = setup.programs?.race ?? 0;
  const tyrePct = setup.programs?.tyre ?? 0;

  // Programma Gomme riduce il degrado (-18% max); Setup poco bilanciato (<55%) o focus estremo su Giro Secco lo peggiorano
  const confDegMult = 1.0 + ((55 - conf) / 100) * 0.24;
  const fpProgDegMult = 1.0 - (tyrePct / 100) * 0.18 + (Math.max(0, qualiPct - tyrePct) / 100) * 0.10;
  const netDegDeltaPct = Math.round((confDegMult * fpProgDegMult - 1.0) * 100);

  return {
    conf,
    setupDeltaSec: Number((-confScore * 0.14).toFixed(2)),
    qualiDeltaSec: Number((-((qualiPct / 100) * 1.65) * 0.14).toFixed(2)),
    raceDeltaSec: Number((-((racePct / 100) * 1.50) * 0.13).toFixed(2)),
    tyreWearRedPct: -netDegDeltaPct,
    tyreDegDeltaPct: netDegDeltaPct
  };
}

function computeCarPaceScore(driver, team, track, setupConf = 65, isWet = false, sessionMode = 'race') {
  const mood = getMoodMeta(driver.mood);
  const isSprintMode = sessionMode === 'sprint' || sessionMode === 'sprint_quali';

  // Nella Sprint (poca benzina e niente gestione lunga), Aero + PU e velocità pura pesano di più rispetto a Telaio/Consumo gomme
  const baseCar = isSprintMode
    ? (team.aero * 0.40 + team.pu * 0.38 + team.chassis * 0.22)
    : (team.aero * 0.36 + team.pu * 0.34 + team.chassis * 0.30);

  const trackDnaBonus = isSprintMode
    ? ((track.downforce - 5) * ((team.aero - 80) * 0.045) + (track.topSpeed - 5) * ((team.pu - 80) * 0.055))
    : ((track.downforce - 5) * ((team.aero - 80) * 0.04) + (track.topSpeed - 5) * ((team.pu - 80) * 0.04));

  const driverSkill = isSprintMode
    ? (driver.pace * 0.58 + driver.cons * 0.27 + driver.tyreMgmt * 0.15)
    : (driver.pace * 0.45 + driver.cons * 0.35 + driver.tyreMgmt * 0.20);

  const confBonus = ((setupConf - 50) / 50) * (isSprintMode ? 1.65 : 1.4);

  // Bonus dai Programmi Prove Libere per i piloti utente
  let fpProgramBonus = 0;
  const uDrivers = getUserDrivers();
  const fpSlot = driver.id === uDrivers[0]?.id ? gameState.weekend?.fp?.d1 : (driver.id === uDrivers[1]?.id ? gameState.weekend?.fp?.d2 : null);
  if (fpSlot?.programs) {
    if (sessionMode === 'quali' || sessionMode === 'sprint_quali') {
      fpProgramBonus = ((fpSlot.programs.quali || 0) / 100) * 1.65;
    } else if (sessionMode === 'sprint') {
      fpProgramBonus = ((fpSlot.programs.quali || 0) / 100) * 0.65 + ((fpSlot.programs.race || 0) / 100) * 0.95;
    } else {
      fpProgramBonus = ((fpSlot.programs.race || 0) / 100) * 1.50;
    }
  }

  const traitModPace = (isSprintMode && driver.trait === 'attacker' ? 0.95 : (sessionMode === 'race' && driver.trait === 'tactician' ? 0.45 : 0));
  const wetBonus = isWet && driver.trait === 'wet_ace' ? 2.4 : 0;
  const fatiguePen = Math.max(0, ((driver.fatigue ?? 15) - 55) * 0.05);
  const wearState = typeof getDriverCarWearState === 'function' ? getDriverCarWearState(driver.id) : { puWear: 0, chassisWear: 0 };
  const puWearPen = wearState.puWear > 70 ? ((wearState.puWear - 70) / 30) * 1.45 : 0;
  const chWearPen = wearState.chassisWear > 70 ? ((wearState.chassisWear - 70) / 30) * 0.95 : 0;
  return baseCar * 0.58 + driverSkill * 0.42 + trackDnaBonus + confBonus + fpProgramBonus + traitModPace + wetBonus - (mood.paceDelta * 2.2) - fatiguePen - puWearPen - chWearPen;
}

function checkTwoCompoundRuleCompliance(compoundsList) {
  const list = (compoundsList || []).filter(Boolean);
  if (list.some(c => c === 'I' || c === 'W')) {
    return { compliant: true, waivedWet: true, dryCount: 2 };
  }
  const uniqueDry = new Set(list.filter(c => c === 'S' || c === 'M' || c === 'H'));
  return {
    compliant: uniqueDry.size >= 2,
    waivedWet: false,
    dryCount: uniqueDry.size,
    compounds: [...uniqueDry]
  };
}

function buildGridFromQuali(track, isWet) {
  const w = gameState.weekend;
  const uDrivers = getUserDrivers();
  const entries = gameState.drivers.filter(d => d.teamId).map(d => {
    const tm = getTeam(d.teamId);
    let conf = 65;
    if (d.id === uDrivers[0]?.id) conf = w.fp?.d1?.confidence ?? 55;
    if (d.id === uDrivers[1]?.id) conf = w.fp?.d2?.confidence ?? 55;
    const score = computeCarPaceScore(d, tm, track, conf, isWet) + (Math.random() * 2.4 - 1.2);
    const rawSec = track.baseLap - (score - 82) * 0.14 + (Math.random() * 0.35);
    const gridPenalty = typeof getDriverCarWearState === 'function' ? (getDriverCarWearState(d.id).pendingGridPenalty || 0) : 0;
    return {
      driverId: d.id,
      name: d.name,
      code: d.code,
      teamId: tm.id,
      teamName: tm.name,
      teamColor: tm.color,
      isUser: tm.id === gameState.userTeamId,
      score,
      gridPenalty,
      bestLap: Math.max(58.0, Number(rawSec.toFixed(3)))
    };
  });
  entries.sort((a, b) => b.score - a.score);
  entries.forEach((e, i) => { e.qualPos = i + 1; });
  entries.sort((a, b) => (a.qualPos + a.gridPenalty) - (b.qualPos + b.gridPenalty) || a.gridPenalty - b.gridPenalty || a.qualPos - b.qualPos);
  entries.forEach((e, i) => { e.gridPos = i + 1; });
  return entries;
}

function getSprintLaps(track) {
  return Math.max(14, Math.min(26, Math.round((track?.laps || 56) / 3)));
}

function buildPilotRecommendedSprintStrategy(track, driver, gridPos = 10, isWet = false) {
  const sprintLaps = getSprintLaps(track);
  const tyreSkill = driver?.tyreMgmt ?? 84;
  if (isWet) {
    return {
      tyre: 'I',
      push: 'balanced',
      note: `${driver?.code || 'Pilota'}: "Sprint bagnata (${sprintLaps} giri): partiamo su Intermedie senza sosta prevista."`
    };
  }
  const useMedium = track.tyreDeg === 3 && (tyreSkill < 88 || sprintLaps >= 19);
  const tyre = useMedium ? 'M' : 'S';
  const push = useMedium ? 'push' : (track.tyreDeg === 1 ? 'push' : 'balanced');
  const note = useMedium
    ? `${driver?.code || 'Pilota'}: "Degrado alto sui ${sprintLaps} giri: con la Medium evito il crollo nel finale e non devo fermarmi."`
    : `${driver?.code || 'Pilota'}: "Gara secca da ${sprintLaps} giri senza pit obbligatorio: vado su Soft per attaccare subito!"`;
  return { tyre, push, note };
}

function createDefaultSprintStrategy(track, grid = [], isWet = false) {
  const uDrivers = typeof getUserDrivers === 'function' ? getUserDrivers() : [];
  const getPos = (drv) => (grid || []).find(g => g.driverId === drv?.id)?.gridPos || 10;
  const rec1 = buildPilotRecommendedSprintStrategy(track, uDrivers[0], getPos(uDrivers[0]), isWet);
  const rec2 = buildPilotRecommendedSprintStrategy(track, uDrivers[1], getPos(uDrivers[1]), isWet);
  return {
    d1: { ...rec1, recommended: { ...rec1 } },
    d2: { ...rec2, recommended: { ...rec2 } }
  };
}

function ensureSprintStrategy(track) {
  const w = gameState.weekend;
  if (!w) return createDefaultSprintStrategy(track);
  if (!w.sprintStrategy || !w.sprintStrategy.d1) {
    w.sprintStrategy = createDefaultSprintStrategy(track, w.sprintQuali?.grid || [], !!w.sprintQuali?.isWet);
  }
  return w.sprintStrategy;
}

function setPreSprintChoice(slotKey, field, val) {
  const w = gameState.weekend;
  const track = CALENDAR_2026[gameState.round - 1] || CALENDAR_2026[0];
  if (!w) return;
  const strat = ensureSprintStrategy(track);
  if (!strat[slotKey]) return;
  strat[slotKey][field] = val;
  saveGame();
  renderApp();
}

function applyPilotRecommendedSprintStrategy(slotKey) {
  const w = gameState.weekend;
  const track = CALENDAR_2026[gameState.round - 1] || CALENDAR_2026[0];
  if (!w) return;
  const strat = ensureSprintStrategy(track);
  const cur = strat[slotKey];
  if (!cur?.recommended) return;
  strat[slotKey] = { ...cur.recommended, recommended: { ...cur.recommended } };
  showToast('Assetto gomme Sprint consigliato applicato!', 'success');
  saveGame();
  renderApp();
}

// =========================================================
// QUALIFICHE REALI (Q1/Q2/Q3) E QUALIFICHE SPRINT (SQ1/SQ2/SQ3)
// =========================================================
const QUALI_STAGES = [
  { stage: 1, label: 'Q1', durationSec: 18 * 60, advanceCount: 16, mandatoryDryTyre: null },
  { stage: 2, label: 'Q2', durationSec: 15 * 60, advanceCount: 10, mandatoryDryTyre: null },
  { stage: 3, label: 'Q3', durationSec: 12 * 60, advanceCount: 10, mandatoryDryTyre: null }
];

const SPRINT_QUALI_STAGES = [
  { stage: 1, label: 'SQ1', durationSec: 12 * 60, advanceCount: 16, mandatoryDryTyre: 'M' },
  { stage: 2, label: 'SQ2', durationSec: 10 * 60, advanceCount: 10, mandatoryDryTyre: 'M' },
  { stage: 3, label: 'SQ3', durationSec: 8 * 60, advanceCount: 10, mandatoryDryTyre: 'S' }
];

function getActiveQualiContext() {
  const w = gameState?.weekend;
  if (!w) return { q: null, stages: QUALI_STAGES, isSprint: false };
  if (w.phase === 'sprint_quali') {
    return { q: w.sprintQuali, stages: SPRINT_QUALI_STAGES, isSprint: true };
  }
  return { q: w.quali, stages: QUALI_STAGES, isSprint: false };
}

function initLiveQualifyingSession(isSprint = false) {
  const w = gameState.weekend;
  const track = CALENDAR_2026[gameState.round - 1] || CALENDAR_2026[0];
  const stages = isSprint ? SPRINT_QUALI_STAGES : QUALI_STAGES;
  const isWet = Math.random() < (isSprint ? track.rainChance * 0.85 : track.rainChance);
  // Con la sola FP1 prima della Sprint Quali la pista è leggermente più verde
  const initialGrip = isSprint ? (isWet ? 38 : 46) : (isWet ? 42 : 54);
  const defaultTyre = isWet ? 'I' : (stages[0].mandatoryDryTyre || 'S');

  const participants = gameState.drivers.filter(d => d.teamId).map((d, idx) => {
    const tm = getTeam(d.teamId);
    const isUser = tm.id === gameState.userTeamId;
    return {
      driverId: d.id,
      name: d.name,
      code: d.code,
      teamId: tm.id,
      teamName: tm.name,
      teamColor: tm.color,
      isUser,
      eliminatedIn: null,
      finalGridPos: null,
      tyre: defaultTyre,
      bestLapTyre: null,
      risk: 'balanced',
      status: 'pit', // 'pit' | 'outlap' | 'hotlap' | 'inlap'
      trackProgress: 0,
      pitProgress: 0.2 + ((idx % 11) * 0.06),
      lapStartTime: 0,
      expectedLapSec: track.baseLap,
      bestLapSec: 999,
      lastErrorNote: '',
      runsDone: 0,
      nextAiReleaseSec: (isSprint ? 25 : 40) + idx * (isSprint ? 18 : 28)
    };
  });

  const qualiObj = {
    isSprint,
    stageIndex: 0,
    stageLabel: stages[0].label,
    timeLeftSec: stages[0].durationSec,
    isWet,
    trackGrip: initialGrip,
    speed: 2,
    paused: false,
    stageFinished: false,
    allFinished: false,
    eventsExpanded: false,
    participants,
    events: [
      isSprint
        ? `⚡ Via a ${stages[0].label} (${track.name}) — ${isWet ? 'Bagnato' : `Gomma obbligatoria ${defaultTyre}`} • Grip ${initialGrip}%!`
        : `Via al Q1 (${track.name}) — Aderenza pista iniziale ${initialGrip}%!`
    ]
  };

  if (isSprint) {
    w.sprintQuali = qualiObj;
    w.phase = 'sprint_quali';
  } else {
    w.quali = qualiObj;
    w.phase = 'quali';
  }
  startSessionAnimationLoop();
}

function toggleLiveEventsLog() {
  const w = gameState?.weekend;
  if (!w) return;
  if (w.phase === 'sprint_quali' && w.sprintQuali) {
    w.sprintQuali.eventsExpanded = !w.sprintQuali.eventsExpanded;
  } else if (w.phase === 'quali' && w.quali) {
    w.quali.eventsExpanded = !w.quali.eventsExpanded;
  } else if (w.phase === 'sprint_race' && w.sprintRace) {
    w.sprintRace.eventsExpanded = !w.sprintRace.eventsExpanded;
  } else if (w.phase === 'race' && w.race) {
    w.race.eventsExpanded = !w.race.eventsExpanded;
  }
  renderApp();
}

function setLiveMobileTab(tab, shouldScrollTop = false) {
  const w = gameState?.weekend;
  if (!w) return;
  w.liveMobileTab = tab === 'timing' ? 'timing' : 'pitwall';
  renderApp();
  if (shouldScrollTop && typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function setQualiSpeed(spd) {
  const { q } = getActiveQualiContext();
  if (!q) return;
  if (spd === 0) {
    q.paused = true;
  } else {
    q.paused = false;
    q.speed = spd;
  }
  saveGame();
  renderApp();
}

function setQualiDriverChoice(driverId, field, value) {
  const { q, stages } = getActiveQualiContext();
  if (!q) return;
  const stageObj = stages[q.stageIndex] || stages[0];
  if (q.isSprint && !q.isWet && field === 'tyre' && stageObj.mandatoryDryTyre && value !== stageObj.mandatoryDryTyre) {
    showToast(`Regola Sprint Quali: in ${stageObj.label} sull'asciutto è obbligatoria la mescola ${stageObj.mandatoryDryTyre}!`, 'info');
    return;
  }
  const p = q.participants.find(x => x.driverId === driverId);
  if (!p) return;
  p[field] = value;
  saveGame();
  renderApp();
}

function sendQualiDriverOut(driverId) {
  const { q, stages } = getActiveQualiContext();
  const track = CALENDAR_2026[gameState.round - 1] || CALENDAR_2026[0];
  if (!q || q.stageFinished) return;
  const p = q.participants.find(x => x.driverId === driverId);
  if (!p || p.eliminatedIn) return;
  if (p.status !== 'pit') {
    showToast(`${p.code} è già in pista (${p.status})!`, 'info');
    return;
  }
  const stageObj = stages[q.stageIndex] || stages[0];
  if (q.isSprint && !q.isWet && stageObj.mandatoryDryTyre) {
    p.tyre = stageObj.mandatoryDryTyre;
  }
  p.status = 'outlap';
  p.pitProgress = 0.85;
  p.trackProgress = 0.0;
  p.expectedLapSec = track.baseLap + 6.5;
  p.lastErrorNote = '';
  q.events.unshift(`BOX ${p.code}: esce in pista con gomme ${p.tyre} (rischio ${p.risk}).`);
  saveGame();
  renderApp();
}

function abortQualiDriverToPit(driverId) {
  const { q } = getActiveQualiContext();
  if (!q) return;
  const p = q.participants.find(x => x.driverId === driverId);
  if (!p || p.status === 'pit') return;
  p.status = 'pit';
  p.trackProgress = 0;
  p.pitProgress = 0.45;
  q.events.unshift(`BOX ${p.code}: rientra anticipatamente ai box.`);
  saveGame();
  renderApp();
}

function computeQualiHotLapResult(p, track, isWet, qObj = null) {
  const w = gameState.weekend;
  const q = qObj || getActiveQualiContext().q;
  const drv = gameState.drivers.find(d => d.id === p.driverId);
  const tm = getTeam(p.teamId);
  const uDrivers = getUserDrivers();
  let conf = 65;
  if (p.driverId === uDrivers[0]?.id) conf = w.fp?.d1?.confidence ?? 55;
  if (p.driverId === uDrivers[1]?.id) conf = w.fp?.d2?.confidence ?? 55;

  const grip = q?.trackGrip ?? (isWet ? 45 : 75);
  const gripTimePenalty = Number((((100 - grip) / 100) * 1.45).toFixed(3));
  const lowGripErrorBonus = grip < 70 ? ((70 - grip) / 100) * 0.22 : 0;

  const comp = TYRE_COMPOUNDS[p.tyre] || TYRE_COMPOUNDS.S;
  const weatherMismatchPen = (isWet && comp.wet === 0) ? 9.5 : ((!isWet && comp.wet > 0) ? 5.5 : 0);

  const riskCfg = {
    safe: { paceGain: 0.35, errorChance: 0.03 },
    balanced: { paceGain: 0.0, errorChance: 0.11 },
    push: { paceGain: -0.48, errorChance: 0.25 }
  }[p.risk || 'balanced'];

  const traitMod = drv?.trait === 'attacker' ? -0.05 : (drv?.trait === 'hothead' ? 0.07 : 0);
  const errorRoll = Math.random();
  let errorPenalty = 0;
  let errorMsg = '';

  if (errorRoll < (riskCfg.errorChance + traitMod + lowGripErrorBonus)) {
    if (Math.random() < 0.25 && p.risk === 'push') {
      errorPenalty = 4.2;
      errorMsg = grip < 68 ? '⚠️ Testacoda su asfalto poco gommato!' : '⚠️ Testacoda/Lungo! Giro rovinato';
    } else {
      errorPenalty = 0.85 + Math.random() * 0.9;
      errorMsg = grip < 68
        ? `⚠️ Poco grip (${Math.round(grip)}%): bloccaggio (+${errorPenalty.toFixed(2)}s)`
        : `⚠️ Bloccaggio/Track limits (+${errorPenalty.toFixed(2)}s)`;
    }
  }

  const sessionMode = q?.isSprint ? 'sprint_quali' : 'quali';
  const score = computeCarPaceScore(drv, tm, track, conf, isWet, sessionMode);
  const rawLap = track.baseLap - (score - 82) * 0.14 + (comp.paceBonus * 0.65) + riskCfg.paceGain + gripTimePenalty + weatherMismatchPen + errorPenalty + (Math.random() * 0.28 - 0.14);
  return {
    lapSec: Math.max(58.0, Number(rawLap.toFixed(3))),
    errorMsg
  };
}

function tickLiveQualifying(dtSec) {
  const { q, stages } = getActiveQualiContext();
  if (!q || q.paused || q.stageFinished || q.allFinished) return;

  const track = CALENDAR_2026[gameState.round - 1] || CALENDAR_2026[0];
  const simDelta = dtSec * (q.speed || 1) * 9.5;
  q.timeLeftSec = Math.max(0, q.timeLeftSec - simDelta);

  const activeList = q.participants.filter(p => !p.eliminatedIn);
  const stageObj = stages[q.stageIndex] || stages[0];
  const elapsedInStage = stageObj.durationSec - q.timeLeftSec;
  const carsOnTrack = activeList.filter(p => p.status !== 'pit').length;
  const maxGripForConditions = q.isWet ? 64 : 100;
  if (carsOnTrack > 0 && (q.trackGrip || 50) < maxGripForConditions) {
    const gripGain = simDelta * (0.012 + carsOnTrack * 0.0022);
    q.trackGrip = Math.min(maxGripForConditions, Number(((q.trackGrip || 50) + gripGain).toFixed(1)));
  }

  const minReleaseLeft = q.isSprint ? 105 : 130;
  const pushWindowLeft = q.isSprint ? 240 : 320;
  const maxAiRuns = q.isSprint ? (q.stageIndex === 2 ? 1 : 2) : 2;

  activeList.forEach((p, idx) => {
    if (!p.isUser && p.status === 'pit' && q.timeLeftSec > minReleaseLeft && elapsedInStage >= p.nextAiReleaseSec && p.runsDone < maxAiRuns) {
      p.tyre = q.isWet ? 'I' : (stageObj.mandatoryDryTyre || 'S');
      p.risk = q.timeLeftSec < pushWindowLeft ? 'push' : 'balanced';
      p.status = 'outlap';
      p.pitProgress = 0.85;
      p.trackProgress = 0;
      p.expectedLapSec = track.baseLap + 6.0;
      p.nextAiReleaseSec = elapsedInStage + (q.isSprint ? 260 : 420) + (idx % 5) * 16;
    }

    if (p.status === 'outlap' || p.status === 'hotlap' || p.status === 'inlap') {
      const lapDuration = Math.max(55, p.expectedLapSec || track.baseLap);
      p.trackProgress += simDelta / lapDuration;

      if (p.trackProgress >= 1.0) {
        p.trackProgress -= 1.0;
        if (p.status === 'outlap') {
          p.status = 'hotlap';
          p.expectedLapSec = track.baseLap;
          if (p.isUser) q.events.unshift(`⏱️ ${p.code} lancia il giro veloce (${p.tyre} • ${p.risk})!`);
        } else if (p.status === 'hotlap') {
          const res = computeQualiHotLapResult(p, track, q.isWet, q);
          p.runsDone += 1;
          p.lastErrorNote = res.errorMsg;
          if (res.lapSec < p.bestLapSec) {
            p.bestLapSec = res.lapSec;
            p.bestLapTyre = p.tyre;
          }
          if (res.errorMsg) {
            q.events.unshift(`${p.code}: ${formatLapTime(res.lapSec)} — ${res.errorMsg}`);
          } else if (p.isUser || res.lapSec <= getSortedQualiActive(q)[0]?.bestLapSec) {
            q.events.unshift(`⚡ ${p.code} chiude in ${formatLapTime(res.lapSec)} (${p.tyre})`);
          }
          p.status = 'inlap';
          p.expectedLapSec = track.baseLap + 8.0;
        } else if (p.status === 'inlap') {
          p.status = 'pit';
          p.trackProgress = 0;
          p.pitProgress = 0.25 + ((idx % 10) * 0.05);
          if (p.isUser) q.events.unshift(`BOX ${p.code}: rientrato in pit-lane.`);
        }
      }
    }
  });

  if (q.timeLeftSec <= 0) {
    finishCurrentQualiStage();
  }
}

function getSortedQualiActive(q) {
  return q.participants
    .filter(p => !p.eliminatedIn)
    .sort((a, b) => a.bestLapSec - b.bestLapSec);
}

function skipToEndOfCurrentQualiStage() {
  const { q, stages } = getActiveQualiContext();
  const track = CALENDAR_2026[gameState.round - 1] || CALENDAR_2026[0];
  if (!q || q.stageFinished) return;
  const stageObj = stages[q.stageIndex] || stages[0];
  q.trackGrip = Math.min(q.isWet ? 64 : 100, Number(((q.trackGrip || 54) + 12).toFixed(1)));
  q.participants.filter(p => !p.eliminatedIn).forEach(p => {
    if (p.bestLapSec >= 900 || p.status !== 'pit') {
      if (!p.isUser) {
        p.tyre = q.isWet ? 'I' : (stageObj.mandatoryDryTyre || 'S');
        p.risk = 'push';
      } else if (q.isSprint && !q.isWet && stageObj.mandatoryDryTyre) {
        p.tyre = stageObj.mandatoryDryTyre;
      }
      const res = computeQualiHotLapResult(p, track, q.isWet, q);
      if (res.lapSec < p.bestLapSec) {
        p.bestLapSec = res.lapSec;
        p.bestLapTyre = p.tyre;
      }
      p.lastErrorNote = res.errorMsg;
    }
    p.status = 'pit';
    p.trackProgress = 0;
  });

  q.timeLeftSec = 0;
  finishCurrentQualiStage();
  saveGame();
  renderApp();
}

function finishCurrentQualiStage() {
  const { q, stages } = getActiveQualiContext();
  if (!q || q.stageFinished) return;
  const stageObj = stages[q.stageIndex] || stages[0];
  const sortedActive = getSortedQualiActive(q);

  sortedActive.forEach((p, idx) => {
    p.status = 'pit';
    p.trackProgress = 0;
    if (idx >= stageObj.advanceCount) {
      p.eliminatedIn = stageObj.label;
      p.finalGridPos = idx + 1;
    }
  });

  q.stageFinished = true;
  q.paused = true;

  if (q.stageIndex >= stages.length - 1) {
    sortedActive.forEach((p, idx) => {
      p.finalGridPos = idx + 1;
    });
    const rawOrder = [...q.participants]
      .sort((a, b) => (a.finalGridPos || 99) - (b.finalGridPos || 99))
      .map((p, idx) => {
        const gridPenalty = !q.isSprint && typeof getDriverCarWearState === 'function'
          ? (getDriverCarWearState(p.driverId).pendingGridPenalty || 0)
          : 0;
        return {
          qualPos: idx + 1,
          gridPenalty,
          driverId: p.driverId,
          name: p.name,
          code: p.code,
          teamId: p.teamId,
          teamName: p.teamName,
          teamColor: p.teamColor,
          isUser: p.isUser,
          tyre: p.bestLapTyre || p.tyre,
          bestLap: p.bestLapSec < 900 ? p.bestLapSec : (CALENDAR_2026[gameState.round - 1]?.baseLap || 85) + 3.0
        };
      });

    if (!q.isSprint) {
      rawOrder.sort((a, b) => (a.qualPos + a.gridPenalty) - (b.qualPos + b.gridPenalty) || a.gridPenalty - b.gridPenalty || a.qualPos - b.qualPos);
    }
    const fullGrid = rawOrder.map((entry, idx) => ({
      ...entry,
      gridPos: idx + 1
    }));

    q.grid = fullGrid;
    q.poleLap = rawOrder.find(x => x.qualPos === 1)?.bestLap || fullGrid[0]?.bestLap;
    q.allFinished = true;
    if (!q.isSprint) {
      const penalized = fullGrid.filter(g => g.gridPenalty > 0);
      if (penalized.length) {
        q.events.unshift(`⚖️ Penalità PU/Cambio applicate in griglia: ${penalized.map(g => `${g.code} +${g.gridPenalty}→P${g.gridPos}`).join(', ')}.`);
      }
      generatePostSessionPress('quali', { gridOrder: fullGrid });
      q.events.unshift(`🏁 Fine Q3! Pole Position per ${fullGrid[0]?.name} (P1 al via).`);
    } else {
      pushMediaQuote('Stampa Sprint', `Sprint Pole a ${CALENDAR_2026[gameState.round - 1]?.name || ''} per ${fullGrid[0]?.name} (${formatLapTime(fullGrid[0]?.bestLap)})!`);
      q.events.unshift(`⚡ Fine SQ3! Sprint Pole per ${fullGrid[0]?.name} (${formatLapTime(fullGrid[0]?.bestLap)}).`);
    }
  } else {
    q.events.unshift(`🏁 Fine ${stageObj.label}! Eliminati i piloti dalla P${stageObj.advanceCount + 1} in giù.`);
  }
}

function advanceToNextQualiStage() {
  const { q, stages } = getActiveQualiContext();
  if (!q) return;
  const track = CALENDAR_2026[gameState.round - 1] || CALENDAR_2026[0];

  if (q.allFinished) {
    if (q.isSprint) {
      const { sat } = getRoundWeekendDates(gameState.round, gameState.season);
      if (gameState.currentDate < sat) advanceSingleDay(true);
      gameState.weekend.sprintStrategy = createDefaultSprintStrategy(track, q.grid || [], !!q.isWet);
      gameState.weekend.phase = 'sprint_strategy';
      showToast(`📅 Sabato ${formatCareerDateIT(gameState.currentDate)}: preparazione Gara Sprint!`, 'info');
    } else {
      ensurePreRaceStrategy(track);
      gameState.weekend.phase = 'strategy';
    }
    saveGame();
    renderApp();
    return;
  }

  q.stageIndex += 1;
  const nextStage = stages[q.stageIndex] || stages[0];
  q.stageLabel = nextStage.label;
  q.timeLeftSec = nextStage.durationSec;
  q.stageFinished = false;
  q.paused = false;

  q.participants.filter(p => !p.eliminatedIn).forEach((p, idx) => {
    p.bestLapSec = 999;
    p.bestLapTyre = null;
    p.status = 'pit';
    p.trackProgress = 0;
    p.runsDone = 0;
    p.lastErrorNote = '';
    if (q.isSprint && !q.isWet && nextStage.mandatoryDryTyre) {
      p.tyre = nextStage.mandatoryDryTyre;
    }
    p.nextAiReleaseSec = (q.isSprint ? 20 : 35) + idx * (q.isSprint ? 16 : 25);
  });

  q.events.unshift(`🟢 Semaforo verde per ${nextStage.label} (${Math.round(nextStage.durationSec / 60)} min)${q.isSprint && !q.isWet ? ` • Gomma ${nextStage.mandatoryDryTyre}` : ''}!`);
  saveGame();
  renderApp();
}

// =========================================================
// STRATEGIA PRE-GARA & IN GARA (1, 2 O 3 STINT)
// =========================================================
function setPreRaceChoice(slotKey, field, val) {
  const w = gameState.weekend;
  const track = CALENDAR_2026[gameState.round - 1] || CALENDAR_2026[0];
  if (!w) return;
  const strat = ensurePreRaceStrategy(track);
  const st = strat[slotKey];
  if (!st) return;

  const maxLap = Math.max(10, track.laps);
  if (field === 'stints') {
    st.stints = Math.max(1, Math.min(3, Number(val) || 2));
  } else if (field === 'pit1Lap') {
    const parsed = parseInt(val, 10);
    if (isNaN(parsed)) return;
    st.pit1Lap = Math.max(3, Math.min(maxLap - 3, parsed));
  } else if (field === 'pit2Lap') {
    const parsed = parseInt(val, 10);
    if (isNaN(parsed)) return;
    st.pit2Lap = Math.max(Math.min(maxLap - 2, st.pit1Lap + 3), Math.min(maxLap - 2, parsed));
  } else {
    st[field] = val;
  }

  if (st.pit2Lap < st.pit1Lap + 3) {
    st.pit2Lap = Math.min(maxLap - 2, st.pit1Lap + 3);
  }

  // Se siamo in pausa strategica durante la gara, aggiorna in tempo reale la monoposto
  if (w.race && w.race.cars) {
    const uDrivers = getUserDrivers();
    const targetDrv = slotKey === 'd1' ? uDrivers[0] : uDrivers[1];
    const car = w.race.cars.find(c => c.driverId === targetDrv?.id);
    if (car && !car.retired) {
      car.plannedStops = st.stints - 1;
      car.pit1Lap = st.pit1Lap;
      car.pit1Tyre = st.pit1Tyre;
      car.pit2Lap = st.pit2Lap;
      car.pit2Tyre = st.pit2Tyre;
      car.pushMode = st.push;
    }
  }

  saveGame();
  renderApp();
}

function stepPreRacePitLap(slotKey, field, delta) {
  const w = gameState.weekend;
  const track = CALENDAR_2026[gameState.round - 1] || CALENDAR_2026[0];
  if (!w) return;
  const strat = ensurePreRaceStrategy(track);
  const st = strat[slotKey];
  if (!st) return;
  const cur = Number(st[field] || 15);
  setPreRaceChoice(slotKey, field, cur + delta);
}

function toggleLiveRaceStrategyModal(openState) {
  const race = gameState.weekend?.race;
  const track = CALENDAR_2026[gameState.round - 1] || CALENDAR_2026[0];
  if (!race) return;
  ensurePreRaceStrategy(track);
  race.strategyOpen = openState;
  if (openState) {
    race.paused = true;
  }
  saveGame();
  renderApp();
}

// =========================================================
// MOTORE GARA FLUIDO (GARA SPRINT LIVE & GRAN PREMIO LIVE)
// =========================================================
function getActiveRaceContext() {
  const w = gameState?.weekend;
  if (!w) return null;
  if (w.phase === 'sprint_race') return w.sprintRace;
  return w.race;
}

function buildRaceWeatherPlan(track, initialWet, totalLaps, isSprint = false) {
  const rainProb = Math.min(0.68, (track?.rainChance || 0.1) * (isSprint ? 0.95 : 1.15));
  if (initialWet) {
    const heavy = Math.random() < 0.35;
    if (Math.random() < 0.45 && totalLaps >= 18) {
      const endLap = Math.max(6, Math.round(totalLaps * (0.45 + Math.random() * 0.25)));
      return { type: 'rain_clearing', changeLap: 0, endLap, heavy };
    }
    return { type: 'steady_wet', changeLap: 0, endLap: 999, heavy };
  }

  if (Math.random() < rainProb && totalLaps >= 16) {
    const changeLap = Math.max(4, Math.min(totalLaps - 5, Math.round(totalLaps * (0.28 + Math.random() * 0.36))));
    const duration = isSprint ? (5 + Math.floor(Math.random() * 6)) : (7 + Math.floor(Math.random() * 10));
    const endLap = changeLap + duration < totalLaps - 3 ? changeLap + duration : 999;
    return { type: 'rain_coming', changeLap, endLap, heavy: Math.random() < 0.32 };
  }

  return { type: 'steady_dry', changeLap: 999, endLap: 999, heavy: false };
}

function getRaceWeatherRadar(race) {
  if (!race) return { label: 'Sereno', detail: 'Meteo stabile', tone: 'text-slate-300' };
  const wp = race.weatherPlan || { type: 'steady_dry', changeLap: 999, endLap: 999, heavy: false };
  const lap = race.currentLap || 0;
  const total = race.totalLaps || 56;

  if (race.isWet) {
    if (wp.endLap < total && lap < wp.endLap) {
      const inLaps = Math.max(1, wp.endLap - lap);
      return {
        label: wp.heavy ? 'Pioggia Forte' : 'Pioggia',
        detail: `Schiarita tra ~${inLaps} giri (G${wp.endLap})`,
        tone: 'text-sky-300'
      };
    }
    return {
      label: wp.heavy ? 'Pioggia Forte' : 'Pioggia',
      detail: 'Asfalto bagnato fino al traguardo',
      tone: 'text-sky-300'
    };
  }

  if (wp.type === 'rain_coming' && lap < wp.changeLap) {
    const inLaps = Math.max(1, wp.changeLap - lap);
    const windowEnd = wp.endLap < total ? `–G${wp.endLap}` : '+';
    return {
      label: 'Asciutto',
      detail: `Radar: pioggia tra ~${inLaps} giri (G${wp.changeLap}${windowEnd})`,
      tone: 'text-amber-300'
    };
  }

  return {
    label: 'Asciutto',
    detail: 'Cielo stabile · 0% pioggia prevista',
    tone: 'text-emerald-300'
  };
}

function startLiveSprintRace() {
  const w = gameState.weekend;
  const track = CALENDAR_2026[gameState.round - 1] || CALENDAR_2026[0];
  const uDrivers = getUserDrivers();
  const baseGrid = w.sprintQuali?.grid || buildGridFromQuali(track, false);
  const strat = ensureSprintStrategy(track);
  const sprintLaps = getSprintLaps(track);
  const isWet = !!w.sprintQuali?.isWet;
  const weatherPlan = buildRaceWeatherPlan(track, isWet, sprintLaps, true);

  const cars = baseGrid.map((g, idx) => {
    const drv = gameState.drivers.find(d => d.id === g.driverId);
    const tm = getTeam(g.teamId);
    const isD1 = drv?.id === uDrivers[0]?.id;
    const isD2 = drv?.id === uDrivers[1]?.id;
    const myStrat = isD1 ? strat.d1 : (isD2 ? strat.d2 : null);

    // Nella Sprint non c'è sosta obbligatoria: IA parte su Soft o Medium (su degrado alto)
    const aiUseMed = track.tyreDeg === 3 && ((drv?.tyreMgmt ?? 84) < 88 || idx % 2 === 1);
    const initTyre = myStrat ? myStrat.tyre : (isWet ? (weatherPlan.heavy ? 'W' : 'I') : (aiUseMed ? 'M' : 'S'));
    const pushMode = myStrat ? myStrat.push : (initTyre === 'M' ? 'push' : 'balanced');

    const startOffsetLap = -idx * 0.0032;
    return {
      driverId: drv.id,
      name: drv.name,
      code: drv.code,
      teamId: tm.id,
      teamName: tm.name,
      teamColor: tm.color,
      isUser: tm.id === gameState.userTeamId,
      gridPos: g.gridPos,
      pos: g.gridPos,
      lap: 0,
      lapProgress: Math.max(0, 1 + startOffsetLap),
      distanceLaps: startOffsetLap,
      totalTime: idx * 0.28,
      gapToLeader: idx * 0.28,
      tyre: initTyre,
      tyreWear: 0,
      pitStops: 0,
      plannedStops: 0,
      pit1Lap: 999,
      pit1Tyre: 'M',
      pit2Lap: 999,
      pit2Tyre: 'S',
      inPit: false,
      pitTimer: 0,
      pushMode,
      retired: false,
      lastLapSec: g.bestLap,
      bestLapSec: g.bestLap,
      currentLapDuration: Math.max(58.0, g.bestLap + 1.4)
    };
  });

  const userPitCompounds = {};
  uDrivers.forEach(ud => { userPitCompounds[ud.id] = isWet ? 'I' : 'S'; });

  w.sprintRace = {
    isSprint: true,
    totalLaps: sprintLaps,
    currentLap: 0,
    finished: false,
    paused: false,
    strategyOpen: false,
    eventsExpanded: false,
    speed: 2,
    safetyCar: false,
    scLapsLeft: 0,
    weather: isWet ? (weatherPlan.heavy ? 'Pioggia Forte' : 'Pioggia') : 'Asciutto',
    isWet,
    weatherPlan,
    userPitCompounds,
    cars,
    events: [`⚡ Semafori verdi! Parte la Gara Sprint di ${track.name} (${sprintLaps} giri, nessuna sosta obbligatoria)!`]
  };
  w.phase = 'sprint_race';
  startSessionAnimationLoop();
  saveGame();
  renderApp();
}

function startLiveRace() {
  const w = gameState.weekend;
  const track = CALENDAR_2026[gameState.round - 1] || CALENDAR_2026[0];
  const uDrivers = getUserDrivers();
  const baseGrid = w.quali?.grid || buildGridFromQuali(track, false);
  const strat = ensurePreRaceStrategy(track);
  const isWet = !!w.quali?.isWet;
  const weatherPlan = buildRaceWeatherPlan(track, isWet, track.laps, false);

  const cars = baseGrid.map((g, idx) => {
    const drv = gameState.drivers.find(d => d.id === g.driverId);
    const tm = getTeam(g.teamId);
    const isD1 = drv?.id === uDrivers[0]?.id;
    const isD2 = drv?.id === uDrivers[1]?.id;
    const myStrat = isD1 ? strat.d1 : (isD2 ? strat.d2 : null);

    const aiTwoStops = track.tyreDeg === 3 && (idx % 3 === 0);
    const initTyre = myStrat ? myStrat.startTyre : (isWet ? (weatherPlan.heavy ? 'W' : 'I') : (idx % 2 === 0 ? 'M' : 'H'));
    const pit1Lap = myStrat ? myStrat.pit1Lap : Math.round(track.laps * (aiTwoStops ? 0.33 : 0.46 + (idx % 4) * 0.03));
    let pit1Tyre = myStrat ? myStrat.pit1Tyre : (initTyre === 'H' ? 'M' : 'H');
    if (!myStrat && !isWet && pit1Tyre === initTyre) {
      pit1Tyre = initTyre === 'M' ? 'H' : 'M';
    }
    const pit2Lap = myStrat ? myStrat.pit2Lap : Math.round(track.laps * 0.67);
    const pit2Tyre = myStrat ? myStrat.pit2Tyre : 'M';
    const plannedStops = myStrat ? (myStrat.stints - 1) : (aiTwoStops ? 2 : 1);
    const pushMode = myStrat ? myStrat.push : 'balanced';

    const startOffsetLap = -idx * 0.0045;
    return {
      driverId: drv.id,
      name: drv.name,
      code: drv.code,
      teamId: tm.id,
      teamName: tm.name,
      teamColor: tm.color,
      isUser: tm.id === gameState.userTeamId,
      gridPos: g.gridPos,
      pos: g.gridPos,
      lap: 0,
      lapProgress: Math.max(0, 1 + startOffsetLap),
      distanceLaps: startOffsetLap,
      totalTime: idx * 0.35,
      gapToLeader: idx * 0.35,
      tyre: initTyre,
      tyreWear: 0,
      engineLoadLaps: 0,
      stintStartLap: 0,
      completedStints: [],
      pitStops: 0,
      plannedStops,
      pit1Lap,
      pit1Tyre,
      pit2Lap,
      pit2Tyre,
      inPit: false,
      pitTimer: 0,
      pushMode,
      retired: false,
      lastLapSec: g.bestLap,
      bestLapSec: g.bestLap,
      currentLapDuration: g.bestLap + 2.5
    };
  });

  // Le penalità in griglia pendenti per PU/Cambio vengono scontate alla partenza del GP della domenica
  (gameState.teams || []).forEach(tm => {
    if (tm.carComponentPools) {
      if (tm.carComponentPools[1]) tm.carComponentPools[1].gridPenalty = 0;
      if (tm.carComponentPools[2]) tm.carComponentPools[2].gridPenalty = 0;
    }
  });

  const userPitCompounds = {};
  uDrivers.forEach((ud, i) => {
    const myStrat = i === 0 ? strat.d1 : strat.d2;
    const hasPlanned = myStrat && (myStrat.stints || 1) >= 2;
    userPitCompounds[ud.id] = isWet ? (weatherPlan.heavy ? 'W' : 'I') : (hasPlanned ? (myStrat.pit1Tyre || 'H') : 'H');
  });

  w.race = {
    isSprint: false,
    totalLaps: track.laps,
    currentLap: 0,
    finished: false,
    paused: false,
    strategyOpen: false,
    eventsExpanded: false,
    speed: 2,
    safetyCar: false,
    scLapsLeft: 0,
    weather: isWet ? (weatherPlan.heavy ? 'Pioggia Forte' : 'Pioggia') : 'Asciutto',
    isWet,
    weatherPlan,
    userPitCompounds,
    cars,
    events: [`🚦 Semafori verdi! Parte il GP ${track.name} (${track.laps} giri)!`]
  };
  w.phase = 'race';
  startSessionAnimationLoop();
  saveGame();
  renderApp();
}

function setLiveRaceSpeed(spd) {
  const race = getActiveRaceContext();
  if (!race) return;
  if (spd === 0) {
    race.paused = true;
  } else {
    race.paused = false;
    race.speed = spd;
  }
  saveGame();
  renderApp();
}

function setLiveCarPush(driverId, mode) {
  const race = getActiveRaceContext();
  const track = CALENDAR_2026[gameState.round - 1] || CALENDAR_2026[0];
  const car = race?.cars?.find(c => c.driverId === driverId);
  if (car) {
    car.pushMode = mode;
    if (!car.inPit && !car.retired) {
      car.currentLapDuration = computeDynamicLapDuration(car, track, race);
    }
    saveGame();
    renderApp();
  }
}

function getCarNextScheduledPit(car, totalLaps) {
  if (!car) return { active: false };
  const curLap = car.lap || 0;
  if (car.forcePitCompound) {
    const targetLap = Math.min(totalLaps, curLap + 1);
    return { active: true, forced: true, lap: targetLap, compound: car.forcePitCompound, lapsLeft: 1 };
  }
  if (car.pitStops === 0 && car.plannedStops >= 1) {
    const lap = Math.max(curLap + 1, Math.min(totalLaps - 1, car.pit1Lap || Math.round(totalLaps * 0.45)));
    return { active: true, forced: false, pitIdx: 1, lap, compound: car.pit1Tyre || 'H', lapsLeft: Math.max(1, lap - curLap) };
  }
  if (car.pitStops === 1 && car.plannedStops >= 2) {
    const lap = Math.max(curLap + 1, Math.min(totalLaps - 1, car.pit2Lap || Math.round(totalLaps * 0.72)));
    return { active: true, forced: false, pitIdx: 2, lap, compound: car.pit2Tyre || 'M', lapsLeft: Math.max(1, lap - curLap) };
  }
  return { active: false };
}

function buildCarStintTimeline(car, race) {
  const totalLaps = Math.max(1, race?.totalLaps || 56);
  const segs = [];
  let cursor = 0;

  (car.completedStints || []).forEach(st => {
    const s = Math.max(cursor, st.startLap ?? cursor);
    const e = Math.min(totalLaps, Math.max(s + 1, st.endLap ?? s + 1));
    segs.push({ startLap: s, endLap: e, compound: st.compound || 'M', status: 'done' });
    cursor = e;
  });

  const curStart = Math.max(cursor, car.stintStartLap ?? cursor);
  if (race?.isSprint) {
    segs.push({ startLap: curStart, endLap: totalLaps, compound: car.tyre || 'S', status: 'current' });
    return segs;
  }

  const nextPit = getCarNextScheduledPit(car, totalLaps);
  if (car.pitStops === 0 && car.plannedStops >= 1 && !car.forcePitCompound) {
    const p1 = Math.max(curStart + 1, Math.min(totalLaps - 1, car.pit1Lap || Math.round(totalLaps * 0.45)));
    segs.push({ startLap: curStart, endLap: p1, compound: car.tyre || 'M', status: 'current' });
    if (car.plannedStops >= 2) {
      const p2 = Math.max(p1 + 2, Math.min(totalLaps - 1, car.pit2Lap || Math.round(totalLaps * 0.72)));
      segs.push({ startLap: p1, endLap: p2, compound: car.pit1Tyre || 'H', status: 'planned' });
      segs.push({ startLap: p2, endLap: totalLaps, compound: car.pit2Tyre || 'M', status: 'planned' });
    } else {
      segs.push({ startLap: p1, endLap: totalLaps, compound: car.pit1Tyre || 'H', status: 'planned' });
    }
  } else if (car.pitStops === 1 && car.plannedStops >= 2 && !car.forcePitCompound) {
    const p2 = Math.max(curStart + 1, Math.min(totalLaps - 1, car.pit2Lap || Math.round(totalLaps * 0.72)));
    segs.push({ startLap: curStart, endLap: p2, compound: car.tyre || 'H', status: 'current' });
    segs.push({ startLap: p2, endLap: totalLaps, compound: car.pit2Tyre || 'M', status: 'planned' });
  } else if (nextPit.active && nextPit.forced) {
    const pNow = Math.max(curStart + 1, Math.min(totalLaps - 1, nextPit.lap));
    segs.push({ startLap: curStart, endLap: pNow, compound: car.tyre || 'M', status: 'current' });
    segs.push({ startLap: pNow, endLap: totalLaps, compound: nextPit.compound || 'H', status: 'planned' });
  } else {
    segs.push({ startLap: curStart, endLap: totalLaps, compound: car.tyre || 'H', status: 'current' });
  }
  return segs;
}

function syncCarStrategyToPreRace(car) {
  const w = gameState.weekend;
  if (!w || !w.preRaceStrategy || !car) return;
  const uDrivers = getUserDrivers();
  const slotKey = car.driverId === uDrivers[0]?.id ? 'd1' : (car.driverId === uDrivers[1]?.id ? 'd2' : null);
  const st = slotKey ? w.preRaceStrategy[slotKey] : null;
  if (!st) return;
  st.stints = Math.max(1, Math.min(3, (car.plannedStops || 0) + 1));
  st.pit1Lap = car.pit1Lap;
  st.pit1Tyre = car.pit1Tyre;
  st.pit2Lap = car.pit2Lap;
  st.pit2Tyre = car.pit2Tyre;
}

function setUserNextPitCompound(driverId, compound) {
  const race = getActiveRaceContext();
  if (!race || !TYRE_COMPOUNDS[compound]) return;
  race.userPitCompounds = race.userPitCompounds || {};
  race.userPitCompounds[driverId] = compound;
  const car = race.cars?.find(c => c.driverId === driverId);
  if (car) {
    if (car.forcePitCompound) {
      car.forcePitCompound = compound;
    } else if (!race.isSprint) {
      if (car.pitStops === 0 && car.plannedStops >= 1) car.pit1Tyre = compound;
      else if (car.pitStops === 1 && car.plannedStops >= 2) car.pit2Tyre = compound;
      syncCarStrategyToPreRace(car);
    }
  }
  saveGame();
  renderApp();
}

function shiftUserLivePitLap(driverId, delta) {
  const race = getActiveRaceContext();
  if (!race || race.isSprint) return;
  const totalLaps = race.totalLaps || 56;
  const car = race.cars?.find(c => c.driverId === driverId);
  if (!car || car.retired || car.inPit) return;

  const minAllowed = Math.max((car.lap || 0) + 1, 3);
  const maxAllowed = Math.max(minAllowed, totalLaps - 2);

  if (car.pitStops === 0 && car.plannedStops >= 1) {
    car.pit1Lap = Math.max(minAllowed, Math.min(maxAllowed, (car.pit1Lap || Math.round(totalLaps * 0.45)) + delta));
    if (car.plannedStops >= 2 && car.pit2Lap < car.pit1Lap + 3) {
      car.pit2Lap = Math.min(maxAllowed, car.pit1Lap + 3);
    }
  } else if (car.pitStops === 1 && car.plannedStops >= 2) {
    const minP2 = Math.max(minAllowed, (car.pit1Lap || 10) + 3);
    car.pit2Lap = Math.max(minP2, Math.min(maxAllowed, (car.pit2Lap || Math.round(totalLaps * 0.72)) + delta));
  } else {
    return;
  }

  syncCarStrategyToPreRace(car);
  saveGame();
  renderApp();
}

function addExtraLivePit(driverId) {
  const race = getActiveRaceContext();
  if (!race || race.isSprint) return;
  const totalLaps = race.totalLaps || 56;
  const car = race.cars?.find(c => c.driverId === driverId);
  if (!car || car.retired || car.inPit) return;
  const curLap = car.lap || 0;
  if (curLap >= totalLaps - 2) {
    showToast('Troppo vicino al traguardo per programmare una sosta.', 'info');
    return;
  }
  const chosenComp = race.userPitCompounds?.[driverId] || (race.isWet ? 'I' : 'M');

  if (car.pitStops === 0 && car.plannedStops === 0) {
    car.plannedStops = 1;
    car.pit1Lap = Math.min(totalLaps - 2, Math.max(curLap + 3, Math.round((curLap + totalLaps) / 2)));
    car.pit1Tyre = chosenComp;
    race.events.unshift(`📻 ${car.code}: pianificata sosta al Giro ${car.pit1Lap} (${chosenComp}).`);
  } else if (car.pitStops === 1 && car.plannedStops <= 1) {
    car.plannedStops = 2;
    car.pit2Lap = Math.min(totalLaps - 2, Math.max(curLap + 3, Math.round((curLap + totalLaps) / 2)));
    car.pit2Tyre = chosenComp;
    race.events.unshift(`📻 ${car.code}: aggiunta 2ª sosta al Giro ${car.pit2Lap} (${chosenComp}).`);
  } else if (car.pitStops === 0 && car.plannedStops === 1) {
    car.plannedStops = 2;
    car.pit2Lap = Math.min(totalLaps - 2, Math.max((car.pit1Lap || curLap) + 5, Math.round(((car.pit1Lap || curLap) + totalLaps) / 2)));
    car.pit2Tyre = chosenComp === 'H' ? 'M' : chosenComp;
    race.events.unshift(`📻 ${car.code}: aggiunta 2ª sosta al Giro ${car.pit2Lap} (${car.pit2Tyre}).`);
  } else {
    showToast('Massimo 2 soste programmate già attive.', 'info');
    return;
  }

  syncCarStrategyToPreRace(car);
  saveGame();
  renderApp();
}

function skipNextLivePit(driverId) {
  const race = getActiveRaceContext();
  if (!race || race.isSprint) return;
  const car = race.cars?.find(c => c.driverId === driverId);
  if (!car || car.retired) return;

  if (car.forcePitCompound) {
    car.forcePitCompound = null;
    race.events.unshift(`📻 ${car.code}: rientro immediato annullato.`);
  } else if (car.pitStops === 0 && car.plannedStops >= 1) {
    car.plannedStops = 0;
    race.events.unshift(`📻 ${car.code}: sosta programmata annullata, resta in pista.`);
  } else if (car.pitStops === 1 && car.plannedStops >= 2) {
    car.plannedStops = 1;
    race.events.unshift(`📻 ${car.code}: 2ª sosta annullata, si va fino in fondo.`);
  }

  syncCarStrategyToPreRace(car);
  saveGame();
  renderApp();
}

function pitUserCarNow(driverId, compound = null) {
  const race = getActiveRaceContext();
  const car = race?.cars?.find(c => c.driverId === driverId);
  if (!car || car.retired || car.inPit) return;
  const chosen = compound || race.userPitCompounds?.[driverId] || (race.isWet ? 'I' : (race.isSprint ? 'S' : 'H'));
  race.userPitCompounds = race.userPitCompounds || {};
  race.userPitCompounds[driverId] = chosen;
  car.forcePitCompound = chosen;
  race.events.unshift(`📻 BOX ${car.code}: ordine di rientro a fine giro per montare ${chosen}!`);
  saveGame();
  renderApp();
}

function cancelUserPitOrder(driverId) {
  const race = getActiveRaceContext();
  const car = race?.cars?.find(c => c.driverId === driverId);
  if (!car || !car.forcePitCompound) return;
  car.forcePitCompound = null;
  race.events.unshift(`📻 BOX ${car.code}: ordine di rientro annullato, resta in pista.`);
  saveGame();
  renderApp();
}

function computeTyreWearPerLap(car, track, race) {
  const drv = gameState.drivers.find(d => d.id === car.driverId);
  const comp = TYRE_COMPOUNDS[car.tyre] || TYRE_COMPOUNDS.M;
  const degTrackMult = track.tyreDeg === 3 ? 1.24 : (track.tyreDeg === 2 ? 1.0 : 0.84);
  const ruleDegMult = gameState.rules?.extraDegMultiplier || 1.0;

  const tyreSkill = drv?.tyreMgmt ?? 84;
  const driverSkillMult = Math.max(0.84, Math.min(1.16, 1.0 - ((tyreSkill - 84) * 0.011)));
  const traitMult = drv?.trait === 'tactician' ? 0.94 : (drv?.trait === 'attacker' ? 1.06 : 1.0);

  let fpDegMult = 1.0;
  if (car.isUser) {
    const uDrivers = getUserDrivers();
    const fpSlot = car.driverId === uDrivers[0]?.id ? gameState.weekend?.fp?.d1 : gameState.weekend?.fp?.d2;
    const conf = fpSlot?.confidence ?? 55;
    const tyreProgPct = fpSlot?.programs?.tyre ?? 0;
    const qualiProgPct = fpSlot?.programs?.quali ?? 0;
    const confDegMult = 1.0 + ((55 - conf) / 100) * 0.24;
    const progDegMult = 1.0 - (tyreProgPct / 100) * 0.18 + (Math.max(0, qualiProgPct - tyreProgPct) / 100) * 0.10;
    fpDegMult = Math.max(0.76, Math.min(1.25, confDegMult * progDegMult));
  }

  const pushMult = car.pushMode === 'push' ? 1.26 : (car.pushMode === 'conserve' ? 0.76 : 1.0);
  const scMult = race.safetyCar ? 0.42 : 1.0;
  const sprintFuelMult = race.isSprint ? 0.94 : 1.0;
  const overheatingMult = (!race.isWet && comp.wet > 0) ? 2.1 : 1.0;

  return comp.degRate * degTrackMult * ruleDegMult * driverSkillMult * traitMult * fpDegMult * pushMult * scMult * sprintFuelMult * overheatingMult;
}

function computeDynamicLapDuration(car, track, race) {
  const drv = gameState.drivers.find(d => d.id === car.driverId);
  const tm = getTeam(car.teamId);
  const comp = TYRE_COMPOUNDS[car.tyre] || TYRE_COMPOUNDS.M;
  const pushFactor = car.pushMode === 'push' ? -0.55 : (car.pushMode === 'conserve' ? 0.45 : 0.0);
  const wear = Number(car.tyreWear || 0);
  const wearPenalty = wear <= 25
    ? wear * 0.012
    : (wear <= 65
      ? 0.30 + (wear - 25) * 0.032
      : (wear <= 85
        ? 1.58 + (wear - 65) * 0.085
        : 3.28 + (wear - 85) * 0.22));
  const wetMismatch = (race.isWet && comp.wet === 0)
    ? 7.5
    : ((!race.isWet && comp.wet > 0)
      ? 4.8
      : (race.isWet && race.weatherPlan?.heavy && comp.wet === 1 ? 0.95 : (race.isWet && !race.weatherPlan?.heavy && comp.wet === 2 ? 0.55 : 0)));
  const sessionMode = race.isSprint ? 'sprint' : 'race';
  const paceScore = computeCarPaceScore(drv, tm, track, 65, race.isWet, sessionMode);
  // Nella Sprint si parte scarichi di benzina: ~0.9s più veloci rispetto al passo pieno della domenica
  const sprintFuelGain = race.isSprint ? -0.90 : 0.0;
  const scFactor = race.safetyCar ? 1.24 : 1.0;

  const baseSec = Math.max(58.0, track.baseLap - (paceScore - 82) * 0.13 + comp.paceBonus + pushFactor + wearPenalty + wetMismatch + sprintFuelGain + (Math.random() * 0.28 - 0.14));
  return Number((baseSec * scFactor).toFixed(3));
}

function tickLiveRace(dtSec) {
  const race = getActiveRaceContext();
  if (!race || race.paused || race.finished) return;

  const track = CALENDAR_2026[gameState.round - 1] || CALENDAR_2026[0];
  const simSec = dtSec * (race.speed || 1) * 6.5;
  const totalLaps = race.totalLaps || track.laps;

  race.cars.forEach(car => {
    if (car.retired) return;

    if (car.inPit) {
      car.pitTimer -= simSec;
      car.totalTime += simSec;
      if (car.pitTimer <= 0) {
        const prevTyre = car.tyre || 'M';
        car.completedStints = car.completedStints || [];
        car.completedStints.push({
          startLap: car.stintStartLap ?? 0,
          endLap: Math.max((car.stintStartLap ?? 0) + 1, car.lap || 1),
          compound: prevTyre
        });
        car.stintStartLap = car.lap || 1;
        car.inPit = false;
        car.tyre = car.nextPitCompound || 'H';
        car.tyreWear = 0;
        car.warnedWearCritical = false;
        car.pitStops += 1;
        car.nextPitCompound = null;
        if (car.isUser && !race.isSprint && race.userPitCompounds) {
          if (car.pitStops === 1 && car.plannedStops >= 2) {
            race.userPitCompounds[car.driverId] = car.pit2Tyre || 'M';
          }
        }
        car.currentLapDuration = computeDynamicLapDuration(car, track, race);
        race.events.unshift(`🔧 BOX ${car.code}: sosta completata, riparte su ${car.tyre}!`);
      }
      return;
    }

    const lapDur = Math.max(55.0, car.currentLapDuration || track.baseLap);
    const deltaLaps = simSec / lapDur;
    car.distanceLaps += deltaLaps;
    car.totalTime += simSec;

    const loadMult = car.pushMode === 'push' ? 1.28 : (car.pushMode === 'conserve' ? 0.78 : 1.0);
    car.engineLoadLaps = (car.engineLoadLaps || 0) + deltaLaps * loadMult;

    const comp = TYRE_COMPOUNDS[car.tyre] || TYRE_COMPOUNDS.M;
    const wearPerLap = computeTyreWearPerLap(car, track, race);
    car.tyreWear = Math.min(100, (car.tyreWear || 0) + wearPerLap * deltaLaps);
    if (car.isUser && !car.warnedWearCritical && car.tyreWear >= 75) {
      car.warnedWearCritical = true;
      race.events.unshift(`⚠️ ${car.code}: degrado gomme critico (${Math.round(car.tyreWear)}%), calo netto sul passo!`);
    }

    const completedLapNow = Math.max(0, Math.floor(car.distanceLaps));
    if (completedLapNow > car.lap) {
      car.lap = completedLapNow;
      car.lastLapSec = lapDur;
      if (car.lap >= 1 && car.lastLapSec < car.bestLapSec) {
        car.bestLapSec = car.lastLapSec;
      }

      if (!race.isSprint && car.isUser && !car.warnedCompoundRule && car.lap >= Math.max(1, totalLaps - 10)) {
        const usedSoFar = [...(car.completedStints || []).map(s => s.compound), car.tyre];
        if (!checkTwoCompoundRuleCompliance(usedSoFar).compliant) {
          car.warnedCompoundRule = true;
          race.events.unshift(`⚠️ RADIO ${car.code}: devi ancora montare una 2ª mescola diversa sull'asciutto (rischio squalifica FIA)!`);
        }
      }

      const tm = getTeam(car.teamId);
      const wearState = typeof getDriverCarWearState === 'function' ? getDriverCarWearState(car.driverId) : { maxWear: 0 };
      const wearDnfBonus = wearState.maxWear > 70 ? ((wearState.maxWear - 70) / 30) * 0.0085 : 0;
      const relRisk = Math.max(0.0008, (100 - (tm?.rel || 82)) * 0.00048) + wearDnfBonus;
      if (car.lap > 2 && Math.random() < relRisk) {
        car.retired = true;
        const causeLabel = wearState.maxWear > 70 ? ' (guasto PU/Cambio usurato)' : '';
        race.events.unshift(`💥 Giro ${car.lap}: RITIRO per ${car.name} (${tm.short})${causeLabel}!`);
        const scProb = race.isSprint ? 0.30 : 0.42;
        if (!race.safetyCar && Math.random() < scProb && car.lap < totalLaps - 3) {
          race.safetyCar = true;
          race.scLapsLeft = race.isSprint ? 2 : 3;
          race.events.unshift(`🟡 SAFETY CAR in pista al giro ${car.lap}!`);
        }
        return;
      }

      let shouldPit = false;
      let targetCompound = race.isSprint ? 'S' : 'H';

      if (car.forcePitCompound) {
        shouldPit = true;
        targetCompound = car.forcePitCompound;
        car.forcePitCompound = null;
      } else if (!car.isUser && race.isWet && comp.wet === 0 && car.lap >= 2 && car.lap < totalLaps - 2) {
        shouldPit = true;
        targetCompound = race.weatherPlan?.heavy ? 'W' : 'I';
      } else if (!car.isUser && !race.isWet && comp.wet > 0 && car.lap >= 3 && car.lap < totalLaps - 2) {
        shouldPit = true;
        targetCompound = totalLaps - car.lap <= 16 ? 'S' : 'M';
      } else if (!race.isSprint && car.lap < totalLaps - 2) {
        if (car.pitStops === 0 && car.plannedStops >= 1 && car.lap >= car.pit1Lap) {
          shouldPit = true;
          targetCompound = car.pit1Tyre || 'H';
        } else if (car.pitStops === 1 && car.plannedStops >= 2 && car.lap >= car.pit2Lap) {
          shouldPit = true;
          targetCompound = car.pit2Tyre || 'M';
        }
      }

      if (shouldPit) {
        car.inPit = true;
        car.pitTimer = 21.5;
        car.nextPitCompound = targetCompound;
      } else {
        car.currentLapDuration = computeDynamicLapDuration(car, track, race);
      }
    }
  });

  const active = race.cars.filter(c => !c.retired).sort((a, b) => b.distanceLaps - a.distanceLaps);
  const retired = race.cars.filter(c => c.retired);
  const leader = active[0];
  const leaderLap = leader ? leader.lap : race.currentLap;

  if (leaderLap > race.currentLap) {
    race.currentLap = leaderLap;
    if (race.safetyCar) {
      race.scLapsLeft -= 1;
      if (race.scLapsLeft <= 0) {
        race.safetyCar = false;
        race.events.unshift(`🟢 Safety Car rientra ai box al giro ${race.currentLap}: si riparte!`);
      }
    }

    const wp = race.weatherPlan;
    if (wp) {
      if (!race.isWet && wp.type === 'rain_coming' && race.currentLap >= wp.changeLap && race.currentLap < wp.endLap) {
        race.isWet = true;
        race.weather = wp.heavy ? 'Pioggia Forte' : 'Pioggia';
        race.events.unshift(`🌧️ Giro ${race.currentLap}: ${wp.heavy ? 'acquazzone intenso' : 'inizia a piovere'}! Finestra box per ${wp.heavy ? 'Full Wet (W)' : 'Intermedie (I)'}!`);
      } else if (race.isWet && race.currentLap >= wp.endLap) {
        race.isWet = false;
        race.weather = 'Asciutto';
        race.events.unshift(`☀️ Giro ${race.currentLap}: la pioggia cessa e si forma la traiettoria asciutta!`);
      }
    } else if (!race.isWet && Math.random() < track.rainChance * (race.isSprint ? 0.025 : 0.035) && race.currentLap > 3 && race.currentLap < totalLaps - 2) {
      race.isWet = true;
      race.weather = 'Pioggia';
      race.events.unshift(`🌧️ Giro ${race.currentLap}: inizia a piovere sul tracciato!`);
    }
  }

  active.forEach((c, idx) => {
    c.pos = idx + 1;
    if (idx === 0 || !leader) {
      c.gapToLeader = 0;
    } else {
      const lapDiff = Math.max(0, leader.distanceLaps - c.distanceLaps);
      c.gapToLeader = Number((lapDiff * (leader.currentLapDuration || track.baseLap)).toFixed(2));
    }
  });
  retired.forEach((c, idx) => {
    c.pos = active.length + idx + 1;
  });

  if (leader && leader.lap >= totalLaps) {
    if (race.isSprint) {
      finalizeSprintRaceResults();
    } else {
      finalizeRaceResults();
    }
  }
}

function applyWeekendComponentWear(race) {
  if (!race || !Array.isArray(race.cars)) return;
  race.cars.forEach(c => {
    const tm = getTeam(c.teamId);
    if (!tm) return;
    const teamDrivers = (gameState.drivers || []).filter(d => d.teamId === tm.id);
    const carNum = teamDrivers[1]?.id === c.driverId ? 2 : 1;
    const parts = (gameState.garageParts?.[tm.id] || []).filter(p => p.assignedCar === carNum);
    const load = c.engineLoadLaps > 0 ? c.engineLoadLaps : Math.max(3, c.lap || 12);
    const puGain = Math.max(1, Math.round(load * 0.21));
    const chGain = Math.max(1, Math.round(load * 0.17));

    const puPart = parts.find(p => p.slot === 'pu');
    const chPart = parts.find(p => p.slot === 'chassis');
    if (puPart) puPart.wear = Math.min(100, Math.round((puPart.wear || 0) + puGain));
    if (chPart) chPart.wear = Math.min(100, Math.round((chPart.wear || 0) + chGain));

    if (c.isUser) {
      if ((puPart?.wear || 0) >= 70 || (chPart?.wear || 0) >= 70) {
        gameState.newsFeed.unshift(`GARAGE Auto #${carNum} (${c.code}): usura elevata (PU ${puPart?.wear || 0}%, Cambio ${chPart?.wear || 0}%). Valuta la sostituzione in Garage.`);
      }
    } else if (tm.carComponentPools?.[carNum]) {
      // Anche i team IA sostituiscono PU/Cambio se superano l'82% di usura, subendo eventuali penalità se sforano la quota 4/4
      if ((puPart?.wear || 0) >= 82) {
        puPart.wear = 0;
        tm.carComponentPools[carNum].puUsed = (tm.carComponentPools[carNum].puUsed || 1) + 1;
        if (tm.carComponentPools[carNum].puUsed > 4) {
          tm.carComponentPools[carNum].gridPenalty = (tm.carComponentPools[carNum].gridPenalty || 0) + 10;
          pushMediaQuote('Regolamento FIA', `${tm.name} (${c.code}): sostituita Power Unit (${tm.carComponentPools[carNum].puUsed}/4), +10 pos. al prossimo GP.`);
        }
      }
      if ((chPart?.wear || 0) >= 82) {
        chPart.wear = 0;
        tm.carComponentPools[carNum].chassisUsed = (tm.carComponentPools[carNum].chassisUsed || 1) + 1;
        if (tm.carComponentPools[carNum].chassisUsed > 4) {
          tm.carComponentPools[carNum].gridPenalty = (tm.carComponentPools[carNum].gridPenalty || 0) + 5;
        }
      }
    }
  });
}

function finalizeSprintRaceResults() {
  const w = gameState.weekend;
  const race = w.sprintRace;
  const track = CALENDAR_2026[gameState.round - 1] || CALENDAR_2026[0];
  const userTeam = getUserTeam();
  const sprintPointsMap = [8, 7, 6, 5, 4, 3, 2, 1];

  race.finished = true;
  race.paused = true;
  applyWeekendComponentWear(race);

  const ordered = [...race.cars].sort((a, b) => {
    if (a.retired && !b.retired) return 1;
    if (!a.retired && b.retired) return -1;
    return a.pos - b.pos;
  });

  let sprintIncome = 0;
  const classification = ordered.map((c, idx) => {
    const pos = c.retired ? 'RIT' : idx + 1;
    const pts = (!c.retired && typeof pos === 'number' && sprintPointsMap[pos - 1]) ? sprintPointsMap[pos - 1] : 0;
    const drv = gameState.drivers.find(d => d.id === c.driverId);
    const tm = getTeam(c.teamId);

    if (drv) {
      drv.points = (drv.points || 0) + pts;
      const sprintFat = (drv.staminaShield || 0) > 0 ? 4 : 6;
      drv.fatigue = Math.min(100, (drv.fatigue ?? 15) + sprintFat);
    }
    if (tm) {
      tm.points = (tm.points || 0) + pts;
    }

    if (c.isUser && !c.retired && typeof pos === 'number') {
      if (pts > 0) sprintIncome = Number((sprintIncome + pts * 0.25).toFixed(1));
      if (pos <= 3) sprintIncome = Number((sprintIncome + 0.8).toFixed(1));
      adjustDriverMood(c.driverId, pos <= 3 ? 4 : (pos <= 8 ? 2 : -2), `Sprint chiusa in P${pos}`);
    } else if (c.isUser && c.retired) {
      adjustDriverMood(c.driverId, -4, 'Ritiro nella Sprint');
    } else if (!c.isUser && tm && pts > 0) {
      tm.budget = Number((tm.budget + pts * 0.15).toFixed(1));
    }

    return {
      pos,
      driverId: c.driverId,
      name: c.name,
      code: c.code,
      teamId: c.teamId,
      teamName: c.teamName,
      teamColor: c.teamColor,
      isUser: c.isUser,
      tyre: c.tyre,
      stints: [...(c.completedStints || []).map(s => s.compound), c.tyre],
      pitStops: c.pitStops,
      bestLap: c.bestLapSec,
      pts
    };
  });

  if (sprintIncome > 0) {
    userTeam.budget = Number((userTeam.budget + sprintIncome).toFixed(1));
  }
  w.sprintResults = { classification, sprintIncome, trackName: track.name };
  w.phase = 'sprint_summary';
  pushMediaQuote('Stampa Sprint', `Sprint ${track.name}: vince ${classification[0]?.name || ''}!`);
  showToast(`⚡ Sprint completata!${sprintIncome > 0 ? ` Bonus +€${sprintIncome.toFixed(1)}M` : ''}`, 'success');
  saveGame();
  renderApp();
}

function continueAfterSprintSummary() {
  initLiveQualifyingSession(false);
  showToast('Sabato pomeriggio: Qualifiche ufficiali del GP (Q1)!', 'info');
  saveGame();
  renderApp();
}

function finalizeRaceResults() {
  const w = gameState.weekend;
  const race = w.race;
  const track = CALENDAR_2026[gameState.round - 1] || CALENDAR_2026[0];
  const sponsor = getActiveSponsor();
  const userTeam = getUserTeam();
  const pointsTable = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

  race.finished = true;
  race.paused = true;
  applyWeekendComponentWear(race);

  // Controllo regola FIA: obbligo di almeno 2 mescole diverse sull'asciutto (decade se usate I o W)
  race.cars.forEach(c => {
    const usedList = [...(c.completedStints || []).map(s => s.compound), c.tyre];
    const check = checkTwoCompoundRuleCompliance(usedList);
    c.dsqCompoundRule = !c.retired && !check.compliant;
    if (c.dsqCompoundRule) {
      race.events.unshift(`🚫 SQUALIFICA FIA: ${c.name} (${c.code}) escluso per aver usato una sola mescola sull'asciutto!`);
      pushMediaQuote('Commissari FIA', `SQUALIFICA a ${track.name}: ${c.name} ha completato il GP sull'asciutto con una sola mescola (${c.tyre}).`);
    }
  });

  const ordered = [...race.cars].sort((a, b) => {
    const rankA = a.retired ? 2 : (a.dsqCompoundRule ? 1 : 0);
    const rankB = b.retired ? 2 : (b.dsqCompoundRule ? 1 : 0);
    if (rankA !== rankB) return rankA - rankB;
    return a.pos - b.pos;
  });

  let gpIncome = Number(sponsor.perRace.toFixed(1));
  const classification = ordered.map((c, idx) => {
    const pos = c.retired ? 'RIT' : (c.dsqCompoundRule ? 'SQ' : idx + 1);
    const pts = (!c.retired && !c.dsqCompoundRule && typeof pos === 'number' && pointsTable[pos - 1]) ? pointsTable[pos - 1] : 0;
    const drv = gameState.drivers.find(d => d.id === c.driverId);
    const tm = getTeam(c.teamId);

    if (drv) {
      drv.points = (drv.points || 0) + pts;
      if (pos === 1) drv.wins = (drv.wins || 0) + 1;
      if (typeof pos === 'number' && pos <= 3) drv.podiums = (drv.podiums || 0) + 1;
      const baseFat = c.retired ? 8 : 16;
      const finalFat = (drv.staminaShield || 0) > 0 ? Math.round(baseFat * 0.6) : baseFat;
      if ((drv.staminaShield || 0) > 0) drv.staminaShield = 0;
      drv.fatigue = Math.min(100, (drv.fatigue ?? 15) + finalFat);
    }
    if (tm) {
      tm.points = (tm.points || 0) + pts;
      if (pos === 1) tm.wins = (tm.wins || 0) + 1;
      if (typeof pos === 'number' && pos <= 3) tm.podiums = (tm.podiums || 0) + 1;
    }

    if (c.isUser && !c.retired && !c.dsqCompoundRule && typeof pos === 'number') {
      if (pts > 0) gpIncome = Number((gpIncome + pts * sponsor.pointsBonus).toFixed(1));
      if (pos <= 3) gpIncome = Number((gpIncome + sponsor.podiumBonus).toFixed(1));
      if (pos === 1) gpIncome = Number((gpIncome + sponsor.winBonus).toFixed(1));
      adjustDriverMood(c.driverId, pos <= 3 ? 7 : (pos <= 10 ? 3 : -4), `Gara chiusa in P${pos}`);
    } else if (c.isUser && c.dsqCompoundRule) {
      adjustDriverMood(c.driverId, -8, 'Squalifica FIA: usata una sola mescola asciutta');
    } else if (c.isUser && c.retired) {
      adjustDriverMood(c.driverId, -6, 'Ritiro in gara');
    } else if (!c.isUser && tm) {
      const aiBonus = 1.2 + pts * 0.25 + (typeof pos === 'number' && pos <= 3 ? 1.5 : 0);
      tm.budget = Number((tm.budget + aiBonus).toFixed(1));
      if (!c.retired && !c.dsqCompoundRule && typeof pos === 'number') {
        adjustDriverMood(c.driverId, pos <= 3 ? 5 : (pos <= 10 ? 2 : -2));
      } else if (c.retired || c.dsqCompoundRule) {
        adjustDriverMood(c.driverId, -4);
      }
    }

    return {
      pos,
      dsqReason: c.dsqCompoundRule ? '1 mescola dry (Regola FIA)' : null,
      driverId: c.driverId,
      name: c.name,
      code: c.code,
      teamId: c.teamId,
      teamName: c.teamName,
      teamColor: c.teamColor,
      isUser: c.isUser,
      tyre: c.tyre,
      stints: [...(c.completedStints || []).map(s => s.compound), c.tyre],
      pitStops: c.pitStops,
      bestLap: c.bestLapSec,
      pts
    };
  });

  userTeam.budget = Number((userTeam.budget + gpIncome).toFixed(1));
  gameState.completedRounds = gameState.completedRounds || [];
  gameState.completedRounds.push({
    season: gameState.season,
    round: gameState.round,
    gpName: track.name,
    winner: classification[0]?.name || '',
    gpIncome
  });

  w.results = { classification, gpIncome, trackName: track.name };
  w.phase = 'summary';
  generatePostSessionPress('race', { classification });
  showToast(`Bandiera a scacchi! Incasso GP: +€${gpIncome.toFixed(1)}M`, 'success');
  saveGame();
  renderApp();
}

function continueAfterRaceSummary() {
  const { sun } = getRoundWeekendDates(gameState.round, gameState.season);
  // Dopo la gara della domenica si passa al lunedì successivo
  gameState.currentDate = addDaysToIsoDate(sun, 1);
  gameState.isRaceWeekendActive = false;

  if (gameState.round < CALENDAR_2026.length) {
    gameState.round += 1;
    gameState.weekend = initWeekendState(gameState.round, gameState.userTeamId, gameState.drivers);
    generatePaddockPressForRound(gameState.round);
    gameState.activeTab = 'hub';
    showToast(`📅 ${formatCareerDateIT(gameState.currentDate)} — Verso il GP ${gameState.round}: ${CALENDAR_2026[gameState.round - 1].name}!`, 'info');
  } else {
    applyEndOfSeasonPrizesAndReset();
  }
  saveGame();
  renderApp();
}

function applyEndOfSeasonPrizesAndReset() {
  ensureMarketAndAiDefaults();
  const sortedTeams = [...gameState.teams].sort((a, b) => (b.points || 0) - (a.points || 0) || (b.wins || 0) - (a.wins || 0));
  const sortedDriversLast = [...gameState.drivers].filter(d => d.teamId).sort((a, b) => (b.points || 0) - (a.points || 0) || (b.wins || 0) - (a.wins || 0) || b.ovr - a.ovr);
  const champDriver = sortedDriversLast[0];
  const champDriverTeam = champDriver ? getTeam(champDriver.teamId) : null;
  const champTeam = sortedTeams[0];
  const userPosIdx = sortedTeams.findIndex(t => t.id === gameState.userTeamId);
  const userTmObj = getUserTeam();

  gameState.hallOfFame = gameState.hallOfFame || [];
  if (!gameState.hallOfFame.some(h => h.season === gameState.season)) {
    gameState.hallOfFame.unshift({
      season: gameState.season,
      championDriver: champDriver?.name || '-',
      championDriverTeam: champDriverTeam?.short || '-',
      championDriverPts: champDriver?.points || 0,
      championTeam: champTeam?.name || '-',
      championTeamPts: champTeam?.points || 0,
      userTeamName: userTmObj?.name || '-',
      userPos: userPosIdx >= 0 ? userPosIdx + 1 : 11,
      userPts: userTmObj?.points || 0
    });
  }

  sortedTeams.forEach((t, idx) => {
    const prize = FOM_PRIZE_POOL[idx] || 60.0;
    const wages = getDriversWageBill(t.id);
    t.budget = Number((t.budget + prize - wages).toFixed(1));
    if (t.id !== gameState.userTeamId && t.budget < 22.0) {
      // Ricapitalizzazione minima soci per mantenere competitive le scuderie IA
      t.budget = 22.0;
    }
    if (t.id === gameState.userTeamId) {
      pushMediaQuote('Fine Stagione FOM', `Chiusa la stagione ${gameState.season} in P${idx + 1} Costruttori: premio FOM +€${prize.toFixed(1)}M, monte ingaggi -€${wages.toFixed(1)}M.`);
    }
  });

  if (gameState.season < gameState.maxSeasons) {
    // Decrementa contratti, invecchia piloti e svincolati
    gameState.drivers.forEach(d => {
      d.points = 0;
      d.wins = 0;
      d.podiums = 0;
      d.age = (d.age || 25) + 1;
      d.contract = Math.max(0, (d.contract || 1) - 1);
      d.fatigue = 10;
    });
    (gameState.freeAgents || []).forEach(fa => {
      fa.points = 0;
      fa.wins = 0;
      fa.podiums = 0;
      fa.age = (fa.age || 23) + 1;
      fa.fatigue = 10;
    });

    // Reset Budget Cap e sviluppi in corso di fine anno + mercato IA & adeguamento regolamenti
    gameState.capSpent = 0.0;
    gameState.aiPendingUpgrades = [];
    gameState.lastAiSillySeasonRound = 0;
    gameState.completedRounds = [];
    gameState.teams.forEach(t => {
      t.capSpent = 0.0;
      t.points = 0;
      t.wins = 0;
      t.podiums = 0;
    });

    if (typeof processOffSeasonAiMarket === 'function') {
      processOffSeasonAiMarket();
    }
    if (typeof processOffSeasonRegulations === 'function') {
      processOffSeasonRegulations(sortedTeams);
    }

    gameState.season += 1;
    gameState.round = 1;
    // Primo lunedì utile di fine febbraio del nuovo anno
    const feb22 = new Date(Date.UTC(gameState.season, 1, 22));
    const offsetToMonday = (8 - feb22.getUTCDay()) % 7;
    feb22.setUTCDate(feb22.getUTCDate() + offsetToMonday);
    gameState.currentDate = toIsoDateUTC(feb22);
    gameState.isRaceWeekendActive = false;

    gameState.weekend = initWeekendState(1, gameState.userTeamId, gameState.drivers);
    generatePaddockPressForRound(1);
    gameState.activeTab = 'hub';
    showToast(`Benvenuti nella stagione ${gameState.season} (${formatCareerDateIT(gameState.currentDate)})!`, 'success');
  } else {
    showToast('Ciclo di 7 stagioni completato! Consulta l\'Albo d\'Oro o gestisci i salvataggi.', 'info');
  }
}

// =========================================================
// AGGIORNAMENTO SELETTIVO DOM & LOOP ANIMAZIONE FLUIDO (60 FPS)
// =========================================================
function updateTrackDotsDomOnly(track, dots) {
  if (typeof getCachedTrackPoints !== 'function' || typeof document === 'undefined') return;
  const pathPoints = getCachedTrackPoints(track.round, track.path);
  const pitStartX = 82;
  const pitEndX = 148;
  const pitY = 144;

  dots.forEach(d => {
    const circle = document.getElementById(`track-dot-${d.code}`);
    if (!circle) return;
    let cx = 115;
    let cy = pitY;
    if (d.inPit) {
      const pFrac = Math.max(0, Math.min(1, d.pitProgress ?? 0.5));
      cx = pitStartX + (pitEndX - pitStartX) * pFrac;
      cy = pitY;
    } else if (pathPoints.length > 0) {
      const prog = ((d.trackProgress % 1) + 1) % 1;
      const idx = Math.min(pathPoints.length - 1, Math.floor(prog * pathPoints.length));
      cx = pathPoints[idx].x;
      cy = pathPoints[idx].y;
    }
    circle.setAttribute('cx', cx.toFixed(1));
    circle.setAttribute('cy', cy.toFixed(1));
    const lbl = document.getElementById(`track-label-${d.code}`);
    if (lbl) {
      lbl.setAttribute('x', (cx + 6).toFixed(1));
      lbl.setAttribute('y', (cy + 3).toFixed(1));
    }
  });
}

function updateLiveSessionDomOnly() {
  if (!gameState || !gameState.weekend || typeof document === 'undefined') return;
  const w = gameState.weekend;
  const track = CALENDAR_2026[gameState.round - 1] || CALENDAR_2026[0];

  if (w.phase === 'quali' || w.phase === 'sprint_quali') {
    const { q } = getActiveQualiContext();
    if (!q) return;
    const mins = Math.floor(q.timeLeftSec / 60);
    const secs = Math.floor(q.timeLeftSec % 60);
    const clockEl = document.getElementById('quali-clock');
    if (clockEl) clockEl.textContent = `⏱️ ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    const grip = Math.round(q.trackGrip ?? (q.isWet ? 45 : 65));
    const gripPenaltySec = (((100 - grip) / 100) * 1.45).toFixed(2);
    const gripTextEl = document.getElementById('quali-grip-val');
    if (gripTextEl) gripTextEl.textContent = `${grip}%`;
    const gripImpEl = document.getElementById('quali-grip-impact');
    if (gripImpEl) gripImpEl.textContent = `+${gripPenaltySec}s`;
    const gripBarEl = document.getElementById('quali-grip-bar');
    if (gripBarEl) gripBarEl.style.width = `${grip}%`;

    const activeDrivers = getSortedQualiActive(q);
    updateTrackDotsDomOnly(track, activeDrivers.map(p => ({
      code: p.code,
      inPit: p.status === 'pit',
      pitProgress: p.pitProgress,
      trackProgress: p.trackProgress
    })));
    return;
  }

  if (w.phase === 'race' || w.phase === 'sprint_race') {
    const race = getActiveRaceContext();
    if (!race || !Array.isArray(race.cars)) return;

    const ordered = [...race.cars].sort((a, b) => a.pos - b.pos);
    updateTrackDotsDomOnly(track, ordered.filter(c => !c.retired).map(c => ({
      code: c.code,
      inPit: c.inPit,
      pitProgress: c.inPit ? Math.max(0, Math.min(1, 1 - (c.pitTimer / 21.5))) : 0,
      trackProgress: c.distanceLaps
    })));

    race.cars.forEach(c => {
      const gapEl = document.getElementById(`live-gap-${c.driverId}`);
      if (gapEl) {
        gapEl.textContent = c.retired
          ? 'RIT'
          : (c.inPit ? 'IN PIT' : (c.pos === 1 ? 'LEADER' : `+${Number(c.gapToLeader || 0).toFixed(1)}s`));
      }
      if (c.isUser) {
        const wearPct = Math.round(c.tyreWear || 0);
        const lifePct = Math.max(0, 100 - wearPct);
        const wearTextEl = document.getElementById(`car-wear-text-${c.driverId}`);
        if (wearTextEl) {
          wearTextEl.textContent = `Usura ${wearPct}% (Vita ${lifePct}%)${!race.isSprint ? ` · Pit ${c.pitStops}/${c.plannedStops}` : ''}`;
        }
        const wearBarEl = document.getElementById(`car-wear-bar-${c.driverId}`);
        if (wearBarEl) {
          wearBarEl.style.width = `${lifePct}%`;
        }
        const timelinePinEl = document.getElementById(`car-timeline-pos-${c.driverId}`);
        if (timelinePinEl) {
          const total = Math.max(1, race.totalLaps || track.laps || 56);
          const pct = Math.min(100, Math.max(0, (c.distanceLaps / total) * 100));
          timelinePinEl.style.left = `${pct.toFixed(1)}%`;
        }
        const miniCarEl = document.getElementById(`mobile-mini-car-${c.driverId}`);
        if (miniCarEl) {
          const miniGap = c.retired ? 'RIT' : (c.inPit ? 'PIT' : (c.pos === 1 ? 'P1' : `+${Number(c.gapToLeader || 0).toFixed(1)}s`));
          miniCarEl.textContent = `P${c.retired ? 'R' : c.pos} ${c.code} ${miniGap}`;
        }
      }
    });

    const miniLeaderEl = document.getElementById('mobile-mini-leader');
    if (miniLeaderEl && ordered[0]) {
      miniLeaderEl.textContent = `G${race.currentLap}/${race.totalLaps || track.laps} · P1 ${ordered[0].code}`;
    }
  }
}

function getQualiSnapshotSignature(q) {
  if (!q) return '';
  const order = getSortedQualiActive(q).map(p => `${p.driverId}:${p.status}:${p.tyre}:${p.bestLapSec.toFixed(3)}`).join('|');
  return `${q.stageIndex}|${q.stageFinished}|${q.events.length}|${order}`;
}

function getRaceSnapshotSignature(race) {
  if (!race || !Array.isArray(race.cars)) return '';
  const order = [...race.cars]
    .sort((a, b) => a.pos - b.pos)
    .map(c => {
      const wearTier = c.isUser ? (c.tyreWear >= 75 ? 2 : (c.tyreWear >= 48 ? 1 : 0)) : 0;
      return `${c.driverId}:${c.inPit ? 1 : 0}:${c.retired ? 1 : 0}:${c.tyre}:${c.pitStops}:${wearTier}`;
    })
    .join('|');
  return `${race.currentLap}|${race.finished}|${race.safetyCar}|${race.isWet}|${race.events.length}|${order}`;
}

function startSessionAnimationLoop() {
  if (animFrameId) return;
  lastAnimTimestamp = performance.now();
  let lastDomUpdate = 0;

  const step = (now) => {
    const dtSec = Math.min(0.1, (now - lastAnimTimestamp) / 1000);
    lastAnimTimestamp = now;

    if (gameState && gameState.activeTab === 'weekend' && gameState.weekend && !uiModal) {
      const w = gameState.weekend;
      const activeQuali = w.phase === 'sprint_quali' ? w.sprintQuali : (w.phase === 'quali' ? w.quali : null);
      const activeRace = w.phase === 'sprint_race' ? w.sprintRace : (w.phase === 'race' ? w.race : null);

      if (activeQuali && !activeQuali.paused && !activeQuali.stageFinished) {
        const beforeSig = getQualiSnapshotSignature(activeQuali);
        tickLiveQualifying(dtSec);
        const afterSig = getQualiSnapshotSignature(activeQuali);
        if (beforeSig !== afterSig) {
          renderApp();
        } else if (now - lastDomUpdate > 32) {
          lastDomUpdate = now;
          updateLiveSessionDomOnly();
        }
      } else if (activeRace && !activeRace.paused && !activeRace.finished) {
        const beforeSig = getRaceSnapshotSignature(activeRace);
        tickLiveRace(dtSec);
        const afterSig = getRaceSnapshotSignature(activeRace);
        if (beforeSig !== afterSig) {
          renderApp();
        } else if (now - lastDomUpdate > 32) {
          lastDomUpdate = now;
          updateLiveSessionDomOnly();
        }
      }
    }

    animFrameId = requestAnimationFrame(step);
  };

  animFrameId = requestAnimationFrame(step);
}
