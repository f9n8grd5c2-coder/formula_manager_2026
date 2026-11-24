function renderTeamSelectScreen() {
  return `
    <div class="p-4 space-y-4">
      <div class="bg-f1card border border-f1border rounded-2xl p-4">
        <div class="text-[11px] font-extrabold uppercase tracking-wider text-f1red">Carriera 7 Stagioni (2026–2032) • Budget Cap €200M</div>
        <h1 class="text-xl font-black text-white mt-0.5">Formula Manager 2026</h1>
        <p class="text-xs text-slate-400 mt-1">Scegli lo sponsor iniziale e la tua scuderia. Cassa e Budget Cap FIA seguono le regole reali della F1.</p>
      </div>

      <div class="bg-f1card border border-f1border rounded-2xl p-3.5 space-y-2">
        <div class="text-xs font-extrabold uppercase tracking-wider text-amber-300">1. Scegli Sponsor Principale</div>
        <div class="space-y-1.5">
          ${SPONSOR_OPTIONS.map((sp, i) => `
            <button type="button" onclick="window.__tmpSponsorId='${sp.id}'; document.querySelectorAll('.sp-opt').forEach(el=>el.classList.remove('border-amber-400','bg-amber-950/30')); this.classList.add('border-amber-400','bg-amber-950/30');" class="sp-opt w-full text-left p-2.5 rounded-xl border ${i === 0 ? 'border-amber-400 bg-amber-950/30' : 'border-f1border bg-f1bg'}">
              <div class="flex justify-between text-xs font-extrabold text-white">
                <span>${sp.name}</span>
                <span class="font-mono-num text-emerald-400">+€${sp.upfront}M subito • €${sp.perRace}/GP</span>
              </div>
              <div class="text-[10px] text-slate-400 mt-0.5">${sp.tagline} (Podio +€${sp.podiumBonus}M • Vittoria +€${sp.winBonus}M)</div>
            </button>
          `).join('')}
        </div>
      </div>

      <div class="text-xs font-extrabold uppercase tracking-wider text-sky-300 px-1">2. Scegli Scuderia (Cassa Iniziale Proporzionata)</div>
      <div class="space-y-2.5 pb-6">
        ${INITIAL_TEAMS.map(t => {
          const tDrivers = INITIAL_DRIVERS.filter(d => d.teamId === t.id);
          const avgPerf = Math.round((t.aero + t.pu + t.chassis) / 3);
          const wages = tDrivers.reduce((s, d) => s + d.salary, 0).toFixed(1);
          return `
            <button onclick="selectTeamAndStart('${t.id}', window.__tmpSponsorId || '${SPONSOR_OPTIONS[0].id}')" class="w-full text-left bg-f1card hover:bg-slate-800/80 border border-f1border rounded-2xl p-3.5 transition active:scale-[0.99]">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                  <span class="w-3.5 h-8 rounded-full inline-block" style="background:${t.color}"></span>
                  <div>
                    <div class="text-sm font-extrabold text-white">${t.name}</div>
                    <div class="text-[11px] text-slate-400">${tDrivers.map(d => d.name).join(' • ')}</div>
                    <div class="text-[10px] text-slate-500 font-mono-num">Monte ingaggi: €${wages}M (fuori Cap)</div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-xs font-mono-num font-extrabold text-white">Auto ${avgPerf}</div>
                  <div class="text-[11px] font-mono-num text-emerald-400">Cassa €${t.budget.toFixed(1)}M</div>
                </div>
              </div>
            </button>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderTopHeader() {
  const team = getUserTeam();
  const track = CALENDAR_2026[gameState.round - 1] || CALENDAR_2026[23];
  const dayTag = getWeekendDayBadge(gameState.weekend);
  const remCap = getRemainingBudgetCap();
  const capLimit = getBudgetCapLimit();
  return `
    <header class="sticky top-0 z-30 bg-f1bg/95 backdrop-blur border-b border-f1border px-4 py-2.5 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-6 rounded-full" style="background:${team.color}"></span>
        <div>
          <div class="text-xs font-extrabold text-white leading-tight">${team.name} <span class="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 ml-1">${dayTag}</span></div>
          <div class="text-[10px] text-slate-400 font-mono-num">Anno ${gameState.season}/${gameState.maxSeasons} • G${gameState.careerDay || 1} • GP${gameState.round}/24 ${track.flag}</div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <div class="text-right font-mono-num">
          <div class="text-xs font-extrabold text-emerald-400">Cassa €${team.budget.toFixed(1)}M</div>
          <div class="text-[9px] ${remCap < 15 ? 'text-amber-300 font-bold' : 'text-sky-300'}">Cap: €${remCap.toFixed(1)}M / €${capLimit.toFixed(0)}M</div>
        </div>
        <button onclick="if(confirm('Vuoi azzerare la carriera?')) resetCareer()" class="px-2 py-1 rounded-lg bg-slate-800 text-[10px] text-slate-400 hover:text-white">Reset</button>
      </div>
    </header>
  `;
}

function renderBottomNav() {
  const tabs = [
    { id: 'hub', icon: '🏠', label: 'Paddock' },
    { id: 'weekend', icon: '🏁', label: 'Weekend' },
    { id: 'calendar', icon: '📅', label: 'Calendario' },
    { id: 'rnd', icon: '🔧', label: 'Garage' },
    { id: 'market', icon: '🤝', label: 'Mercato' },
    { id: 'standings', icon: '🏆', label: 'Classifiche' }
  ];
  return `
    <nav class="sticky bottom-0 z-30 bg-f1card/95 backdrop-blur border-t border-f1border grid grid-cols-6 py-1.5 px-0.5">
      ${tabs.map(t => {
        const active = gameState.activeTab === t.id;
        return `
          <button onclick="setActiveTab('${t.id}')" class="flex flex-col items-center justify-center py-1 rounded-xl transition ${active ? 'text-f1red font-extrabold' : 'text-slate-400 hover:text-slate-200'}">
            <span class="text-sm leading-none">${t.icon}</span>
            <span class="text-[9px] mt-1">${t.label}</span>
          </button>
        `;
      }).join('')}
    </nav>
  `;
}

function renderCalendarView() {
  const doneList = gameState.completedRounds || [];
  return `
    <div class="p-4 space-y-3">
      <div class="bg-f1card border border-f1border rounded-2xl p-4">
        <span class="text-[10px] font-bold uppercase tracking-wider text-f1red">Stagione ${gameState.season} (Ciclo fino al ${gameState.maxSeasons})</span>
        <h2 class="text-lg font-extrabold text-white mt-0.5">Calendario Annuale • 24 GP</h2>
        <p class="text-xs text-slate-400 mt-1">Sprint: Ven FP1 + Qualifica Sprint; Sab FP2 + Gara Sprint + Qualifiche GP; Dom Strategia + GP.</p>
      </div>
      <div class="space-y-2 pb-4">
        ${CALENDAR_2026.map(tr => {
          const isCurrent = tr.round === gameState.round;
          const isDone = doneList.some(x => x.round === tr.round && x.season === gameState.season) || tr.round < gameState.round;
          const statusBadge = isCurrent
            ? '<span class="px-2 py-0.5 rounded bg-f1red text-white text-[9px] font-extrabold">IN CORSO</span>'
            : (isDone
              ? '<span class="px-2 py-0.5 rounded bg-emerald-900/70 text-emerald-300 text-[9px] font-bold">DISPUTATO</span>'
              : '<span class="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[9px] font-bold">IN PROGRAMMA</span>');
          return `
            <div class="bg-f1card border ${isCurrent ? 'border-f1red' : 'border-f1border'} rounded-2xl p-3 space-y-1">
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="text-xs font-mono-num font-black text-slate-400">R${String(tr.round).padStart(2, '0')}</span>
                  <span class="text-base">${tr.flag}</span>
                  <div class="truncate">
                    <div class="text-xs font-extrabold text-white truncate">${tr.name} <span class="text-[10px] text-slate-400 font-normal">(${tr.dateLabel})</span></div>
                    <div class="text-[10px] text-slate-400 truncate">${tr.circuit} • ${tr.laps} Giri • Pioggia ${Math.round(tr.rainChance * 100)}%</div>
                  </div>
                </div>
                <div class="flex flex-col items-end gap-1 shrink-0">
                  ${statusBadge}
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
    <div class="p-4 space-y-3.5">
      <div class="bg-f1card border border-f1border rounded-2xl p-4 space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-f1red">GP ${gameState.round}/24 • ${track.dateLabel} ${track.hasSprint ? '• ⚡ SPRINT' : ''}</span>
            <h2 class="text-lg font-extrabold text-white">${track.flag} GP ${track.name}</h2>
            <div class="text-xs text-slate-400">${track.circuit} • ${track.laps} Giri • Pioggia ${Math.round(track.rainChance * 100)}%</div>
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

        <div class="grid grid-cols-2 gap-2">
          <button onclick="advanceSingleDay(false)" class="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-f1border font-extrabold text-xs text-white">
            ⏭ AVANZA GIORNO
          </button>
          <button onclick="advanceToNextWeekend()" class="py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 font-extrabold text-xs text-white">
            🏁 AL PROSSIMO WEEKEND
          </button>
        </div>

        <button onclick="setActiveTab('weekend')" class="w-full py-3 rounded-xl bg-f1red hover:bg-red-600 font-extrabold text-sm text-white shadow-lg shadow-f1red/25">
          ENTRA IN PISTA (${getWeekendDayBadge(gameState.weekend)}) →
        </button>
      </div>

      <div class="bg-f1card border border-f1border rounded-2xl p-4 space-y-2.5">
        <h3 class="text-xs font-bold uppercase tracking-wider text-amber-300">Attivita Extra & Allenamento</h3>
        <div class="grid grid-cols-2 gap-2">
          <button onclick="runExtraActivity('simulator')" class="p-2.5 rounded-xl bg-f1bg hover:bg-slate-800 border border-f1border text-left">
            <div class="text-xs font-extrabold text-white">🎮 Simulatore Piloti</div>
            <div class="text-[10px] text-amber-300 font-mono-num">-€2.5M (Cap) • +Fatica</div>
          </button>
          <button onclick="runExtraActivity('media_sponsor')" class="p-2.5 rounded-xl bg-f1bg hover:bg-slate-800 border border-f1border text-left">
            <div class="text-xs font-extrabold text-white">🎤 Sponsor & Media Day</div>
            <div class="text-[10px] text-emerald-400 font-mono-num">+Bonus Cassa • +Morale</div>
          </button>
          <button onclick="runExtraActivity('team_building')" class="p-2.5 rounded-xl bg-f1bg hover:bg-slate-800 border border-f1border text-left">
            <div class="text-xs font-extrabold text-white">🤝 Team Building</div>
            <div class="text-[10px] text-sky-300 font-mono-num">-€2.0M (Fuori Cap) • +Morale</div>
          </button>
          <button onclick="runExtraActivity('wind_tunnel')" class="p-2.5 rounded-xl bg-f1bg hover:bg-slate-800 border border-f1border text-left">
            <div class="text-xs font-extrabold text-white">💨 Galleria del Vento</div>
            <div class="text-[10px] text-amber-300 font-mono-num">-€4.0M (Cap) • +0.4 Aero</div>
          </button>
        </div>
      </div>

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
              <div class="bg-f1bg p-3 rounded-xl border border-f1border/70 space-y-1.5">
                <div class="flex items-center justify-between">
                  <div>
                    <span class="font-mono-num font-extrabold text-xs px-1.5 py-0.5 rounded bg-slate-800 mr-1" style="color:${team.color}">#${d.number}</span>
                    <span class="text-sm font-extrabold text-white">${d.name}</span>
                    <span class="text-[10px] text-slate-400 ml-1">(${d.age}a • Contr. ${d.contract}a)</span>
                  </div>
                  <div class="text-right font-mono-num">
                    <span class="text-xs font-black text-white">OVR ${d.ovr}</span>
                    <span class="text-[10px] text-sky-300 ml-1">POT ${d.potential ?? d.ovr}</span>
                  </div>
                </div>
                <div class="flex flex-wrap items-center justify-between gap-1 text-[10px]">
                  <span class="px-1.5 py-0.5 rounded border ${mood.bg} ${mood.color} font-semibold">${mood.emoji} ${mood.label} (${d.mood ?? 65})</span>
                  <span class="text-slate-300">${trait.icon} ${trait.label}</span>
                  <span class="font-mono-num ${fat >= 60 ? 'text-red-400' : 'text-sky-300'}">Fatica ${fat}%</span>
                </div>
              </div>
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
        <div class="space-y-1.5 max-h-44 overflow-y-auto no-scrollbar">
          ${filteredMedia.slice(0, 10).map(m => `
            <div class="text-xs text-slate-200 bg-f1bg p-2.5 rounded-xl border border-f1border/50 leading-snug">
              <span class="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 mr-1.5">${m.source} • Y${m.season || 2026}</span>
              <span>${m.text}</span>
            </div>
          `).join('')}
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
    <div class="p-4 space-y-3.5 pb-6">
      <div class="bg-f1card border border-f1border rounded-2xl p-3.5 space-y-2.5">
        <div class="flex items-center justify-between">
          <div class="text-xs font-extrabold uppercase tracking-wider text-amber-300">Finanze Scuderia & Budget Cap FIA</div>
          <span class="text-[10px] font-mono-num text-slate-400">Sponsor: ${sponsor.name}</span>
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
          <span>Stipendi piloti attuali: €${driverWages.toFixed(1)}M (fuori Cap)</span>
          <span>FOM fine anno: per pos. Costruttori</span>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-1.5 bg-f1card p-1 rounded-2xl border border-f1border">
        <button onclick="setRndSection('garage')" class="py-2 rounded-xl text-xs font-extrabold transition ${rndSec === 'garage' ? 'bg-f1red text-white' : 'text-slate-400'}">🔧 Garage & Auto</button>
        <button onclick="setRndSection('rnd')" class="py-2 rounded-xl text-xs font-extrabold transition ${rndSec === 'rnd' ? 'bg-sky-600 text-white' : 'text-slate-400'}">🧪 Sviluppo R&D</button>
      </div>

      ${rndSec === 'garage' ? `
        <div class="bg-f1card border border-f1border rounded-2xl p-4 space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xs font-extrabold uppercase tracking-wider text-slate-300">Componenti Auto (${team.short})</div>
              <div class="text-[11px] font-mono-num text-slate-400">Aero ${team.aero.toFixed(1)} • PU ${team.pu.toFixed(1)} • Telaio ${team.chassis.toFixed(1)} • Affid. ${team.rel.toFixed(1)}%</div>
            </div>
            <div class="flex gap-1 bg-f1bg p-1 rounded-xl border border-f1border">
              <button onclick="setGarageCarTab(1)" class="px-2.5 py-1 rounded-lg text-xs font-extrabold ${carTab === 1 ? 'bg-f1red text-white' : 'text-slate-400'}">Auto #1</button>
              <button onclick="setGarageCarTab(2)" class="px-2.5 py-1 rounded-lg text-xs font-extrabold ${carTab === 2 ? 'bg-f1red text-white' : 'text-slate-400'}">Auto #2</button>
            </div>
          </div>

          <div class="space-y-2">
            ${parts.map(p => `
              <div class="bg-f1bg p-3 rounded-xl border border-f1border/70 flex items-center justify-between gap-2">
                <div>
                  <div class="text-xs font-extrabold text-white">${p.name}</div>
                  <div class="text-[10px] text-slate-400 font-mono-num">${slotNames[p.slot] || p.slot} • Perf ${p.perf} • Affid. ${p.rel}%</div>
                </div>
                <button onclick="boostSinglePart('${p.id}')" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-f1border text-[10px] font-extrabold text-amber-300 shrink-0">
                  Affina (€2.0M)
                </button>
              </div>
            `).join('')}
          </div>

          <div class="pt-1 border-t border-f1border/60 space-y-1.5">
            <div class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Costruisci Nuovo Componente per Auto #${carTab} (€6.5M • nel Cap)</div>
            <div class="grid grid-cols-3 gap-1.5">
              <button onclick="buildNewGaragePart('pu')" class="py-2 px-2 rounded-xl bg-f1bg hover:bg-slate-800 border border-f1border text-[10px] font-extrabold text-white">+ Power Unit</button>
              <button onclick="buildNewGaragePart('chassis')" class="py-2 px-2 rounded-xl bg-f1bg hover:bg-slate-800 border border-f1border text-[10px] font-extrabold text-white">+ Telaio</button>
              <button onclick="buildNewGaragePart('steer')" class="py-2 px-2 rounded-xl bg-f1bg hover:bg-slate-800 border border-f1border text-[10px] font-extrabold text-white">+ Sterzo/Aero</button>
            </div>
          </div>
        </div>
      ` : `
        ${confirmBox ? `
          <div class="bg-amber-950/50 border-2 border-amber-400 rounded-2xl p-4 space-y-3">
            <div class="text-xs font-black uppercase tracking-wider text-amber-300">Conferma Avvio Sviluppo</div>
            <div class="text-sm font-extrabold text-white">${confirmBox.areaLabel} — Pacchetto ${confirmBox.tierLabel} (+${confirmBox.gain})</div>
            <div class="text-xs text-slate-200 font-mono-num">Costo: €${confirmBox.cost.toFixed(1)}M (nel Budget Cap) • Tempo: ${confirmBox.days} giorni</div>
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
                  <div class="text-[10px] text-slate-400 font-mono-num">Completamento tra ${u.daysLeft} gg • Costo €${Number(u.cost || 4.5).toFixed(1)}M</div>
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
                    <div class="text-[10px] font-mono-num text-amber-300">€${t.cost.toFixed(1)}M • ${t.days}gg</div>
                  </button>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

function renderMarketView() {
  const team = getUserTeam();
  const uDrivers = getUserDrivers();
  const freeAgents = gameState.freeAgents || [];
  const currentWages = getDriversWageBill(team.id);

  return `
    <div class="p-4 space-y-3.5 pb-6">
      <div class="bg-f1card border border-f1border rounded-2xl p-4">
        <span class="text-[10px] font-bold uppercase tracking-wider text-sky-300">Mercato Piloti & Contratti (Fuori Budget Cap)</span>
        <h2 class="text-lg font-extrabold text-white mt-0.5">Line-up & Svincolati</h2>
        <div class="text-[11px] font-mono-num text-slate-400 mt-1">Cassa: €${team.budget.toFixed(1)}M • Monte ingaggi attuale: €${currentWages.toFixed(1)}M/anno</div>
      </div>

      <div class="bg-f1card border border-f1border rounded-2xl p-4 space-y-2.5">
        <h3 class="text-xs font-extrabold uppercase tracking-wider text-amber-300">Piloti Sotto Contratto (${team.name})</h3>
        ${uDrivers.map(d => {
          const fee = (d.salary * 0.4).toFixed(1);
          return `
            <div class="bg-f1bg p-3 rounded-xl border border-f1border/70 flex items-center justify-between gap-2">
              <div>
                <div class="text-xs font-extrabold text-white">${d.name} <span class="text-sky-300 font-mono-num">OVR ${d.ovr}</span></div>
                <div class="text-[10px] text-slate-400 font-mono-num">Scadenza: ${d.contract}a • Ingaggio: €${d.salary.toFixed(1)}M/a</div>
              </div>
              <button onclick="renewDriverContract('${d.id}')" class="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-[10px] font-extrabold text-white shrink-0">
                Rinnova +2a (€${fee}M)
              </button>
            </div>
          `;
        }).join('')}
      </div>

      <div class="bg-f1card border border-f1border rounded-2xl p-4 space-y-2.5">
        <h3 class="text-xs font-extrabold uppercase tracking-wider text-emerald-400">Piloti Svincolati Disponibili</h3>
        ${freeAgents.map(fa => {
          const bonus = (fa.salary * 0.5).toFixed(1);
          return `
            <div class="bg-f1bg p-3 rounded-xl border border-f1border/70 flex items-center justify-between gap-2">
              <div>
                <div class="text-xs font-extrabold text-white">${fa.name} <span class="text-sky-300 font-mono-num">OVR ${fa.ovr}</span></div>
                <div class="text-[10px] text-slate-400 font-mono-num">${fa.age}a • Ingaggio: €${fa.salary.toFixed(1)}M/a • Bonus firma: €${bonus}M</div>
              </div>
              <button onclick="signFreeAgent('${fa.id}')" class="px-2.5 py-1.5 rounded-lg bg-f1red hover:bg-red-600 text-[10px] font-extrabold text-white shrink-0">
                Ingaggia
              </button>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderStandingsView() {
  const sortedDrivers = [...gameState.drivers].filter(d => d.teamId).sort((a, b) => (b.points || 0) - (a.points || 0) || (b.wins || 0) - (a.wins || 0) || b.ovr - a.ovr);
  const sortedTeams = [...gameState.teams].sort((a, b) => (b.points || 0) - (a.points || 0) || (b.wins || 0) - (a.wins || 0));

  return `
    <div class="p-4 space-y-4 pb-6">
      <div class="bg-f1card border border-f1border rounded-2xl p-4 space-y-2.5">
        <h2 class="text-sm font-black uppercase tracking-wider text-amber-300">Classifica Costruttori ${gameState.season}</h2>
        ${sortedTeams.map((t, idx) => {
          const prize = FOM_PRIZE_POOL[idx] || 60.0;
          return `
            <div class="flex items-center justify-between bg-f1bg px-3 py-2 rounded-xl border ${t.id === gameState.userTeamId ? 'border-f1red' : 'border-f1border/60'} text-xs">
              <div class="flex items-center gap-2">
                <span class="font-mono-num font-black text-slate-400 w-5">${idx + 1}.</span>
                <span class="w-2.5 h-2.5 rounded-full" style="background:${t.color}"></span>
                <span class="font-extrabold text-white">${t.name}</span>
              </div>
              <div class="text-right font-mono-num">
                <span class="font-black text-white">${t.points || 0} pt</span>
                <span class="text-[10px] text-emerald-400 ml-2">FOM €${prize.toFixed(0)}M</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="bg-f1card border border-f1border rounded-2xl p-4 space-y-2">
        <h2 class="text-sm font-black uppercase tracking-wider text-sky-300">Classifica Piloti ${gameState.season}</h2>
        ${sortedDrivers.map((d, idx) => {
          const tm = getTeam(d.teamId);
          return `
            <div class="flex items-center justify-between bg-f1bg px-3 py-2 rounded-xl border ${d.teamId === gameState.userTeamId ? 'border-f1red/70' : 'border-f1border/60'} text-xs">
              <div class="flex items-center gap-2">
                <span class="font-mono-num font-black text-slate-400 w-5">${idx + 1}.</span>
                <span class="font-extrabold text-white">${d.name}</span>
                <span class="text-[10px]" style="color:${tm.color}">${tm.short}</span>
              </div>
              <span class="font-mono-num font-black text-amber-300">${d.points || 0} pt</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderFpPhase(w, uDrivers) {
  const slot = w.fp.activeSlot || 'd1';
  const setup = w.fp[slot] || w.fp.d1;
  const drv = slot === 'd1' ? uDrivers[0] : uDrivers[1];
  const maxSessions = w.hasSprint ? 2 : 3;
  const sliders = [
    { key: 'wing', label: 'Ala / Carico Aero' },
    { key: 'susp', label: 'Sospensioni' },
    { key: 'brake', label: 'Bilanciamento Freni' },
    { key: 'ride', label: 'Altezza da Terra' },
    { key: 'diff', label: 'Differenziale' }
  ];

  return `
    <div class="bg-f1card border border-f1border rounded-2xl p-4 space-y-3">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-xs font-extrabold uppercase tracking-wider text-sky-300">Prove Libere FP${w.fp.session}/${maxSessions}</div>
          <div class="text-[11px] font-mono-num text-slate-400">Run rimasti: ${w.fp.runsLeftInSession} • Feeling ${drv?.code || ''}: <strong class="text-emerald-400">${setup?.confidence || 0}%</strong></div>
        </div>
        <div class="flex gap-1 bg-f1bg p-1 rounded-xl border border-f1border">
          ${uDrivers.map((ud, i) => {
            const k = i === 0 ? 'd1' : 'd2';
            return `<button onclick="setFpActiveSlot('${k}')" class="px-2.5 py-1 rounded-lg text-xs font-extrabold ${slot === k ? 'bg-f1red text-white' : 'text-slate-400'}">${ud.code}</button>`;
          }).join('')}
        </div>
      </div>

      <div class="text-xs bg-f1bg p-2.5 rounded-xl border border-f1border/70 text-slate-200">${setup?.feedback || ''}</div>

      <div class="space-y-2.5">
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
          ▶ ESEGUI RUN (${w.fp.runsLeftInSession})
        </button>
        <button onclick="advanceFpSession()" class="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-f1border font-extrabold text-xs text-white">
          ${w.fp.session < maxSessions ? `AVANTI A FP${w.fp.session + 1} →` : 'VAI ALLE QUALIFICHE →'}
        </button>
      </div>
    </div>
  `;
}

function renderPreRaceStrategy(w, track, uDrivers) {
  const strat = w.preRaceStrategy || {
    d1: { tyre: 'M', push: 'balanced', pitLap: Math.round(track.laps * 0.45) },
    d2: { tyre: 'H', push: 'balanced', pitLap: Math.round(track.laps * 0.52) }
  };
  return `
    <div class="bg-f1card border border-f1border rounded-2xl p-4 space-y-3">
      <div class="text-xs font-extrabold uppercase tracking-wider text-amber-300">Strategia Pre-Gara</div>
      ${uDrivers.map((ud, idx) => {
        const sk = idx === 0 ? 'd1' : 'd2';
        const st = strat[sk];
        return `
          <div class="bg-f1bg p-3 rounded-xl border border-f1border/70 space-y-2">
            <div class="flex justify-between text-xs font-extrabold text-white">
              <span>${ud.name} (${ud.code})</span>
              <span class="font-mono-num text-sky-300">Gomma iniziale: ${st.tyre} • Box Giro ${st.pitLap}</span>
            </div>
            <div class="grid grid-cols-3 gap-1.5">
              ${['S', 'M', 'H'].map(c => `
                <button onclick="setPreRaceChoice('${sk}', 'tyre', '${c}')" class="py-1.5 rounded-lg text-xs font-black border ${st.tyre === c ? 'border-white bg-slate-700 text-white' : 'border-f1border bg-f1card text-slate-400'}">${c}</button>
              `).join('')}
            </div>
            <div class="flex items-center justify-between text-[11px] font-mono-num text-slate-300">
              <span>Giro Sosta: ${st.pitLap} / ${track.laps}</span>
              <input type="range" min="5" max="${Math.max(8, track.laps - 4)}" value="${st.pitLap}" onchange="setPreRaceChoice('${sk}', 'pitLap', this.value)" class="w-36" />
            </div>
          </div>
        `;
      }).join('')}
      <button onclick="startLiveRace()" class="w-full py-3 rounded-xl bg-f1red hover:bg-red-600 font-black text-sm text-white">
        🚦 SEMAFORI VERDI — AL VIA DEL GP!
      </button>
    </div>
  `;
}

function renderLiveRacePhase(w, track) {
  const race = w.race;
  const ordered = [...race.cars].sort((a, b) => a.pos - b.pos);
  const userCars = ordered.filter(c => c.isUser);

  return `
    <div class="space-y-3">
      <div class="bg-f1card border border-f1border rounded-2xl p-3.5 flex items-center justify-between">
        <div>
          <div class="text-xs font-extrabold text-white">Giro ${race.currentLap} / ${track.laps} • ${race.weather}</div>
          <div class="text-[10px] text-slate-400 truncate max-w-[230px]">${race.events[0] || ''}</div>
        </div>
        <button onclick="stepRaceOneLap()" class="px-3.5 py-2 rounded-xl bg-f1red hover:bg-red-600 font-black text-xs text-white shrink-0">
          +1 GIRO →
        </button>
      </div>

      <div class="grid grid-cols-1 gap-2">
        ${userCars.map(uc => `
          <div class="bg-f1card border border-f1border rounded-2xl p-3 space-y-2">
            <div class="flex items-center justify-between text-xs">
              <span class="font-extrabold text-white">P${uc.pos} • ${uc.name}</span>
              <span class="font-mono-num text-amber-300">Gomma ${uc.tyre} (${uc.tyreWear}% usura) • Box ${uc.pitStops}</span>
            </div>
            <div class="grid grid-cols-4 gap-1.5">
              <button onclick="setLiveCarPush('${uc.driverId}', 'conserve')" class="py-1 rounded-lg text-[10px] font-bold ${uc.pushMode === 'conserve' ? 'bg-sky-600 text-white' : 'bg-f1bg text-slate-400'}">Risparmio</button>
              <button onclick="setLiveCarPush('${uc.driverId}', 'balanced')" class="py-1 rounded-lg text-[10px] font-bold ${uc.pushMode === 'balanced' ? 'bg-slate-600 text-white' : 'bg-f1bg text-slate-400'}">Neutro</button>
              <button onclick="setLiveCarPush('${uc.driverId}', 'push')" class="py-1 rounded-lg text-[10px] font-bold ${uc.pushMode === 'push' ? 'bg-f1red text-white' : 'bg-f1bg text-slate-400'}">Spingi</button>
              <button onclick="pitUserCarNow('${uc.driverId}', 'H')" class="py-1 rounded-lg text-[10px] font-extrabold bg-amber-500/20 border border-amber-400/50 text-amber-200">Box H</button>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="bg-f1card border border-f1border rounded-2xl p-3 space-y-1.5">
        <div class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Live Timing</div>
        ${ordered.slice(0, 12).map(c => `
          <div class="flex items-center justify-between text-xs bg-f1bg px-2.5 py-1.5 rounded-lg ${c.isUser ? 'border border-f1red/70' : ''}">
            <div class="flex items-center gap-2">
              <span class="font-mono-num font-black w-5 text-slate-400">${c.retired ? 'R' : c.pos}</span>
              <span class="w-2 h-2 rounded-full" style="background:${c.teamColor}"></span>
              <span class="font-bold text-white">${c.name}</span>
            </div>
            <div class="font-mono-num text-[11px] text-slate-300">
              <span>${c.tyre}</span>
              <span class="ml-2 text-sky-300">${formatLapTime(c.lastLapSec)}</span>
            </div>
          </div>
        `).join('')}
      </div>
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
        ${res.classification.map(r => `
          <div class="flex items-center justify-between text-xs bg-f1bg px-3 py-1.5 rounded-xl border ${r.isUser ? 'border-f1red' : 'border-f1border/50'}">
            <div class="flex items-center gap-2">
              <span class="font-mono-num font-black w-6 text-slate-400">${r.pos}</span>
              <span class="font-extrabold text-white">${r.name}</span>
              <span class="text-[10px] text-slate-400">${r.teamName}</span>
            </div>
            <span class="font-mono-num font-bold text-amber-300">+${r.pts} pt</span>
          </div>
        `).join('')}
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

  return `
    <div class="p-4 space-y-3.5 pb-6">
      <div class="bg-f1card border border-f1border rounded-2xl p-4 space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-extrabold uppercase tracking-wider text-f1red">${getWeekendDayBadge(w)} • GP ${track.round}/24</span>
          <span class="text-[10px] font-mono-num text-slate-400">${track.laps} Giri • Degrado ${track.tyreDeg}/3</span>
        </div>
        <h2 class="text-lg font-extrabold text-white">${track.flag} ${track.name} — ${track.circuit}</h2>
        <svg viewBox="0 0 300 160" class="w-full h-24 bg-f1bg rounded-xl border border-f1border/60 p-2">
          <path d="${track.path}" fill="none" stroke="#334155" stroke-width="8" stroke-linejoin="round" />
          <path d="${track.path}" fill="none" stroke="#e10600" stroke-width="3" stroke-linejoin="round" stroke-dasharray="14 6" />
        </svg>
      </div>

      ${w.phase === 'fp' ? renderFpPhase(w, uDrivers) : ''}
      ${w.phase === 'sprint_quali' || w.phase === 'sprint_race' ? `
        <div class="bg-f1card border border-f1border rounded-2xl p-4 space-y-3">
          <div class="text-sm font-extrabold text-white">⚡ Weekend Sprint: Qualifiche & Gara Sprint</div>
          <p class="text-xs text-slate-400">Simula la sequenza Sprint e assegna i punti Sprint (8-1) prima delle Qualifiche del Gran Premio.</p>
          <button onclick="simulateSprintWeekendSequence()" class="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs">
            SIMULA QUALIFICHE + GARA SPRINT →
          </button>
        </div>
      ` : ''}
      ${w.phase === 'quali' ? `
        <div class="bg-f1card border border-f1border rounded-2xl p-4 space-y-3">
          <div class="text-sm font-extrabold text-white">⏱️ Qualifiche Ufficiali GP ${track.name}</div>
          <p class="text-xs text-slate-400">Il feeling dell'assetto raccolto nelle prove libere influenza il giro secco in qualifica.</p>
          <button onclick="simulateQualifying()" class="w-full py-3 rounded-xl bg-f1red hover:bg-red-600 font-black text-xs text-white">
            SCENDI IN PISTA PER LE QUALIFICHE →
          </button>
        </div>
      ` : ''}
      ${w.phase === 'strategy' ? renderPreRaceStrategy(w, track, uDrivers) : ''}
      ${w.phase === 'race' ? renderLiveRacePhase(w, track) : ''}
      ${w.phase === 'summary' ? renderRaceSummaryPhase(w) : ''}
    </div>
  `;
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
  `;
}
