(function boot() {
  const saved = loadGame();
  if (saved && saved.teams && saved.drivers) {
    gameState = saved;
    window.gameState = gameState;
    ensureMarketAndAiDefaults();
    if (gameState.weekend && ['quali', 'sprint_quali', 'race', 'sprint_race'].includes(gameState.weekend.phase)) {
      startSessionAnimationLoop();
    }
  }
  renderApp();
})();
