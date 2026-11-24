(function boot() {
  const saved = loadGame();
  if (saved && saved.teams && saved.drivers) {
    gameState = saved;
    window.gameState = gameState;
    if (typeof gameState.capSpent !== 'number') gameState.capSpent = 0.0;
    if (!gameState.budgetCap) gameState.budgetCap = BUDGET_CAP_2026;
  }
  renderApp();
})();
