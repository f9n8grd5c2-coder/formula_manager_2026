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

  // SABATO: bisogna completare FP3 + Qualifiche (o FP2 + Sprint + Qualifiche)
  if (cur === sat) {
    if (w.phase === 'fp' || w.phase === 'sprint_race' || w.phase === 'quali') {
      return { ok: false, msg: 'Completa tutte le sessioni del Sabato (fino alle Qualifiche) prima della Domenica!' };
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

  // Controllo completamento sviluppi R&D
  const remainingUpgrades = [];
  (gameState.pendingUpgrades || []).forEach(upg => {
    upg.daysLeft = (upg.daysLeft ?? 4) - 1;
    if (upg.daysLeft <= 0) {
      const tm = getTeam(gameState.userTeamId);
      tm[upg.area] = Number((tm[upg.area] + upg.gain).toFixed(1));
      if (gameState.garageParts?.[tm.id]) {
        const targetSlot = upg.area === 'pu' ? 'pu' : (upg.area === 'chassis' ? 'chassis' : 'steer');
        const part = gameState.garageParts[tm.id].find(p => p.slot === targetSlot);
        if (part) {
          part.perf += Math.round(upg.gain * 35);
          part.rel = Math.min(99, part.rel + 2);
          part.name = `${part.name.split(' v')[0]} +${upg.gain}`;
        }
        syncTeamStatsFromGarage(tm.id);
      }
      gameState.newsFeed.unshift(`AGGIORNAMENTO PRONTO: +${upg.gain} ${upg.area.toUpperCase()} completato in fabbrica!`);
      if (!silent) showToast(`Aggiornamento ${upg.area.toUpperCase()} completato!`, 'success');
    } else {
      remainingUpgrades.push(upg);
    }
  });
  gameState.pendingUpgrades = remainingUpgrades;

  // Recupero fatica e crescita/calo piloti
  gameState.drivers.forEach(d => {
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
  });

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

function runExtraActivity(kind) {
  const team = getUserTeam();
  const uDrivers = getUserDrivers();
  if (!team || !uDrivers.length) return;

  if (kind === 'simulator') {
    const cost = 2.5;
    if (!chargeTeamExpense(cost, true, 'Sessione Simulatore Tecnico')) return;
    uDrivers.forEach(d => {
      d.fatigue = Math.min(100, (d.fatigue ?? 15) + 14);
      d.trainingBoost = (d.trainingBoost || 0) + 5;
      adjustDriverMood(d.id, 3, 'Sessione intensa al simulatore e analisi dati');
    });
    pushMediaQuote('Attivita Extra', `Simulatore attivato per ${uDrivers.map(x => x.code).join(' e ')}: -€${cost}M (nel Cap), +fatica.`);
    showToast('Simulatore completato (-€2.5M nel Cap, +fatica)!', 'success');
  } else if (kind === 'media_sponsor') {
    const sponsor = getActiveSponsor();
    const gain = Number((sponsor.perRace * 0.6).toFixed(1));
    team.budget = Number((team.budget + gain).toFixed(1));
    gameState.paddockPressure = Math.min(100, (gameState.paddockPressure || 62) + 5);
    uDrivers.forEach(d => {
      d.fatigue = Math.min(100, (d.fatigue ?? 15) + 6);
      adjustDriverMood(d.id, 2, 'Evento sponsor e incontro con la stampa');
    });
    pushMediaQuote('Sponsor & Media Day', `${sponsor.name} e ${team.name} protagonisti dell evento media: +€${gain.toFixed(1)}M in cassa.`);
    showToast(`Media Day completato: +€${gain.toFixed(1)}M in cassa!`, 'success');
  } else if (kind === 'team_building') {
    const cost = 2.0;
    if (!chargeTeamExpense(cost, false, 'Team Building Scuderia')) return;
    uDrivers.forEach(d => {
      d.fatigue = Math.max(0, (d.fatigue ?? 15) - 6);
      adjustDriverMood(d.id, 7, 'Ritiro di team building e confronto costruttivo');
    });
    if (uDrivers.length === 2) {
      const curRiv = getRivalryValue(uDrivers[0].id, uDrivers[1].id);
      gameState.rivalries[getRivalryKey(uDrivers[0].id, uDrivers[1].id)] = Math.max(0, curRiv - 10);
    }
    pushMediaQuote('Paddock', `Team building per ${team.name}: -€${cost}M (fuori Cap), morale su e rivalita interna piu calma.`);
    showToast('Team building riuscito (-€2.0M fuori Cap)!', 'success');
  } else if (kind === 'wind_tunnel') {
    const cost = 4.0;
    if (!chargeTeamExpense(cost, true, 'Giornata in Galleria del Vento')) return;
    team.aero = Number(Math.min(99, team.aero + 0.4).toFixed(1));
    if (gameState.garageParts?.[team.id]) {
      gameState.garageParts[team.id].filter(p => p.slot === 'steer' || p.slot === 'chassis').forEach(p => {
        p.perf += 18;
      });
      syncTeamStatsFromGarage(team.id);
    }
    pushMediaQuote('Reparto Tecnico', `${team.name} in galleria del vento: -€${cost}M (nel Cap), +0.4 Aerodinamica.`);
    showToast('Galleria del vento completata (-€4.0M nel Cap, +0.4 Aero)!', 'success');
  }

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
  const slotLabels = { pu: 'Power Unit Spec-Evo', chassis: 'Telaio Leggero', steer: 'Sterzo & Aero Spec-Evo' };
  list.push({
    id: `${team.id}_${slot}_${Date.now().toString(36)}`,
    slot,
    name: `${slotLabels[slot] || slot.toUpperCase()} v2`,
    perf: basePerf,
    rel: Math.min(97, Math.max(82, team.rel + 2)),
    assignedCar: carTab
  });
  gameState.garageParts[team.id] = list;
  syncTeamStatsFromGarage(team.id);
  showToast(`Nuovo componente ${slot.toUpperCase()} costruito (-€6.5M nel Cap)!`, 'success');
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

function signFreeAgent(agentId) {
  const idx = (gameState.freeAgents || []).findIndex(a => a.id === agentId);
  if (idx === -1) return;
  const agent = gameState.freeAgents[idx];
  const team = getUserTeam();
  const uDrivers = getUserDrivers();
  const signingBonus = Number((agent.salary * 0.5).toFixed(1));
  if (!chargeTeamExpense(signingBonus, false, `Ingaggio pilota svincolato ${agent.name}`)) return;

  if (uDrivers.length >= 2) {
    const outgoing = uDrivers[uDrivers.length - 1];
    outgoing.teamId = null;
    outgoing.role = 'support';
    gameState.freeAgents.push(outgoing);
  }

  gameState.freeAgents.splice(idx, 1);
  agent.teamId = team.id;
  agent.role = team.hierarchy === '1st_2nd' ? 'support' : 'co_lead';
  gameState.drivers.push(agent);
  pushMediaQuote('Mercato', `${team.name} ingaggia ${agent.name} (OVR ${agent.ovr}, ingaggio €${agent.salary.toFixed(1)}M/anno fuori Cap).`);
  showToast(`${agent.name} ingaggiato!`, 'success');
  saveGame();
  renderApp();
}
