(function () {
  const SDK_URL = 'https://cdn.jsdelivr.net/gh/SaveBankDev/Tribal-Wars-Scripts-SDK@main/twSDK.js';

  const scriptConfig = {
    scriptData: { prefix: 'aonyxMini', name: 'Aonyx Village Loader', version: '1.0' },
    allowedScreens: ['overview_villages'],
    allowedModes: ['combined'],
    isDebug: false
  };

  function start() {
    (async () => {
      await twSDK.init(scriptConfig);

      // exakt wie im Vorbild: Screen/Mode prüfen und ggf. umleiten
      const okScreen = twSDK.checkValidLocation('screen');
      const okMode   = twSDK.checkValidLocation('mode');
      if (!okScreen || !okMode) {
        UI.InfoMessage('Weiterleiten…');
        twSDK.redirectTo('overview_villages&combined'); // gleiches Muster wie im File
        return;
      }

      const playerId = game_data.player.id;

      // exakt der Datenweg aus deinem File: worldDataAPI
      const villages = await twSDK.worldDataAPI('village'); // [id, name, x, y, ownerId, points]
      // optional: players/ally wären genauso über worldDataAPI('player'/'ally') verfügbar

      const mine = villages
        .filter(v => v[4] === playerId)
        .map(v => ({ id: v[0], name: v[1], x: v[2], y: v[3], points: v[5] }));

      localStorage.setItem('aonyx_player_villages', JSON.stringify(mine));

      console.log(`[Aonyx] Spieler: ${game_data.player.name} | Dörfer laut GameData: ${parseInt(TribalWars.getGameData().player.villages,10)}`);
      console.log(`[Aonyx] Gefunden via worldDataAPI: ${mine.length} Dörfer (eigene).`);
      console.table(mine);
      alert(`[Aonyx] ${mine.length} eigene Dörfer geladen (twSDK.worldDataAPI → localStorage.aonyx_player_villages).`);
    })().catch(e => {
      console.error('[Aonyx] Fehler:', e);
      alert('[Aonyx] Fehler beim Laden – siehe Konsole.');
    });
  }

  if (window.twSDK) {
    start();
  } else {
    $.getScript(SDK_URL, start);
  }
})();
