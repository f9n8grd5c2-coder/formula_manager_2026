function canAdvanceFromCurrentWeekendDay() {
  if (!gameState || !gameState.weekend) return { ok: true };
  const cur = gameState.currentDate || '2026-02-23';
  const { fri, sat, sun } = getRoundWeekendDates(gameState.round, gameState.season);
  const w = gameState.weekend;

  if (cur < fri || cur > sun) return { ok: true };

  // VENERDÌ: bisogna completare FP1+FP2 (weekend normale) oppure FP1+Qualifica Sprint (weekend Sprint)
  if (cur === fri) {
    if (w.hasSprint) {
      if (w.phase === 'fp' || w.phase === 'sprint_quali') {
        return { ok: false, msg: 'Completa prima FP1 e Qualifica Sprint del Venerdì!' };
      }
    } else {
      if (w.phase === 'fp' && (w.fp?.session || 1) <= 2) {
        return { ok: false, msg: `Completa prima FP${w.fp.session} del Venerdì prima di passare al Sabato!` };
      }
    }
    return { ok: true };
  }

  // SABATO: bisogna completare FP3 + Qualifiche (o Gara Sprint + Qualifiche GP)
  if (cur === sat) {
    if (w.phase === 'fp' || w.phase === 'sprint_strategy' || w.phase === 'sprint_race' || w.phase === 'sprint_summary' || w.phase === 'quali') {
      return { ok: false, msg: 'Completa tutte le sessioni del Sabato (fino alle Qualifiche GP) prima della Domenica!' };
    }
    return { ok: true };
  }

  // DOMENICA: bisogna completare la Gara
  if (cur === sun) {
    if (w.phase !== 'summary') {
      return { ok: false, msg: 'Devi disputare il Gran Premio della Domenica prima di avanzare!' };
    }
    return { ok: true };
  }

  return { ok: true };
}

function advanceSingleDay(silent = false) {
  if (!gameState) return;
  if (!gameState.currentDate) gameState.currentDate = '2026-02-23';

  const { fri, sat, sun } = getRoundWeekendDates(gameState.round, gameState.season);
  const track = CALENDAR_2026[gameState.round - 1] || CALENDAR_2026[0];

  // Controllo blocco sessioni del giorno corrente
  if (!silent) {
    const check = canAdvanceFromCurrentWeekendDay();
    if (!check.ok) {
      gameState.isRaceWeekendActive = true;
      gameState.activeTab = 'weekend';
      showToast(`⛔ ${check.msg}`, 'danger');
      saveGame();
      renderApp();
      return;
    }
  }

  // Avanza di 1 giorno reale sul calendario
  gameState.careerDay = (gameState.careerDay || 1) + 1;
  gameState.currentDate = addDaysToIsoDate(gameState.currentDate, 1);

  // Controllo completamento sviluppi R&D giocatore
  const remainingUpgrades = [];
  (gameState.pendingUpgrades || []).forEach(upg => {
    upg.daysLeft = (upg.daysLeft ?? 4) - 1;
    if (upg.daysLeft <= 0) {
      const tm = getTeam(gameState.userTeamId);
      applyGarageUpgradeToTeam(tm, upg.area, upg.gain);
      if (gameState.activeTab !== 'rnd') {
        gameState.unreadUpgradesCount = (gameState.unreadUpgradesCount || 0) + 1;
      }
      gameState.newsFeed.unshift(`AGGIORNAMENTO PRONTO: +${upg.gain} ${upg.area.toUpperCase()} completato in fabbrica!`);
      if (!silent) showToast(`Aggiornamento ${upg.area.toUpperCase()} completato!`, 'success');
    } else {
      remainingUpgrades.push(upg);
    }
  });
  gameState.pendingUpgrades = remainingUpgrades;

  // Sviluppo R&D e mercato IA giornaliero
  processAiDailyUpdates();

  // Recupero fatica e crescita/calo piloti (contrattualizzati e svincolati)
  const updateDriverDaily = (d) => {
    d.fatigue = Math.max(0, Math.min(100, (d.fatigue ?? 15) - 4));
    const boostMult = (d.trainingBoost || 0) > 0 ? 1.65 : 1.0;
    if ((d.trainingBoost || 0) > 0) d.trainingBoost = Math.max(0, d.trainingBoost - 1);

    const cap = d.potential ?? d.ovr;
    if (d.age <= 25 && d.ovr < cap && d.fatigue < 65) {
      if (Math.random() < 0.055 * boostMult) {
        d.ovr = Math.min(cap, d.ovr + 1);
        d.pace = Math.min(99, d.pace + 1);
      }
    } else if (d.age >= 36 && d.ovr > 72) {
      const slowFactor = (d.trainingBoost || 0) > 0 ? 0.35 : 1.0;
      if (Math.random() < 0.025 * slowFactor) {
        d.ovr = Math.max(72, d.ovr - 1);
        d.pace = Math.max(70, d.pace - 1);
      }
    }
  };
  (gameState.drivers || []).forEach(updateDriverDaily);
  (gameState.freeAgents || []).forEach(updateDriverDaily);

  // Sincronizzazione automatica con l'ingresso in pista nei 3 giorni del weekend
  if (gameState.currentDate === fri || gameState.currentDate === sat || gameState.currentDate === sun) {
    gameState.isRaceWeekendActive = true;
    if (!silent) {
      gameState.activeTab = 'weekend';
      const dayLabel = gameState.currentDate === fri ? 'Venerdì (Prove Libere)' : (gameState.currentDate === sat ? 'Sabato (Qualifiche)' : 'Domenica (Gara)');
      showToast(`🏁 ${formatCareerDateIT(gameState.currentDate)} — ${dayLabel} GP ${track.name}!`, 'success');
    }
  } else {
    gameState.isRaceWeekendActive = false;
    if (!silent) {
      showToast(`📅 ${formatCareerDateIT(gameState.currentDate)}`, 'info');
    }
  }

  if (!silent) {
    saveGame();
    renderApp();
  }
}

function advanceToNextWeekend() {
  if (!gameState) return;
  if (!gameState.currentDate) gameState.currentDate = '2026-02-23';

  const { fri, sun } = getRoundWeekendDates(gameState.round, gameState.season);
  const track = CALENDAR_2026[gameState.round - 1] || CALENDAR_2026[0];

  if (gameState.currentDate >= fri && gameState.currentDate <= sun) {
    gameState.isRaceWeekendActive = true;
    gameState.activeTab = 'weekend';
    showToast(`Sei già nel weekend del GP ${track.name}!`, 'info');
    saveGame();
    renderApp();
    return;
  }

  let safetyCounter = 0;
  while (gameState.currentDate < fri && safetyCounter < 120) {
    advanceSingleDay(true);
    safetyCounter++;
  }

  gameState.isRaceWeekendActive = true;
  gameState.activeTab = 'weekend';
  showToast(`🏁 Arrivati a ${formatCareerDateIT(gameState.currentDate)} — GP ${track.name}!`, 'success');
  saveGame();
  renderApp();
}

function hasUsedDailyActivity() {
  if (!gameState) return false;
  const cur = gameState.currentDate || '2026-02-23';
  return gameState.lastExtraActivityDate === cur;
}

function getWindTunnelAtrState() {
  const curPeriod = (gameState?.round || 1) <= 12 ? 1 : 2;
  if (!gameState) return { period: curPeriod, used: 0, limit: 3 };
  if (!gameState.windTunnelAtr || gameState.windTunnelAtr.period !== curPeriod) {
    gameState.windTunnelAtr = { period: curPeriod, used: 0, limit: 3 };
  }
  return gameState.windTunnelAtr;
}

function setTrainingTargetDriver(driverId) {
  if (!gameState) return;
  gameState.trainingTargetDriverId = driverId;
  saveGame();
  renderApp();
}

function getDriverTrainingStatCap(driver, focus) {
  if (!driver) return 99;
  const curVal = driver[focus] ?? driver.ovr ?? 80;
  return Math.min(99, Math.max(driver.potential || driver.ovr || 80, curVal));
}

function getDriverTrainingXpGain(driver) {
  if (!driver) return 25;
  const age = driver.age || 26;
  const base = age <= 24 ? 36 : (age <= 31 ? 28 : (age <= 36 ? 22 : 18));
  const moodBonus = (driver.mood ?? 65) >= 72 ? 5 : ((driver.mood ?? 65) < 45 ? -5 : 0);
  const fatiguePen = (driver.fatigue ?? 15) >= 70 ? -8 : 0;
  return Math.max(12, base + moodBonus + fatiguePen);
}

function awardDriverTrainingXp(driver, focus, xpGain) {
  if (!driver || !['pace', 'cons', 'tyreMgmt'].includes(focus)) return { xpGain: 0, leveledUp: 0 };
  driver.trainingXp = driver.trainingXp || { pace: 0, cons: 0, tyreMgmt: 0 };
  const cap = getDriverTrainingStatCap(driver, focus);
  const curStat = driver[focus] ?? driver.ovr ?? 80;
  if (curStat >= cap) {
    driver.trainingXp[focus] = 0;
    return { xpGain: 0, leveledUp: 0, atCap: true };
  }
  let xp = (driver.trainingXp[focus] || 0) + xpGain;
  let leveledUp = 0;
  while (xp >= 100 && (driver[focus] ?? driver.ovr ?? 80) < cap) {
    xp -= 100;
    driver[focus] = Math.min(cap, (driver[focus] ?? driver.ovr ?? 80) + 1);
    leveledUp += 1;
  }
  if ((driver[focus] ?? driver.ovr ?? 80) >= cap) xp = 0;
  driver.trainingXp[focus] = xp;

  if (leveledUp > 0) {
    const avgAttr = Math.round(((driver.pace ?? driver.ovr) + (driver.cons ?? driver.ovr) + (driver.tyreMgmt ?? driver.ovr)) / 3);
    const potCap = Math.max(driver.ovr, driver.potential || driver.ovr);
    driver.ovr = Math.min(potCap, Math.max(driver.ovr, avgAttr));
  }
  return { xpGain, leveledUp, atCap: false };
}

function runDriverTraining(driverId, focus) {
  const team = getUserTeam();
  const uDrivers = getUserDrivers();
  const drv = uDrivers.find(d => d.id === driverId) || uDrivers[0];
  if (!team || !drv) return;

  if (hasUsedDailyActivity()) {
    showToast('Hai già svolto 1 attività extra o allenamento oggi: avanza al giorno successivo!', 'info');
    return;
  }

  const focusMeta = {
    pace: { label: 'Simulatore Giro Secco & Passo', statLabel: 'Velocità', cost: 1.0, inCap: true, fat: 8 },
    tyreMgmt: { label: 'Analisi Degrado & Long Run', statLabel: 'Gestione Gomme', cost: 1.0, inCap: true, fat: 8 },
    cons: { label: 'Riflessi & Costanza Gara', statLabel: 'Costanza', cost: 1.0, inCap: true, fat: 6 },
    fitness: { label: 'Preparazione Atletica & Recupero', statLabel: 'Recupero', cost: 0.4, inCap: false, fat: -24 }
  }[focus];
  if (!focusMeta) return;

  if (focus !== 'fitness') {
    const cap = getDriverTrainingStatCap(drv, focus);
    if ((drv[focus] ?? drv.ovr) >= cap) {
      showToast(`${drv.code} ha già raggiunto il massimo potenziale in ${focusMeta.statLabel} (${cap})!`, 'info');
      return;
    }
    if (!chargeTeamExpense(focusMeta.cost, focusMeta.inCap, `${focusMeta.label} (${drv.code})`)) return;
    const gain = getDriverTrainingXpGain(drv);
    const res = awardDriverTrainingXp(drv, focus, gain);
    drv.fatigue = Math.min(100, (drv.fatigue ?? 15) + focusMeta.fat);
    drv.trainingBoost = (drv.trainingBoost || 0) + 2;
    adjustDriverMood(drv.id, 2, `${focusMeta.label} completata`);
    if (res.leveledUp > 0) {
      pushMediaQuote('Allenamento Piloti', `Progressi evidenti per ${drv.name}: +${res.leveledUp} ${focusMeta.statLabel} (${drv[focus]}) dopo il lavoro al simulatore.`);
      showToast(`🔥 ${drv.code}: +${res.leveledUp} ${focusMeta.statLabel} (ora ${drv[focus]})!`, 'success');
    } else {
      const xpNow = drv.trainingXp?.[focus] || 0;
      pushMediaQuote('Allenamento Piloti', `${drv.name} ha lavorato su ${focusMeta.statLabel}: progresso al ${xpNow}%.`);
      showToast(`${drv.code} +${res.xpGain}% XP ${focusMeta.statLabel} (${xpNow}/100%)`, 'success');
    }
  } else {
    if (!chargeTeamExpense(focusMeta.cost, false, `${focusMeta.label} (${drv.code})`)) return;
    drv.fatigue = Math.max(0, (drv.fatigue ?? 15) - 24);
    drv.staminaShield = 1;
    adjustDriverMood(drv.id, 3, 'Programma di recupero fisico e crioterapia');
    pushMediaQuote('Preparazione Atletica', `${drv.name} completa il recupero atletico: fatica al ${drv.fatigue}% e protezione affaticamento attiva per il prossimo GP.`);
    showToast(`${drv.code}: fatica ridotta al ${drv.fatigue}% · Scudo atletico attivo!`, 'success');
  }

  gameState.trainingTargetDriverId = drv.id;
  gameState.lastExtraActivityDate = gameState.currentDate || '2026-02-23';
  saveGame();
  renderApp();
}

function applyCircuitSimPrepToFp(weekend, track) {
  if (!weekend || weekend.phase !== 'fp' || !weekend.fp || weekend.fp.session !== 1) return false;
  let applied = false;
  ['d1', 'd2'].forEach(slotKey => {
    const setup = weekend.fp[slotKey];
    const target = weekend.driverTargets?.[slotKey] || weekend.targets;
    if (!setup || !target || (setup.fpRunsDone || 0) > 0 || setup.simPrepped) return;
    ['wing', 'susp', 'brake', 'ride', 'diff'].forEach(k => {
      if (setup[k] < target[k]) setup[k] += 1;
      else if (setup[k] > target[k]) setup[k] -= 1;
    });
    setup.confidence = Math.max(setup.confidence || 35, 54);
    setup.simPrepped = true;
    const diffs = [
      { k: 'wing', label: 'ala', d: setup.wing - target.wing },
      { k: 'susp', label: 'sospensioni', d: setup.susp - target.susp },
      { k: 'brake', label: 'freni', d: setup.brake - target.brake },
      { k: 'ride', label: 'altezza', d: setup.ride - target.ride },
      { k: 'diff', label: 'differenziale', d: setup.diff - target.diff }
    ].filter(x => Math.abs(x.d) >= 1).sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
    const topHint = diffs[0]
      ? `Primo riscontro telemetria: affinare ${diffs[0].label} (${diffs[0].d > 0 ? 'ridurre' : 'aumentare'}).`
      : 'Assetto base già centrato sui valori ottimali!';
    setup.feedback = `Simulatore ${track?.name || 'GP'}: base pre-caricata (54%). ${topHint}`;
    applied = true;
  });
  return applied;
}

function runExtraActivity(kind) {
  const team = getUserTeam();
  const uDrivers = getUserDrivers();
  const track = CALENDAR_2026[(gameState?.round || 1) - 1] || CALENDAR_2026[0];
  if (!team || !uDrivers.length) return;

  if (hasUsedDailyActivity()) {
    showToast('Hai già svolto 1 attività extra o allenamento oggi: avanza al giorno successivo!', 'info');
    return;
  }

  if (kind === 'simulator') {
    if (gameState.simPrepRound === gameState.round) {
      showToast(`Simulatore già completato per il GP ${track.name}!`, 'info');
      return;
    }
    const w = gameState.weekend;
    if (w && w.round === gameState.round && (w.phase !== 'fp' || (w.fp?.d1?.fpRunsDone || 0) > 0 || (w.fp?.session || 1) > 1)) {
      showToast('Le Prove Libere sono già iniziate: il simulatore pre-weekend va eseguito prima dei run in pista.', 'info');
      return;
    }
    const cost = 2.0;
    if (!chargeTeamExpense(cost, true, `Simulatore Circuito ${track.name}`)) return;
    gameState.simPrepRound = gameState.round;
    applyCircuitSimPrepToFp(w, track);
    uDrivers.forEach(d => {
      d.fatigue = Math.min(100, (d.fatigue ?? 15) + 9);
      adjustDriverMood(d.id, 3, `Correlazione simulatore per ${track.name}`);
    });
    pushMediaQuote('Attivita Extra', `Simulatore calibrato per ${track.name}: FP1 partirà con assetto affinato e confidenza al 54% (-€${cost}M nel Cap).`);
    showToast(`Simulatore ${track.name} completato: FP1 partirà al 54% di confidenza!`, 'success');
  } else if (kind === 'media_sponsor') {
    if (gameState.lastMediaDayRound === gameState.round) {
      showToast(`Media Day già svolto in vista del GP ${track.name} (max 1 per evento)!`, 'info');
      return;
    }
    const sponsor = getActiveSponsor();
    const gain = Number((sponsor.perRace * 0.85).toFixed(1));
    team.budget = Number((team.budget + gain).toFixed(1));
    gameState.lastMediaDayRound = gameState.round;
    gameState.paddockPressure = Math.min(100, (gameState.paddockPressure || 62) + 6);
    uDrivers.forEach(d => {
      d.fatigue = Math.min(100, (d.fatigue ?? 15) + 8);
      adjustDriverMood(d.id, 3, 'Evento sponsor e incontro con i tifosi');
    });
    pushMediaQuote('Sponsor & Media Day', `${sponsor.name} e ${team.name} protagonisti del Media Day pre-${track.name}: +€${gain.toFixed(1)}M in cassa.`);
    showToast(`Media Day completato: +€${gain.toFixed(1)}M in cassa!`, 'success');
  } else if (kind === 'team_building') {
    const cost = 2.0;
    if (!chargeTeamExpense(cost, false, 'Team Building Scuderia')) return;
    uDrivers.forEach(d => {
      d.fatigue = Math.max(0, (d.fatigue ?? 15) - 8);
      adjustDriverMood(d.id, 7, 'Ritiro di team building e confronto costruttivo');
    });
    if (uDrivers.length === 2) {
      const curRiv = getRivalryValue(uDrivers[0].id, uDrivers[1].id);
      gameState.rivalries[getRivalryKey(uDrivers[0].id, uDrivers[1].id)] = Math.max(0, curRiv - 10);
    }
    pushMediaQuote('Paddock', `Team building per ${team.name}: -€${cost}M (fuori Cap), morale su e rivalita interna piu calma.`);
    showToast('Team building riuscito (-€2.0M fuori Cap)!', 'success');
  } else if (kind === 'wind_tunnel') {
    const atr = getWindTunnelAtrState();
    if (atr.used >= atr.limit) {
      showToast(`Quota ATR FIA esaurita per questo semestre (${atr.used}/${atr.limit}): si rinnova a metà stagione.`, 'info');
      return;
    }
    const cost = 3.5;
    if (!chargeTeamExpense(cost, true, `Galleria del Vento ATR (${atr.used + 1}/${atr.limit})`)) return;
    atr.used += 1;
    team.aero = Number(Math.min(99, team.aero + 0.6).toFixed(1));
    if (gameState.garageParts?.[team.id]) {
      gameState.garageParts[team.id].filter(p => p.slot === 'steer' || p.slot === 'chassis').forEach(p => {
        p.perf += 26;
      });
      syncTeamStatsFromGarage(team.id);
    }
    pushMediaQuote('Reparto Tecnico', `${team.name} in galleria del vento (ATR ${atr.used}/${atr.limit}): -€${cost}M nel Cap, +0.6 Aerodinamica.`);
    showToast(`Galleria del vento ATR (${atr.used}/${atr.limit}) completata: +0.6 Aero!`, 'success');
  } else if (kind === 'filming_day') {
    const used = gameState.filmingDaysUsed || 0;
    if (used >= 3) {
      showToast('Hai esaurito i 3 Test Privati / Filming Day stagionali!', 'info');
      return;
    }
    const cost = 3.0;
    if (!chargeTeamExpense(cost, false, `Test Privati / Filming Day (${used + 1}/3)`)) return;
    gameState.filmingDaysUsed = used + 1;
    team.aero = Number(Math.min(99, team.aero + 0.3).toFixed(1));
    if (gameState.garageParts?.[team.id]) {
      gameState.garageParts[team.id].filter(p => p.slot === 'steer').forEach(p => {
        p.perf += 14;
      });
      syncTeamStatsFromGarage(team.id);
    }
    const growthNotes = [];
    uDrivers.forEach(d => {
      d.fatigue = Math.min(100, (d.fatigue ?? 15) + 10);
      adjustDriverMood(d.id, 4, 'Giornata di test privati in pista');
      const isYoung = (d.age || 26) <= 23;
      const pRes = awardDriverTrainingXp(d, 'pace', isYoung ? 52 : 38);
      const tRes = awardDriverTrainingXp(d, 'tyreMgmt', isYoung ? 34 : 24);
      if (pRes.leveledUp > 0) growthNotes.push(`${d.code} +1 Passo`);
      if (tRes.leveledUp > 0) growthNotes.push(`${d.code} +1 Gomme`);
    });
    const extraMsg = growthNotes.length ? ` (${growthNotes.join(', ')})` : '';
    pushMediaQuote('Test Privati', `${team.name} completa il Filming Day ${gameState.filmingDaysUsed}/3: +0.3 Aero e grande carico XP piloti${extraMsg}.`);
    showToast(`Test / Filming Day ${gameState.filmingDaysUsed}/3 completato!${extraMsg}`, 'success');
  } else {
    return;
  }

  gameState.lastExtraActivityDate = gameState.currentDate || '2026-02-23';
  saveGame();
  renderApp();
}

function setTeamHierarchyMode(mode) {
  const team = getUserTeam();
  const uDrivers = getUserDrivers();
  if (!team || uDrivers.length < 2) return;
  team.hierarchy = mode;
  const [d1, d2] = uDrivers;
  if (mode === 'equal') {
    d1.role = 'co_lead';
    d2.role = 'co_lead';
    adjustDriverMood(d1.id, 3, 'Scuderia impostata su pari livello');
    adjustDriverMood(d2.id, 4, 'Parita di trattamento confermata dal team');
    showToast('Gerarchia impostata: Pari Livello.', 'info');
  } else {
    applyRoleAssignments(d1.id, 'lead', d2.id, 'support');
  }
  saveGame();
  renderApp();
}

function setLeadDriverSelection(newLeadId) {
  const team = getUserTeam();
  const uDrivers = getUserDrivers();
  if (!team || uDrivers.length < 2) return;
  team.hierarchy = '1st_2nd';
  const leadDrv = uDrivers.find(d => d.id === newLeadId) || uDrivers[0];
  const suppDrv = uDrivers.find(d => d.id !== leadDrv.id) || uDrivers[1];
  applyRoleAssignments(leadDrv.id, 'lead', suppDrv.id, 'support');
  saveGame();
  renderApp();
}

function applyRoleAssignments(leadId, leadRole, suppId, suppRole) {
  const team = getUserTeam();
  const lead = gameState.drivers.find(d => d.id === leadId);
  const supp = gameState.drivers.find(d => d.id === suppId);
  if (!lead || !supp) return;
  const prevSuppRole = supp.role;
  lead.role = leadRole;
  supp.role = suppRole;
  adjustDriverMood(lead.id, 6, `Nominato 1a Guida in ${team.name}`);
  if (prevSuppRole !== 'support') {
    const penalty = supp.acceptsSupport ? -6 : -18;
    adjustDriverMood(supp.id, penalty, supp.acceptsSupport ? 'Declassato a 2a Guida' : 'Non gradisce il ruolo di 2a Guida');
    bumpRivalry(lead.id, supp.id, supp.acceptsSupport ? 8 : 18, `Gerarchia 1a/2a guida in casa ${team.name}`);
  }
  showToast(`${lead.code} 1a Guida • ${supp.code} 2a Guida`, 'info');
}

function setRndSection(sec) {
  if (!gameState) return;
  gameState.rndSection = sec;
  saveGame();
  renderApp();
}

function setGarageCarTab(carNum) {
  if (!gameState) return;
  gameState.garageCarTab = carNum;
  saveGame();
  renderApp();
}

const COMPONENT_POOL_RULES = {
  pu: { limit: 4, penalty: 10, label: 'Power Unit' },
  chassis: { limit: 4, penalty: 5, label: 'Cambio / Telaio' }
};

function requestReplaceCarComponent(carNum, slot) {
  ensureMarketAndAiDefaults();
  const team = getUserTeam();
  const rule = COMPONENT_POOL_RULES[slot];
  if (!team || !rule) return;
  const pool = team.carComponentPools?.[carNum] || { puUsed: 1, chassisUsed: 1, gridPenalty: 0 };
  const used = slot === 'pu' ? (pool.puUsed || 1) : (pool.chassisUsed || 1);

  if (used >= rule.limit) {
    gameState.pendingComponentConfirm = {
      carNum,
      slot,
      label: rule.label,
      nextUnitNum: used + 1,
      limit: rule.limit,
      penalty: rule.penalty
    };
    renderApp();
    return;
  }

  executeReplaceCarComponent(carNum, slot);
}

function cancelReplaceCarComponent() {
  if (!gameState) return;
  gameState.pendingComponentConfirm = null;
  renderApp();
}

function confirmReplaceCarComponent() {
  if (!gameState || !gameState.pendingComponentConfirm) return;
  const { carNum, slot } = gameState.pendingComponentConfirm;
  gameState.pendingComponentConfirm = null;
  executeReplaceCarComponent(carNum, slot);
}

function executeReplaceCarComponent(carNum, slot) {
  ensureMarketAndAiDefaults();
  const team = getUserTeam();
  const rule = COMPONENT_POOL_RULES[slot];
  if (!team || !rule) return;
  team.carComponentPools = team.carComponentPools || createDefaultCarComponentPools();
  const pool = team.carComponentPools[carNum];
  const parts = gameState.garageParts?.[team.id] || [];
  const part = parts.find(p => p.assignedCar === carNum && p.slot === slot);
  if (!part || !pool) return;

  part.wear = 0;
  let newUsed = 1;
  if (slot === 'pu') {
    pool.puUsed = (pool.puUsed || 1) + 1;
    newUsed = pool.puUsed;
  } else {
    pool.chassisUsed = (pool.chassisUsed || 1) + 1;
    newUsed = pool.chassisUsed;
  }

  if (newUsed > rule.limit) {
    pool.gridPenalty = (pool.gridPenalty || 0) + rule.penalty;
    const msg = `PENALITÀ GRIGLIA (+${rule.penalty} pos.): Auto #${carNum} monta la ${newUsed}ª ${rule.label} (quota ${rule.limit}/${rule.limit} superata).`;
    gameState.newsFeed.unshift(msg);
    pushMediaQuote('Regolamento FIA', `${team.name} Auto #${carNum}: +${rule.penalty} posizioni in griglia al prossimo GP per cambio ${rule.label} (${newUsed}/${rule.limit}).`);
    showToast(`Nuova ${rule.label} montata su Auto #${carNum}: +${rule.penalty} pos. penalità al prossimo GP!`, 'danger');
  } else {
    showToast(`Nuova ${rule.label} montata su Auto #${carNum} (${newUsed}/${rule.limit} quota gratuita, 0% usura)!`, 'success');
  }

  saveGame();
  renderApp();
}

function boostSinglePart(partId) {
  const team = getUserTeam();
  const parts = gameState.garageParts?.[team.id] || [];
  const part = parts.find(p => p.id === partId);
  if (!part) return;
  const cost = 2.0;
  if (!chargeTeamExpense(cost, true, `Revisione & affinamento ${part.name}`)) return;
  part.perf += 16;
  part.rel = Math.min(99, part.rel + 2);
  syncTeamStatsFromGarage(team.id);
  showToast(`${part.name}: +16 Perf, +2% Affidabilità (-€2.0M nel Cap)`, 'success');
  saveGame();
  renderApp();
}

function buildNewGaragePart(slot) {
  const team = getUserTeam();
  const cost = 6.5;
  if (!chargeTeamExpense(cost, true, `Nuovo componente ${slot.toUpperCase()} in fabbrica`)) return;
  const list = gameState.garageParts[team.id] || [];
  const carTab = gameState.garageCarTab || 1;
  const basePerf = Math.round(((team.aero + team.pu + team.chassis) / 3) * 40) + 25;
  const slotLabels = { pu: 'Power Unit Spec-Evo', chassis: 'Cambio & Telaio Spec-Evo', steer: 'Sterzo & Aero Spec-Evo' };
  const existing = list.find(p => p.assignedCar === carTab && p.slot === slot);
  if (existing) {
    existing.name = `${slotLabels[slot] || slot.toUpperCase()}`;
    existing.perf = Math.max(existing.perf + 18, basePerf);
    existing.rel = Math.min(98, Math.max(existing.rel, team.rel + 2));
  } else {
    list.push({
      id: `${team.id}_${slot}_${Date.now().toString(36)}`,
      slot,
      name: `${slotLabels[slot] || slot.toUpperCase()} v2`,
      perf: basePerf,
      rel: Math.min(97, Math.max(82, team.rel + 2)),
      wear: 0,
      assignedCar: carTab
    });
  }
  gameState.garageParts[team.id] = list;
  syncTeamStatsFromGarage(team.id);
  showToast(`Nuova specifica ${slot.toUpperCase()} installata su Auto #${carTab} (-€6.5M nel Cap)!`, 'success');
  saveGame();
  renderApp();
}

function requestUpgradeConfirm(area, tierKey) {
  const tier = RND_TIERS[tierKey];
  if (!tier) return;
  const labels = { aero: 'Aerodinamica', pu: 'Power Unit', chassis: 'Telaio' };
  gameState.pendingUpgradeConfirm = {
    area,
    areaLabel: labels[area] || area.toUpperCase(),
    tierKey,
    tierLabel: tier.label,
    cost: tier.cost,
    days: tier.days,
    gain: tier.gain
  };
  renderApp();
}

function cancelUpgradeConfirm() {
  gameState.pendingUpgradeConfirm = null;
  renderApp();
}

function confirmAndBuyUpgrade() {
  const pending = gameState.pendingUpgradeConfirm;
  if (!pending) return;
  if (!chargeTeamExpense(pending.cost, true, `Sviluppo ${pending.areaLabel} (${pending.tierLabel})`)) {
    gameState.pendingUpgradeConfirm = null;
    renderApp();
    return;
  }
  gameState.pendingUpgrades = gameState.pendingUpgrades || [];
  gameState.pendingUpgrades.push({
    id: `upg_${Date.now()}`,
    area: pending.area,
    gain: pending.gain,
    daysLeft: pending.days,
    totalDays: pending.days,
    cost: pending.cost
  });
  gameState.pendingUpgradeConfirm = null;
  showToast(`Avviato sviluppo ${pending.areaLabel} (${pending.days} gg, -€${pending.cost.toFixed(1)}M nel Cap)!`, 'success');
  saveGame();
  renderApp();
}

function cancelPendingUpgradeWithRefund(upgId) {
  const idx = (gameState.pendingUpgrades || []).findIndex(u => u.id === upgId);
  if (idx === -1) return;
  const [removed] = gameState.pendingUpgrades.splice(idx, 1);
  const refundAmount = Number(((removed.cost || 4.5) * 0.8).toFixed(1));
  refundTeamExpense(refundAmount, true, `Annullato sviluppo ${removed.area.toUpperCase()}`);
  showToast(`Sviluppo annullato: rimborsati €${refundAmount.toFixed(1)}M (cassa e Cap).`, 'info');
  saveGame();
  renderApp();
}

function renewDriverContract(driverId) {
  const drv = gameState.drivers.find(d => d.id === driverId);
  const team = getUserTeam();
  if (!drv || !team) return;
  const signingFee = Number((drv.salary * 0.4).toFixed(1));
  if (!chargeTeamExpense(signingFee, false, `Rinnovo biennale ${drv.name}`)) return;
  drv.contract = (drv.contract || 1) + 2;
  adjustDriverMood(drv.id, 8, 'Rinnovo contrattuale firmato');
  showToast(`Contratto di ${drv.name} esteso (+2 anni, firma €${signingFee}M fuori Cap)!`, 'success');
  saveGame();
  renderApp();
}

function setMarketReplaceSeat(seatIdx) {
  if (!gameState) return;
  gameState.marketReplaceSeat = Number(seatIdx) === 0 ? 0 : 1;
  saveGame();
  renderApp();
}

function setMarketTabSection(sec) {
  if (!gameState) return;
  gameState.marketTabSection = sec;
  saveGame();
  renderApp();
}

function assignCoherentTeamRoles(team) {
  if (!team || !gameState) return;
  const tDrivers = gameState.drivers.filter(d => d.teamId === team.id);
  if (tDrivers.length < 2) {
    tDrivers.forEach(d => { d.role = 'lead'; });
    return;
  }
  const sorted = [...tDrivers].sort((a, b) => (b.ovr + (b.points || 0) * 0.05) - (a.ovr + (a.points || 0) * 0.05));
  if (team.hierarchy === '1st_2nd') {
    sorted[0].role = 'lead';
    sorted[1].role = 'support';
  } else {
    sorted[0].role = 'co_lead';
    sorted[1].role = 'co_lead';
  }
}

function signFreeAgent(agentId) {
  ensureMarketAndAiDefaults();
  const idx = (gameState.freeAgents || []).findIndex(a => a.id === agentId);
  if (idx === -1) return;
  const agent = gameState.freeAgents[idx];
  const team = getUserTeam();
  const uDrivers = getUserDrivers();
  const signingBonus = Number((agent.salary * 0.5).toFixed(1));
  if (!chargeTeamExpense(signingBonus, false, `Ingaggio pilota svincolato ${agent.name}`)) return;

  if (uDrivers.length >= 2) {
    const seatIdx = Math.min(uDrivers.length - 1, Math.max(0, gameState.marketReplaceSeat ?? 1));
    const outgoing = uDrivers[seatIdx];
    gameState.drivers = gameState.drivers.filter(d => d.id !== outgoing.id);
    outgoing.teamId = null;
    outgoing.role = 'support';
    outgoing.transferRequest = false;
    gameState.freeAgents.push(outgoing);
    pushMarketHistory('Uscita', `${outgoing.name} lascia ${team.name} e torna tra gli svincolati.`);
  }

  gameState.freeAgents.splice(idx, 1);
  gameState.drivers = gameState.drivers.filter(d => d.id !== agent.id);
  agent.teamId = team.id;
  agent.contract = Math.max(2, agent.contract || 2);
  agent.transferRequest = false;
  agent.mood = Math.max(70, agent.mood || 68);
  agent.role = team.hierarchy === '1st_2nd' ? 'support' : 'co_lead';
  gameState.drivers.push(agent);
  assignCoherentTeamRoles(team);

  pushMarketHistory('Acquisto', `${team.name} ingaggia ${agent.name} (OVR ${agent.ovr}, €${agent.salary.toFixed(1)}M/a).`);
  pushMediaQuote('Mercato', `${team.name} ingaggia ${agent.name} (OVR ${agent.ovr}, ingaggio €${agent.salary.toFixed(1)}M/anno fuori Cap).`);
  showToast(`${agent.name} ingaggiato!`, 'success');
  saveGame();
  renderApp();
}

function fillSingleEmptyAiSeat(team, preferredReplacement = null) {
  if (!team || !gameState) return;
  const current = gameState.drivers.filter(d => d.teamId === team.id);
  if (current.length >= 2) return;

  const affordableAgents = (gameState.freeAgents || [])
    .filter(fa => fa.salary <= Math.max(4.5, team.budget * 0.25))
    .sort((a, b) => (b.ovr + (b.potential - b.ovr) * 0.35) - (a.ovr + (a.potential - a.ovr) * 0.35));

  let chosen = affordableAgents[0] || (gameState.freeAgents || [])[0] || preferredReplacement;
  if (!chosen) {
    chosen = generateAcademyRookie();
  } else {
    gameState.freeAgents = (gameState.freeAgents || []).filter(fa => fa.id !== chosen.id);
  }

  gameState.drivers = gameState.drivers.filter(d => d.id !== chosen.id);
  chosen.teamId = team.id;
  chosen.contract = Math.max(1, chosen.contract || 2);
  chosen.transferRequest = false;
  chosen.mood = Math.max(66, chosen.mood || 65);
  gameState.drivers.push(chosen);
  assignCoherentTeamRoles(team);

  pushMarketHistory('Mercato IA', `${team.name} chiama ${chosen.name} (OVR ${chosen.ovr}) per completare la line-up.`);
  pushMediaQuote('Mercato', `${team.name} ingaggia ${chosen.name} (OVR ${chosen.ovr}) dagli svincolati.`);
}

function attemptPoachDriver(driverId) {
  ensureMarketAndAiDefaults();
  const target = (gameState.drivers || []).find(d => d.id === driverId);
  const userTeam = getUserTeam();
  if (!target || !userTeam || target.teamId === userTeam.id) return;

  const isExpiring = (target.contract || 1) <= 1;
  const isUnhappy = !!target.transferRequest || (target.mood ?? 65) < 48;
  if (!isExpiring && !isUnhappy) {
    showToast(`${target.name} è blindato dal contratto (${target.contract} anni)!`, 'danger');
    return;
  }

  const originTeam = getTeam(target.teamId);
  const buyout = isExpiring ? 0 : Number((target.salary * 0.35).toFixed(1));
  const signingBonus = Number((target.salary * 0.5 + buyout).toFixed(1));

  if (!chargeTeamExpense(signingBonus, false, `Offerta ingaggio per ${target.name} (${originTeam.short})`)) return;

  const userCarAvg = (userTeam.aero + userTeam.pu + userTeam.chassis) / 3;
  const originCarAvg = (originTeam.aero + originTeam.pu + originTeam.chassis) / 3;
  const appealDiff = (userCarAvg - originCarAvg) * 0.05 + (userTeam.prestige - originTeam.prestige) * 0.015;
  const acceptProb = Math.max(0.22, Math.min(0.95, 0.62 + appealDiff + (isUnhappy ? 0.22 : 0)));

  if (Math.random() > acceptProb) {
    refundTeamExpense(Number((signingBonus * 0.8).toFixed(1)), false, `Offerta respinta da ${target.name}`);
    pushMediaQuote('Mercato', `${target.name} rifiuta l'offerta di ${userTeam.name} e resta in ${originTeam.name}.`);
    showToast(`${target.name} ha rifiutato la proposta (rimborsato 80% bonus).`, 'info');
    saveGame();
    renderApp();
    return;
  }

  const uDrivers = getUserDrivers();
  let displaced = null;
  if (uDrivers.length >= 2) {
    const seatIdx = Math.min(uDrivers.length - 1, Math.max(0, gameState.marketReplaceSeat ?? 1));
    displaced = uDrivers[seatIdx];
    gameState.drivers = gameState.drivers.filter(d => d.id !== displaced.id);
    displaced.teamId = null;
    displaced.role = 'support';
    displaced.transferRequest = false;
    gameState.freeAgents.push(displaced);
  }

  target.teamId = userTeam.id;
  target.contract = 2;
  target.transferRequest = false;
  target.mood = Math.min(90, Math.max(72, (target.mood || 65) + 10));
  assignCoherentTeamRoles(userTeam);

  pushMarketHistory('Colpo di Mercato', `${userTeam.name} strappa ${target.name} (OVR ${target.ovr}) a ${originTeam.name}!`);
  pushMediaQuote('Mercato', `COLPO ${userTeam.name}: ${target.name} lascia ${originTeam.name} e firma un biennale!`);

  // La scuderia IA sostituisce subito il pilota perso per restare a 2 guide
  fillSingleEmptyAiSeat(originTeam, displaced);

  showToast(`Affare fatto! ${target.name} è un nuovo pilota ${userTeam.short}!`, 'success');
  saveGame();
  renderApp();
}

// =========================================================
// SVILUPPO IA & MERCATO PILOTI DINAMICO (LUNGO PERIODO)
// =========================================================
function applyGarageUpgradeToTeam(team, area, gain) {
  if (!team) return;
  team[area] = Number(Math.min(99, team[area] + gain).toFixed(1));
  if (gameState.garageParts?.[team.id]) {
    const targetSlot = area === 'pu' ? 'pu' : (area === 'chassis' ? 'chassis' : 'steer');
    const slotParts = gameState.garageParts[team.id].filter(p => p.slot === targetSlot);
    if (slotParts.length > 0) {
      const part = slotParts[Math.floor(Math.random() * slotParts.length)];
      part.perf += Math.round(gain * 35);
      part.rel = Math.min(99, part.rel + 2);
      part.name = `${part.name.split(' v')[0]} +${gain}`;
    }
    syncTeamStatsFromGarage(team.id);
  }
}

function processAiDailyUpdates() {
  if (!gameState || !gameState.teams) return;
  ensureMarketAndAiDefaults();

  // 1. Avanzamento sviluppi R&D in corso per le scuderie IA
  const stillPending = [];
  (gameState.aiPendingUpgrades || []).forEach(upg => {
    upg.daysLeft = (upg.daysLeft ?? 5) - 1;
    if (upg.daysLeft <= 0) {
      const tm = getTeam(upg.teamId);
      if (tm && tm.id !== gameState.userTeamId) {
        applyGarageUpgradeToTeam(tm, upg.area, upg.gain);
        if (upg.tierKey !== 'minor') {
          pushMediaQuote('Reparto Tecnico', `${tm.name} porta in pista un pacchetto ${upg.tierLabel} (${upg.area.toUpperCase()}).`);
        }
      }
    } else {
      stillPending.push(upg);
    }
  });
  gameState.aiPendingUpgrades = stillPending;

  // 2. Ogni 5 giorni le scuderie IA valutano nuovi investimenti R&D nel rispetto del Budget Cap
  if ((gameState.careerDay || 1) % 5 === 0) {
    const capLimit = getBudgetCapLimit();
    const aiTeams = gameState.teams.filter(t => t.id !== gameState.userTeamId);
    const maxCarAvg = Math.max(...gameState.teams.map(t => (t.aero + t.pu + t.chassis) / 3));

    aiTeams.forEach(tm => {
      const alreadyBuilding = gameState.aiPendingUpgrades.some(u => u.teamId === tm.id);
      if (alreadyBuilding) return;

      const capRem = Number((capLimit - (tm.capSpent || 0)).toFixed(1));
      const cashReserve = 16.0;
      const spendableCash = Number((tm.budget - cashReserve).toFixed(1));
      if (spendableCash < RND_TIERS.minor.cost || capRem < RND_TIERS.minor.cost) return;

      const carAvg = (tm.aero + tm.pu + tm.chassis) / 3;
      const behindLeader = Math.max(0, maxCarAvg - carAvg);
      const ambitionProb = Math.min(0.45, 0.16 + (tm.prestige / 500) + behindLeader * 0.015);
      if (Math.random() > ambitionProb) return;

      let chosenTier = RND_TIERS.minor;
      if (spendableCash >= RND_TIERS.major.cost && capRem >= RND_TIERS.major.cost && (tm.prestige >= 84 || Math.random() < 0.35)) {
        chosenTier = RND_TIERS.major;
      } else if (spendableCash >= RND_TIERS.standard.cost && capRem >= RND_TIERS.standard.cost && Math.random() < 0.65) {
        chosenTier = RND_TIERS.standard;
      }

      const areas = [
        { k: 'aero', v: tm.aero },
        { k: 'pu', v: tm.pu },
        { k: 'chassis', v: tm.chassis }
      ].sort((a, b) => a.v - b.v);
      const chosenArea = Math.random() < 0.72 ? areas[0].k : areas[Math.floor(Math.random() * areas.length)].k;

      tm.budget = Number((tm.budget - chosenTier.cost).toFixed(1));
      tm.capSpent = Number(((tm.capSpent || 0) + chosenTier.cost).toFixed(1));
      gameState.aiPendingUpgrades.push({
        id: `ai_upg_${tm.id}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        teamId: tm.id,
        area: chosenArea,
        tierKey: chosenTier.id,
        tierLabel: chosenTier.label,
        gain: chosenTier.gain,
        daysLeft: chosenTier.days
      });
    });

    evaluateDriversMarketMood();
  }

  // 3. Silly Season in corso dalla 14a gara in poi (max 1 evento per round)
  if ((gameState.round || 1) >= 14 && (gameState.lastAiSillySeasonRound || 0) < gameState.round) {
    gameState.lastAiSillySeasonRound = gameState.round;
    runAiSillySeasonTick();
  }
}

function evaluateDriversMarketMood() {
  if (!gameState || !gameState.drivers) return;
  const maxCarAvg = Math.max(...gameState.teams.map(t => (t.aero + t.pu + t.chassis) / 3));

  gameState.drivers.forEach(d => {
    if (!d.teamId || d.teamId === gameState.userTeamId) return;
    const tm = getTeam(d.teamId);
    const carAvg = (tm.aero + tm.pu + tm.chassis) / 3;
    const carGap = maxCarAvg - carAvg;

    let drift = 0;
    if (d.ovr >= 88 && carGap > 7.5) drift -= 2;
    if (d.role === 'support' && !d.acceptsSupport) drift -= 2;
    if ((d.points || 0) > (tm.objective <= 4 ? 40 : 12)) drift += 1;

    if (drift !== 0) {
      d.mood = Math.max(15, Math.min(96, (d.mood ?? 65) + drift));
    }
    d.transferRequest = (d.mood ?? 65) < 42 || (d.ovr >= 88 && carGap > 9.5);
  });
}

function runAiSillySeasonTick() {
  if (!gameState) return;
  const aiTeams = gameState.teams.filter(t => t.id !== gameState.userTeamId);
  if (!aiTeams.length) return;

  // Rinnovi anticipati di piloti chiave in scadenza
  const candidateDrivers = gameState.drivers.filter(d => d.teamId && d.teamId !== gameState.userTeamId && (d.contract || 1) <= 1 && !d.transferRequest);
  if (candidateDrivers.length > 0 && Math.random() < 0.45) {
    const drv = candidateDrivers[Math.floor(Math.random() * candidateDrivers.length)];
    const tm = getTeam(drv.teamId);
    const carAvg = (tm.aero + tm.pu + tm.chassis) / 3;
    // Se il pilota è molto più forte dell'auto e di prestigio inferiore, potrebbe aspettare il mercato
    if (drv.ovr - carAvg < 8 || (drv.mood ?? 65) >= 65) {
      drv.contract = 2 + (Math.random() < 0.4 ? 1 : 0);
      drv.mood = Math.min(92, (drv.mood ?? 65) + 6);
      pushMarketHistory('Rinnovo IA', `${tm.name} blinda ${drv.name} con un rinnovo di ${drv.contract} anni.`);
      pushMediaQuote('Mercato', `UFFICIALE: ${tm.name} rinnova il contratto di ${drv.name} (${drv.contract} anni).`);
    } else {
      drv.transferRequest = true;
      pushMarketHistory('Rumors', `${drv.name} non ha ancora rinnovato con ${tm.name}: possibili movimenti a fine anno.`);
    }
  }

  // Raro cambio in corsa se un team IA ha un pilota molto sottotono o in rottura e c'è uno svincolato migliore
  if (Math.random() < 0.22 && (gameState.freeAgents || []).length > 0) {
    const troubled = gameState.drivers.find(d => d.teamId && d.teamId !== gameState.userTeamId && (d.transferRequest || d.mood < 35));
    const bestFa = [...gameState.freeAgents].sort((a, b) => b.ovr - a.ovr)[0];
    if (troubled && bestFa && bestFa.ovr >= troubled.ovr - 1) {
      const tm = getTeam(troubled.teamId);
      gameState.drivers = gameState.drivers.filter(d => d.id !== troubled.id);
      troubled.teamId = null;
      troubled.transferRequest = false;
      gameState.freeAgents.push(troubled);

      gameState.freeAgents = gameState.freeAgents.filter(fa => fa.id !== bestFa.id);
      bestFa.teamId = tm.id;
      bestFa.contract = 2;
      bestFa.mood = 72;
      gameState.drivers.push(bestFa);
      assignCoherentTeamRoles(tm);

      pushMarketHistory('Scambio in Corsa', `${tm.name} sostituisce ${troubled.name} con ${bestFa.name} (OVR ${bestFa.ovr})!`);
      pushMediaQuote('Mercato', `RIBALTONE IN ${tm.short}: fuori ${troubled.name}, arriva subito ${bestFa.name}!`);
    }
  }
}

function generateAcademyRookie() {
  const usedIds = new Set([
    ...(gameState.drivers || []).map(d => d.id),
    ...(gameState.freeAgents || []).map(f => f.id)
  ]);

  const unusedPreset = (typeof ACADEMY_ROOKIES_POOL !== 'undefined' ? ACADEMY_ROOKIES_POOL : []).find(r => !usedIds.has(r.id));
  if (unusedPreset) {
    return {
      ...JSON.parse(JSON.stringify(unusedPreset)),
      teamId: null,
      mood: 68,
      fatigue: 10,
      trainingBoost: 0,
      points: 0,
      wins: 0,
      podiums: 0,
      transferRequest: false
    };
  }

  const usedNumbers = new Set([
    ...(gameState.drivers || []).map(d => d.number),
    ...(gameState.freeAgents || []).map(f => f.number)
  ]);
  const fNames = typeof ROOKIE_FIRST_NAMES !== 'undefined' ? ROOKIE_FIRST_NAMES : ['Luca', 'Matteo', 'Enzo'];
  const lNames = typeof ROOKIE_LAST_NAMES !== 'undefined' ? ROOKIE_LAST_NAMES : ['Bellini', 'Moretti', 'Sorensen'];
  const first = fNames[Math.floor(Math.random() * fNames.length)];
  const last = lNames[Math.floor(Math.random() * lNames.length)];
  const code = last.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();

  let num = 24 + Math.floor(Math.random() * 72);
  while (usedNumbers.has(num) && num < 99) num++;

  const traits = Object.keys(DRIVER_TRAITS || { tactician: 1, attacker: 1 });
  const dnas = ['balanced', 'downforce', 'topSpeed'];
  const ovr = 75 + Math.floor(Math.random() * 6);
  const potential = Math.min(95, ovr + 8 + Math.floor(Math.random() * 7));

  return {
    id: `rookie_${code.toLowerCase()}_${Date.now().toString(36)}_${Math.floor(Math.random() * 99)}`,
    name: `${first} ${last}`,
    code,
    number: num,
    teamId: null,
    role: 'support',
    ovr,
    potential,
    pace: ovr + 1,
    cons: ovr - 1,
    tyreMgmt: ovr - 1,
    age: 18 + Math.floor(Math.random() * 4),
    contract: 2,
    salary: Number((1.3 + (ovr - 75) * 0.25).toFixed(1)),
    mood: 68,
    fatigue: 10,
    trainingBoost: 0,
    points: 0,
    wins: 0,
    podiums: 0,
    trait: traits[Math.floor(Math.random() * traits.length)],
    preferredDna: dnas[Math.floor(Math.random() * dnas.length)],
    acceptsSupport: true,
    transferRequest: false
  };
}

function processOffSeasonAiMarket() {
  if (!gameState) return;
  ensureMarketAndAiDefaults();

  // 1. Ritiri dei veterani e pulizia svincolati troppo anziani
  const retirees = [];
  gameState.drivers = (gameState.drivers || []).filter(d => {
    const retireProb = d.age >= 43 ? 0.78 : (d.age >= 40 ? 0.45 : (d.age >= 38 && d.ovr <= 80 ? 0.30 : 0));
    if (retireProb > 0 && d.teamId !== gameState.userTeamId && Math.random() < retireProb) {
      retirees.push(d);
      return false;
    }
    return true;
  });

  retirees.forEach(r => {
    pushMarketHistory('Ritiro', `${r.name} (${r.age} anni) annuncia il ritiro dalla Formula 1.`);
    pushMediaQuote('Mercato', `GRAZIE ${r.code}: ${r.name} si ritira a ${r.age} anni dopo una lunga carriera.`);
  });

  gameState.freeAgents = (gameState.freeAgents || []).filter(fa => {
    if (fa.age >= 39 || (fa.age >= 35 && fa.ovr < 78)) return false;
    return true;
  });

  // 2. Nuovi talenti dalle Academy per alimentare il ricambio generazionale
  const targetMinPool = 8;
  const newcomersCount = Math.max(2, targetMinPool - gameState.freeAgents.length);
  for (let i = 0; i < newcomersCount; i++) {
    const rookie = generateAcademyRookie();
    gameState.freeAgents.push(rookie);
  }

  // 3. Controllo scadenze squadra utente (rinnovo automatico di emergenza 1 anno se scaduto, modificabile poi dal giocatore)
  const userDrivers = getUserDrivers();
  userDrivers.forEach(ud => {
    if ((ud.contract || 0) <= 0) {
      ud.contract = 1;
      ud.salary = Number((ud.salary * 1.05).toFixed(1));
      adjustDriverMood(ud.id, -5, 'Opzione annuale attivata a scadenza contratto');
      pushMarketHistory('Scadenza Utente', `${ud.name}: contratto scaduto, attivata opzione ponte di 1 anno (€${ud.salary.toFixed(1)}M).`);
    }
  });

  // 4. Mercato IA: rilascio contratti scaduti non confermati & scambi tra scuderie
  const aiTeamsSorted = [...gameState.teams]
    .filter(t => t.id !== gameState.userTeamId)
    .sort((a, b) => {
      const scoreA = a.prestige * 0.45 + ((a.aero + a.pu + a.chassis) / 3) * 0.55;
      const scoreB = b.prestige * 0.45 + ((b.aero + b.pu + b.chassis) / 3) * 0.55;
      return scoreB - scoreA;
    });

  // Piloti IA in scadenza o scontenti vengono valutati prima dai rispettivi team
  aiTeamsSorted.forEach(tm => {
    const roster = gameState.drivers.filter(d => d.teamId === tm.id);
    roster.forEach(d => {
      if ((d.contract || 0) <= 0 || d.transferRequest) {
        const teamAvg = (tm.aero + tm.pu + tm.chassis) / 3;
        const bestFaOvr = Math.max(0, ...(gameState.freeAgents || []).map(f => f.ovr));
        const shouldDrop = d.transferRequest || (d.ovr < teamAvg - 6 && bestFaOvr >= d.ovr + 1) || (d.age >= 37 && bestFaOvr >= d.ovr - 1);
        if (shouldDrop) {
          gameState.drivers = gameState.drivers.filter(x => x.id !== d.id);
          d.teamId = null;
          d.transferRequest = false;
          d.mood = 62;
          gameState.freeAgents.push(d);
          pushMarketHistory('Fine Contratto', `${d.name} lascia ${tm.name} a fine contratto.`);
        } else {
          d.contract = 2;
          d.salary = Number(Math.max(1.5, d.salary * (d.ovr >= 88 ? 1.04 : 0.98)).toFixed(1));
          d.mood = Math.min(85, (d.mood ?? 65) + 6);
          pushMarketHistory('Rinnovo IA', `${tm.name} conferma ${d.name} per altri 2 anni.`);
        }
      }
    });
  });

  // Ogni scuderia IA completa i sedili vacanti o cerca un upgrade pescando da svincolati e piloti scontenti/in scadenza di altri team IA
  aiTeamsSorted.forEach(tm => {
    let safety = 0;
    while (gameState.drivers.filter(d => d.teamId === tm.id).length < 2 && safety < 4) {
      safety++;
      const teamAvg = (tm.aero + tm.pu + tm.chassis) / 3;
      const maxWage = Math.max(5.5, (tm.budget * 0.22));

      // Pool candidati: svincolati + eventuali stelle scontente/in scadenza in team più deboli
      const poachable = gameState.drivers.filter(d =>
        d.teamId &&
        d.teamId !== gameState.userTeamId &&
        d.teamId !== tm.id &&
        ((d.contract || 1) <= 1 || d.transferRequest) &&
        (() => {
          const curTm = getTeam(d.teamId);
          const curAvg = (curTm.aero + curTm.pu + curTm.chassis) / 3;
          return teamAvg > curAvg + 2 || tm.prestige > curTm.prestige + 5;
        })()
      );

      const candidates = [
        ...(gameState.freeAgents || []).map(f => ({ driver: f, fromAiTeam: null })),
        ...poachable.map(p => ({ driver: p, fromAiTeam: getTeam(p.teamId) }))
      ]
        .filter(c => c.driver.salary <= maxWage || c.driver.ovr >= 88)
        .sort((a, b) => {
          const scoreA = a.driver.ovr + Math.max(0, (a.driver.potential || a.driver.ovr) - a.driver.ovr) * 0.45 - (a.driver.age > 34 ? 2.5 : 0);
          const scoreB = b.driver.ovr + Math.max(0, (b.driver.potential || b.driver.ovr) - b.driver.ovr) * 0.45 - (b.driver.age > 34 ? 2.5 : 0);
          return scoreB - scoreA;
        });

      const pick = candidates[0] || { driver: generateAcademyRookie(), fromAiTeam: null };
      const drv = pick.driver;

      if (pick.fromAiTeam) {
        pushMarketHistory('Trasferimento IA', `${tm.name} ingaggia ${drv.name} (OVR ${drv.ovr}) strappandolo a ${pick.fromAiTeam.name}!`);
        pushMediaQuote('Mercato', `COLPO DI MERCATO: ${drv.name} lascia ${pick.fromAiTeam.name} e firma con ${tm.name}!`);
      } else {
        gameState.freeAgents = (gameState.freeAgents || []).filter(fa => fa.id !== drv.id);
        pushMarketHistory('Ingaggio IA', `${tm.name} firma ${drv.name} (OVR ${drv.ovr}, ${drv.age}a).`);
        pushMediaQuote('Mercato', `${tm.name} annuncia ${drv.name} per la nuova stagione!`);
      }

      gameState.drivers = gameState.drivers.filter(x => x.id !== drv.id);
      drv.teamId = tm.id;
      drv.contract = 2 + (drv.age <= 23 ? 1 : 0);
      drv.salary = Number(Math.max(1.5, Math.min(34, (drv.ovr - 74) * 1.45)).toFixed(1));
      drv.transferRequest = false;
      drv.mood = 72;
      gameState.drivers.push(drv);
    }

    // Anche se ha già 2 piloti, un top/mid team ambizioso può sostituire un pilota molto debole con uno svincolato nettamente migliore
    const roster = gameState.drivers.filter(d => d.teamId === tm.id).sort((a, b) => a.ovr - b.ovr);
    const weakest = roster[0];
    const topFa = [...(gameState.freeAgents || [])].sort((a, b) => b.ovr - a.ovr)[0];
    if (weakest && topFa && (weakest.contract || 1) <= 1 && topFa.ovr >= weakest.ovr + 3 && topFa.salary <= tm.budget * 0.25) {
      gameState.drivers = gameState.drivers.filter(x => x.id !== weakest.id);
      weakest.teamId = null;
      weakest.transferRequest = false;
      gameState.freeAgents.push(weakest);

      gameState.freeAgents = gameState.freeAgents.filter(fa => fa.id !== topFa.id);
      topFa.teamId = tm.id;
      topFa.contract = 2;
      topFa.mood = 72;
      gameState.drivers.push(topFa);
      pushMarketHistory('Avvicendamento IA', `${tm.name} sostituisce ${weakest.name} (${weakest.ovr}) con ${topFa.name} (${topFa.ovr}).`);
    }

    assignCoherentTeamRoles(tm);
  });

  // 5. Garanzia finale: ogni scuderia IA ha esattamente 2 piloti attivi
  gameState.teams.filter(t => t.id !== gameState.userTeamId).forEach(tm => {
    while (gameState.drivers.filter(d => d.teamId === tm.id).length < 2) {
      fillSingleEmptyAiSeat(tm);
    }
  });
}

function processOffSeasonRegulations(sortedTeamsLastSeason) {
  if (!gameState) return;
  const isMajorRegChange = ((gameState.season + 1) % 3 === 0); // Cambio regolamentare più deciso ogni 3 anni (es. 2028, 2031)

  sortedTeamsLastSeason.forEach((sortedTm, rankIdx) => {
    const tm = getTeam(sortedTm.id);
    if (!tm) return;

    // Aggiorna obiettivo scuderia in base al piazzamento reale dell'ultima stagione
    tm.objective = Math.max(1, Math.min(10, rankIdx + 1));

    // Lieve convergenza regolamentare per evitare che tutte le auto arrivino a 99/99/99
    const resetFactor = isMajorRegChange ? 0.32 : 0.18;
    const baseline = 79.0;

    ['aero', 'pu', 'chassis'].forEach(stat => {
      const cur = tm[stat] || 80;
      let nextVal = cur - Math.max(0, cur - baseline) * resetFactor;

      // Sviluppo invernale delle scuderie IA proporzionato al budget/prestigio + leggera variabilità tecnica
      if (tm.id !== gameState.userTeamId) {
        const winterRoll = 0.6 + (tm.prestige / 100) * 1.4 + (Math.random() * 1.8 - 0.5);
        nextVal += winterRoll;
      } else {
        // Anche la monoposto utente beneficia di una piccola messa a punto invernale di base
        nextVal += 0.9;
      }

      tm[stat] = Number(Math.max(72, Math.min(97, nextVal)).toFixed(1));
    });

    // Riallinea i componenti in garage ai nuovi valori regolamentari della stagione e azzera usura/quote PU e Cambio
    tm.carComponentPools = createDefaultCarComponentPools();
    if (gameState.garageParts?.[tm.id]) {
      const slotStatMap = { pu: 'pu', chassis: 'chassis', steer: 'aero' };
      gameState.garageParts[tm.id].forEach(p => {
        const statKey = slotStatMap[p.slot] || 'aero';
        p.perf = Math.round(tm[statKey] * 40);
        p.rel = Math.max(76, Math.min(95, Math.round(tm.rel)));
        p.wear = 0;
      });
      syncTeamStatsFromGarage(tm.id);
    }
  });

  gameState.filmingDaysUsed = 0;
  gameState.windTunnelAtr = { period: 1, used: 0, limit: 3 };
  gameState.simPrepRound = null;
  gameState.lastMediaDayRound = null;

  const regMsg = isMajorRegChange
    ? `Nuovo ciclo tecnico ${gameState.season + 1}: rimescolamento aerodinamico e aggiornamento delle forze in pista!`
    : `Test invernali ${gameState.season + 1}: tutte le scuderie hanno portato gli aggiornamenti di inizio anno.`;
  pushMediaQuote('Regolamento FIA', regMsg);
}

