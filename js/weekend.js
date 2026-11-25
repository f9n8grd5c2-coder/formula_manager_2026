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

  return {
    round: roundNum,
    hasSprint: !!track.hasSprint,
    day: 'friday',
    phase: 'fp',
    targets: { wing: targetD1.wing, susp: targetD1.susp, brake: targetD1.brake, ride: targetD1.ride, diff: targetD1.diff },
    driverTargets: { d1: targetD1, d2: targetD2 },
    fp: {
      session: 1,
      runsLeftInSession: 3,
      activeSlot: 'd1',
      d1: d1 ? makeDriverSetup(4, 5, 6, 5, 5) : null,
      d2: d2 ? makeDriverSetup(6, 5, 4, 6, 5) : null
    },
    sprintQuali: null,
    sprintRace: null,
    quali: null,
    preRaceStrategy: createDefaultPreRaceStrategy(track),
    race: null,
    results: null
  };
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
  const maxSessions = w.hasSprint ? 2 : 3;
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
    w.phase = 'sprint_quali';
    showToast('Venerdì pomeriggio: Qualifiche Sprint!', 'info');
  } else {
    if (gameState.currentDate < sat) advanceSingleDay(true);
    initLiveQualifyingSession();
    showToast(`Sabato ${formatCareerDateIT(gameState.currentDate)}: Qualifiche ufficiali Q1!`, 'info');
  }
  saveGame();
  renderApp();
}

function computeCarPaceScore(driver, team, track, setupConf = 65, isWet = false, sessionMode = 'race') {
  const mood = getMoodMeta(driver.mood);
  const baseCar = (team.aero * 0.36 + team.pu * 0.34 + team.chassis * 0.30);
  const trackDnaBonus = (
    (track.downforce - 5) * ((team.aero - 80) * 0.04) +
    (track.topSpeed - 5) * ((team.pu - 80) * 0.04)
  );
  const driverSkill = (driver.pace * 0.45 + driver.cons * 0.35 + driver.tyreMgmt * 0.20);
  const confBonus = ((setupConf - 50) / 50) * 1.4;

  // Bonus dai Programmi Prove Libere per i piloti utente
  let fpProgramBonus = 0;
  const uDrivers = getUserDrivers();
  const fpSlot = driver.id === uDrivers[0]?.id ? gameState.weekend?.fp?.d1 : (driver.id === uDrivers[1]?.id ? gameState.weekend?.fp?.d2 : null);
  if (fpSlot?.programs) {
    if (sessionMode === 'quali') {
      fpProgramBonus = ((fpSlot.programs.quali || 0) / 100) * 1.65;
    } else {
      fpProgramBonus = ((fpSlot.programs.race || 0) / 100) * 1.50;
    }
  }

  const wetBonus = isWet && driver.trait === 'wet_ace' ? 2.4 : 0;
  const fatiguePen = Math.max(0, ((driver.fatigue ?? 15) - 55) * 0.05);
  return baseCar * 0.58 + driverSkill * 0.42 + trackDnaBonus + confBonus + fpProgramBonus + wetBonus - (mood.paceDelta * 2.2) - fatiguePen;
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
    return {
      driverId: d.id,
      name: d.name,
      code: d.code,
      teamId: tm.id,
      teamName: tm.name,
      teamColor: tm.color,
      isUser: tm.id === gameState.userTeamId,
      score,
      bestLap: Math.max(58.0, Number(rawSec.toFixed(3)))
    };
  });
  entries.sort((a, b) => b.score - a.score);
  entries.forEach((e, i) => { e.gridPos = i + 1; });
  return entries;
}

function simulateSprintWeekendSequence() {
  const w = gameState.weekend;
  const track = CALENDAR_2026[gameState.round - 1] || CALENDAR_2026[0];
  const isWet = Math.random() < track.rainChance * 0.7;
  const sqGrid = buildGridFromQuali(track, isWet);
  w.sprintQuali = { grid: sqGrid, isWet };

  const sprintPointsMap = [8, 7, 6, 5, 4, 3, 2, 1];
  const sprintOrder = [...sqGrid].sort((a, b) => (b.score + (Math.random() * 1.8 - 0.9)) - (a.score + (Math.random() * 1.8 - 0.9)));
  const sprintRows = sprintOrder.map((e, idx) => {
    const pos = idx + 1;
    const pts = sprintPointsMap[idx] || 0;
    const drv = gameState.drivers.find(x => x.id === e.driverId);
    const tm = getTeam(e.teamId);
    if (drv) drv.points = (drv.points || 0) + pts;
    if (tm) tm.points = (tm.points || 0) + pts;
    if (e.isUser && pts > 0) {
      tm.budget = Number((tm.budget + pts * 0.2).toFixed(1));
    }
    return { ...e, pos, pts };
  });
  w.sprintRace = { classification: sprintRows, isWet };
  initLiveQualifyingSession();
  showToast('Sprint completata! Ora Qualifiche ufficiali Q1!', 'success');
  saveGame();
  renderApp();
}

// =========================================================
// QUALIFICHE REALI Q1 / Q2 / Q3 CON PUNTINI FLUIDI E BOX
// =========================================================
const QUALI_STAGES = [
  { stage: 1, label: 'Q1', durationSec: 18 * 60, advanceCount: 16 },
  { stage: 2, label: 'Q2', durationSec: 15 * 60, advanceCount: 10 },
  { stage: 3, label: 'Q3', durationSec: 12 * 60, advanceCount: 10 }
];

function initLiveQualifyingSession() {
  const w = gameState.weekend;
  const track = CALENDAR_2026[gameState.round - 1] || CALENDAR_2026[0];
  const isWet = Math.random() < track.rainChance;
  const initialGrip = isWet ? 42 : 54;
  const defaultTyre = isWet ? 'I' : 'S';

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
      risk: 'balanced',
      status: 'pit', // 'pit' | 'outlap' | 'hotlap' | 'inlap'
      trackProgress: 0,
      pitProgress: 0.2 + ((idx % 11) * 0.06),
      lapStartTime: 0,
      expectedLapSec: track.baseLap,
      bestLapSec: 999,
      lastErrorNote: '',
      runsDone: 0,
      nextAiReleaseSec: 40 + idx * 28
    };
  });

  w.quali = {
    stageIndex: 0,
    stageLabel: 'Q1',
    timeLeftSec: QUALI_STAGES[0].durationSec,
    isWet,
    trackGrip: initialGrip,
    speed: 2,
    paused: false,
    stageFinished: false,
    allFinished: false,
    participants,
    events: [`Via al Q1 (${track.name}) — Aderenza pista iniziale ${initialGrip}%!`]
  };
  w.phase = 'quali';
  startSessionAnimationLoop();
}

function setQualiSpeed(spd) {
  const q = gameState.weekend?.quali;
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
  const q = gameState.weekend?.quali;
  if (!q) return;
  const p = q.participants.find(x => x.driverId === driverId);
  if (!p) return;
  p[field] = value;
  saveGame();
  renderApp();
}

function sendQualiDriverOut(driverId) {
  const q = gameState.weekend?.quali;
  const track = CALENDAR_2026[gameState.round - 1] || CALENDAR_2026[0];
  if (!q || q.stageFinished) return;
  const p = q.participants.find(x => x.driverId === driverId);
  if (!p || p.eliminatedIn) return;
  if (p.status !== 'pit') {
    showToast(`${p.code} è già in pista (${p.status})!`, 'info');
    return;
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
  const q = gameState.weekend?.quali;
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

function computeQualiHotLapResult(p, track, isWet) {
  const w = gameState.weekend;
  const q = w?.quali;
  const drv = gameState.drivers.find(d => d.id === p.driverId);
  const tm = getTeam(p.teamId);
  const uDrivers = getUserDrivers();
  let conf = 65;
  if (p.driverId === uDrivers[0]?.id) conf = w.fp?.d1?.confidence ?? 55;
  if (p.driverId === uDrivers[1]?.id) conf = w.fp?.d2?.confidence ?? 55;

  const grip = q?.trackGrip ?? (isWet ? 45 : 75);
  // Conseguenza 1: pista poco gommata penalizza il tempo sul giro (fino a +0.95s al 40% di grip, 0.00s al 100%)
  const gripTimePenalty = Number((((100 - grip) / 100) * 1.45).toFixed(3));
  // Conseguenza 2: bassa aderenza aumenta il rischio di sbavature se il pilota spinge
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

  const score = computeCarPaceScore(drv, tm, track, conf, isWet, 'quali');
  const rawLap = track.baseLap - (score - 82) * 0.14 + (comp.paceBonus * 0.65) + riskCfg.paceGain + gripTimePenalty + weatherMismatchPen + errorPenalty + (Math.random() * 0.28 - 0.14);
  return {
    lapSec: Math.max(58.0, Number(rawLap.toFixed(3))),
    errorMsg
  };
}

function tickLiveQualifying(dtSec) {
  const w = gameState?.weekend;
  const q = w?.quali;
  if (!q || q.paused || q.stageFinished || q.allFinished) return;

  const track = CALENDAR_2026[gameState.round - 1] || CALENDAR_2026[0];
  const simDelta = dtSec * (q.speed || 1) * 9.5;
  q.timeLeftSec = Math.max(0, q.timeLeftSec - simDelta);

  const activeList = q.participants.filter(p => !p.eliminatedIn);
  const stageObj = QUALI_STAGES[q.stageIndex];
  const elapsedInStage = stageObj.durationSec - q.timeLeftSec;
const carsOnTrack = activeList.filter(p => p.status !== 'pit').length;
  const maxGripForConditions = q.isWet ? 64 : 100;
  if (carsOnTrack > 0 && (q.trackGrip || 50) < maxGripForConditions) {
    const gripGain = simDelta * (0.012 + carsOnTrack * 0.0022);
    q.trackGrip = Math.min(maxGripForConditions, Number(((q.trackGrip || 50) + gripGain).toFixed(1)));
  }
  
  activeList.forEach((p, idx) => {
    if (!p.isUser && p.status === 'pit' && q.timeLeftSec > 130 && elapsedInStage >= p.nextAiReleaseSec && p.runsDone < 2) {
      p.tyre = q.isWet ? 'I' : 'S';
      p.risk = q.timeLeftSec < 320 ? 'push' : 'balanced';
      p.status = 'outlap';
      p.pitProgress = 0.85;
      p.trackProgress = 0;
      p.expectedLapSec = track.baseLap + 6.0;
      p.nextAiReleaseSec = elapsedInStage + 420 + (idx % 5) * 20;
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
          const res = computeQualiHotLapResult(p, track, q.isWet);
          p.runsDone += 1;
          p.lastErrorNote = res.errorMsg;
          if (res.lapSec < p.bestLapSec) {
            p.bestLapSec = res.lapSec;
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
  const q = gameState.weekend?.quali;
  const track = CALENDAR_2026[gameState.round - 1] || CALENDAR_2026[0];
  if (!q || q.stageFinished) return;
  q.trackGrip = Math.min(q.isWet ? 64 : 100, Number(((q.trackGrip || 54) + 14).toFixed(1)));
  q.participants.filter(p => !p.eliminatedIn).forEach(p => {
    if (p.bestLapSec >= 900 || p.status !== 'pit') {
      if (!p.isUser) {
        p.tyre = q.isWet ? 'I' : 'S';
        p.risk = 'push';
      }
      const res = computeQualiHotLapResult(p, track, q.isWet);
      if (res.lapSec < p.bestLapSec) p.bestLapSec = res.lapSec;
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
  const q = gameState.weekend?.quali;
  if (!q || q.stageFinished) return;
  const stageObj = QUALI_STAGES[q.stageIndex];
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

  if (q.stageIndex >= QUALI_STAGES.length - 1) {
    sortedActive.forEach((p, idx) => {
      p.finalGridPos = idx + 1;
    });
    const fullGrid = [...q.participants]
      .sort((a, b) => (a.finalGridPos || 99) - (b.finalGridPos || 99))
      .map((p, idx) => ({
        gridPos: idx + 1,
        driverId: p.driverId,
        name: p.name,
        code: p.code,
        teamId: p.teamId,
        teamName: p.teamName,
        teamColor: p.teamColor,
        isUser: p.isUser,
        bestLap: p.bestLapSec < 900 ? p.bestLapSec : (CALENDAR_2026[gameState.round - 1]?.baseLap || 85) + 3.0
      }));
    q.grid = fullGrid;
    q.poleLap = fullGrid[0]?.bestLap;
    q.allFinished = true;
    generatePostSessionPress('quali', { gridOrder: fullGrid });
    q.events.unshift(`🏁 Fine Q3! Pole Position per ${fullGrid[0]?.name} (${formatLapTime(fullGrid[0]?.bestLap)}).`);
  } else {
    q.events.unshift(`🏁 Fine ${stageObj.label}! Eliminati i piloti dalla P${stageObj.advanceCount + 1} in giù.`);
  }
}

function advanceToNextQualiStage() {
  const q = gameState.weekend?.quali;
  if (!q) return;
  if (q.allFinished) {
    const track = CALENDAR_2026[gameState.round - 1] || CALENDAR_2026[0];
    ensurePreRaceStrategy(track);
    gameState.weekend.phase = 'strategy';
    saveGame();
    renderApp();
    return;
  }

  q.stageIndex += 1;
  const nextStage = QUALI_STAGES[q.stageIndex];
  q.stageLabel = nextStage.label;
  q.timeLeftSec = nextStage.durationSec;
  q.stageFinished = false;
  q.paused = false;

  q.participants.filter(p => !p.eliminatedIn).forEach((p, idx) => {
    p.bestLapSec = 999;
    p.status = 'pit';
    p.trackProgress = 0;
    p.runsDone = 0;
    p.lastErrorNote = '';
    p.nextAiReleaseSec = 35 + idx * 25;
  });

  q.events.unshift(`🟢 Semaforo verde per ${nextStage.label} (${Math.round(nextStage.durationSec / 60)} min)!`);
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

  if (field === 'stints' || field === 'pit1Lap' || field === 'pit2Lap') {
    st[field] = Number(val);
  } else {
    st[field] = val;
  }

  if (st.pit2Lap <= st.pit1Lap + 5) {
    st.pit2Lap = Math.min(track.laps - 3, st.pit1Lap + 8);
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
// MOTORE GARA FLUIDO (PUNTINI, DISTACCHI REALI, x1/x2/x4/x8)
// =========================================================
function startLiveRace() {
  const w = gameState.weekend;
  const track = CALENDAR_2026[gameState.round - 1] || CALENDAR_2026[0];
  const uDrivers = getUserDrivers();
  const baseGrid = w.quali?.grid || buildGridFromQuali(track, false);
  const strat = ensurePreRaceStrategy(track);

  const cars = baseGrid.map((g, idx) => {
    const drv = gameState.drivers.find(d => d.id === g.driverId);
    const tm = getTeam(g.teamId);
    const isD1 = drv?.id === uDrivers[0]?.id;
    const isD2 = drv?.id === uDrivers[1]?.id;
    const myStrat = isD1 ? strat.d1 : (isD2 ? strat.d2 : null);

    const aiTwoStops = track.tyreDeg === 3 && (idx % 3 === 0);
    const initTyre = myStrat ? myStrat.startTyre : (idx % 2 === 0 ? 'M' : 'H');
    const pit1Lap = myStrat ? myStrat.pit1Lap : Math.round(track.laps * (aiTwoStops ? 0.33 : 0.46 + (idx % 4) * 0.03));
    const pit1Tyre = myStrat ? myStrat.pit1Tyre : (initTyre === 'H' ? 'M' : 'H');
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

  w.race = {
    totalLaps: track.laps,
    currentLap: 0,
    finished: false,
    paused: false,
    strategyOpen: false,
    speed: 2,
    safetyCar: false,
    scLapsLeft: 0,
    weather: w.quali?.isWet ? 'Pioggia' : 'Asciutto',
    isWet: !!w.quali?.isWet,
    cars,
    events: [`🚦 Semafori verdi! Parte il GP ${track.name} (${track.laps} giri)!`]
  };
  w.phase = 'race';
  startSessionAnimationLoop();
  saveGame();
  renderApp();
}

function setLiveRaceSpeed(spd) {
  const race = gameState.weekend?.race;
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
  const car = gameState.weekend?.race?.cars?.find(c => c.driverId === driverId);
  if (car) {
    car.pushMode = mode;
    saveGame();
    renderApp();
  }
}

function pitUserCarNow(driverId, compound = 'H') {
  const race = gameState.weekend?.race;
  const car = race?.cars?.find(c => c.driverId === driverId);
  if (!car || car.retired || car.inPit) return;
  car.forcePitCompound = compound;
  race.events.unshift(`📻 BOX ${car.code}: ordine di rientro a fine giro per montare ${compound}!`);
  saveGame();
  renderApp();
}

function computeTyreWearPerLap(car, track, race) {
  const drv = gameState.drivers.find(d => d.id === car.driverId);
  const comp = TYRE_COMPOUNDS[car.tyre] || TYRE_COMPOUNDS.M;
  const degTrackMult = track.tyreDeg === 3 ? 1.24 : (track.tyreDeg === 2 ? 1.0 : 0.84);
  const ruleDegMult = gameState.rules?.extraDegMultiplier || 1.0;

  // Fattore abilità pilota nel preservare le gomme (tyreMgmt 75..96 -> +12% fino a -16% consumo)
  const tyreSkill = drv?.tyreMgmt ?? 84;
  const driverSkillMult = Math.max(0.80, Math.min(1.18, 1.0 - ((tyreSkill - 84) * 0.013)));

  // Fattore tratto pilota (Tattico risparmia gomma, Attaccante consuma un po' di più)
  const traitMult = drv?.trait === 'tactician' ? 0.94 : (drv?.trait === 'attacker' ? 1.05 : 1.0);

  // Bonus dal programma "Gestione Gomme" svolto nelle Prove Libere (fino a -18% usura)
  let fpTyreProgMult = 1.0;
  if (car.isUser) {
    const uDrivers = getUserDrivers();
    const fpSlot = car.driverId === uDrivers[0]?.id ? gameState.weekend?.fp?.d1 : gameState.weekend?.fp?.d2;
    const tyreProgPct = fpSlot?.programs?.tyre ?? 0;
    fpTyreProgMult = 1.0 - (tyreProgPct / 100) * 0.18;
  }

  // Modalità di spinta e Safety Car
  const pushMult = car.pushMode === 'push' ? 1.28 : (car.pushMode === 'conserve' ? 0.74 : 1.0);
  const scMult = race.safetyCar ? 0.42 : 1.0;

  // Se si usa gomma da bagnato su pista asciutta si surriscalda e si distrugge subito
  const overheatingMult = (!race.isWet && comp.wet > 0) ? 2.1 : 1.0;

  return comp.degRate * degTrackMult * ruleDegMult * driverSkillMult * traitMult * fpTyreProgMult * pushMult * scMult * overheatingMult;
}

function computeDynamicLapDuration(car, track, race) {
  const drv = gameState.drivers.find(d => d.id === car.driverId);
  const tm = getTeam(car.teamId);
  const comp = TYRE_COMPOUNDS[car.tyre] || TYRE_COMPOUNDS.M;
  const pushFactor = car.pushMode === 'push' ? -0.55 : (car.pushMode === 'conserve' ? 0.45 : 0.0);
  const wearPenalty = car.tyreWear <= 35
    ? car.tyreWear * 0.008
    : (car.tyreWear <= 75
      ? 0.28 + (car.tyreWear - 35) * 0.036
      : 1.72 + (car.tyreWear - 75) * 0.115);
  const wetMismatch = (race.isWet && comp.wet === 0) ? 7.5 : ((!race.isWet && comp.wet > 0) ? 4.8 : 0);
  const paceScore = computeCarPaceScore(drv, tm, track, 65, race.isWet);
  const scFactor = race.safetyCar ? 1.24 : 1.0;

  const baseSec = Math.max(58.0, track.baseLap - (paceScore - 82) * 0.13 + comp.paceBonus + pushFactor + wearPenalty + wetMismatch + (Math.random() * 0.28 - 0.14));
  return Number((baseSec * scFactor).toFixed(3));
}

function tickLiveRace(dtSec) {
  const w = gameState?.weekend;
  const race = w?.race;
  if (!race || race.paused || race.finished) return;

  const track = CALENDAR_2026[gameState.round - 1] || CALENDAR_2026[0];
  const simSec = dtSec * (race.speed || 1) * 6.5;

  const degTrackMult = track.tyreDeg === 3 ? 1.24 : (track.tyreDeg === 2 ? 1.0 : 0.84);
  const ruleDegMult = gameState.rules?.extraDegMultiplier || 1.0;

  race.cars.forEach(car => {
    if (car.retired) return;

    if (car.inPit) {
      car.pitTimer -= simSec;
      car.totalTime += simSec;
      if (car.pitTimer <= 0) {
        car.inPit = false;
        car.tyre = car.nextPitCompound || 'H';
        car.tyreWear = 0;
        car.pitStops += 1;
        car.nextPitCompound = null;
        car.currentLapDuration = computeDynamicLapDuration(car, track, race);
        race.events.unshift(`🔧 BOX ${car.code}: sosta completata, riparte su ${car.tyre}!`);
      }
      return;
    }

    const lapDur = Math.max(55.0, car.currentLapDuration || track.baseLap);
    const deltaLaps = simSec / lapDur;
    car.distanceLaps += deltaLaps;
    car.totalTime += simSec;

    const comp = TYRE_COMPOUNDS[car.tyre] || TYRE_COMPOUNDS.M;
    const wearPerLap = computeTyreWearPerLap(car, track, race);
    car.tyreWear = Math.min(100, Number((car.tyreWear + wearPerLap * deltaLaps).toFixed(1)));

    const completedLapNow = Math.max(0, Math.floor(car.distanceLaps));
    if (completedLapNow > car.lap) {
      car.lap = completedLapNow;
      car.lastLapSec = lapDur;
      if (car.lap >= 1 && car.lastLapSec < car.bestLapSec) {
        car.bestLapSec = car.lastLapSec;
      }

      // Affidabilità
      const tm = getTeam(car.teamId);
      const relRisk = Math.max(0.0008, (100 - (tm?.rel || 82)) * 0.00048);
      if (car.lap > 2 && Math.random() < relRisk) {
        car.retired = true;
        race.events.unshift(`💥 Giro ${car.lap}: RITIRO per ${car.name} (${tm.short})!`);
        if (!race.safetyCar && Math.random() < 0.42 && car.lap < track.laps - 4) {
          race.safetyCar = true;
          race.scLapsLeft = 3;
          race.events.unshift(`🟡 SAFETY CAR in pista al giro ${car.lap}!`);
        }
        return;
      }

      // Controllo Pit-Stop
      let shouldPit = false;
      let targetCompound = 'H';

      if (car.forcePitCompound) {
        shouldPit = true;
        targetCompound = car.forcePitCompound;
        car.forcePitCompound = null;
      } else if (race.isWet && comp.wet === 0 && car.lap >= 2) {
        shouldPit = true;
        targetCompound = 'I';
      } else if (!race.isWet && comp.wet > 0 && car.lap >= 3) {
        shouldPit = true;
        targetCompound = 'M';
      } else if (car.lap < track.laps - 2) {
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

  // Aggiorna posizioni e distacchi reali dal leader
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
    } else if (!race.isWet && Math.random() < track.rainChance * 0.035 && race.currentLap > 3) {
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

  if (leader && leader.lap >= track.laps) {
    finalizeRaceResults();
  }
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
  const ordered = [...race.cars].sort((a, b) => {
    if (a.retired && !b.retired) return 1;
    if (!a.retired && b.retired) return -1;
    return a.pos - b.pos;
  });

  let gpIncome = Number(sponsor.perRace.toFixed(1));
  const classification = ordered.map((c, idx) => {
    const pos = c.retired ? 'RIT' : idx + 1;
    const pts = (!c.retired && typeof pos === 'number' && pointsTable[pos - 1]) ? pointsTable[pos - 1] : 0;
    const drv = gameState.drivers.find(d => d.id === c.driverId);
    const tm = getTeam(c.teamId);

    if (drv) {
      drv.points = (drv.points || 0) + pts;
      if (pos === 1) drv.wins = (drv.wins || 0) + 1;
      if (typeof pos === 'number' && pos <= 3) drv.podiums = (drv.podiums || 0) + 1;
      drv.fatigue = Math.min(100, (drv.fatigue ?? 15) + (c.retired ? 8 : 16));
    }
    if (tm) {
      tm.points = (tm.points || 0) + pts;
      if (pos === 1) tm.wins = (tm.wins || 0) + 1;
      if (typeof pos === 'number' && pos <= 3) tm.podiums = (tm.podiums || 0) + 1;
    }

    if (c.isUser && !c.retired && typeof pos === 'number') {
      if (pts > 0) gpIncome = Number((gpIncome + pts * sponsor.pointsBonus).toFixed(1));
      if (pos <= 3) gpIncome = Number((gpIncome + sponsor.podiumBonus).toFixed(1));
      if (pos === 1) gpIncome = Number((gpIncome + sponsor.winBonus).toFixed(1));
      adjustDriverMood(c.driverId, pos <= 3 ? 7 : (pos <= 10 ? 3 : -4), `Gara chiusa in P${pos}`);
    } else if (c.isUser && c.retired) {
      adjustDriverMood(c.driverId, -6, 'Ritiro in gara');
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
  const sortedTeams = [...gameState.teams].sort((a, b) => (b.points || 0) - (a.points || 0) || (b.wins || 0) - (a.wins || 0));
  sortedTeams.forEach((t, idx) => {
    const prize = FOM_PRIZE_POOL[idx] || 60.0;
    const wages = getDriversWageBill(t.id);
    t.budget = Number((t.budget + prize - wages).toFixed(1));
    if (t.id === gameState.userTeamId) {
      pushMediaQuote('Fine Stagione FOM', `Chiusa la stagione ${gameState.season} in P${idx + 1} Costruttori: premio FOM +€${prize.toFixed(1)}M, monte ingaggi -€${wages.toFixed(1)}M.`);
    }
  });

  if (gameState.season < gameState.maxSeasons) {
    gameState.season += 1;
    gameState.round = 1;
    // Primo lunedì utile di fine febbraio del nuovo anno
    const feb22 = new Date(Date.UTC(gameState.season, 1, 22));
    const offsetToMonday = (8 - feb22.getUTCDay()) % 7;
    feb22.setUTCDate(feb22.getUTCDate() + offsetToMonday);
    gameState.currentDate = toIsoDateUTC(feb22);
    gameState.isRaceWeekendActive = false;

    gameState.capSpent = 0.0;
    gameState.completedRounds = [];
    gameState.teams.forEach(t => {
      t.points = 0;
      t.wins = 0;
      t.podiums = 0;
    });
    gameState.drivers.forEach(d => {
      d.points = 0;
      d.wins = 0;
      d.podiums = 0;
      d.age = (d.age || 25) + 1;
      d.contract = Math.max(1, (d.contract || 1) - 1);
      d.fatigue = 10;
    });
    gameState.weekend = initWeekendState(1, gameState.userTeamId, gameState.drivers);
    generatePaddockPressForRound(1);
    gameState.activeTab = 'hub';
    showToast(`Benvenuti nella stagione ${gameState.season} (${formatCareerDateIT(gameState.currentDate)})!`, 'success');
  } else {
    showToast('Ciclo di 7 stagioni completato! Puoi avviare una nuova carriera dal tasto Reset.', 'info');
  }
}

// =========================================================
// LOOP ANIMAZIONE FLUIDO (60 FPS) PER QUALIFICHE E GARA
// =========================================================
function startSessionAnimationLoop() {
  if (animFrameId) return;
  lastAnimTimestamp = performance.now();
  let lastRenderTime = 0;

  const step = (now) => {
    const dtSec = Math.min(0.1, (now - lastAnimTimestamp) / 1000);
    lastAnimTimestamp = now;

    if (gameState && gameState.activeTab === 'weekend' && gameState.weekend) {
      const w = gameState.weekend;
      if (w.phase === 'quali' && w.quali && !w.quali.paused && !w.quali.stageFinished) {
        tickLiveQualifying(dtSec);
        if (now - lastRenderTime > 90) {
          lastRenderTime = now;
          renderApp();
        }
      } else if (w.phase === 'race' && w.race && !w.race.paused && !w.race.finished) {
        tickLiveRace(dtSec);
        if (now - lastRenderTime > 90) {
          lastRenderTime = now;
          renderApp();
        }
      }
    }

    animFrameId = requestAnimationFrame(step);
  };

  animFrameId = requestAnimationFrame(step);
}
