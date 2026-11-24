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
    confidence: 35, plan: 'race', fpRunsDone: 0, lastError: null,
    feedback: 'Regola i 5 parametri di assetto ed esegui i run in pista.'
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
    preRaceStrategy: null,
    race: null,
    results: null
  };
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

function setFpPlan(plan) {
  const w = gameState.weekend;
  if (!w || w.phase !== 'fp') return;
  const slot = w.fp.activeSlot || 'd1';
  if (w.fp[slot]) {
    w.fp[slot].plan = plan;
    saveGame();
    renderApp();
  }
}

function runFpStint() {
  const w = gameState.weekend;
  if (!w || w.phase !== 'fp') return;
  const slot = w.fp.activeSlot || 'd1';
  const setup = w.fp[slot];
  const uDrivers = getUserDrivers();
  const drv = slot === 'd1' ? uDrivers[0] : uDrivers[1];
  if (!setup || !drv) return;

  if ((w.fp.runsLeftInSession ?? 0) <= 0) {
    showToast('Run esauriti in questa sessione: passa alla sessione successiva!', 'info');
    return;
  }

  const target = getDriverTargetSetup(w, slot);
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
  w.fp.runsLeftInSession = Math.max(0, w.fp.runsLeftInSession - 1);

  const hints = [];
  if (Math.abs(diffWing) >= 2) hints.push(diffWing > 0 ? 'ala troppo carica' : 'ala troppo scarica');
  if (Math.abs(diffSusp) >= 2) hints.push(diffSusp > 0 ? 'sospensioni troppo rigide' : 'sospensioni troppo morbide');
  if (Math.abs(diffBrake) >= 2) hints.push(diffBrake > 0 ? 'freni troppo aggressivi' : 'freni troppo conservativi');
  if (Math.abs(diffRide) >= 2) hints.push(diffRide > 0 ? 'assetto troppo alto' : 'assetto troppo basso');
  if (Math.abs(diffDiff) >= 2) hints.push(diffDiff > 0 ? 'differenziale troppo chiuso' : 'differenziale troppo aperto');

  setup.feedback = hints.length
    ? `${drv.code}: feeling ${setup.confidence}% — segnalato: ${hints.slice(0, 2).join(' e ')}.`
    : `${drv.code}: assetto quasi perfetto (${setup.confidence}% feeling)!`;

  saveGame();
  renderApp();
}

function advanceFpSession() {
  const w = gameState.weekend;
  if (!w || w.phase !== 'fp') return;
  const maxSessions = w.hasSprint ? 2 : 3;
  if (w.fp.session < maxSessions) {
    w.fp.session += 1;
    w.fp.runsLeftInSession = 3;
    showToast(`Passati a FP${w.fp.session}!`, 'info');
  } else {
    w.phase = w.hasSprint ? 'sprint_quali' : 'quali';
    showToast(w.hasSprint ? 'Venerdi sera: Qualifiche Sprint!' : 'Sabato: Qualifiche GP!', 'info');
  }
  saveGame();
  renderApp();
}

function computeCarPaceScore(driver, team, track, setupConf = 65, isWet = false) {
  const mood = getMoodMeta(driver.mood);
  const baseCar = (team.aero * 0.36 + team.pu * 0.34 + team.chassis * 0.30);
  const trackDnaBonus = (
    (track.downforce - 5) * ((team.aero - 80) * 0.04) +
    (track.topSpeed - 5) * ((team.pu - 80) * 0.04)
  );
  const driverSkill = (driver.pace * 0.45 + driver.cons * 0.35 + driver.tyreMgmt * 0.20);
  const confBonus = ((setupConf - 50) / 50) * 1.4;
  const wetBonus = isWet && driver.trait === 'wet_ace' ? 2.4 : 0;
  const fatiguePen = Math.max(0, ((driver.fatigue ?? 15) - 55) * 0.05);
  return baseCar * 0.58 + driverSkill * 0.42 + trackDnaBonus + confBonus + wetBonus - (mood.paceDelta * 2.2) - fatiguePen;
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
  w.phase = 'quali';
  showToast('Qualifiche Sprint e Gara Sprint completate! Ora Qualifiche GP.', 'success');
  saveGame();
  renderApp();
}

function simulateQualifying() {
  const w = gameState.weekend;
  const track = CALENDAR_2026[gameState.round - 1] || CALENDAR_2026[0];
  const isWet = Math.random() < track.rainChance;
  const grid = buildGridFromQuali(track, isWet);
  w.quali = { grid, isWet, poleLap: grid[0]?.bestLap || track.baseLap };
  w.phase = 'strategy';
  generatePostSessionPress('quali', { gridOrder: grid });
  showToast(`Qualifiche completate! Pole: ${grid[0]?.name} (${formatLapTime(grid[0]?.bestLap)})`, 'success');
  saveGame();
  renderApp();
}

function setPreRaceChoice(slotKey, field, val) {
  const w = gameState.weekend;
  if (!w) return;
  w.preRaceStrategy = w.preRaceStrategy || {
    d1: { tyre: 'M', push: 'balanced', pitLap: Math.round((CALENDAR_2026[gameState.round - 1]?.laps || 56) * 0.45) },
    d2: { tyre: 'H', push: 'balanced', pitLap: Math.round((CALENDAR_2026[gameState.round - 1]?.laps || 56) * 0.52) }
  };
  w.preRaceStrategy[slotKey][field] = field === 'pitLap' ? Number(val) : val;
  saveGame();
  renderApp();
}

function startLiveRace() {
  const w = gameState.weekend;
  const track = CALENDAR_2026[gameState.round - 1] || CALENDAR_2026[0];
  const uDrivers = getUserDrivers();
  const baseGrid = w.quali?.grid || buildGridFromQuali(track, false);
  const strat = w.preRaceStrategy || {
    d1: { tyre: 'M', push: 'balanced', pitLap: Math.round(track.laps * 0.45) },
    d2: { tyre: 'H', push: 'balanced', pitLap: Math.round(track.laps * 0.52) }
  };

  const cars = baseGrid.map((g, idx) => {
    const drv = gameState.drivers.find(d => d.id === g.driverId);
    const tm = getTeam(g.teamId);
    const isD1 = drv?.id === uDrivers[0]?.id;
    const isD2 = drv?.id === uDrivers[1]?.id;
    const myStrat = isD1 ? strat.d1 : (isD2 ? strat.d2 : null);
    const initTyre = myStrat ? myStrat.tyre : (idx % 2 === 0 ? 'M' : 'H');
    const pitLap = myStrat ? myStrat.pitLap : Math.round(track.laps * (0.42 + (idx % 5) * 0.04));
    const pushMode = myStrat ? myStrat.push : 'balanced';
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
      progress: 0,
      totalTime: idx * 0.25,
      tyre: initTyre,
      tyreWear: 0,
      pitStops: 0,
      pitLap,
      pushMode,
      retired: false,
      lastLapSec: g.bestLap,
      bestLapSec: g.bestLap
    };
  });

  w.race = {
    totalLaps: track.laps,
    currentLap: 0,
    finished: false,
    weather: w.quali?.isWet ? 'Pioggia' : 'Asciutto',
    isWet: !!w.quali?.isWet,
    cars,
    events: [`Via al GP ${track.name} (${track.laps} giri)!`]
  };
  w.phase = 'race';
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
  const car = gameState.weekend?.race?.cars?.find(c => c.driverId === driverId);
  if (!car || car.retired) return;
  car.tyre = compound;
  car.tyreWear = 0;
  car.pitStops = (car.pitStops || 0) + 1;
  car.totalTime += 21.5;
  gameState.weekend.race.events.unshift(`BOX ${car.code}: sosta anticipata per gomme ${compound}!`);
  saveGame();
  renderApp();
}

function stepRaceOneLap() {
  const w = gameState.weekend;
  const race = w?.race;
  if (!race || race.finished) return;
  const track = CALENDAR_2026[gameState.round - 1] || CALENDAR_2026[0];
  const nextLap = race.currentLap + 1;
  race.currentLap = nextLap;

  if (!race.isWet && Math.random() < (track.rainChance * 0.04)) {
    race.isWet = true;
    race.weather = 'Pioggia';
    race.events.unshift(`Giro ${nextLap}: inizia a piovere sul tracciato!`);
  }

  const degTrackMult = track.tyreDeg === 3 ? 1.24 : (track.tyreDeg === 2 ? 1.0 : 0.84);
  const ruleDegMult = gameState.rules?.extraDegMultiplier || 1.0;

  race.cars.forEach(car => {
    if (car.retired) return;
    const drv = gameState.drivers.find(d => d.id === car.driverId);
    const tm = getTeam(car.teamId);
    const comp = TYRE_COMPOUNDS[car.tyre] || TYRE_COMPOUNDS.M;

    const relRisk = Math.max(0.001, (100 - (tm?.rel || 82)) * 0.00055);
    if (Math.random() < relRisk) {
      car.retired = true;
      race.events.unshift(`Giro ${nextLap}: RITIRO per ${car.name} (${tm.short})!`);
      return;
    }

    if (race.isWet && comp.wet === 0 && nextLap > 2) {
      car.tyre = 'I';
      car.tyreWear = 0;
      car.pitStops += 1;
      car.totalTime += 21.0;
      race.events.unshift(`Giro ${nextLap}: ${car.code} monta Intermedie.`);
    } else if (!race.isWet && comp.wet > 0 && nextLap > 3) {
      car.tyre = 'M';
      car.tyreWear = 0;
      car.pitStops += 1;
      car.totalTime += 21.0;
      race.events.unshift(`Giro ${nextLap}: ${car.code} torna su Slick Medium.`);
    } else if (nextLap === car.pitLap && car.pitStops === 0 && nextLap < track.laps - 2) {
      car.tyre = car.tyre === 'S' ? 'M' : (car.tyre === 'M' ? 'H' : 'M');
      car.tyreWear = 0;
      car.pitStops += 1;
      car.totalTime += 21.5;
      race.events.unshift(`Giro ${nextLap}: pit-stop per ${car.code} (${car.tyre}).`);
    }

    const pushFactor = car.pushMode === 'push' ? -0.55 : (car.pushMode === 'conserve' ? 0.45 : 0.0);
    const wearRate = comp.degRate * degTrackMult * ruleDegMult * (car.pushMode === 'push' ? 1.28 : (car.pushMode === 'conserve' ? 0.78 : 1.0));
    car.tyreWear = Math.min(100, Number((car.tyreWear + wearRate).toFixed(1)));
    const wearPenalty = Math.max(0, (car.tyreWear - 45) * 0.045);

    const paceScore = computeCarPaceScore(drv, tm, track, 65, race.isWet);
    const lapSec = Math.max(58.0, track.baseLap - (paceScore - 82) * 0.13 + comp.paceBonus + pushFactor + wearPenalty + (Math.random() * 0.55 - 0.25));
    car.lastLapSec = Number(lapSec.toFixed(3));
    if (car.lastLapSec < car.bestLapSec) car.bestLapSec = car.lastLapSec;
    car.totalTime = Number((car.totalTime + car.lastLapSec).toFixed(3));
    car.lap = nextLap;
  });

  const active = race.cars.filter(c => !c.retired).sort((a, b) => b.lap - a.lap || a.totalTime - b.totalTime);
  const retired = race.cars.filter(c => c.retired);
  [...active, ...retired].forEach((c, idx) => { c.pos = idx + 1; });

  if (nextLap >= track.laps) {
    finalizeRaceResults();
    return;
  }

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
  if (gameState.round < CALENDAR_2026.length) {
    gameState.round += 1;
    gameState.careerDay = (gameState.careerDay || 1) + 14;
    gameState.weekendStartDay = gameState.careerDay + 7;
    gameState.weekend = initWeekendState(gameState.round, gameState.userTeamId, gameState.drivers);
    generatePaddockPressForRound(gameState.round);
    gameState.activeTab = 'hub';
    showToast(`Avanzati al GP ${gameState.round}: ${CALENDAR_2026[gameState.round - 1].name}!`, 'info');
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
    showToast(`Benvenuti nella stagione ${gameState.season}! Budget Cap FIA azzerato a €${getBudgetCapLimit().toFixed(0)}M.`, 'success');
  } else {
    showToast('Ciclo di 7 stagioni completato! Puoi avviare una nuova carriera dal tasto Reset.', 'info');
  }
}
