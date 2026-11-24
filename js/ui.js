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
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r}" fill="${d.color}" stroke="${stroke}" stroke-width="${sw}" />
        ${d.isUser ? `<text x="${(cx + 6).toFixed(1)}" y="${(cy + 3).toFixed(1)}" fill="#ffffff" font-size="8" font-weight="800" font-family="JetBrains Mono, monospace">${d.code}</text>` : ''}
      </g>
    `;
  }).join('');

  return `
    <svg viewBox="0 0 300 162" class="w-full h-36 bg-f1bg rounded-xl border border-f1border/70 p-1">
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

      <div class="space-y-1.5">
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
          ▶ RUN ENTRAMBI (${w.fp.runsLeftInSession})
        </button>
        <button onclick="advanceFpSession()" class="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-f1border font-extrabold text-xs text-white">
          ${w.fp.session < maxSessions ? `AVANTI A FP${w.fp.session + 1} →` : 'VAI ALLE QUALIFICHE →'}
        </button>
      </div>
    </div>
  `;
}

// =========================================================
// QUALIFICHE Q1 / Q2 / Q3 IN TEMPO REALE
// =========================================================
function renderLiveQualiPhase(w, track) {
  const q = w.quali;
  if (!q) return '';
  const mins = Math.floor(q.timeLeftSec / 60);
  const secs = Math.floor(q.timeLeftSec % 60);
  const clockStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const stageObj = QUALI_STAGES[q.stageIndex] || QUALI_STAGES[0];
  const activeDrivers = getSortedQualiActive(q);
  const userParticipants = q.participants.filter(p => p.isUser);
  const dots = activeDrivers.map(p => ({
    code: p.code,
    color: p.teamColor,
    isUser: p.isUser,
    inPit: p.status === 'pit',
    pitProgress: p.pitProgress,
    trackProgress: p.trackProgress
  }));

  return `
    <div class="space-y-3">
      <div class="bg-f1card border border-f1border rounded-2xl p-3.5 space-y-2.5">
        <div class="flex items-center justify-between">
          <div>
            <span class="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-f1red text-white">${q.stageLabel}</span>
            <span class="text-xs font-extrabold text-white ml-1.5">${q.isWet ? '🌧️ Bagnato' : '☀️ Asciutto'}</span>
          </div>
          <div class="font-mono-num text-base font-black text-amber-300">⏱️ ${clockStr}</div>
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
              return `<button onclick="setQualiSpeed(${btn.s})" class="px-2.5 py-1 rounded-lg text-[11px] font-mono-num font-extrabold ${isAct ? 'bg-f1red text-white' : 'bg-f1bg text-slate-300 border border-f1border'}">${btn.l}</button>`;
            }).join('')}
          </div>
          ${!q.stageFinished ? `
            <button onclick="skipToEndOfCurrentQualiStage()" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-f1border text-[10px] font-extrabold text-slate-200">
              Fine ${q.stageLabel} ⏭
            </button>
          ` : ''}
        </div>

        <div class="text-[11px] bg-f1bg px-2.5 py-1.5 rounded-xl border border-f1border/70 text-slate-300 truncate">
          ${q.events[0] || ''}
        </div>
      </div>

      ${q.stageFinished ? `
        <button onclick="advanceToNextQualiStage()" class="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-black text-xs text-white shadow-lg">
          ${q.allFinished ? 'VAI ALLA STRATEGIA PRE-GARA →' : `PROSEGUI A ${QUALI_STAGES[q.stageIndex + 1]?.label} →`}
        </button>
      ` : `
        <div class="space-y-2">
          ${userParticipants.map(up => {
            const isElim = !!up.eliminatedIn;
            return `
              <div class="bg-f1card border ${isElim ? 'border-slate-700 opacity-60' : 'border-f1border'} rounded-2xl p-3 space-y-2">
                <div class="flex items-center justify-between text-xs">
                  <span class="font-extrabold text-white">${up.name} (${up.code})</span>
                  <span class="font-mono-num text-amber-300 font-bold">
                    ${isElim ? `Eliminato (${up.eliminatedIn})` : `${up.status.toUpperCase()} • ${formatLapTime(up.bestLapSec)}`}
                  </span>
                </div>
                ${up.lastErrorNote ? `<div class="text-[10px] text-red-400 font-bold">${up.lastErrorNote}</div>` : ''}
                ${!isElim ? `
                  <div class="grid grid-cols-2 gap-2">
                    <div class="flex gap-1">
                      ${(q.isWet ? ['I', 'W'] : ['S', 'M', 'H']).map(c => `
                        <button onclick="setQualiDriverChoice('${up.driverId}', 'tyre', '${c}')" class="flex-1 py-1 rounded-lg text-[10px] font-black border ${up.tyre === c ? 'bg-slate-700 border-white text-white' : 'bg-f1bg border-f1border text-slate-400'}">${c}</button>
                      `).join('')}
                    </div>
                    <div class="flex gap-1">
                      ${[
                        { id: 'safe', l: 'Prud.' },
                        { id: 'balanced', l: 'Bil.' },
                        { id: 'push', l: 'Rischio' }
                      ].map(rk => `
                        <button onclick="setQualiDriverChoice('${up.driverId}', 'risk', '${rk.id}')" class="flex-1 py-1 rounded-lg text-[10px] font-extrabold border ${up.risk === rk.id ? 'bg-amber-500/25 border-amber-400 text-amber-200' : 'bg-f1bg border-f1border text-slate-400'}">${rk.l}</button>
                      `).join('')}
                    </div>
                  </div>
                  ${up.status === 'pit' ? `
                    <button onclick="sendQualiDriverOut('${up.driverId}')" class="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-extrabold text-white">
                      🚀 MANDA IN PISTA PER GIRO VELOCE
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

      <div class="bg-f1card border border-f1border rounded-2xl p-3 space-y-1">
        <div class="flex justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
          <span>Classifica ${q.stageLabel}</span>
          <span>Taglio Top ${stageObj.advanceCount}</span>
        </div>
        ${activeDrivers.map((p, idx) => {
          const isCutoff = idx >= stageObj.advanceCount;
          return `
            <div class="flex items-center justify-between text-xs bg-f1bg px-2.5 py-1.5 rounded-lg ${p.isUser ? 'border border-f1red/70' : ''} ${isCutoff ? 'opacity-65' : ''}">
              <div class="flex items-center gap-2">
                <span class="font-mono-num font-black w-5 ${isCutoff ? 'text-red-400' : 'text-slate-400'}">${idx + 1}</span>
                <span class="w-2 h-2 rounded-full" style="background:${p.teamColor}"></span>
                <span class="font-bold text-white">${p.name}</span>
              </div>
              <div class="font-mono-num text-[11px]">
                <span class="text-slate-400 mr-1.5">${p.status === 'pit' ? 'BOX' : 'PISTA'}</span>
                <span class="text-sky-300 font-bold">${formatLapTime(p.bestLapSec)}</span>
              </div>
            </div>
          `;
        }).join('')}
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
          <div class="bg-red-950/40 border border-red-500/40 rounded-lg py-1">
            <span class="font-black text-red-400">SOFT (S)</span>
            <div class="text-[11px] text-white font-bold">${stintsInfo.S} giri</div>
          </div>
          <div class="bg-amber-950/40 border border-amber-500/40 rounded-lg py-1">
            <span class="font-black text-amber-300">MEDIUM (M)</span>
            <div class="text-[11px] text-white font-bold">${stintsInfo.M} giri</div>
          </div>
          <div class="bg-slate-800/80 border border-slate-500/40 rounded-lg py-1">
            <span class="font-black text-slate-200">HARD (H)</span>
            <div class="text-[11px] text-white font-bold">${stintsInfo.H} giri</div>
          </div>
        </div>
      </div>

      ${uDrivers.map((ud, idx) => {
        const sk = idx === 0 ? 'd1' : 'd2';
        const st = strat[sk];
        const liveCar = isLiveOverlay ? gameState.weekend?.race?.cars?.find(c => c.driverId === ud.id) : null;
        return `
          <div class="bg-f1bg p-3 rounded-xl border border-f1border/70 space-y-2.5">
            <div class="flex justify-between items-center text-xs font-extrabold text-white">
              <span>${ud.name} (${ud.code})</span>
              <span class="font-mono-num text-sky-300">
                ${liveCar ? `Ora: ${liveCar.tyre} (${liveCar.tyreWear}%) • ${st.stints} Stint` : `${st.stints} Stint (${st.stints - 1} Pit)`}
              </span>
            </div>

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
                    <button onclick="setPreRaceChoice('${sk}', 'startTyre', '${c}')" class="py-1 rounded-lg text-xs font-black border ${st.startTyre === c ? 'border-white bg-slate-700 text-white' : 'border-f1border bg-f1card text-slate-400'}">${c}</button>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            ${st.stints >= 2 ? `
              <div class="space-y-1.5 pt-1 border-t border-f1border/60">
                <div class="flex items-center justify-between text-[11px] font-mono-num text-slate-200">
                  <span>Pit 1 al Giro <strong>${st.pit1Lap}</strong> → monta <strong>${st.pit1Tyre}</strong></span>
                  <input type="range" min="4" max="${Math.max(8, track.laps - 4)}" value="${st.pit1Lap}" onchange="setPreRaceChoice('${sk}', 'pit1Lap', this.value)" class="w-28" />
                </div>
                <div class="grid grid-cols-4 gap-1">
                  ${['S', 'M', 'H', 'I'].map(c => `
                    <button onclick="setPreRaceChoice('${sk}', 'pit1Tyre', '${c}')" class="py-1 rounded-lg text-[10px] font-black border ${st.pit1Tyre === c ? 'border-amber-400 bg-amber-500/20 text-amber-200' : 'border-f1border bg-f1card text-slate-400'}">${c}</button>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            ${st.stints >= 3 ? `
              <div class="space-y-1.5 pt-1 border-t border-f1border/60">
                <div class="flex items-center justify-between text-[11px] font-mono-num text-slate-200">
                  <span>Pit 2 al Giro <strong>${st.pit2Lap}</strong> → monta <strong>${st.pit2Tyre}</strong></span>
                  <input type="range" min="${Math.min(track.laps - 4, st.pit1Lap + 4)}" max="${Math.max(10, track.laps - 2)}" value="${st.pit2Lap}" onchange="setPreRaceChoice('${sk}', 'pit2Lap', this.value)" class="w-28" />
                </div>
                <div class="grid grid-cols-4 gap-1">
                  ${['S', 'M', 'H', 'I'].map(c => `
                    <button onclick="setPreRaceChoice('${sk}', 'pit2Tyre', '${c}')" class="py-1 rounded-lg text-[10px] font-black border ${st.pit2Tyre === c ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200' : 'border-f1border bg-f1card text-slate-400'}">${c}</button>
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

function renderPreRaceStrategy(w, track, uDrivers) {
  return renderStrategyConfiguratorBlock(track, uDrivers, false);
}

// =========================================================
// GARA LIVE FLUIDA CON PUNTINI, SPEED x1..x8 E STRATEGIA
// =========================================================
function renderLiveRacePhase(w, track, uDrivers) {
  const race = w.race;
  const ordered = [...race.cars].sort((a, b) => a.pos - b.pos);
  const userCars = ordered.filter(c => c.isUser);

  if (race.strategyOpen) {
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

  return `
    <div class="space-y-3">
      <div class="bg-f1card border border-f1border rounded-2xl p-3.5 space-y-2.5">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-xs font-extrabold text-white">
              Giro ${race.currentLap} / ${track.laps} • ${race.weather}
              ${race.safetyCar ? '<span class="ml-1.5 px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-black">SAFETY CAR</span>' : ''}
            </div>
            <div class="text-[10px] text-slate-400 truncate max-w-[235px]">${race.events[0] || ''}</div>
          </div>
          <button onclick="toggleLiveRaceStrategyModal(true)" class="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shrink-0 shadow">
            📋 STRATEGIA
          </button>
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
              return `<button onclick="setLiveRaceSpeed(${btn.s})" class="px-2.5 py-1 rounded-lg text-[11px] font-mono-num font-extrabold ${isAct ? 'bg-f1red text-white' : 'bg-f1bg text-slate-300 border border-f1border'}">${btn.l}</button>`;
            }).join('')}
          </div>
          <span class="text-[10px] font-mono-num text-slate-400">${race.paused ? 'IN PAUSA' : `VELOCITÀ x${race.speed}`}</span>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-2">
        ${userCars.map(uc => `
          <div class="bg-f1card border border-f1border rounded-2xl p-3 space-y-2">
            <div class="flex items-center justify-between text-xs">
              <span class="font-extrabold text-white">P${uc.pos} • ${uc.name}</span>
              <span class="font-mono-num text-amber-300">Gomma ${uc.tyre} (${uc.tyreWear}% usura) • Pit ${uc.pitStops}/${uc.plannedStops}</span>
            </div>
            <div class="grid grid-cols-4 gap-1.5">
              <button onclick="setLiveCarPush('${uc.driverId}', 'conserve')" class="py-1 rounded-lg text-[10px] font-bold ${uc.pushMode === 'conserve' ? 'bg-sky-600 text-white' : 'bg-f1bg text-slate-400'}">Risparmio</button>
              <button onclick="setLiveCarPush('${uc.driverId}', 'balanced')" class="py-1 rounded-lg text-[10px] font-bold ${uc.pushMode === 'balanced' ? 'bg-slate-600 text-white' : 'bg-f1bg text-slate-400'}">Neutro</button>
              <button onclick="setLiveCarPush('${uc.driverId}', 'push')" class="py-1 rounded-lg text-[10px] font-bold ${uc.pushMode === 'push' ? 'bg-f1red text-white' : 'bg-f1bg text-slate-400'}">Spingi</button>
              <button onclick="pitUserCarNow('${uc.driverId}', '${race.isWet ? 'I' : 'H'}')" class="py-1 rounded-lg text-[10px] font-extrabold bg-amber-500/20 border border-amber-400/50 text-amber-200">Box Ora</button>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="bg-f1card border border-f1border rounded-2xl p-3 space-y-1.5">
        <div class="flex justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
          <span>Live Timing & Distacchi</span>
          <span>Gomma • Gap</span>
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
              <div class="font-mono-num text-[11px] text-slate-300 shrink-0">
                <span class="font-bold text-amber-300">${c.tyre}</span>
                <span class="ml-2 text-sky-300">${gapText}</span>
              </div>
            </div>
          `;
        }).join('')}
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

  if (w.phase === 'quali' && !w.quali) {
    initLiveQualifyingSession();
  }

  return `
    <div class="p-4 space-y-3.5 pb-6">
      <div class="bg-f1card border border-f1border rounded-2xl p-3.5 flex items-center justify-between">
        <div>
          <span class="text-[10px] font-extrabold uppercase tracking-wider text-f1red">${getWeekendDayBadge(w)} • GP ${track.round}/24</span>
          <h2 class="text-base font-extrabold text-white">${track.flag} ${track.name} — ${track.circuit}</h2>
        </div>
        <span class="text-[10px] font-mono-num text-slate-400">${track.laps} Giri • Deg ${track.tyreDeg}/3</span>
      </div>

      ${w.phase === 'fp' ? renderFpPhase(w, track, uDrivers) : ''}
      ${w.phase === 'sprint_quali' || w.phase === 'sprint_race' ? `
        <div class="bg-f1card border border-f1border rounded-2xl p-4 space-y-3">
          <div class="text-sm font-extrabold text-white">⚡ Weekend Sprint: Qualifiche & Gara Sprint</div>
          <p class="text-xs text-slate-400">Simula la sequenza Sprint e assegna i punti Sprint (8-1) prima delle Qualifiche Q1/Q2/Q3 del Gran Premio.</p>
          <button onclick="simulateSprintWeekendSequence()" class="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs">
            SIMULA QUALIFICHE + GARA SPRINT →
          </button>
        </div>
      ` : ''}
      ${w.phase === 'quali' ? renderLiveQualiPhase(w, track) : ''}
      ${w.phase === 'strategy' ? renderPreRaceStrategy(w, track, uDrivers) : ''}
      ${w.phase === 'race' ? renderLiveRacePhase(w, track, uDrivers) : ''}
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
