function getTyreColorMeta(compound) {
  const c = String(compound || 'M').toUpperCase();
  const map = {
    S: { code: 'S', name: 'Soft', bg: '#ff3b30', text: '#ffffff' },
    M: { code: 'M', name: 'Medium', bg: '#ffcc00', text: '#090d16' },
    H: { code: 'H', name: 'Hard', bg: '#f2f2f7', text: '#090d16' },
    I: { code: 'I', name: 'Inter', bg: '#34c759', text: '#041f0e' },
    W: { code: 'W', name: 'Wet', bg: '#007aff', text: '#ffffff' }
  };
  return map[c] || map.M;
}

function getTyreBadgeHtml(compound, size = 'sm') {
  const meta = getTyreColorMeta(compound);
  const sizeCls = size === 'xs'
    ? 'w-4 h-4 text-[9px]'
    : (size === 'md' ? 'w-6 h-6 text-[11px]' : 'w-5 h-5 text-[10px]');
  return `<span title="${meta.name} (${meta.code})" class="inline-flex items-center justify-center rounded-full font-mono-num font-black leading-none shrink-0 ${sizeCls}" style="background:${meta.bg}; color:${meta.text}; border:1.5px solid rgba(255,255,255,0.28); box-shadow: inset 0 0 0 1px rgba(0,0,0,0.18);">${meta.code}</span>`;
}

function getTyreButtonStyle(compound, isSelected, isLocked = false) {
  const meta = getTyreColorMeta(compound);
  if (isLocked) {
    return 'background:#0f172a; color:#475569; border-color:#1e293b; opacity:0.42;';
  }
  if (isSelected) {
    return `background:${meta.bg}; color:${meta.text}; border-color:#ffffff; box-shadow:0 0 0 1px ${meta.bg};`;
  }
  return `background:#121722; color:${meta.bg}; border-color:${meta.bg}85;`;
}

function renderTeamSelectScreen() {
  const activeSlot = typeof getActiveSaveSlot === 'function' ? getActiveSaveSlot().replace('_', ' ').toUpperCase() : 'SLOT 1';
  return `
    <div class="p-4 lg:p-6 space-y-4">
      <div class="bg-f1card border border-f1border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div class="text-[11px] font-bold uppercase tracking-wider text-f1red">Carriera 7 Stagioni (2026–2032) · Budget Cap €200M · ${activeSlot}</div>
          <h1 class="text-xl lg:text-2xl font-extrabold text-white mt-0.5">Formula Manager 2026</h1>
          <p class="text-xs text-slate-400 mt-1">Scegli lo sponsor iniziale e la tua scuderia. Cassa e Budget Cap FIA seguono le regole reali della F1.</p>
        </div>
        <button type="button" onclick="openModal('saves_manager')" class="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-f1border text-xs font-bold text-white whitespace-nowrap shrink-0">
          💾 Salvataggi & Importa
        </button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div class="lg:col-span-5 bg-f1card border border-f1border rounded-2xl p-4 space-y-2.5">
          <div class="text-xs font-extrabold uppercase tracking-wider text-amber-300">1. Scegli Sponsor Principale</div>
          <div class="space-y-2">
            ${SPONSOR_OPTIONS.map((sp, i) => `
              <button type="button" onclick="window.__tmpSponsorId='${sp.id}'; document.querySelectorAll('.sp-opt').forEach(el=>el.classList.remove('border-amber-400','bg-amber-950/30')); this.classList.add('border-amber-400','bg-amber-950/30');" class="sp-opt w-full text-left p-3 rounded-xl border ${i === 0 ? 'border-amber-400 bg-amber-950/30' : 'border-f1border bg-f1bg'}">
                <div class="flex justify-between text-xs font-extrabold text-white gap-2">
                  <span>${sp.name}</span>
                  <span class="font-mono-num text-emerald-400 shrink-0">+€${sp.upfront}M · €${sp.perRace}/GP</span>
                </div>
                <div class="text-[11px] text-slate-400 mt-1">${sp.tagline} (Podio +€${sp.podiumBonus}M · Vittoria +€${sp.winBonus}M)</div>
              </button>
            `).join('')}
          </div>
        </div>

        <div class="lg:col-span-7 space-y-2.5 pb-6">
          <div class="text-xs font-extrabold uppercase tracking-wider text-sky-300 px-1">2. Scegli Scuderia (Cassa Iniziale Proporzionata)</div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            ${INITIAL_TEAMS.map(t => {
              const tDrivers = INITIAL_DRIVERS.filter(d => d.teamId === t.id);
              const avgPerf = Math.round((t.aero + t.pu + t.chassis) / 3);
              const wages = tDrivers.reduce((s, d) => s + d.salary, 0).toFixed(1);
              return `
                <button onclick="selectTeamAndStart('${t.id}', window.__tmpSponsorId || '${SPONSOR_OPTIONS[0].id}')" class="w-full text-left bg-f1card hover:bg-slate-800/80 border border-f1border rounded-2xl p-3.5 transition active:scale-[0.99]">
                  <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2.5 min-w-0">
                      <span class="w-3.5 h-8 rounded-full inline-block shrink-0" style="background:${t.color}"></span>
                      <div class="min-w-0">
                        <div class="text-sm font-extrabold text-white truncate">${t.name}</div>
                        <div class="text-[11px] text-slate-400 truncate">${tDrivers.map(d => d.name).join(' · ')}</div>
                        <div class="text-[10px] text-slate-500 font-mono-num">Ingaggi: €${wages}M (fuori Cap)</div>
                      </div>
                    </div>
                    <div class="text-right shrink-0">
                      <div class="text-xs font-mono-num font-extrabold text-white">Auto ${avgPerf}</div>
                      <div class="text-[11px] font-mono-num text-emerald-400">€${t.budget.toFixed(1)}M</div>
                    </div>
                  </div>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      </div>
      ${renderActiveModal()}
    </div>
  `;
}

function renderTopHeader() {
  const team = getUserTeam();
  const track = CALENDAR_2026[gameState.round - 1] || CALENDAR_2026[23];
  const dayTag = getWeekendDayBadge(gameState.weekend);
  const remCap = getRemainingBudgetCap();
  const capLimit = getBudgetCapLimit();
  const dateStr = formatCareerDateIT(gameState.currentDate || '2026-02-23');
  return `
    <header class="sticky top-0 z-30 bg-f1bg/95 backdrop-blur border-b border-f1border px-4 py-2 flex items-center justify-between gap-2">
      <div class="flex items-center gap-2 min-w-0">
        <span class="w-2.5 h-6 rounded-full shrink-0" style="background:${team.color}"></span>
        <div class="min-w-0">
          <div class="text-xs font-extrabold text-white leading-tight truncate">${team.name} <span class="text-[10px] text-amber-300 font-bold ml-1">· ${dayTag}</span></div>
          <div class="text-[10px] text-slate-400 font-mono-num truncate">${dateStr} · GP${gameState.round}/24 ${track.flag}</div>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <div class="text-right font-mono-num">
          <div class="text-xs font-extrabold text-emerald-400">€${team.budget.toFixed(1)}M</div>
          <div class="text-[9px] ${remCap < 15 ? 'text-amber-300 font-bold' : 'text-sky-300'}">Cap €${remCap.toFixed(1)}M/${capLimit.toFixed(0)}M</div>
        </div>
        <button type="button" onclick="openModal('saves_manager')" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-f1border text-[10px] font-bold text-slate-200 whitespace-nowrap">💾 Slot</button>
        <button type="button" onclick="openModal('confirm_reset')" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-red-950/80 border border-f1border text-[10px] font-bold text-slate-300 hover:text-red-200 whitespace-nowrap">Reset</button>
      </div>
    </header>
  `;
}

function renderBottomNav() {
  const badges = typeof getNavBadges === 'function' ? getNavBadges() : {};
  const tabs = [
    { id: 'hub', icon: '🏠', label: 'Paddock' },
    { id: 'weekend', icon: '🏁', label: 'Weekend', badge: badges.weekend },
    { id: 'calendar', icon: '📅', label: 'Calendario' },
    { id: 'rnd', icon: '🔧', label: 'Garage', badge: badges.rnd },
    { id: 'market', icon: '🤝', label: 'Mercato', badge: badges.market },
    { id: 'standings', icon: '🏆', label: 'Classifiche' }
  ];
  return `
    <nav class="sticky bottom-0 z-30 bg-f1card/95 backdrop-blur border-t border-f1border grid grid-cols-6 py-1 px-1">
      ${tabs.map(t => {
        const active = gameState.activeTab === t.id;
        return `
          <button onclick="setActiveTab('${t.id}')" class="relative flex flex-col items-center justify-center py-1 rounded-xl transition ${active ? 'text-f1red font-extrabold' : 'text-slate-400 hover:text-slate-200'}">
            ${t.badge ? `<span class="absolute top-0.5 right-1.5 px-1 rounded bg-amber-500 text-slate-950 text-[8px] font-black leading-tight">${t.badge}</span>` : ''}
            <span class="text-sm leading-none">${t.icon}</span>
            <span class="text-[9px] mt-0.5 whitespace-nowrap">${t.label}</span>
          </button>
        `;
      }).join('')}
    </nav>
  `;
}

function renderCalendarView() {
  const doneList = gameState.completedRounds || [];
  return `
    <div class="p-4 space-y-3 pb-6">
      <div class="bg-f1card border border-f1border rounded-2xl p-4">
        <span class="text-[10px] font-bold uppercase tracking-wider text-f1red">Stagione ${gameState.season} (Ciclo fino al ${gameState.maxSeasons})</span>
        <h2 class="text-lg font-extrabold text-white mt-0.5">Calendario Annuale · 24 GP</h2>
        <p class="text-xs text-slate-400 mt-1">Sprint: Ven FP1 + Qualifica Sprint; Sab Gara Sprint + Qualifiche GP; Dom Strategia + GP.</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        ${CALENDAR_2026.map(tr => {
          const isCurrent = tr.round === gameState.round;
          const isDone = doneList.some(x => x.round === tr.round && x.season === gameState.season) || tr.round < gameState.round;
          const statusText = isCurrent ? 'IN CORSO' : (isDone ? 'DISPUTATO' : 'IN PROGRAMMA');
          const statusColor = isCurrent ? 'text-f1red' : (isDone ? 'text-emerald-400' : 'text-slate-400');
          return `
            <div class="bg-f1card border ${isCurrent ? 'border-f1red' : 'border-f1border'} rounded-2xl p-3 space-y-1">
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="text-xs font-mono-num font-black text-slate-400">R${String(tr.round).padStart(2, '0')}</span>
                  <span class="text-base">${tr.flag}</span>
                  <div class="truncate">
                    <div class="text-xs font-extrabold text-white truncate">${tr.name} <span class="text-[10px] text-slate-400 font-normal">(${tr.dateLabel})</span></div>
                    <div class="text-[10px] text-slate-400 truncate">${tr.circuit} · ${tr.laps} Giri · Pioggia ${Math.round(tr.rainChance * 100)}%</div>
                  </div>
                </div>
                <div class="flex flex-col items-end gap-0.5 shrink-0">
                  <span class="text-[9px] font-extrabold ${statusColor}">${statusText}</span>
                  ${tr.hasSprint ? '<span class="text-[9px] font-extrabold text-amber-300">⚡ SPRINT</span>' : ''}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderHubView() {
  const team = getUserTeam();
  const userDrivers = getUserDrivers();
  const track = CALENDAR_2026[gameState.round - 1] || CALENDAR_2026[0];
  const stints = getEstimatedStints(track, gameState.rules);
  const mateRiv = userDrivers.length === 2 ? getRivalryValue(userDrivers[0].id, userDrivers[1].id) : 0;
  const mediaFilter = gameState.hubMediaFilter || 'all';
  const pressure = gameState.paddockPressure ?? 62;

  const filteredMedia = (gameState.mediaFeed || []).filter(m => {
    if (mediaFilter === 'fans') return m.source.includes('Stampa') || m.source === 'Team Principal' || m.source.includes('Sponsor');
    if (mediaFilter === 'rivalry') return m.source === 'Rivalita' || m.source === 'Pilota' || m.source === 'Paddock' || m.source === 'Attivita Extra';
    return true;
  });

  return `
    <div class="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start pb-6">
      <div class="lg:col-span-6 space-y-3.5">
        <div class="bg-f1card border border-f1border rounded-2xl p-4 space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-f1red">GP ${gameState.round}/24 · ${track.dateLabel} ${track.hasSprint ? '· ⚡ SPRINT' : ''}</span>
              <h2 class="text-lg font-extrabold text-white">${track.flag} GP ${track.name}</h2>
              <div class="text-xs text-slate-400">${track.circuit} · ${track.laps} Giri · Pioggia ${Math.round(track.rainChance * 100)}%</div>
            </div>
            <div class="text-right font-mono-num text-[11px] bg-f1bg px-2.5 py-1.5 rounded-xl border border-f1border">
              <div class="text-slate-400">Pressione <strong class="${pressure >= 75 ? 'text-red-400' : 'text-amber-300'}">${pressure}%</strong></div>
              <div class="text-slate-400">Degrado <strong class="text-amber-300">${track.tyreDeg}/3</strong></div>
            </div>
          </div>

          <div class="flex items-center justify-between text-[11px] font-mono-num bg-f1bg p-2.5 rounded-xl border border-f1border/70">
            <span class="text-slate-400">Stint Stimati:</span>
            <span class="text-red-400 font-bold">S: ${stints.S}g</span>
            <span class="text-amber-300 font-bold">M: ${stints.M}g</span>
            <span class="text-slate-200 font-bold">H: ${stints.H}g</span>
          </div>

          <div class="flex items-center justify-between text-xs bg-f1bg px-3 py-2 rounded-xl border border-f1border">
            <span class="text-slate-400">Data attuale:</span>
            <span class="font-mono-num font-extrabold text-white">${formatCareerDateIT(gameState.currentDate || '2026-02-23')}</span>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <button onclick="advanceSingleDay(false)" class="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-f1border font-extrabold text-xs text-white">
              ⏭ Avanza Giorno
            </button>
            <button onclick="advanceToNextWeekend()" class="py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 font-extrabold text-xs text-white">
              🏁 Al Prossimo Weekend
            </button>
          </div>

          ${isCurrentDateInRaceWeekend() ? `
            <button onclick="setActiveTab('weekend')" class="w-full py-3 rounded-xl bg-f1red hover:bg-red-600 font-extrabold text-sm text-white shadow-lg shadow-f1red/25">
              ENTRA IN PISTA (${getWeekendDayBadge(gameState.weekend)}) →
            </button>
          ` : `
            <div class="w-full py-2.5 px-3 rounded-xl bg-slate-900/80 border border-f1border text-center text-[11px] font-bold text-slate-400">
              Prossimo weekend in pista: <span class="text-amber-300 font-mono-num">${formatCareerDateIT(getRoundWeekendDates(gameState.round, gameState.season).fri)}</span>
            </div>
          `}
        </div>

        ${(() => {
          const activityDoneToday = typeof hasUsedDailyActivity === 'function' && hasUsedDailyActivity();
          const btnDisabled = activityDoneToday ? 'disabled' : '';
          const btnCls = activityDoneToday
            ? 'p-2.5 rounded-xl bg-f1bg border border-f1border text-left opacity-45 cursor-not-allowed'
            : 'p-2.5 rounded-xl bg-f1bg hover:bg-slate-800 border border-f1border text-left transition';
          const selectedDrv = userDrivers.find(d => d.id === gameState.trainingTargetDriverId) || userDrivers[0];
          const drvXp = selectedDrv?.trainingXp || { pace: 0, cons: 0, tyreMgmt: 0 };
          const xpStep = typeof getDriverTrainingXpGain === 'function' ? getDriverTrainingXpGain(selectedDrv) : 28;
          const atr = typeof getWindTunnelAtrState === 'function' ? getWindTunnelAtrState() : { period: 1, used: 0, limit: 3 };
          const simDone = gameState.simPrepRound === gameState.round;
          const mediaDone = gameState.lastMediaDayRound === gameState.round;
          const filmingUsed = gameState.filmingDaysUsed || 0;
          const sponsorGain = Number((getActiveSponsor().perRace * 0.85).toFixed(1));
          const statsRows = [
            { key: 'pace', icon: '⚡', label: 'Velocità (Passo)', shortLabel: 'Passo', val: selectedDrv?.pace ?? selectedDrv?.ovr ?? 80, xp: drvXp.pace || 0, color: 'bg-sky-400', textCls: 'text-sky-300' },
            { key: 'tyreMgmt', icon: '🛞', label: 'Gestione Gomme', shortLabel: 'Gest. Gomme', val: selectedDrv?.tyreMgmt ?? selectedDrv?.ovr ?? 80, xp: drvXp.tyreMgmt || 0, color: 'bg-amber-400', textCls: 'text-amber-300' },
            { key: 'cons', icon: '🎯', label: 'Costanza Gara', shortLabel: 'Costanza', val: selectedDrv?.cons ?? selectedDrv?.ovr ?? 80, xp: drvXp.cons || 0, color: 'bg-emerald-400', textCls: 'text-emerald-300' }
          ];
          return `
            <div class="bg-f1card border border-f1border rounded-2xl p-4 space-y-3">
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-xs font-bold uppercase tracking-wider text-sky-300">Allenamento Individuale Piloti</h3>
                <span class="text-[10px] font-mono-num font-bold ${activityDoneToday ? 'text-slate-400' : 'text-emerald-400'}">
                  ${activityDoneToday ? 'Usato oggi (0/1)' : 'Slot oggi (1/1)'}
                </span>
              </div>

              ${selectedDrv ? `
                <div class="grid grid-cols-2 gap-1.5 bg-f1bg p-1 rounded-xl border border-f1border">
                  ${userDrivers.map(ud => {
                    const isSel = ud.id === selectedDrv.id;
                    return `
                      <button type="button" onclick="setTrainingTargetDriver('${ud.id}')" class="py-1.5 px-2 rounded-lg text-[11px] font-extrabold transition truncate ${isSel ? 'bg-f1red text-white' : 'text-slate-400 hover:text-white'}">
                        #${ud.number} ${ud.code} · Fat. ${ud.fatigue ?? 15}%
                      </button>
                    `;
                  }).join('')}
                </div>

                <div class="bg-f1bg p-3 rounded-xl border border-f1border/70 space-y-2">
                  <div class="flex items-center justify-between text-[11px] font-mono-num">
                    <span class="font-extrabold text-white">${selectedDrv.name} · OVR ${selectedDrv.ovr}/${selectedDrv.potential ?? selectedDrv.ovr}</span>
                    <span class="text-slate-400">+${xpStep}% XP/sessione</span>
                  </div>
                  ${statsRows.map(sr => {
                    const cap = typeof getDriverTrainingStatCap === 'function' ? getDriverTrainingStatCap(selectedDrv, sr.key) : (selectedDrv.potential || 99);
                    const isMax = sr.val >= cap;
                    return `
                      <div class="space-y-1">
                        <div class="flex justify-between text-[10px] font-mono-num">
                          <span class="text-slate-300">${sr.icon} ${sr.label}</span>
                          <span class="${sr.textCls} font-bold">${sr.val}/${cap} ${isMax ? '· MAX POT.' : `· XP ${sr.xp}%`}</span>
                        </div>
                        <div class="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div class="h-full transition-all ${sr.color}" style="width:${isMax ? 100 : sr.xp}%"></div>
                        </div>
                      </div>
                    `;
                  }).join('')}
                  ${(selectedDrv.staminaShield || 0) > 0 ? `
                    <div class="text-[10px] font-bold text-emerald-300 pt-0.5">🛡️ Scudo atletico attivo: -40% fatica nel prossimo GP</div>
                  ` : ''}
                </div>

                <div class="grid grid-cols-2 gap-2">
                  ${statsRows.map(sr => {
                    const cap = typeof getDriverTrainingStatCap === 'function' ? getDriverTrainingStatCap(selectedDrv, sr.key) : (selectedDrv.potential || 99);
                    const atCap = sr.val >= cap;
                    const dis = activityDoneToday || atCap ? 'disabled' : '';
                    const cls = (activityDoneToday || atCap)
                      ? 'p-2.5 rounded-xl bg-f1bg border border-f1border text-left opacity-45 cursor-not-allowed'
                      : 'p-2.5 rounded-xl bg-f1bg hover:bg-slate-800 border border-f1border text-left transition';
                    return `
                      <button ${dis} onclick="runDriverTraining('${selectedDrv.id}', '${sr.key}')" class="${cls}">
                        <div class="text-xs font-extrabold text-white">${sr.icon} ${sr.shortLabel}</div>
                        <div class="text-[10px] font-mono-num ${atCap ? 'text-slate-400' : 'text-amber-300'}">${atCap ? 'Potenziale Max' : '-€1.0M (Cap) · +XP'}</div>
                      </button>
                    `;
                  }).join('')}
                  <button ${btnDisabled} onclick="runDriverTraining('${selectedDrv.id}', 'fitness')" class="${btnCls}">
                    <div class="text-xs font-extrabold text-white">🏋️ Prep. Atletica</div>
                    <div class="text-[10px] text-emerald-400 font-mono-num">-€0.4M · -24% Fat. + Scudo</div>
                  </button>
                </div>
              ` : ''}
            </div>

            <div class="bg-f1card border border-f1border rounded-2xl p-4 space-y-2.5">
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-xs font-bold uppercase tracking-wider text-amber-300">Attivita Extra Scuderia</h3>
                <span class="text-[10px] font-mono-num text-slate-400">1 slot/giorno condiviso</span>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <button ${activityDoneToday || simDone ? 'disabled' : ''} onclick="runExtraActivity('simulator')" class="${(activityDoneToday || simDone) ? 'p-2.5 rounded-xl bg-f1bg border border-f1border text-left opacity-45 cursor-not-allowed' : 'p-2.5 rounded-xl bg-f1bg hover:bg-slate-800 border border-f1border text-left transition'}">
                  <div class="text-xs font-extrabold text-white">🎮 Sim. ${track.name}</div>
                  <div class="text-[10px] font-mono-num ${simDone ? 'text-emerald-400' : 'text-amber-300'}">${simDone ? 'Pronto per FP1 ✓' : '-€2.0M (Cap) · FP1 54%'}</div>
                </button>
                <button ${activityDoneToday || atr.used >= atr.limit ? 'disabled' : ''} onclick="runExtraActivity('wind_tunnel')" class="${(activityDoneToday || atr.used >= atr.limit) ? 'p-2.5 rounded-xl bg-f1bg border border-f1border text-left opacity-45 cursor-not-allowed' : 'p-2.5 rounded-xl bg-f1bg hover:bg-slate-800 border border-f1border text-left transition'}">
                  <div class="text-xs font-extrabold text-white">💨 Galleria Vento</div>
                  <div class="text-[10px] font-mono-num ${atr.used >= atr.limit ? 'text-red-400' : 'text-amber-300'}">ATR ${atr.used}/${atr.limit} · -€3.5M · +0.6 Aero</div>
                </button>
                <button ${activityDoneToday || mediaDone ? 'disabled' : ''} onclick="runExtraActivity('media_sponsor')" class="${(activityDoneToday || mediaDone) ? 'p-2.5 rounded-xl bg-f1bg border border-f1border text-left opacity-45 cursor-not-allowed' : 'p-2.5 rounded-xl bg-f1bg hover:bg-slate-800 border border-f1border text-left transition'}">
                  <div class="text-xs font-extrabold text-white">🎤 Media Day</div>
                  <div class="text-[10px] font-mono-num ${mediaDone ? 'text-slate-400' : 'text-emerald-400'}">${mediaDone ? `Fatto per GP${gameState.round}` : `+€${sponsorGain}M · 1x GP`}</div>
                </button>
                <button ${activityDoneToday || filmingUsed >= 3 ? 'disabled' : ''} onclick="runExtraActivity('filming_day')" class="${(activityDoneToday || filmingUsed >= 3) ? 'p-2.5 rounded-xl bg-f1bg border border-f1border text-left opacity-45 cursor-not-allowed' : 'p-2.5 rounded-xl bg-f1bg hover:bg-slate-800 border border-f1border text-left transition'}">
                  <div class="text-xs font-extrabold text-white">🏎️ Test / Filming</div>
                  <div class="text-[10px] font-mono-num ${filmingUsed >= 3 ? 'text-red-400' : 'text-sky-300'}">${filmingUsed}/3 Stag. · -€3.0M · ++XP</div>
                </button>
                <button ${btnDisabled} onclick="runExtraActivity('team_building')" class="col-span-2 ${btnCls}">
                  <div class="text-xs font-extrabold text-white">🤝 Team Building Scuderia</div>
                  <div class="text-[10px] text-sky-300 font-mono-num">-€2.0M (Fuori Cap) · +7 Morale · -8% Fatica · -10 Rivalita</div>
                </button>
              </div>
            </div>
          `;
        })()}
      </div>

      <div class="lg:col-span-6 space-y-3.5">
        <div class="bg-f1card border border-f1border rounded-2xl p-4 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-300">Piloti, Fatica & Gerarchia</h3>
            ${userDrivers.length === 2 ? `<span class="text-[10px] font-mono-num text-amber-300">Rivalita Box: ${mateRiv}/100</span>` : ''}
          </div>

          ${userDrivers.length === 2 ? `
            <div class="grid grid-cols-2 gap-1.5 bg-f1bg p-1 rounded-xl border border-f1border">
              <button onclick="setTeamHierarchyMode('1st_2nd')" class="py-1.5 rounded-lg text-[11px] font-extrabold transition ${team.hierarchy === '1st_2nd' ? 'bg-f1red text-white' : 'text-slate-400'}">1a / 2a Guida</button>
              <button onclick="setTeamHierarchyMode('equal')" class="py-1.5 rounded-lg text-[11px] font-extrabold transition ${team.hierarchy !== '1st_2nd' ? 'bg-sky-600 text-white' : 'text-slate-400'}">Pari Livello</button>
            </div>
            ${team.hierarchy === '1st_2nd' ? `
              <div class="grid grid-cols-2 gap-1.5">
                ${userDrivers.map(ud => `
                  <button onclick="setLeadDriverSelection('${ud.id}')" class="py-1.5 px-2 rounded-xl text-[11px] font-bold border ${ud.role === 'lead' ? 'bg-amber-500/20 border-amber-400 text-amber-200' : 'bg-f1bg border-f1border text-slate-400'}">
                    1a Guida: ${ud.code}
                  </button>
                `).join('')}
              </div>
            ` : ''}
          ` : ''}

          <div class="space-y-2.5">
            ${userDrivers.map(d => {
              const mood = getMoodMeta(d.mood);
              const trait = DRIVER_TRAITS[d.trait] || DRIVER_TRAITS.tactician;
              const fat = d.fatigue ?? 15;
              return `
                <button type="button" onclick="openDriverModal('${d.id}')" class="w-full text-left bg-f1bg hover:bg-slate-800/80 p-3 rounded-xl border border-f1border/70 space-y-1.5 transition">
                  <div class="flex items-center justify-between">
                    <div>
                      <span class="font-mono-num font-extrabold text-xs mr-1" style="color:${team.color}">#${d.number}</span>
                      <span class="text-sm font-extrabold text-white">${d.name}</span>
                      <span class="text-[10px] text-slate-400 ml-1">(${d.age}a · Contr. ${d.contract}a)</span>
                    </div>
                    <div class="text-right font-mono-num">
                      <span class="text-xs font-black text-white">OVR ${d.ovr}</span>
                      <span class="text-[10px] text-sky-300 ml-1">POT ${d.potential ?? d.ovr}</span>
                    </div>
                  </div>
                  <div class="flex flex-wrap items-center justify-between gap-1 text-[10px]">
                    <span class="font-semibold ${mood.color}">${mood.emoji} ${mood.label} (${d.mood ?? 65})</span>
                    <span class="text-slate-300">${trait.icon} ${trait.label}</span>
                    <span class="font-mono-num ${fat >= 60 ? 'text-red-400' : 'text-sky-300'}">Fatica ${fat}% · Scheda ›</span>
                  </div>
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <div class="bg-f1card border border-f1border rounded-2xl p-4 space-y-2.5">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-300">Paddock & Stampa</h3>
            <div class="flex gap-1">
              ${[
                { id: 'all', lbl: 'Tutti' },
                { id: 'fans', lbl: 'Stampa/Sponsor' },
                { id: 'rivalry', lbl: 'Rivalita/Extra' }
              ].map(f => `
                <button onclick="setHubMediaFilter('${f.id}')" class="px-2 py-0.5 rounded text-[10px] font-bold ${mediaFilter === f.id ? 'bg-f1red text-white' : 'bg-f1bg text-slate-400'}">${f.lbl}</button>
              `).join('')}
            </div>
          </div>
          <div class="space-y-1.5 max-h-56 overflow-y-auto no-scrollbar">
            ${filteredMedia.slice(0, 12).map(m => `
              <div class="text-xs text-slate-200 bg-f1bg p-2.5 rounded-xl border border-f1border/50 leading-snug">
                <span class="text-[10px] font-extrabold uppercase text-amber-300 mr-1.5">${m.source} · Y${m.season || 2026}:</span>
                <span>${m.text}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderRndView() {
  const team = getUserTeam();
  const rndSec = gameState.rndSection || 'garage';
  const carTab = gameState.garageCarTab || 1;
  const parts = (gameState.garageParts?.[team.id] || []).filter(p => p.assignedCar === carTab);
  const pendingList = gameState.pendingUpgrades || [];
  const confirmBox = gameState.pendingUpgradeConfirm;

  const capLimit = getBudgetCapLimit();
  const capSpent = getCapSpent();
  const remCap = getRemainingBudgetCap();
  const capPct = Math.min(100, Math.max(0, (capSpent / capLimit) * 100));
  const driverWages = getDriversWageBill(team.id);
  const sponsor = getActiveSponsor();

  const slotNames = { pu: 'Power Unit', chassis: 'Telaio', steer: 'Sterzo / Aero' };

  return `
    <div class="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start pb-6">
      <div class="lg:col-span-5 bg-f1card border border-f1border rounded-2xl p-4 space-y-2.5">
        <div class="flex items-center justify-between">
          <div class="text-xs font-extrabold uppercase tracking-wider text-amber-300">Finanze Scuderia & Budget Cap FIA</div>
          <span class="text-[10px] font-mono-num text-slate-400">${sponsor.name}</span>
        </div>
        <div class="grid grid-cols-3 gap-2 font-mono-num">
          <div class="bg-f1bg p-2 rounded-xl border border-f1border/70">
            <div class="text-[9px] text-slate-400 uppercase">Cassa Liquida</div>
            <div class="text-xs font-extrabold text-emerald-400">€${team.budget.toFixed(1)}M</div>
          </div>
          <div class="bg-f1bg p-2 rounded-xl border border-f1border/70">
            <div class="text-[9px] text-slate-400 uppercase">Speso Cap</div>
            <div class="text-xs font-extrabold text-white">€${capSpent.toFixed(1)}M</div>
          </div>
          <div class="bg-f1bg p-2 rounded-xl border border-f1border/70">
            <div class="text-[9px] text-slate-400 uppercase">Margine Cap</div>
            <div class="text-xs font-extrabold ${remCap < 15 ? 'text-amber-300' : 'text-sky-300'}">€${remCap.toFixed(1)}M</div>
          </div>
        </div>
        <div class="space-y-1">
          <div class="flex justify-between text-[10px] font-mono-num text-slate-400">
            <span>Utilizzo Budget Cap FIA (€${capLimit.toFixed(0)}M)</span>
            <span>${capPct.toFixed(1)}%</span>
          </div>
          <div class="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div class="h-full transition-all ${capPct >= 90 ? 'bg-red-500' : (capPct >= 75 ? 'bg-amber-400' : 'bg-sky-400')}" style="width:${capPct}%"></div>
          </div>
        </div>
        <div class="flex items-center justify-between text-[10px] text-slate-400 font-mono-num pt-0.5">
          <span>Ingaggi: €${driverWages.toFixed(1)}M (fuori Cap)</span>
          <span>FOM fine anno: per pos. Costruttori</span>
        </div>
      </div>

      <div class="lg:col-span-7 space-y-3.5">
        <div class="grid grid-cols-2 gap-1.5 bg-f1card p-1 rounded-2xl border border-f1border">
          <button onclick="setRndSection('garage')" class="py-2 rounded-xl text-xs font-extrabold transition ${rndSec === 'garage' ? 'bg-f1red text-white' : 'text-slate-400'}">🔧 Garage & Auto</button>
          <button onclick="setRndSection('rnd')" class="py-2 rounded-xl text-xs font-extrabold transition ${rndSec === 'rnd' ? 'bg-sky-600 text-white' : 'text-slate-400'}">🧪 Sviluppo R&D</button>
        </div>

        ${rndSec === 'garage' ? (() => {
          const pool = team.carComponentPools?.[carTab] || { puUsed: 1, chassisUsed: 1, gridPenalty: 0 };
          const compConfirm = gameState.pendingComponentConfirm;
          return `
          <div class="bg-f1card border border-f1border rounded-2xl p-4 space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-xs font-extrabold uppercase tracking-wider text-slate-300">Componenti Auto (${team.short})</div>
                <div class="text-[11px] font-mono-num text-slate-400">Aero ${team.aero.toFixed(1)} · PU ${team.pu.toFixed(1)} · Telaio ${team.chassis.toFixed(1)} · Affid. ${team.rel.toFixed(1)}%</div>
              </div>
              <div class="flex gap-1 bg-f1bg p-1 rounded-xl border border-f1border">
                <button onclick="setGarageCarTab(1)" class="px-2.5 py-1 rounded-lg text-xs font-extrabold ${carTab === 1 ? 'bg-f1red text-white' : 'text-slate-400'}">Auto #1</button>
                <button onclick="setGarageCarTab(2)" class="px-2.5 py-1 rounded-lg text-xs font-extrabold ${carTab === 2 ? 'bg-f1red text-white' : 'text-slate-400'}">Auto #2</button>
              </div>
            </div>

            <div class="bg-f1bg p-2.5 rounded-xl border border-f1border/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-num">
              <span class="text-slate-400">Quota FIA Auto #${carTab}:</span>
              <span class="${(pool.puUsed || 1) >= 4 ? 'text-red-400 font-black' : 'text-sky-300 font-bold'}">PU ${pool.puUsed || 1}/4</span>
              <span class="${(pool.chassisUsed || 1) >= 4 ? 'text-red-400 font-black' : 'text-sky-300 font-bold'}">Cambio ${pool.chassisUsed || 1}/4</span>
              ${(pool.gridPenalty || 0) > 0
                ? `<span class="text-red-400 font-black">⚖️ Penalità Griglia: +${pool.gridPenalty} pos.</span>`
                : `<span class="text-emerald-400 font-bold">0 penalità</span>`}
            </div>

            ${compConfirm ? `
              <div class="bg-red-950/55 border-2 border-red-400 rounded-2xl p-3.5 space-y-2.5">
                <div class="text-xs font-black uppercase tracking-wider text-red-300">⚠️ Avviso Penalità Griglia FIA</div>
                <div class="text-xs text-white font-bold leading-snug">
                  Auto #${compConfirm.carNum} ha già usato ${compConfirm.limit}/${compConfirm.limit} unità stagionali. Montare la ${compConfirm.nextUnitNum}ª ${compConfirm.label} comporta <span class="text-red-300">+${compConfirm.penalty} posizioni di penalità</span> sulla griglia del prossimo GP!
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <button onclick="cancelReplaceCarComponent()" class="py-2 rounded-xl bg-slate-800 text-xs font-extrabold text-slate-200">Annulla</button>
                  <button onclick="confirmReplaceCarComponent()" class="py-2 rounded-xl bg-f1red hover:bg-red-600 text-xs font-extrabold text-white">Conferma (+${compConfirm.penalty} Pos.)</button>
                </div>
              </div>
            ` : ''}

            <div class="space-y-2">
              ${parts.map(p => {
                const wearVal = Math.round(p.wear || 0);
                const wearColor = wearVal >= 70 ? 'text-red-400 font-black' : (wearVal >= 45 ? 'text-amber-300 font-bold' : 'text-emerald-400');
                const isRegulated = p.slot === 'pu' || p.slot === 'chassis';
                const usedCnt = p.slot === 'pu' ? (pool.puUsed || 1) : (pool.chassisUsed || 1);
                const penAmt = p.slot === 'pu' ? 10 : 5;
                const willPenalize = usedCnt >= 4;
                return `
                  <div class="bg-f1bg p-3 rounded-xl border ${wearVal >= 70 ? 'border-red-500/60' : 'border-f1border/70'} space-y-2">
                    <div class="flex items-center justify-between gap-2">
                      <div>
                        <div class="text-xs font-extrabold text-white">${p.name}</div>
                        <div class="text-[10px] text-slate-400 font-mono-num">
                          ${slotNames[p.slot] || p.slot} · Perf ${p.perf} · Affid. ${p.rel}%
                          ${isRegulated ? ` · <span class="${wearColor}">Usura ${wearVal}%</span>` : ''}
                        </div>
                      </div>
                      <div class="flex items-center gap-1.5 shrink-0">
                        <button onclick="boostSinglePart('${p.id}')" class="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-f1border text-[10px] font-extrabold text-amber-300">
                          Affina (€2M)
                        </button>
                        ${isRegulated ? `
                          <button onclick="requestReplaceCarComponent(${carTab}, '${p.slot}')" class="px-2 py-1.5 rounded-lg text-[10px] font-extrabold border ${willPenalize ? 'bg-red-950/70 hover:bg-red-900 border-red-500/60 text-red-200' : 'bg-emerald-900/60 hover:bg-emerald-800 border-emerald-500/50 text-emerald-200'}">
                            ${willPenalize ? `Sostituisci (+${penAmt}P)` : `Nuova (${usedCnt}/4)`}
                          </button>
                        ` : ''}
                      </div>
                    </div>
                    ${isRegulated ? `
                      <div class="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div class="h-full transition-all ${wearVal >= 70 ? 'bg-red-500' : (wearVal >= 45 ? 'bg-amber-400' : 'bg-emerald-400')}" style="width:${wearVal}%"></div>
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>

            <div class="pt-1 border-t border-f1border/60 space-y-1.5">
              <div class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Aggiorna Specifica per Auto #${carTab} (€6.5M · nel Cap)</div>
              <div class="grid grid-cols-3 gap-1.5">
                <button onclick="buildNewGaragePart('pu')" class="py-2 px-2 rounded-xl bg-f1bg hover:bg-slate-800 border border-f1border text-[10px] font-extrabold text-white">+ Power Unit</button>
                <button onclick="buildNewGaragePart('chassis')" class="py-2 px-2 rounded-xl bg-f1bg hover:bg-slate-800 border border-f1border text-[10px] font-extrabold text-white">+ Cambio/Telaio</button>
                <button onclick="buildNewGaragePart('steer')" class="py-2 px-2 rounded-xl bg-f1bg hover:bg-slate-800 border border-f1border text-[10px] font-extrabold text-white">+ Sterzo/Aero</button>
              </div>
            </div>
          </div>
          `;
        })() : `
          ${confirmBox ? `
            <div class="bg-amber-950/50 border-2 border-amber-400 rounded-2xl p-4 space-y-3">
              <div class="text-xs font-black uppercase tracking-wider text-amber-300">Conferma Avvio Sviluppo</div>
              <div class="text-sm font-extrabold text-white">${confirmBox.areaLabel} — Pacchetto ${confirmBox.tierLabel} (+${confirmBox.gain})</div>
              <div class="text-xs text-slate-200 font-mono-num">Costo: €${confirmBox.cost.toFixed(1)}M (nel Budget Cap) · Tempo: ${confirmBox.days} giorni</div>
              <div class="grid grid-cols-2 gap-2">
                <button onclick="cancelUpgradeConfirm()" class="py-2 rounded-xl bg-slate-800 text-xs font-extrabold text-slate-200">Annulla</button>
                <button onclick="confirmAndBuyUpgrade()" class="py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-extrabold text-white">Conferma e Paga</button>
              </div>
            </div>
          ` : ''}

          ${pendingList.length > 0 ? `
            <div class="bg-f1card border border-f1border rounded-2xl p-4 space-y-2">
              <div class="text-xs font-extrabold uppercase tracking-wider text-sky-300">Lavori in Corso in Fabbrica</div>
              ${pendingList.map(u => `
                <div class="bg-f1bg p-2.5 rounded-xl border border-f1border/70 flex items-center justify-between gap-2">
                  <div>
                    <div class="text-xs font-extrabold text-white uppercase">${u.area} (+${u.gain})</div>
                    <div class="text-[10px] text-slate-400 font-mono-num">Completamento tra ${u.daysLeft} gg · Costo €${Number(u.cost || 4.5).toFixed(1)}M</div>
                  </div>
                  <button onclick="cancelPendingUpgradeWithRefund('${u.id}')" class="px-2.5 py-1.5 rounded-lg bg-red-950/70 hover:bg-red-900 border border-red-500/40 text-[10px] font-extrabold text-red-200">
                    Annulla (-20%)
                  </button>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <div class="space-y-2.5">
            ${[
              { key: 'aero', title: 'Aerodinamica', val: team.aero },
              { key: 'pu', title: 'Power Unit', val: team.pu },
              { key: 'chassis', title: 'Telaio', val: team.chassis }
            ].map(areaObj => `
              <div class="bg-f1card border border-f1border rounded-2xl p-3.5 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-extrabold text-white">${areaObj.title}</span>
                  <span class="text-xs font-mono-num font-black text-sky-300">Attuale: ${Number(areaObj.val).toFixed(1)}</span>
                </div>
                <div class="grid grid-cols-3 gap-1.5">
                  ${Object.values(RND_TIERS).map(t => `
                    <button onclick="requestUpgradeConfirm('${areaObj.key}', '${t.id}')" class="p-2 rounded-xl bg-f1bg hover:bg-slate-800 border border-f1border text-left">
                      <div class="text-[11px] font-extrabold text-white">${t.label} (+${t.gain})</div>
                      <div class="text-[10px] font-mono-num text-amber-300">€${t.cost.toFixed(1)}M · ${t.days}gg</div>
                    </button>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    </div>
  `;
}

function renderMarketView() {
  ensureMarketAndAiDefaults();
  const team = getUserTeam();
  const uDrivers = getUserDrivers();
  const freeAgents = [...(gameState.freeAgents || [])].sort((a, b) => b.ovr - a.ovr);
  const currentWages = getDriversWageBill(team.id);
  const replaceSeat = Math.min(Math.max(0, gameState.marketReplaceSeat ?? 1), Math.max(0, uDrivers.length - 1));
  const activeSec = gameState.marketTabSection || 'grid';
  const marketHistory = gameState.marketHistory || [];

  const aiTeams = [...gameState.teams]
    .filter(t => t.id !== gameState.userTeamId)
    .sort((a, b) => ((b.aero + b.pu + b.chassis) / 3) - ((a.aero + a.pu + a.chassis) / 3));

  return `
    <div class="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start pb-6">
      <div class="lg:col-span-5 space-y-3.5">
        <div class="bg-f1card border border-f1border rounded-2xl p-4 space-y-2">
          <span class="text-[10px] font-bold uppercase tracking-wider text-sky-300">Mercato Piloti F1 & Contratti (Fuori Cap)</span>
          <h2 class="text-lg font-extrabold text-white">Line-up, Scadenze & Silly Season</h2>
          <div class="text-[11px] font-mono-num text-slate-400">Cassa: €${team.budget.toFixed(1)}M · Monte ingaggi: €${currentWages.toFixed(1)}M/anno</div>
        </div>

        <div class="bg-f1card border border-f1border rounded-2xl p-4 space-y-2.5">
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-xs font-extrabold uppercase tracking-wider text-amber-300">Piloti Sotto Contratto (${team.name})</h3>
            <span class="text-[10px] text-slate-400">Sedile da sostituire</span>
          </div>
          ${uDrivers.map((d, idx) => {
            const fee = (d.salary * 0.4).toFixed(1);
            const isTargetSeat = replaceSeat === idx;
            const isExp = (d.contract || 1) <= 1;
            return `
              <div class="bg-f1bg p-3 rounded-xl border ${isTargetSeat ? 'border-f1red/70' : 'border-f1border/70'} space-y-2">
                <div class="flex items-center justify-between gap-2">
                  <button type="button" onclick="openDriverModal('${d.id}')" class="text-left min-w-0">
                    <div class="text-xs font-extrabold text-white hover:text-sky-300 transition">
                      ${d.name} <span class="text-sky-300 font-mono-num">OVR ${d.ovr}</span>
                      ${isExp ? '<span class="ml-1 text-amber-300 text-[10px] font-extrabold">· IN SCADENZA</span>' : ''}
                    </div>
                    <div class="text-[10px] text-slate-400 font-mono-num">${d.age}a · Scadenza: ${d.contract}a · €${d.salary.toFixed(1)}M/a · Scheda ›</div>
                  </button>
                  <button onclick="renewDriverContract('${d.id}')" class="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-[10px] font-extrabold text-white shrink-0">
                    Rinnova +2a (€${fee}M)
                  </button>
                </div>
                ${uDrivers.length >= 2 ? `
                  <button onclick="setMarketReplaceSeat(${idx})" class="w-full py-1.5 rounded-lg text-[10px] font-bold border ${isTargetSeat ? 'bg-f1red/20 border-f1red text-red-200' : 'bg-f1card border-f1border text-slate-400'}">
                    ${isTargetSeat ? '✓ Sedile selezionato per sostituzione' : 'Seleziona sedile per sostituzione'}
                  </button>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="lg:col-span-7 space-y-3.5">
        <div class="grid grid-cols-3 gap-1.5 bg-f1card p-1 rounded-2xl border border-f1border">
          <button onclick="setMarketTabSection('grid')" class="py-2 rounded-xl text-[11px] font-extrabold transition ${activeSec === 'grid' ? 'bg-f1red text-white' : 'text-slate-400'}">🏎️ Scuderie IA</button>
          <button onclick="setMarketTabSection('free')" class="py-2 rounded-xl text-[11px] font-extrabold transition ${activeSec === 'free' ? 'bg-emerald-600 text-white' : 'text-slate-400'}">🆕 Svincolati (${freeAgents.length})</button>
          <button onclick="setMarketTabSection('moves')" class="py-2 rounded-xl text-[11px] font-extrabold transition ${activeSec === 'moves' ? 'bg-sky-600 text-white' : 'text-slate-400'}">📰 Movimenti (${marketHistory.length})</button>
        </div>

        ${activeSec === 'grid' ? `
          <div class="space-y-2.5">
            <div class="text-[11px] text-slate-400 px-1">Tocca un pilota per i dettagli. Puoi fare un'offerta ai piloti IA in scadenza (≤1 anno) o scontenti.</div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              ${aiTeams.map(tm => {
                const tmDrivers = gameState.drivers.filter(d => d.teamId === tm.id).sort((a, b) => b.ovr - a.ovr);
                const carAvg = ((tm.aero + tm.pu + tm.chassis) / 3).toFixed(1);
                return `
                  <div class="bg-f1card border border-f1border rounded-2xl p-3.5 space-y-2">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="w-2.5 h-5 rounded-full shrink-0" style="background:${tm.color}"></span>
                        <span class="text-xs font-extrabold text-white truncate">${tm.name}</span>
                      </div>
                      <span class="text-[10px] font-mono-num text-sky-300 font-bold shrink-0">Auto ${carAvg} · €${tm.budget.toFixed(0)}M</span>
                    </div>
                    <div class="space-y-1.5">
                      ${tmDrivers.map(d => {
                        const isExpiring = (d.contract || 1) <= 1;
                        const isUnhappy = !!d.transferRequest || (d.mood ?? 65) < 48;
                        const canOffer = isExpiring || isUnhappy;
                        const buyout = isExpiring ? 0 : Number((d.salary * 0.35).toFixed(1));
                        const totalCost = (d.salary * 0.5 + buyout).toFixed(1);
                        return `
                          <div class="bg-f1bg p-2.5 rounded-xl border border-f1border/70 flex items-center justify-between gap-2">
                            <button type="button" onclick="openDriverModal('${d.id}')" class="text-left min-w-0 flex-1">
                              <div class="text-xs font-extrabold text-white hover:text-sky-300 truncate">
                                ${d.name} <span class="text-sky-300 font-mono-num">OVR ${d.ovr}</span>
                                ${isExpiring ? '<span class="ml-1 text-amber-300 text-[9px]">· SCAD.</span>' : ''}
                                ${isUnhappy ? '<span class="ml-1 text-red-300 text-[9px]">· SCONT.</span>' : ''}
                              </div>
                              <div class="text-[10px] text-slate-400 font-mono-num">${d.age}a · Contr. ${d.contract}a · €${d.salary.toFixed(1)}M/a</div>
                            </button>
                            ${canOffer ? `
                              <button onclick="attemptPoachDriver('${d.id}')" class="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black shrink-0">
                                Offri (€${totalCost}M)
                              </button>
                            ` : `
                              <span class="text-slate-500 text-[10px] font-bold shrink-0">Blindato</span>
                            `}
                          </div>
                        `;
                      }).join('')}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

        ${activeSec === 'free' ? `
          <div class="bg-f1card border border-f1border rounded-2xl p-4 space-y-2.5">
            <h3 class="text-xs font-extrabold uppercase tracking-wider text-emerald-400">Piloti Svincolati & Giovani Academy</h3>
            ${freeAgents.length === 0 ? '<div class="text-xs text-slate-400">Nessuno svincolato disponibile al momento.</div>' : freeAgents.map(fa => {
              const bonus = (fa.salary * 0.5).toFixed(1);
              const trait = DRIVER_TRAITS[fa.trait] || DRIVER_TRAITS.tactician;
              return `
                <div class="bg-f1bg p-3 rounded-xl border border-f1border/70 flex items-center justify-between gap-2">
                  <button type="button" onclick="openDriverModal('${fa.id}')" class="text-left min-w-0 flex-1">
                    <div class="text-xs font-extrabold text-white hover:text-sky-300">${fa.name} <span class="text-sky-300 font-mono-num">OVR ${fa.ovr}</span> <span class="text-[10px] font-mono-num text-emerald-300">POT ${fa.potential ?? fa.ovr}</span></div>
                    <div class="text-[10px] text-slate-400 font-mono-num">${fa.age}a · ${trait.icon} ${trait.label} · €${fa.salary.toFixed(1)}M/a · Firma €${bonus}M</div>
                  </button>
                  <button onclick="signFreeAgent('${fa.id}')" class="px-3 py-1.5 rounded-lg bg-f1red hover:bg-red-600 text-[10px] font-extrabold text-white shrink-0">
                    Ingaggia
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}

        ${activeSec === 'moves' ? `
          <div class="bg-f1card border border-f1border rounded-2xl p-4 space-y-2">
            <h3 class="text-xs font-extrabold uppercase tracking-wider text-sky-300">Movimenti & Rumors Mercato F1</h3>
            ${marketHistory.length === 0 ? `
              <div class="text-xs text-slate-400">Ancora nessun movimento ufficiale. La Silly Season entra nel vivo dalla seconda metà di stagione e a fine anno!</div>
            ` : marketHistory.map(m => `
              <div class="bg-f1bg p-2.5 rounded-xl border border-f1border/60 text-xs text-slate-200 leading-snug">
                <span class="text-[10px] font-extrabold uppercase text-amber-300 mr-1.5">${m.type} · ${m.season} R${m.round}:</span>
                <span>${m.text}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function renderStandingsView() {
  ensureMarketAndAiDefaults();
  const sortedDrivers = [...gameState.drivers].filter(d => d.teamId).sort((a, b) => (b.points || 0) - (a.points || 0) || (b.wins || 0) - (a.wins || 0) || b.ovr - a.ovr);
  const sortedTeams = [...gameState.teams].sort((a, b) => (b.points || 0) - (a.points || 0) || (b.wins || 0) - (a.wins || 0));
  const hof = gameState.hallOfFame || [];

  return `
    <div class="p-4 space-y-4 pb-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <div class="bg-f1card border border-f1border rounded-2xl p-4 space-y-2">
          <h2 class="text-sm font-black uppercase tracking-wider text-amber-300">Classifica Costruttori ${gameState.season}</h2>
          ${sortedTeams.map((t, idx) => {
            const prize = FOM_PRIZE_POOL[idx] || 60.0;
            const carAvg = ((t.aero + t.pu + t.chassis) / 3).toFixed(1);
            return `
              <div class="flex items-center justify-between bg-f1bg px-3 py-2 rounded-xl border ${t.id === gameState.userTeamId ? 'border-f1red' : 'border-f1border/60'} text-xs">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="font-mono-num font-black text-slate-400 w-5 shrink-0">${idx + 1}.</span>
                  <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${t.color}"></span>
                  <span class="font-extrabold text-white truncate">${t.name}</span>
                  <span class="text-[10px] font-mono-num text-sky-300 shrink-0">Auto ${carAvg}</span>
                </div>
                <div class="text-right font-mono-num shrink-0">
                  <span class="font-black text-white">${t.points || 0} pt</span>
                  <span class="text-[10px] text-emerald-400 ml-2">FOM €${prize.toFixed(0)}M</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="bg-f1card border border-f1border rounded-2xl p-4 space-y-2">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-black uppercase tracking-wider text-sky-300">Classifica Piloti ${gameState.season}</h2>
            <span class="text-[10px] text-slate-400">Tocca per dettagli</span>
          </div>
          ${sortedDrivers.map((d, idx) => {
            const tm = getTeam(d.teamId);
            return `
              <button type="button" onclick="openDriverModal('${d.id}')" class="w-full flex items-center justify-between bg-f1bg hover:bg-slate-800/80 px-3 py-2 rounded-xl border ${d.teamId === gameState.userTeamId ? 'border-f1red/70' : 'border-f1border/60'} text-xs text-left transition">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="font-mono-num font-black text-slate-400 w-5 shrink-0">${idx + 1}.</span>
                  <span class="font-extrabold text-white truncate">${d.name}</span>
                  <span class="text-[10px] shrink-0" style="color:${tm.color}">${tm.short}</span>
                </div>
                <span class="font-mono-num font-black text-amber-300 shrink-0">${d.points || 0} pt</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <div class="bg-f1card border border-f1border rounded-2xl p-4 space-y-2.5">
        <h2 class="text-sm font-black uppercase tracking-wider text-emerald-300">Albo d'Oro Carriera (2026–${gameState.maxSeasons})</h2>
        ${hof.length === 0 ? `
          <div class="text-xs text-slate-400">Nessuna stagione completata finora. I campioni del mondo appariranno qui al termine del 24° GP.</div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            ${hof.map(entry => `
              <div class="bg-f1bg p-3 rounded-xl border border-f1border/70 space-y-1 text-xs">
                <div class="flex items-center justify-between">
                  <span class="font-mono-num font-black text-amber-300">Stagione ${entry.season}</span>
                  <span class="font-mono-num text-[11px] text-slate-400">Tu: P${entry.userPos} (${entry.userPts} pt)</span>
                </div>
                <div class="text-white font-bold">🏆 Pilota: ${entry.championDriver} (${entry.championDriverTeam}) · <span class="font-mono-num text-sky-300">${entry.championDriverPts} pt</span></div>
                <div class="text-slate-300">🏎️ Costruttori: ${entry.championTeam} · <span class="font-mono-num text-emerald-300">${entry.championTeamPts} pt</span></div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    </div>
  `;
}

// =========================================================
// SVG PISTA CON PUNTINI FLUIDI E CORSIA BOX
// =========================================================
function renderLiveTrackMapSvg(track, dots) {
  const pathPoints = getCachedTrackPoints(track.round, track.path);
  const pitStartX = 82;
  const pitEndX = 148;
  const pitY = 144;

  const renderedDots = dots.map(d => {
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
    const r = d.isUser ? 5.2 : 3.6;
    const stroke = d.isUser ? '#ffffff' : '#0b0e14';
    const sw = d.isUser ? 1.6 : 1.0;
    return `
      <g>
        <circle id="track-dot-${d.code}" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r}" fill="${d.color}" stroke="${stroke}" stroke-width="${sw}" />
        ${d.isUser ? `<text id="track-label-${d.code}" x="${(cx + 6).toFixed(1)}" y="${(cy + 3).toFixed(1)}" fill="#ffffff" font-size="8" font-weight="800" font-family="JetBrains Mono, monospace">${d.code}</text>` : ''}
      </g>
    `;
  }).join('');

  return `
    <svg viewBox="0 0 300 162" class="w-full h-28 sm:h-36 lg:h-48 bg-f1bg rounded-xl border border-f1border/70 p-1">
      <path d="${track.path}" fill="none" stroke="#1e293b" stroke-width="10" stroke-linejoin="round" />
      <path d="${track.path}" fill="none" stroke="#475569" stroke-width="2" stroke-linejoin="round" stroke-dasharray="6 4" />
      <line x1="${pitStartX}" y1="130" x2="${pitStartX}" y2="${pitY}" stroke="#64748b" stroke-width="2" />
      <line x1="${pitStartX}" y1="${pitY}" x2="${pitEndX}" y2="${pitY}" stroke="#94a3b8" stroke-width="3" stroke-linecap="round" />
      <line x1="${pitEndX}" y1="${pitY}" x2="${pitEndX}" y2="130" stroke="#64748b" stroke-width="2" />
      <text x="115" y="156" text-anchor="middle" fill="#64748b" font-size="7" font-weight="700">PIT LANE</text>
      <line x1="150" y1="122" x2="150" y2="138" stroke="#e10600" stroke-width="2.5" />
      ${renderedDots}
    </svg>
  `;
}

const __trackSampleCache = {};
function getCachedTrackPoints(roundKey, pathD) {
  if (__trackSampleCache[roundKey]) return __trackSampleCache[roundKey];
  try {
    const svgNS = 'http://www.w3.org/2000/svg';
    const tempSvg = document.createElementNS(svgNS, 'svg');
    const tempPath = document.createElementNS(svgNS, 'path');
    tempPath.setAttribute('d', pathD);
    tempSvg.appendChild(tempPath);
    const totalLen = tempPath.getTotalLength();
    const samples = [];
    const steps = 160;
    for (let i = 0; i < steps; i++) {
      const pt = tempPath.getPointAtLength((i / steps) * totalLen);
      samples.push({ x: pt.x, y: pt.y });
    }
    __trackSampleCache[roundKey] = samples;
    return samples;
  } catch (e) {
    return [];
  }
}

// =========================================================
// PROVE LIBERE (FEEDBACK DA ENTRAMBI I PILOTI OGNI RUN)
// =========================================================
function renderFpPhase(w, track, uDrivers) {
  const slot = w.fp.activeSlot || 'd1';
  const setup = w.fp[slot] || w.fp.d1;
  const maxSessions = w.hasSprint ? 1 : 3;
  const sliders = [
    { key: 'wing', label: 'Ala / Carico Aero' },
    { key: 'susp', label: 'Sospensioni' },
    { key: 'brake', label: 'Bilanciamento Freni' },
    { key: 'ride', label: 'Altezza da Terra' },
    { key: 'diff', label: 'Differenziale' }
  ];

  const tel = typeof getFpTelemetryPreview === 'function'
    ? getFpTelemetryPreview(w, slot)
    : { setupDeltaSec: 0, qualiDeltaSec: 0, raceDeltaSec: 0, tyreWearRedPct: 0 };

  return `
    <div class="bg-f1card border border-f1border rounded-2xl p-4 space-y-3">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-xs font-extrabold uppercase tracking-wider text-sky-300">Prove Libere FP${w.fp.session}/${maxSessions}</div>
          <div class="text-[11px] font-mono-num text-slate-400">Run rimasti: ${w.fp.runsLeftInSession} (girano entrambi i piloti)</div>
        </div>
        <div class="flex gap-1 bg-f1bg p-1 rounded-xl border border-f1border">
          ${uDrivers.map((ud, i) => {
            const k = i === 0 ? 'd1' : 'd2';
            const conf = w.fp[k]?.confidence ?? 35;
            return `<button onclick="setFpActiveSlot('${k}')" class="px-2.5 py-1 rounded-lg text-xs font-extrabold ${slot === k ? 'bg-f1red text-white' : 'text-slate-400'}">${ud.code} (${conf}%)</button>`;
          }).join('')}
        </div>
      </div>

      <div class="bg-f1bg p-2.5 rounded-xl border border-f1border/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-num">
        <span class="text-slate-400">Telemetria sbloccata:</span>
        <span class="${tel.setupDeltaSec <= 0 ? 'text-emerald-400' : 'text-amber-300'} font-bold">Setup ${tel.setupDeltaSec >= 0 ? '+' : ''}${tel.setupDeltaSec.toFixed(2)}s</span>
        <span class="text-sky-300 font-bold">Quali ${tel.qualiDeltaSec.toFixed(2)}s</span>
        <span class="text-sky-300 font-bold">Passo ${tel.raceDeltaSec.toFixed(2)}s</span>
        <span class="${tel.tyreDegDeltaPct <= 0 ? 'text-emerald-300' : 'text-amber-300'} font-bold">Gomme ${tel.tyreDegDeltaPct > 0 ? '+' : ''}${tel.tyreDegDeltaPct}% usura</span>
      </div>

      <div class="bg-f1bg p-2.5 rounded-xl border border-f1border/80 space-y-2">
        <div class="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
          <span>Programma Prove (${uDrivers[slot === 'd1' ? 0 : 1]?.code || 'Pilota'})</span>
          <span class="text-slate-400">Effetto su Qualifica/Gara</span>
        </div>
        <div class="grid grid-cols-3 gap-1.5">
          ${[
            { id: 'quali', icon: '⏱️', label: 'Giro Secco', desc: 'Bonus Qualifica' },
            { id: 'race', icon: '🏁', label: 'Passo Gara', desc: 'Ritmo Domenica' },
            { id: 'tyre', icon: '🛞', label: 'Gest. Gomme', desc: '-Usura in Gara' }
          ].map(pr => {
            const pct = setup?.programs?.[pr.id] ?? 0;
            const isSel = (setup?.plan || 'race') === pr.id;
            return `
              <button onclick="setFpProgram('${slot}', '${pr.id}')" class="p-2 rounded-xl border text-left transition ${isSel ? 'bg-sky-950/60 border-sky-400 text-white' : 'bg-f1card border-f1border text-slate-400'}">
                <div class="text-[11px] font-extrabold">${pr.icon} ${pr.label}</div>
                <div class="text-[9px] text-slate-400">${pr.desc}</div>
                <div class="mt-1.5 w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div class="h-full bg-emerald-400" style="width:${pct}%"></div>
                </div>
                <div class="text-[9px] font-mono-num text-emerald-300 font-bold mt-0.5">${pct}%</div>
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        ${uDrivers.map((ud, i) => {
          const k = i === 0 ? 'd1' : 'd2';
          const st = w.fp[k];
          return `
            <div class="text-[11px] bg-f1bg px-2.5 py-2 rounded-xl border ${slot === k ? 'border-sky-500/60' : 'border-f1border/70'} text-slate-200 flex items-center justify-between gap-2">
              <span>${st?.feedback || ''}</span>
              <span class="font-mono-num font-black text-emerald-400 shrink-0">${st?.confidence ?? 35}%</span>
            </div>
          `;
        }).join('')}
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5">
        ${sliders.map(sl => `
          <div class="space-y-1">
            <div class="flex justify-between text-xs font-mono-num">
              <span class="text-slate-300">${sl.label}</span>
              <span class="font-extrabold text-white">${setup?.[sl.key] ?? 5}/10</span>
            </div>
            <input type="range" min="1" max="10" step="1" value="${setup?.[sl.key] ?? 5}" oninput="updateFpSlider('${sl.key}', this.value)" class="w-full" />
          </div>
        `).join('')}
      </div>

      <div class="grid grid-cols-2 gap-2 pt-1">
        <button onclick="runFpStint()" class="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-extrabold text-xs text-white">
          ▶ Run Entrambi (${w.fp.runsLeftInSession})
        </button>
        <button onclick="advanceFpSession()" class="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-f1border font-extrabold text-xs text-white">
          ${w.fp.session < maxSessions ? `Avanti a FP${w.fp.session + 1} →` : (w.hasSprint ? 'Qualifiche Sprint →' : 'Vai alle Qualifiche →')}
        </button>
      </div>
    </div>
  `;
}

// =========================================================
// QUALIFICHE Q1/Q2/Q3 E QUALIFICHE SPRINT SQ1/SQ2/SQ3 LIVE
// =========================================================
function renderLiveQualiPhase(w, track, isSprint = false) {
  const q = isSprint ? w.sprintQuali : w.quali;
  const stages = isSprint ? SPRINT_QUALI_STAGES : QUALI_STAGES;
  if (!q) return '';
  const mins = Math.floor(q.timeLeftSec / 60);
  const secs = Math.floor(q.timeLeftSec % 60);
  const clockStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const stageObj = stages[q.stageIndex] || stages[0];
  const activeDrivers = getSortedQualiActive(q);
  const userParticipants = q.participants.filter(p => p.isUser);
  const hasCutoff = q.stageIndex < stages.length - 1;
  const cutoffLap = hasCutoff ? activeDrivers[stageObj.advanceCount - 1]?.bestLapSec : null;
  const bubbleOutLap = hasCutoff ? activeDrivers[stageObj.advanceCount]?.bestLapSec : null;

  const grip = Math.round(q.trackGrip ?? (q.isWet ? 45 : 65));
  const gripPenaltySec = (((100 - grip) / 100) * 1.45).toFixed(2);
  const gripStatusLabel = grip >= 88 ? 'Gommata (Grip Max)' : (grip >= 68 ? 'In miglioramento' : 'Pista Verde (+Rischio)');
  const gripColor = grip >= 88 ? 'text-emerald-400' : (grip >= 68 ? 'text-amber-300' : 'text-red-400');

  const dots = activeDrivers.map(p => ({
    code: p.code,
    color: p.teamColor,
    isUser: p.isUser,
    inPit: p.status === 'pit',
    pitProgress: p.pitProgress,
    trackProgress: p.trackProgress
  }));

  const mobileTab = w.liveMobileTab === 'timing' ? 'timing' : 'pitwall';
  const leaderQuali = activeDrivers[0];

  return `
    <div class="lg:hidden bg-f1card border border-f1border rounded-2xl p-2 space-y-2 mb-3">
      <div class="grid grid-cols-2 gap-1 bg-f1bg p-1 rounded-xl">
        <button type="button" onclick="setLiveMobileTab('pitwall')" class="min-h-[40px] py-1.5 px-2 rounded-lg text-xs font-extrabold whitespace-nowrap transition ${mobileTab === 'pitwall' ? 'bg-f1red text-white' : 'text-slate-400 hover:text-white'}">
          🏎️ Muretto Box
        </button>
        <button type="button" onclick="setLiveMobileTab('timing')" class="min-h-[40px] py-1.5 px-2 rounded-lg text-xs font-extrabold whitespace-nowrap transition ${mobileTab === 'timing' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'}">
          📊 Classifica (${activeDrivers.length})
        </button>
      </div>
      <div class="flex items-center justify-between gap-2 px-1 text-[11px] font-mono-num">
        <span class="text-slate-300 font-bold truncate">${q.stageLabel} · P1 ${leaderQuali ? `${leaderQuali.code} ${formatLapTime(leaderQuali.bestLapSec)}` : '-'}</span>
        <div class="flex items-center gap-2.5 shrink-0">
          ${userParticipants.map(up => {
            const pIdx = activeDrivers.findIndex(x => x.driverId === up.driverId);
            const pPos = pIdx >= 0 ? pIdx + 1 : (up.finalGridPos || '-');
            const pCls = up.eliminatedIn ? 'text-slate-400' : (typeof pPos === 'number' && pPos <= stageObj.advanceCount ? 'text-emerald-300' : 'text-red-300');
            return `<span class="inline-flex items-center gap-1 font-extrabold ${pCls}">P${pPos} ${up.code} ${!up.eliminatedIn ? getTyreBadgeHtml(up.tyre, 'xs') : ''}</span>`;
          }).join('<span class="text-slate-600">·</span>')}
        </div>
      </div>
      ${q.stageFinished && mobileTab === 'timing' ? `
        <button type="button" onclick="advanceToNextQualiStage()" class="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-black text-xs text-white">
          ${q.allFinished
            ? (q.isSprint ? 'PROSEGUI A SABATO (PRE-SPRINT) →' : 'VAI ALLA STRATEGIA PRE-GARA →')
            : `PROSEGUI A ${stages[q.stageIndex + 1]?.label} →`}
        </button>
      ` : ''}
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
      <div class="lg:col-span-7 space-y-3 ${mobileTab === 'pitwall' ? 'block' : 'hidden lg:block'}">
        <div class="bg-f1card border border-f1border rounded-2xl p-3.5 space-y-2.5">
          <div class="flex items-center justify-between">
            <div>
              <span class="text-xs font-black uppercase tracking-wider ${q.isSprint ? 'text-amber-300' : 'text-f1red'}">${q.isSprint ? `⚡ ${q.stageLabel}` : q.stageLabel}</span>
              <span class="text-xs font-extrabold text-white ml-1.5">· ${q.isWet ? '🌧️ Bagnato' : '☀️ Asciutto'}</span>
              ${q.isSprint && !q.isWet && stageObj.mandatoryDryTyre ? `<span class="ml-1.5 inline-flex items-center gap-1 text-[10px] font-mono-num text-amber-300 font-bold">· Gomma Obbl. ${getTyreBadgeHtml(stageObj.mandatoryDryTyre, 'xs')}</span>` : ''}
            </div>
            <div id="quali-clock" class="font-mono-num text-base font-black text-amber-300">⏱️ ${clockStr}</div>
          </div>

          <div class="bg-f1bg p-2.5 rounded-xl border border-f1border/80 space-y-1">
            <div class="flex items-center justify-between text-[11px] font-mono-num">
              <span class="text-slate-400">🛣️ Aderenza: <strong id="quali-grip-val" class="${gripColor}">${grip}%</strong> (${gripStatusLabel})</span>
              <span class="text-slate-300">Impatto: <strong id="quali-grip-impact">+${gripPenaltySec}s</strong></span>
            </div>
            <div class="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div id="quali-grip-bar" class="h-full transition-all ${grip >= 88 ? 'bg-emerald-400' : (grip >= 68 ? 'bg-amber-400' : 'bg-red-400')}" style="width:${grip}%"></div>
            </div>
          </div>

          ${renderLiveTrackMapSvg(track, dots)}

          <div class="flex items-center justify-between gap-1">
            <div class="flex gap-1">
              ${[
                { s: 0, l: '⏸' },
                { s: 1, l: 'x1' },
                { s: 2, l: 'x2' },
                { s: 4, l: 'x4' },
                { s: 8, l: 'x8' }
              ].map(btn => {
                const isAct = (btn.s === 0 && q.paused) || (!q.paused && q.speed === btn.s);
                return `<button onclick="setQualiSpeed(${btn.s})" class="px-2.5 py-1.5 rounded-lg text-[11px] font-mono-num font-extrabold ${isAct ? 'bg-f1red text-white' : 'bg-f1bg text-slate-300 border border-f1border'}">${btn.l}</button>`;
              }).join('')}
            </div>
            ${!q.stageFinished ? `
              <button onclick="skipToEndOfCurrentQualiStage()" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-f1border text-[10px] font-extrabold text-slate-200">
                Fine ${q.stageLabel} ⏭
              </button>
            ` : ''}
          </div>

          <button type="button" onclick="toggleLiveEventsLog()" class="w-full text-left text-[11px] bg-f1bg hover:bg-slate-800/70 px-2.5 py-1.5 rounded-xl border border-f1border/70 text-slate-300 transition">
            <div class="flex items-center justify-between gap-2">
              <span class="truncate">${q.events[0] || ''}</span>
              <span class="text-[10px] font-bold text-sky-300 shrink-0">${q.eventsExpanded ? '▲ Chiudi' : `▼ Log (${q.events.length})`}</span>
            </div>
            ${q.eventsExpanded ? `
              <div class="mt-2 pt-2 border-t border-f1border/60 space-y-1 max-h-36 overflow-y-auto no-scrollbar">
                ${q.events.slice(1, 9).map(ev => `<div class="text-[10px] text-slate-400">${ev}</div>`).join('')}
              </div>
            ` : ''}
          </button>
        </div>

        ${q.stageFinished ? `
          <button onclick="advanceToNextQualiStage()" class="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-black text-xs text-white shadow-lg">
            ${q.allFinished
              ? (q.isSprint ? 'PROSEGUI A SABATO (PRE-SPRINT) →' : 'VAI ALLA STRATEGIA PRE-GARA →')
              : `PROSEGUI A ${stages[q.stageIndex + 1]?.label} →`}
          </button>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-2">
            ${userParticipants.map(up => {
              const isElim = !!up.eliminatedIn;
              const livePosIdx = activeDrivers.findIndex(x => x.driverId === up.driverId);
              const livePos = livePosIdx >= 0 ? livePosIdx + 1 : (up.finalGridPos || '-');
              const isSafeZone = typeof livePos === 'number' && livePos <= stageObj.advanceCount;
              const posColor = isElim ? 'text-slate-400' : (isSafeZone ? 'text-emerald-300' : 'text-red-300');
              const mandatoryTyre = q.isSprint && !q.isWet ? stageObj.mandatoryDryTyre : null;

              let cutoffDeltaText = '';
              if (!isElim && hasCutoff && up.bestLapSec < 900) {
                if (!isSafeZone && cutoffLap && cutoffLap < 900) {
                  cutoffDeltaText = `+${(up.bestLapSec - cutoffLap).toFixed(3)}s da P${stageObj.advanceCount}`;
                } else if (isSafeZone && bubbleOutLap && bubbleOutLap < 900) {
                  cutoffDeltaText = `Margine -${(bubbleOutLap - up.bestLapSec).toFixed(3)}s`;
                }
              }

              return `
                <div class="bg-f1card border ${isElim ? 'border-slate-700 opacity-60' : 'border-f1border'} rounded-2xl p-3 space-y-2">
                  <div class="flex items-center justify-between text-xs gap-2">
                    <div class="flex items-center gap-1.5 min-w-0">
                      <span class="font-mono-num text-xs font-black shrink-0 ${posColor}">P${livePos}</span>
                      <span class="font-extrabold text-white truncate">${up.name} (${up.code})</span>
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0">
                      ${!isElim ? getTyreBadgeHtml(up.tyre, 'sm') : ''}
                      <span class="font-mono-num text-amber-300 font-bold">
                        ${isElim ? `Eliminato (${up.eliminatedIn})` : `${up.status.toUpperCase()} · ${formatLapTime(up.bestLapSec)}`}
                      </span>
                    </div>
                  </div>
                  ${cutoffDeltaText ? `<div class="text-[10px] font-mono-num font-bold ${isSafeZone ? 'text-emerald-400' : 'text-red-400'}">${cutoffDeltaText}</div>` : ''}
                  ${up.lastErrorNote ? `<div class="text-[10px] text-red-400 font-bold">${up.lastErrorNote}</div>` : ''}
                  ${!isElim ? `
                    <div class="grid grid-cols-2 gap-2">
                      <div class="flex gap-1">
                        ${(q.isWet ? ['I', 'W'] : ['S', 'M', 'H']).map(c => {
                          const locked = mandatoryTyre && c !== mandatoryTyre;
                          return `
                            <button onclick="setQualiDriverChoice('${up.driverId}', 'tyre', '${c}')" style="${getTyreButtonStyle(c, up.tyre === c, locked)}" class="flex-1 py-1.5 rounded-lg text-[10px] font-black border transition">${c}</button>
                          `;
                        }).join('')}
                      </div>
                      <div class="flex gap-1">
                        ${[
                          { id: 'safe', l: 'Prud.' },
                          { id: 'balanced', l: 'Bil.' },
                          { id: 'push', l: 'Rischio' }
                        ].map(rk => `
                          <button onclick="setQualiDriverChoice('${up.driverId}', 'risk', '${rk.id}')" class="flex-1 py-1.5 rounded-lg text-[10px] font-extrabold border ${up.risk === rk.id ? 'bg-amber-500/25 border-amber-400 text-amber-200' : 'bg-f1bg border-f1border text-slate-400'}">${rk.l}</button>
                        `).join('')}
                      </div>
                    </div>
                    ${up.status === 'pit' ? `
                      <button onclick="sendQualiDriverOut('${up.driverId}')" class="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-extrabold text-white">
                        🚀 Manda in Pista per Giro Veloce
                      </button>
                    ` : `
                      <button onclick="abortQualiDriverToPit('${up.driverId}')" class="w-full py-1.5 rounded-xl bg-slate-800 text-[11px] font-bold text-slate-300">
                        Richiama ai Box
                      </button>
                    `}
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <div class="lg:col-span-5 bg-f1card border border-f1border rounded-2xl p-3 space-y-1 ${mobileTab === 'timing' ? 'block' : 'hidden lg:block'}">
        <div class="flex justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400 pb-1">
          <span>Classifica ${q.stageLabel}</span>
          <span>Taglio Top ${stageObj.advanceCount}${cutoffLap && cutoffLap < 900 ? ` · ${formatLapTime(cutoffLap)}` : ''}</span>
        </div>
        ${activeDrivers.map((p, idx) => {
          const isCutoff = idx >= stageObj.advanceCount;
          const shownTyre = p.status !== 'pit'
            ? (p.tyre || (q.isWet ? 'I' : 'S'))
            : (p.bestLapTyre || p.tyre || (q.isWet ? 'I' : 'S'));
          return `
            <div class="flex items-center justify-between text-xs bg-f1bg px-2.5 py-1.5 rounded-lg ${p.isUser ? 'border border-f1red/70' : ''} ${isCutoff ? 'opacity-65' : ''}">
              <div class="flex items-center gap-2 min-w-0">
                <span class="font-mono-num font-black w-5 shrink-0 ${isCutoff ? 'text-red-400' : 'text-slate-400'}">${idx + 1}</span>
                <span class="w-2 h-2 rounded-full shrink-0" style="background:${p.teamColor}"></span>
                <span class="font-bold text-white truncate">${p.name}</span>
              </div>
              <div class="flex items-center gap-1.5 font-mono-num text-[11px] shrink-0">
                <span class="text-slate-400">${p.status === 'pit' ? 'BOX' : 'PISTA'}</span>
                ${getTyreBadgeHtml(shownTyre, 'xs')}
                <span class="text-sky-300 font-bold w-16 text-right">${formatLapTime(p.bestLapSec)}</span>
              </div>
            </div>
          `;
        }).join('')}
        <button type="button" onclick="setLiveMobileTab('pitwall', true)" class="lg:hidden w-full mt-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-f1border text-xs font-extrabold text-white">
          ← Torna al Muretto Box
        </button>
      </div>
    </div>
  `;
}

// =========================================================
// STRATEGIA PRE-GARA & LIVE (1, 2 O 3 STINT + DURATE GOMME)
// =========================================================
function renderStrategyConfiguratorBlock(track, uDrivers, isLiveOverlay = false) {
  const strat = ensurePreRaceStrategy(track);
  const stintsInfo = getEstimatedStints(track, gameState.rules);

  return `
    <div class="bg-f1card border border-f1border rounded-2xl p-4 space-y-3">
      <div class="flex items-center justify-between">
        <div class="text-xs font-extrabold uppercase tracking-wider text-amber-300">
          ${isLiveOverlay ? '📋 Strategia Live (Gara in Pausa)' : '📋 Strategia Pre-Gara (1, 2 o 3 Stint)'}
        </div>
        <span class="text-[10px] font-mono-num text-slate-400">${track.laps} Giri</span>
      </div>

      <div class="bg-f1bg p-2.5 rounded-xl border border-f1border/80 space-y-1">
        <div class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Durata Stimata Mescola su ${track.name} (Degrado ${track.tyreDeg}/3)</div>
        <div class="grid grid-cols-3 gap-1.5 text-center font-mono-num text-xs">
          <div class="rounded-lg py-1.5 px-1 border" style="background:rgba(255,59,48,0.12); border-color:rgba(255,59,48,0.5);">
            <div class="flex items-center justify-center gap-1">${getTyreBadgeHtml('S', 'xs')}<span class="font-black" style="color:#ff3b30;">SOFT</span></div>
            <div class="text-[11px] text-white font-bold mt-0.5">${stintsInfo.S} giri</div>
          </div>
          <div class="rounded-lg py-1.5 px-1 border" style="background:rgba(255,204,0,0.12); border-color:rgba(255,204,0,0.5);">
            <div class="flex items-center justify-center gap-1">${getTyreBadgeHtml('M', 'xs')}<span class="font-black" style="color:#ffcc00;">MEDIUM</span></div>
            <div class="text-[11px] text-white font-bold mt-0.5">${stintsInfo.M} giri</div>
          </div>
          <div class="rounded-lg py-1.5 px-1 border" style="background:rgba(242,242,247,0.10); border-color:rgba(242,242,247,0.45);">
            <div class="flex items-center justify-center gap-1">${getTyreBadgeHtml('H', 'xs')}<span class="font-black" style="color:#f2f2f7;">HARD</span></div>
            <div class="text-[11px] text-white font-bold mt-0.5">${stintsInfo.H} giri</div>
          </div>
        </div>
      </div>

      ${uDrivers.map((ud, idx) => {
        const sk = idx === 0 ? 'd1' : 'd2';
        const st = strat[sk];
        const liveCar = isLiveOverlay ? gameState.weekend?.race?.cars?.find(c => c.driverId === ud.id) : null;
        const plannedSeq = [st.startTyre];
        if (st.stints >= 2) plannedSeq.push(st.pit1Tyre);
        if (st.stints >= 3) plannedSeq.push(st.pit2Tyre);
        const isWetRace = !!gameState.weekend?.quali?.isWet;
        const gridEntry = (gameState.weekend?.quali?.grid || []).find(g => g.driverId === ud.id);
        const carWear = typeof getDriverCarWearState === 'function' ? getDriverCarWearState(ud.id) : { maxWear: 0, puWear: 0, chassisWear: 0 };
        const ruleCheck = typeof checkTwoCompoundRuleCompliance === 'function'
          ? checkTwoCompoundRuleCompliance(plannedSeq)
          : { compliant: true };
        const showDryRuleWarn = !isLiveOverlay && !isWetRace && !ruleCheck.compliant;
        return `
          <div class="bg-f1bg p-3 rounded-xl border ${showDryRuleWarn ? 'border-red-500/70' : 'border-f1border/70'} space-y-2.5">
            <div class="flex justify-between items-center text-xs font-extrabold text-white gap-2">
              <div class="truncate">
                <span>${ud.name} (${ud.code})</span>
                ${!isLiveOverlay && gridEntry ? `<span class="ml-1.5 text-[10px] font-mono-num text-amber-300">P${gridEntry.gridPos}${gridEntry.gridPenalty ? ` (+${gridEntry.gridPenalty}P)` : ''}</span>` : ''}
              </div>
              <span class="inline-flex items-center gap-1 font-mono-num text-sky-300 shrink-0">
                ${liveCar
                  ? `${getTyreBadgeHtml(liveCar.tyre, 'xs')} <span>(${Math.round(liveCar.tyreWear)}%) · ${st.stints} Stint</span>`
                  : `${plannedSeq.map(c => getTyreBadgeHtml(c, 'xs')).join('<span class="text-slate-500">→</span>')} <span class="ml-1">(${st.stints - 1} Pit)</span>`}
              </span>
            </div>
            ${showDryRuleWarn ? `
              <div class="bg-red-950/50 border border-red-500/70 rounded-xl px-2.5 py-2 text-[11px] font-bold text-red-200 leading-snug">
                ⚠️ Regola FIA: servono almeno 2 mescole diverse sull'asciutto (altrimenti squalifica a fine GP).
              </div>
            ` : ''}
            ${!isLiveOverlay && carWear.maxWear >= 70 ? `
              <div class="text-[10px] font-bold text-amber-300">⚠️ Componenti usurati (PU ${carWear.puWear}% · Cambio ${carWear.chassisWear}%): rischio calo/guasto in gara.</div>
            ` : ''}
${!isLiveOverlay && st.recommended ? `
              <div class="bg-sky-950/35 border border-sky-500/40 rounded-xl p-2.5 space-y-1.5">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[10px] font-extrabold uppercase tracking-wider text-sky-300">💡 Proposta di ${ud.code} (Gest. Gomme ${ud.tyreMgmt ?? 84})</span>
                  <button onclick="applyPilotRecommendedStrategy('${sk}')" class="px-2 py-0.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-[10px] font-extrabold text-white shrink-0">
                    Applica Proposta
                  </button>
                </div>
                <div class="text-[11px] text-slate-200 leading-snug">${st.recommended.note}</div>
              </div>
            ` : ''}
            
            <div class="grid grid-cols-3 gap-1.5">
              ${[1, 2, 3].map(n => `
                <button onclick="setPreRaceChoice('${sk}', 'stints', ${n})" class="py-1.5 rounded-lg text-[11px] font-black border ${st.stints === n ? 'bg-sky-600 border-sky-300 text-white' : 'bg-f1card border-f1border text-slate-400'}">
                  ${n} Stint (${n - 1} Pit)
                </button>
              `).join('')}
            </div>

            ${!isLiveOverlay ? `
              <div class="space-y-1">
                <div class="text-[10px] text-slate-400 font-bold">Stint 1 — Gomma alla partenza:</div>
                <div class="grid grid-cols-3 gap-1.5">
                  ${['S', 'M', 'H'].map(c => `
                    <button onclick="setPreRaceChoice('${sk}', 'startTyre', '${c}')" style="${getTyreButtonStyle(c, st.startTyre === c)}" class="py-1 rounded-lg text-xs font-black border transition">${c}</button>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            ${st.stints >= 2 ? `
              <div class="space-y-1.5 pt-1 border-t border-f1border/60">
                <div class="flex items-center justify-between gap-2 text-[11px] font-mono-num text-slate-200">
                  <span class="inline-flex items-center gap-1">Pit 1 al Giro <strong>${st.pit1Lap}</strong> → ${getTyreBadgeHtml(st.pit1Tyre, 'xs')}</span>
                  <div class="flex items-center gap-1">
                    <button type="button" onclick="stepPreRacePitLap('${sk}', 'pit1Lap', -1)" class="w-8 h-8 rounded-lg bg-f1card hover:bg-slate-700 border border-f1border font-black text-sm text-white flex items-center justify-center">-</button>
                    <input type="number" min="3" max="${Math.max(6, track.laps - 3)}" value="${st.pit1Lap}" onchange="setPreRaceChoice('${sk}', 'pit1Lap', this.value)" class="w-14 h-8 rounded-lg bg-f1card border border-f1border text-center font-mono-num font-black text-xs text-white focus:outline-none focus:border-sky-400" />
                    <button type="button" onclick="stepPreRacePitLap('${sk}', 'pit1Lap', 1)" class="w-8 h-8 rounded-lg bg-f1card hover:bg-slate-700 border border-f1border font-black text-sm text-white flex items-center justify-center">+</button>
                  </div>
                </div>
                <div class="grid grid-cols-4 gap-1">
                  ${['S', 'M', 'H', 'I'].map(c => `
                    <button onclick="setPreRaceChoice('${sk}', 'pit1Tyre', '${c}')" style="${getTyreButtonStyle(c, st.pit1Tyre === c)}" class="py-1 rounded-lg text-[10px] font-black border transition">${c}</button>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            ${st.stints >= 3 ? `
              <div class="space-y-1.5 pt-1 border-t border-f1border/60">
                <div class="flex items-center justify-between gap-2 text-[11px] font-mono-num text-slate-200">
                  <span class="inline-flex items-center gap-1">Pit 2 al Giro <strong>${st.pit2Lap}</strong> → ${getTyreBadgeHtml(st.pit2Tyre, 'xs')}</span>
                  <div class="flex items-center gap-1">
                    <button type="button" onclick="stepPreRacePitLap('${sk}', 'pit2Lap', -1)" class="w-8 h-8 rounded-lg bg-f1card hover:bg-slate-700 border border-f1border font-black text-sm text-white flex items-center justify-center">-</button>
                    <input type="number" min="${Math.min(track.laps - 2, st.pit1Lap + 3)}" max="${Math.max(8, track.laps - 2)}" value="${st.pit2Lap}" onchange="setPreRaceChoice('${sk}', 'pit2Lap', this.value)" class="w-14 h-8 rounded-lg bg-f1card border border-f1border text-center font-mono-num font-black text-xs text-white focus:outline-none focus:border-emerald-400" />
                    <button type="button" onclick="stepPreRacePitLap('${sk}', 'pit2Lap', 1)" class="w-8 h-8 rounded-lg bg-f1card hover:bg-slate-700 border border-f1border font-black text-sm text-white flex items-center justify-center">+</button>
                  </div>
                </div>
                <div class="grid grid-cols-4 gap-1">
                  ${['S', 'M', 'H', 'I'].map(c => `
                    <button onclick="setPreRaceChoice('${sk}', 'pit2Tyre', '${c}')" style="${getTyreButtonStyle(c, st.pit2Tyre === c)}" class="py-1 rounded-lg text-[10px] font-black border transition">${c}</button>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}

      ${isLiveOverlay ? `
        <button onclick="toggleLiveRaceStrategyModal(false)" class="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-black text-xs text-white">
          ✅ APPLICA STRATEGIA E RIPRENDI GARA
        </button>
      ` : `
        <button onclick="startLiveRace()" class="w-full py-3 rounded-xl bg-f1red hover:bg-red-600 font-black text-sm text-white shadow-lg shadow-f1red/25">
          🚦 SEMAFORI VERDI — AL VIA DEL GP!
        </button>
      `}
    </div>
  `;
}

function renderPreSprintStrategy(w, track, uDrivers) {
  const strat = ensureSprintStrategy(track);
  const sprintLaps = getSprintLaps(track);
  const stintsInfo = getEstimatedStints(track, gameState.rules);
  const isWet = !!w.sprintQuali?.isWet;
  const grid = w.sprintQuali?.grid || [];

  return `
    <div class="bg-f1card border border-f1border rounded-2xl p-4 space-y-3">
      <div class="flex items-center justify-between">
        <div>
          <span class="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500 text-slate-950">⚡ PRE-SPRINT • ~100 KM</span>
          <div class="text-sm font-extrabold text-white mt-1">Assetto Gara Sprint (${sprintLaps} Giri)</div>
        </div>
        <span class="text-[10px] font-mono-num text-emerald-300 font-bold">0 Pit Obbligatori</span>
      </div>

      <div class="bg-f1bg p-2.5 rounded-xl border border-f1border/80 space-y-1">
        <div class="text-[10px] text-slate-300 leading-snug">
          Gara breve e carica d'attacco: niente sosta obbligatoria e meno benzina favoriscono le auto rapide sul passo puro e Aero/PU. Punti ai primi 8 (8-1).
        </div>
        <div class="flex items-center justify-between text-[11px] font-mono-num pt-1">
          <span class="text-slate-400">Durata stimata:</span>
          <span class="inline-flex items-center gap-1 font-bold" style="color:#ff3b30;">${getTyreBadgeHtml('S', 'xs')} ${stintsInfo.S}g</span>
          <span class="inline-flex items-center gap-1 font-bold" style="color:#ffcc00;">${getTyreBadgeHtml('M', 'xs')} ${stintsInfo.M}g</span>
          <span class="inline-flex items-center gap-1 font-bold" style="color:#f2f2f7;">${getTyreBadgeHtml('H', 'xs')} ${stintsInfo.H}g</span>
        </div>
      </div>

      ${uDrivers.map((ud, idx) => {
        const sk = idx === 0 ? 'd1' : 'd2';
        const st = strat[sk];
        const gPos = grid.find(g => g.driverId === ud.id)?.gridPos || '-';
        return `
          <div class="bg-f1bg p-3 rounded-xl border border-f1border/70 space-y-2.5">
            <div class="flex justify-between items-center text-xs font-extrabold text-white">
              <span>${ud.name} (${ud.code})</span>
              <span class="inline-flex items-center gap-1.5 font-mono-num text-amber-300">${getTyreBadgeHtml(st.tyre, 'xs')} Griglia P${gPos}</span>
            </div>
            ${st.recommended ? `
              <div class="bg-sky-950/35 border border-sky-500/40 rounded-xl p-2.5 space-y-1.5">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[10px] font-extrabold uppercase tracking-wider text-sky-300">💡 Consiglio ${ud.code}</span>
                  <button onclick="applyPilotRecommendedSprintStrategy('${sk}')" class="px-2 py-0.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-[10px] font-extrabold text-white shrink-0">Applica</button>
                </div>
                <div class="text-[11px] text-slate-200 leading-snug">${st.recommended.note}</div>
              </div>
            ` : ''}

            <div class="space-y-1">
              <div class="text-[10px] text-slate-400 font-bold">Mescola partenza Sprint:</div>
              <div class="grid ${isWet ? 'grid-cols-2' : 'grid-cols-3'} gap-1.5">
                ${(isWet ? ['I', 'W'] : ['S', 'M', 'H']).map(c => `
                  <button onclick="setPreSprintChoice('${sk}', 'tyre', '${c}')" style="${getTyreButtonStyle(c, st.tyre === c)}" class="py-1.5 rounded-lg text-xs font-black border transition">${c}</button>
                `).join('')}
              </div>
            </div>

            <div class="space-y-1">
              <div class="text-[10px] text-slate-400 font-bold">Spinta al via:</div>
              <div class="grid grid-cols-3 gap-1.5">
                ${[
                  { id: 'conserve', l: 'Risparmio' },
                  { id: 'balanced', l: 'Neutro' },
                  { id: 'push', l: 'Spingi' }
                ].map(md => `
                  <button onclick="setPreSprintChoice('${sk}', 'push', '${md.id}')" class="py-1 rounded-lg text-[10px] font-extrabold border ${st.push === md.id ? 'border-amber-400 bg-amber-500/20 text-amber-200' : 'border-f1border bg-f1card text-slate-400'}">${md.l}</button>
                `).join('')}
              </div>
            </div>
          </div>
        `;
      }).join('')}

      <button onclick="startLiveSprintRace()" class="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-lg">
        ⚡ PARTENZA GARA SPRINT (${sprintLaps} GIRI)!
      </button>
    </div>
  `;
}

function renderPreRaceStrategy(w, track, uDrivers) {
  return renderStrategyConfiguratorBlock(track, uDrivers, false);
}

// =========================================================
// GARA LIVE FLUIDA (SPRINT LIVE & GRAN PREMIO LIVE)
// =========================================================
function renderLiveRacePhase(w, track, uDrivers, isSprint = false) {
  const race = isSprint ? w.sprintRace : w.race;
  if (!race || !Array.isArray(race.cars)) return '';
  const totalLaps = race.totalLaps || (isSprint ? getSprintLaps(track) : track.laps);
  const ordered = [...race.cars].sort((a, b) => a.pos - b.pos);
  const fixedUserCars = (uDrivers || []).map(ud => race.cars.find(c => c.driverId === ud.id)).filter(Boolean);
  const userCars = fixedUserCars.length ? fixedUserCars : race.cars.filter(c => c.isUser);
  const radar = typeof getRaceWeatherRadar === 'function'
    ? getRaceWeatherRadar(race)
    : { label: race.weather, detail: '', tone: 'text-slate-300' };

  if (!isSprint && race.strategyOpen) {
    return renderStrategyConfiguratorBlock(track, uDrivers, true);
  }

  const dots = ordered.filter(c => !c.retired).map(c => ({
    code: c.code,
    color: c.teamColor,
    isUser: c.isUser,
    inPit: c.inPit,
    pitProgress: c.inPit ? Math.max(0, Math.min(1, 1 - (c.pitTimer / 21.5))) : 0,
    trackProgress: c.distanceLaps
  }));

  const mobileTab = w.liveMobileTab === 'timing' ? 'timing' : 'pitwall';
  const raceLeader = ordered[0];

  return `
    <div class="lg:hidden bg-f1card border border-f1border rounded-2xl p-2 space-y-2 mb-3">
      <div class="grid grid-cols-2 gap-1 bg-f1bg p-1 rounded-xl">
        <button type="button" onclick="setLiveMobileTab('pitwall')" class="min-h-[40px] py-1.5 px-2 rounded-lg text-xs font-extrabold whitespace-nowrap transition ${mobileTab === 'pitwall' ? 'bg-f1red text-white' : 'text-slate-400 hover:text-white'}">
          🏎️ Muretto Box
        </button>
        <button type="button" onclick="setLiveMobileTab('timing')" class="min-h-[40px] py-1.5 px-2 rounded-lg text-xs font-extrabold whitespace-nowrap transition ${mobileTab === 'timing' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'}">
          📊 Classifica (${ordered.length})
        </button>
      </div>
      <div class="flex items-center justify-between gap-2 px-1 text-[11px] font-mono-num">
        <span id="mobile-mini-leader" class="text-slate-300 font-bold truncate">G${race.currentLap}/${totalLaps} · P1 ${raceLeader?.code || '-'}</span>
        <div class="flex items-center gap-2 shrink-0">
          ${userCars.map(uc => {
            const miniGap = uc.retired ? 'RIT' : (uc.inPit ? 'PIT' : (uc.pos === 1 ? 'P1' : `+${Number(uc.gapToLeader || 0).toFixed(1)}s`));
            const cTone = uc.retired ? 'text-slate-500' : (uc.pos <= 10 ? 'text-emerald-300' : 'text-amber-300');
            return `<span class="inline-flex items-center gap-1 font-extrabold ${cTone}">${getTyreBadgeHtml(uc.tyre, 'xs')}<span id="mobile-mini-car-${uc.driverId}">P${uc.retired ? 'R' : uc.pos} ${uc.code} ${miniGap}</span></span>`;
          }).join('<span class="text-slate-600">·</span>')}
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
      <div class="lg:col-span-7 space-y-3 ${mobileTab === 'pitwall' ? 'block' : 'hidden lg:block'}">
        <div class="bg-f1card border border-f1border rounded-2xl p-3.5 space-y-2.5">
          <div class="flex items-center justify-between gap-2">
            <div class="min-w-0">
              <div class="text-xs font-extrabold text-white">
                ${isSprint ? '<span class="text-amber-300 font-black mr-1">⚡ SPRINT ·</span>' : ''}Giro ${race.currentLap} / ${totalLaps} · ${race.weather}
                ${race.safetyCar ? '<span class="ml-1.5 text-amber-300 font-black">· SAFETY CAR</span>' : ''}
              </div>
              <div class="text-[11px] font-bold ${radar.tone} truncate">${radar.detail}</div>
            </div>
            ${!isSprint ? `
              <span class="text-[10px] font-mono-num text-slate-400 font-bold shrink-0">${totalLaps} Giri · Regia Box Live</span>
            ` : `
              <span class="text-[10px] font-mono-num text-amber-300 font-bold shrink-0">Top 8 Punti</span>
            `}
          </div>

          ${renderLiveTrackMapSvg(track, dots)}

          <div class="flex items-center justify-between gap-1">
            <div class="flex gap-1">
              ${[
                { s: 0, l: '⏸ Pausa' },
                { s: 1, l: 'x1' },
                { s: 2, l: 'x2' },
                { s: 4, l: 'x4' },
                { s: 8, l: 'x8' }
              ].map(btn => {
                const isAct = (btn.s === 0 && race.paused) || (!race.paused && race.speed === btn.s);
                return `<button onclick="setLiveRaceSpeed(${btn.s})" class="px-2.5 py-1.5 rounded-lg text-[11px] font-mono-num font-extrabold ${isAct ? 'bg-f1red text-white' : 'bg-f1bg text-slate-300 border border-f1border'}">${btn.l}</button>`;
              }).join('')}
            </div>
            <span class="text-[10px] font-mono-num text-slate-400">${race.paused ? 'IN PAUSA' : `VELOCITÀ x${race.speed}`}</span>
          </div>

          <button type="button" onclick="toggleLiveEventsLog()" class="w-full text-left text-[11px] bg-f1bg hover:bg-slate-800/70 px-2.5 py-1.5 rounded-xl border border-f1border/70 text-slate-300 transition">
            <div class="flex items-center justify-between gap-2">
              <span class="truncate">${race.events[0] || ''}</span>
              <span class="text-[10px] font-bold text-sky-300 shrink-0">${race.eventsExpanded ? '▲ Chiudi' : `▼ Log (${race.events.length})`}</span>
            </div>
            ${race.eventsExpanded ? `
              <div class="mt-2 pt-2 border-t border-f1border/60 space-y-1 max-h-36 overflow-y-auto no-scrollbar">
                ${race.events.slice(1, 9).map(ev => `<div class="text-[10px] text-slate-400">${ev}</div>`).join('')}
              </div>
            ` : ''}
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-2.5">
          ${userCars.map(uc => {
            const wearPct = Math.round(uc.tyreWear || 0);
            const lifePct = Math.max(0, 100 - wearPct);
            const wearBarColor = wearPct >= 75 ? 'bg-red-500' : (wearPct >= 48 ? 'bg-amber-400' : 'bg-emerald-400');
            const wearTextColor = wearPct >= 75 ? 'text-red-400 font-black' : (wearPct >= 48 ? 'text-amber-300' : 'text-emerald-400');
            const compObj = TYRE_COMPOUNDS[uc.tyre] || TYRE_COMPOUNDS.M;
            const weatherMismatch = (race.isWet && compObj.wet === 0) || (!race.isWet && compObj.wet > 0);
            const nextPit = !isSprint && typeof getCarNextScheduledPit === 'function'
              ? getCarNextScheduledPit(uc, totalLaps)
              : { active: false };
            const nextComp = uc.forcePitCompound || (nextPit.active ? nextPit.compound : null) || race.userPitCompounds?.[uc.driverId] || (race.isWet ? 'I' : (isSprint ? 'S' : 'H'));
            const stintsSegs = !isSprint && typeof buildCarStintTimeline === 'function'
              ? buildCarStintTimeline(uc, race)
              : [];
            const curPct = Math.min(100, Math.max(0, ((uc.distanceLaps || 0) / Math.max(1, totalLaps)) * 100));
            const usedSoFar = [...(uc.completedStints || []).map(s => s.compound), uc.tyre];
            const compoundRule = !isSprint && typeof checkTwoCompoundRuleCompliance === 'function'
              ? checkTwoCompoundRuleCompliance(usedSoFar)
              : { compliant: true };
            const needsSecondCompoundWarn = !isSprint && !uc.retired && !compoundRule.compliant && race.currentLap >= Math.max(1, totalLaps - 14);
            const carWear = typeof getDriverCarWearState === 'function' ? getDriverCarWearState(uc.driverId) : { maxWear: 0, puWear: 0, chassisWear: 0 };

            return `
              <div class="bg-f1card border ${weatherMismatch || needsSecondCompoundWarn ? 'border-red-500/80' : 'border-f1border'} rounded-2xl p-3 space-y-2">
                <div class="flex items-center justify-between text-xs gap-2">
                  <span class="font-extrabold text-white">P${uc.pos} · ${uc.name}</span>
                  <div class="flex items-center gap-1.5 shrink-0">
                    ${getTyreBadgeHtml(uc.tyre, 'sm')}
                    <span id="car-wear-text-${uc.driverId}" class="font-mono-num ${wearTextColor}">Usura ${wearPct}% (Vita ${lifePct}%)${!isSprint ? ` · Pit ${uc.pitStops}/${uc.plannedStops}` : ''}</span>
                  </div>
                </div>
                ${weatherMismatch ? `
                  <div class="text-[10px] font-bold text-red-400 flex items-center gap-1">⚠️ Gomma ${getTyreBadgeHtml(uc.tyre, 'xs')} inadatta al meteo attuale (${race.weather}): rientra ai box!</div>
                ` : (needsSecondCompoundWarn ? `
                  <div class="text-[10px] font-bold text-red-400">⚠️ Regola FIA: devi ancora montare una seconda mescola diversa!</div>
                ` : (wearPct >= 75 ? `
                  <div class="text-[10px] font-bold text-amber-300">⚠️ Usura critica (${wearPct}%): calo netto sul ritmo!</div>
                ` : (carWear.maxWear >= 70 ? `
                  <div class="text-[10px] font-bold text-amber-300">⚠️ Componenti auto usurati (PU ${carWear.puWear}% · Cambio ${carWear.chassisWear}%)</div>
                ` : '')))}
                <div class="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div id="car-wear-bar-${uc.driverId}" class="h-full transition-all ${wearBarColor}" style="width:${lifePct}%"></div>
                </div>

                ${!isSprint ? `
                  <div class="bg-f1bg/90 border border-f1border/70 rounded-xl p-2 space-y-1.5">
                    <div class="flex items-center justify-between gap-2 text-[11px] font-mono-num">
                      ${nextPit.active ? (
                        nextPit.forced ? `
                          <span class="font-extrabold text-amber-300 inline-flex items-center gap-1">🔧 Rientra a fine giro → ${getTyreBadgeHtml(nextPit.compound, 'xs')}</span>
                          <button type="button" onclick="cancelUserPitOrder('${uc.driverId}')" class="px-2 py-0.5 rounded bg-red-950/80 border border-red-500/60 text-[10px] font-extrabold text-red-200">Annulla</button>
                        ` : `
                          <span class="text-slate-200 truncate inline-flex items-center gap-1">
                            Prossimo Pit: <strong class="text-amber-300">G${nextPit.lap}</strong> → ${getTyreBadgeHtml(nextPit.compound, 'xs')} <span class="text-slate-400">(tra ${nextPit.lapsLeft}g)</span>
                          </span>
                          <div class="flex items-center gap-1 shrink-0">
                            <button type="button" onclick="shiftUserLivePitLap('${uc.driverId}', -1)" class="px-1.5 py-0.5 rounded bg-f1card hover:bg-slate-700 border border-f1border text-[10px] font-black text-white">-1G</button>
                            <button type="button" onclick="shiftUserLivePitLap('${uc.driverId}', 1)" class="px-1.5 py-0.5 rounded bg-f1card hover:bg-slate-700 border border-f1border text-[10px] font-black text-white">+1G</button>
                            <button type="button" onclick="skipNextLivePit('${uc.driverId}')" title="Annulla sosta prevista" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-red-950 border border-f1border text-[10px] font-bold text-slate-300">Salta</button>
                          </div>
                        `
                      ) : `
                        <span class="text-slate-400">Ultimo stint · 0 pit previsti</span>
                        <button type="button" onclick="addExtraLivePit('${uc.driverId}')" class="px-2 py-0.5 rounded bg-sky-700 hover:bg-sky-600 text-[10px] font-extrabold text-white shrink-0">+ Pit</button>
                      `}
                    </div>

                    <div class="relative w-full h-4 rounded-lg bg-slate-900 overflow-hidden flex border border-f1border/60">
                      ${stintsSegs.map(seg => {
                        const spanLaps = Math.max(1, seg.endLap - seg.startLap);
                        const wPct = (spanLaps / Math.max(1, totalLaps)) * 100;
                        const cMeta = TYRE_COMPOUNDS[seg.compound] || TYRE_COMPOUNDS.M;
                        const dimCls = seg.status === 'done' ? 'opacity-45' : (seg.status === 'planned' ? 'opacity-80' : 'opacity-100');
                        return `
                          <div class="h-full flex items-center justify-center border-r border-black/40 last:border-r-0 ${dimCls}" style="width:${wPct.toFixed(1)}%; background:${cMeta.color}; color:${cMeta.text};">
                            <span class="text-[9px] font-mono-num font-black truncate px-0.5">${seg.compound}${wPct >= 16 ? `·G${seg.endLap}` : ''}</span>
                          </div>
                        `;
                      }).join('')}
                      <div id="car-timeline-pos-${uc.driverId}" class="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_4px_#fff]" style="left:${curPct.toFixed(1)}%"></div>
                    </div>
                  </div>
                ` : ''}

                <div class="grid grid-cols-3 gap-1.5">
                  <button onclick="setLiveCarPush('${uc.driverId}', 'conserve')" class="py-1.5 rounded-lg text-[10px] font-bold ${uc.pushMode === 'conserve' ? 'bg-sky-600 text-white' : 'bg-f1bg text-slate-400'}">Risparmio</button>
                  <button onclick="setLiveCarPush('${uc.driverId}', 'balanced')" class="py-1.5 rounded-lg text-[10px] font-bold ${uc.pushMode === 'balanced' ? 'bg-slate-600 text-white' : 'bg-f1bg text-slate-400'}">Neutro</button>
                  <button onclick="setLiveCarPush('${uc.driverId}', 'push')" class="py-1.5 rounded-lg text-[10px] font-bold ${uc.pushMode === 'push' ? 'bg-f1red text-white' : 'bg-f1bg text-slate-400'}">Spingi</button>
                </div>
                <div class="flex items-center gap-1.5 pt-0.5">
                  <div class="flex gap-1 flex-1">
                    ${['S', 'M', 'H', 'I', 'W'].map(c => `
                      <button onclick="setUserNextPitCompound('${uc.driverId}', '${c}')" style="${getTyreButtonStyle(c, nextComp === c)}" class="flex-1 py-1.5 rounded-lg text-[10px] font-black border transition">${c}</button>
                    `).join('')}
                  </div>
                  ${uc.forcePitCompound ? `
                    <button onclick="cancelUserPitOrder('${uc.driverId}')" class="px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold bg-red-950/80 border border-red-500/60 text-red-200 shrink-0 inline-flex items-center gap-1">
                      <span>Annulla</span> ${getTyreBadgeHtml(uc.forcePitCompound, 'xs')}
                    </button>
                  ` : `
                    <button onclick="pitUserCarNow('${uc.driverId}')" class="px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold bg-amber-500 hover:bg-amber-400 text-slate-950 shrink-0 inline-flex items-center gap-1">
                      <span>Box Ora</span> ${getTyreBadgeHtml(nextComp, 'xs')}
                    </button>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="lg:col-span-5 bg-f1card border border-f1border rounded-2xl p-3 space-y-1.5 ${mobileTab === 'timing' ? 'block' : 'hidden lg:block'}">
        <div class="flex justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400 pb-0.5">
          <span>Live Timing & Distacchi</span>
          <span>Gomma · Gap</span>
        </div>
        ${ordered.map(c => {
          const gapText = c.retired
            ? 'RIT'
            : (c.inPit ? 'IN PIT' : (c.pos === 1 ? 'LEADER' : `+${Number(c.gapToLeader || 0).toFixed(1)}s`));
          return `
            <div class="flex items-center justify-between text-xs bg-f1bg px-2.5 py-1.5 rounded-lg ${c.isUser ? 'border border-f1red/70' : ''}">
              <div class="flex items-center gap-2 min-w-0">
                <span class="font-mono-num font-black w-5 text-slate-400">${c.retired ? 'R' : c.pos}</span>
                <span class="w-2 h-2 rounded-full shrink-0" style="background:${c.teamColor}"></span>
                <span class="font-bold text-white truncate">${c.name}</span>
              </div>
              <div class="flex items-center gap-2 font-mono-num text-[11px] text-slate-300 shrink-0">
                ${getTyreBadgeHtml(c.tyre, 'sm')}
                <span id="live-gap-${c.driverId}" class="text-sky-300 w-14 text-right">${gapText}</span>
              </div>
            </div>
          `;
        }).join('')}
        <button type="button" onclick="setLiveMobileTab('pitwall', true)" class="lg:hidden w-full mt-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-f1border text-xs font-extrabold text-white">
          ← Torna al Muretto Box
        </button>
      </div>
    </div>
  `;
}

function renderSprintSummaryPhase(w) {
  const res = w.sprintResults;
  if (!res) return '';
  return `
    <div class="bg-f1card border border-f1border rounded-2xl p-4 space-y-3">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-xs font-extrabold uppercase tracking-wider text-amber-300">⚡ Ordine d'Arrivo Sprint • ${res.trackName}</div>
          <div class="text-xs font-mono-num text-emerald-300">Punti Sprint assegnati (Top 8)${res.sprintIncome > 0 ? ` • Bonus +€${Number(res.sprintIncome).toFixed(1)}M` : ''}</div>
        </div>
      </div>
      <div class="space-y-1.5 max-h-64 overflow-y-auto no-scrollbar">
        ${res.classification.map(r => {
          const stintsList = (r.stints && r.stints.length) ? r.stints : (r.tyre ? [r.tyre] : []);
          return `
            <div class="flex items-center justify-between text-xs bg-f1bg px-3 py-1.5 rounded-xl border ${r.isUser ? 'border-f1red' : 'border-f1border/50'} gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <span class="font-mono-num font-black w-6 text-slate-400 shrink-0">${r.pos}</span>
                <span class="font-extrabold text-white truncate">${r.name}</span>
                <span class="text-[10px] text-slate-400 truncate hidden sm:inline">${r.teamName}</span>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <div class="flex items-center gap-0.5">${stintsList.map(st => getTyreBadgeHtml(st, 'xs')).join('')}</div>
                <span class="font-mono-num font-bold w-11 text-right ${r.pts > 0 ? 'text-amber-300' : 'text-slate-500'}">+${r.pts} pt</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <button onclick="continueAfterSprintSummary()" class="w-full py-3 rounded-xl bg-f1red hover:bg-red-600 font-black text-xs text-white">
        PROSEGUI ALLE QUALIFICHE GP (Q1) →
      </button>
    </div>
  `;
}

function renderRaceSummaryPhase(w) {
  const res = w.results;
  if (!res) return '';
  return `
    <div class="bg-f1card border border-f1border rounded-2xl p-4 space-y-3">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-xs font-extrabold uppercase tracking-wider text-emerald-400">Ordine d'Arrivo • GP ${res.trackName}</div>
          <div class="text-xs font-mono-num text-amber-300">Incasso netto GP da sponsor/risultati: +€${Number(res.gpIncome || 0).toFixed(1)}M</div>
        </div>
      </div>
      <div class="space-y-1.5 max-h-64 overflow-y-auto no-scrollbar">
        ${res.classification.map(r => {
          const stintsList = (r.stints && r.stints.length) ? r.stints : (r.tyre ? [r.tyre] : []);
          const isSq = r.pos === 'SQ';
          return `
            <div class="flex items-center justify-between text-xs bg-f1bg px-3 py-1.5 rounded-xl border ${r.isUser ? 'border-f1red' : 'border-f1border/50'} gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <span class="font-mono-num font-black w-6 shrink-0 ${isSq ? 'text-red-400' : 'text-slate-400'}">${r.pos}</span>
                <span class="font-extrabold text-white truncate">${r.name}</span>
                ${isSq ? `<span class="text-[10px] font-bold text-red-400 shrink-0">· Squalifica FIA (1 mescola)</span>` : `<span class="text-[10px] text-slate-400 truncate hidden sm:inline">${r.teamName}</span>`}
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <div class="flex items-center gap-0.5">${stintsList.map(st => getTyreBadgeHtml(st, 'xs')).join('')}</div>
                <span class="font-mono-num font-bold w-11 text-right ${isSq ? 'text-red-400' : 'text-amber-300'}">+${r.pts} pt</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <button onclick="continueAfterRaceSummary()" class="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-black text-xs text-white">
        PROSEGUI →
      </button>
    </div>
  `;
}

function renderWeekendView() {
  const w = gameState.weekend;
  const track = CALENDAR_2026[gameState.round - 1] || CALENDAR_2026[0];
  const uDrivers = getUserDrivers();

  if (w.phase === 'sprint_quali' && !w.sprintQuali) {
    initLiveQualifyingSession(true);
  }
  if (w.phase === 'quali' && !w.quali) {
    initLiveQualifyingSession(false);
  }

  return `
    <div class="p-4 space-y-3.5 pb-6">
      <div class="bg-f1card border border-f1border rounded-2xl p-3.5 flex items-center justify-between">
        <div>
          <span class="text-[10px] font-extrabold uppercase tracking-wider text-f1red">${getWeekendDayBadge(w)} • GP ${track.round}/24</span>
          <h2 class="text-base font-extrabold text-white">${track.flag} ${track.name} — ${track.circuit}</h2>
        </div>
        <span class="text-[10px] font-mono-num text-slate-400">${w.phase === 'sprint_race' || w.phase === 'sprint_strategy' ? `${getSprintLaps(track)} Giri (Sprint)` : `${track.laps} Giri`} • Deg ${track.tyreDeg}/3</span>
      </div>

      ${w.phase === 'fp' ? renderFpPhase(w, track, uDrivers) : ''}
      ${w.phase === 'sprint_quali' ? renderLiveQualiPhase(w, track, true) : ''}
      ${w.phase === 'sprint_strategy' ? renderPreSprintStrategy(w, track, uDrivers) : ''}
      ${w.phase === 'sprint_race' ? renderLiveRacePhase(w, track, uDrivers, true) : ''}
      ${w.phase === 'sprint_summary' ? renderSprintSummaryPhase(w) : ''}
      ${w.phase === 'quali' ? renderLiveQualiPhase(w, track, false) : ''}
      ${w.phase === 'strategy' ? renderPreRaceStrategy(w, track, uDrivers) : ''}
      ${w.phase === 'race' ? renderLiveRacePhase(w, track, uDrivers, false) : ''}
      ${w.phase === 'summary' ? renderRaceSummaryPhase(w) : ''}
    </div>
  `;
}

function renderActiveModal() {
  if (!uiModal) return '';

  if (uiModal.type === 'confirm_reset') {
    const slotLabel = typeof getActiveSaveSlot === 'function' ? getActiveSaveSlot().replace('_', ' ').toUpperCase() : 'SLOT 1';
    return `
      <div class="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4" onclick="closeModal()">
        <div class="bg-f1card border border-f1border rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl" onclick="event.stopPropagation()">
          <div>
            <div class="text-xs font-bold uppercase tracking-wider text-red-400">Conferma Azzeramento</div>
            <h3 class="text-base font-extrabold text-white mt-1">Azzerare la carriera in ${slotLabel}?</h3>
            <p class="text-xs text-slate-400 mt-1">Tutti i progressi di questo slot verranno cancellati e tornerai alla selezione scuderia.</p>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <button type="button" onclick="closeModal()" class="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-extrabold text-slate-200">Annulla</button>
            <button type="button" onclick="resetCareer()" class="py-2.5 rounded-xl bg-f1red hover:bg-red-600 text-xs font-extrabold text-white">Azzera Slot</button>
          </div>
        </div>
      </div>
    `;
  }

  if (uiModal.type === 'saves_manager') {
    const active = getActiveSaveSlot();
    const slots = listSaveSlotsMeta();
    return `
      <div class="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4" onclick="closeModal()">
        <div class="bg-f1card border border-f1border rounded-2xl p-5 max-w-md w-full space-y-3.5 shadow-2xl" onclick="event.stopPropagation()">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-extrabold text-white">Gestione Salvataggi</h3>
            <button type="button" onclick="closeModal()" class="px-2.5 py-1 rounded-lg bg-slate-800 text-xs font-bold text-slate-300">Chiudi</button>
          </div>
          <div class="space-y-2">
            ${slots.map(sl => {
              const isAct = sl.slotId === active;
              return `
                <div class="bg-f1bg p-3 rounded-xl border ${isAct ? 'border-f1red' : 'border-f1border'} flex items-center justify-between gap-2">
                  <div class="min-w-0">
                    <div class="text-xs font-extrabold text-white flex items-center gap-1.5">
                      ${!sl.empty ? `<span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${sl.teamColor}"></span>` : ''}
                      <span>${sl.label}${isAct ? ' · Attivo' : ''}</span>
                    </div>
                    <div class="text-[11px] text-slate-400 font-mono-num truncate">
                      ${sl.empty ? 'Slot vuoto' : `${sl.teamName} · ${sl.season} R${sl.round} · €${sl.budget}M`}
                    </div>
                  </div>
                  <div class="flex gap-1.5 shrink-0">
                    <button type="button" onclick="switchSaveSlot('${sl.slotId}')" class="px-2.5 py-1.5 rounded-lg ${isAct ? 'bg-slate-800 text-slate-300' : 'bg-sky-600 hover:bg-sky-500 text-white'} text-[10px] font-extrabold">
                      ${isAct ? 'In uso' : (sl.empty ? 'Nuova' : 'Carica')}
                    </button>
                    ${!sl.empty ? `
                      <button type="button" onclick="deleteSaveSlot('${sl.slotId}')" class="px-2 py-1.5 rounded-lg bg-red-950/70 hover:bg-red-900 text-red-200 text-[10px] font-bold">
                        Elimina
                      </button>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }

  if (uiModal.type === 'driver_detail' && gameState) {
    const drv = (gameState.drivers || []).find(d => d.id === uiModal.driverId)
      || (gameState.freeAgents || []).find(f => f.id === uiModal.driverId);
    if (!drv) return '';
    const tm = drv.teamId ? getTeam(drv.teamId) : null;
    const mood = getMoodMeta(drv.mood);
    const trait = DRIVER_TRAITS[drv.trait] || DRIVER_TRAITS.tactician;
    const roleLabel = drv.role === 'lead' ? '1a Guida' : (drv.role === 'support' ? '2a Guida' : 'Pari Livello');
    return `
      <div class="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4" onclick="closeModal()">
        <div class="bg-f1card border border-f1border rounded-2xl p-5 max-w-md w-full space-y-3.5 shadow-2xl" onclick="event.stopPropagation()">
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="text-[11px] font-bold uppercase tracking-wider" style="color:${tm ? tm.color : '#34d399'}">
                #${drv.number} · ${tm ? `${tm.name} · ${roleLabel}` : 'Pilota Svincolato'}
              </div>
              <h3 class="text-lg font-extrabold text-white">${drv.name} (${drv.code})</h3>
              <div class="text-xs text-slate-400 font-mono-num">${drv.age} anni · Contratto ${drv.contract || 0}a · €${Number(drv.salary || 0).toFixed(1)}M/anno</div>
            </div>
            <button type="button" onclick="closeModal()" class="px-2.5 py-1 rounded-lg bg-slate-800 text-xs font-bold text-slate-300">Chiudi</button>
          </div>

          <div class="grid grid-cols-5 gap-1.5 text-center font-mono-num">
            <div class="bg-f1bg p-2 rounded-xl border border-f1border/70">
              <div class="text-[9px] text-slate-400">OVR</div>
              <div class="text-sm font-black text-white">${drv.ovr}</div>
            </div>
            <div class="bg-f1bg p-2 rounded-xl border border-f1border/70">
              <div class="text-[9px] text-slate-400">POT</div>
              <div class="text-sm font-black text-emerald-400">${drv.potential ?? drv.ovr}</div>
            </div>
            <div class="bg-f1bg p-2 rounded-xl border border-f1border/70">
              <div class="text-[9px] text-slate-400">PASSO</div>
              <div class="text-sm font-black text-sky-300">${drv.pace ?? drv.ovr}</div>
              <div class="text-[8px] text-slate-400">XP ${drv.trainingXp?.pace || 0}%</div>
            </div>
            <div class="bg-f1bg p-2 rounded-xl border border-f1border/70">
              <div class="text-[9px] text-slate-400">COST.</div>
              <div class="text-sm font-black text-white">${drv.cons ?? drv.ovr}</div>
              <div class="text-[8px] text-slate-400">XP ${drv.trainingXp?.cons || 0}%</div>
            </div>
            <div class="bg-f1bg p-2 rounded-xl border border-f1border/70">
              <div class="text-[9px] text-slate-400">GOMME</div>
              <div class="text-sm font-black text-amber-300">${drv.tyreMgmt ?? drv.ovr}</div>
              <div class="text-[8px] text-slate-400">XP ${drv.trainingXp?.tyreMgmt || 0}%</div>
            </div>
          </div>

          <div class="bg-f1bg p-3 rounded-xl border border-f1border/70 space-y-1.5 text-xs">
            <div class="flex items-center justify-between">
              <span class="font-bold text-white">${trait.icon} ${trait.label}</span>
              <span class="${mood.color} font-semibold">${mood.emoji} ${mood.label} (${drv.mood ?? 65}/100)</span>
            </div>
            <div class="text-[11px] text-slate-400">${trait.desc}</div>
            ${(drv.staminaShield || 0) > 0 ? `<div class="text-[10px] font-bold text-emerald-300">🛡️ Scudo atletico attivo per il prossimo GP</div>` : ''}
          </div>

          <div class="grid grid-cols-4 gap-2 text-center font-mono-num text-xs">
            <div class="bg-f1bg p-2 rounded-xl border border-f1border/70">
              <div class="text-[9px] text-slate-400">PUNTI</div>
              <div class="font-black text-amber-300">${drv.points || 0}</div>
            </div>
            <div class="bg-f1bg p-2 rounded-xl border border-f1border/70">
              <div class="text-[9px] text-slate-400">VITTORIE</div>
              <div class="font-black text-white">${drv.wins || 0}</div>
            </div>
            <div class="bg-f1bg p-2 rounded-xl border border-f1border/70">
              <div class="text-[9px] text-slate-400">PODI</div>
              <div class="font-black text-emerald-400">${drv.podiums || 0}</div>
            </div>
            <div class="bg-f1bg p-2 rounded-xl border border-f1border/70">
              <div class="text-[9px] text-slate-400">FATICA</div>
              <div class="font-black text-sky-300">${drv.fatigue ?? 15}%</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  return '';
}

function renderApp() {
  const root = document.getElementById('app');
  if (!root) return;

  if (!gameState) {
    root.innerHTML = renderTeamSelectScreen();
    return;
  }

  let bodyHtml = '';
  switch (gameState.activeTab) {
    case 'hub':
      bodyHtml = renderHubView();
      break;
    case 'weekend':
      bodyHtml = renderWeekendView();
      break;
    case 'calendar':
      bodyHtml = renderCalendarView();
      break;
    case 'rnd':
      bodyHtml = renderRndView();
      break;
    case 'market':
      bodyHtml = renderMarketView();
      break;
    case 'standings':
      bodyHtml = renderStandingsView();
      break;
    default:
      bodyHtml = renderHubView();
  }

  root.innerHTML = `
    ${renderTopHeader()}
    <main class="flex-1 overflow-y-auto no-scrollbar">${bodyHtml}</main>
    ${renderBottomNav()}
    ${renderActiveModal()}
  `;
}
