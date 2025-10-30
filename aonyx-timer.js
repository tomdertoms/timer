// Aonyx Timer v2.8
// Wenn du das liest, läuft’s. Wenn nicht, ist das Problem vor dem Bildschirm.

(function(){
  'use strict';

  if (!window.TribalWars || typeof TribalWars.post !== 'function' || !window.game_data) {
    alert('Aonyx Timer: Im Spiel ausführen (nicht auf der Loginseite).');
    return;
  }

  /* ===== Helfer ===== */
  const LS = 'aonyx_timer_v28_';
  const $ = (id)=>document.getElementById(id);
  const save = (k,v)=>localStorage.setItem(LS+k, JSON.stringify(v));
  const load = (k,d=null)=>{ try{const s=localStorage.getItem(LS+k); return s?JSON.parse(s):d;}catch(_){return d;} };
  const pad2=(n)=>String(n).padStart(2,'0'), pad3=(n)=>String(n).padStart(3,'0');
  const fmtHMSms=(d)=>`${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}.${pad3(d.getMilliseconds())}`;
  const parseTime=(s)=>{if(!s)return null;const m=s.trim().match(/^(\d{1,2}):?(\d{2})?:?(\d{2})?(?:\.(\d{1,3}))?$/);if(!m)return null;const d=new Date();d.setHours(+m[1]||0,+m[2]||0,+m[3]||0,Number((m[4]||'0').padEnd(3,'0')));return d;};
  const timeMask=(input)=>{input.addEventListener('input',()=>{const raw=input.value.replace(/\D/g,'').slice(0,9);let h=raw.slice(0,2),m=raw.slice(2,4),s=raw.slice(4,6),ms=raw.slice(6,9);if(h.length===1)h='0'+h;if(m&&m.length===1)m='0'+m;if(s&&s.length===1)s='0'+s;let out='';if(h)out+=h;if(m)out+=':'+m;if(s)out+=':'+s;if(ms)out+='.'+ms;input.value=out;});input.addEventListener('blur',()=>{const d=parseTime(input.value);input.value=d?fmtHMSms(d):'';});};

  const UNIT_LABEL={
    spear:'Speer', sword:'Schwert', axe:'Axt', archer:'Bogenschütze', spy:'Späher',
    light:'Leichte Kav.', marcher:'Beritt. Bogi', heavy:'Schwere Kav.',
    ram:'Ramme', catapult:'Katapult', knight:'Paladin'
  };

  function availableUnits(){
    if (Array.isArray(game_data.units) && game_data.units.length) return game_data.units.slice();
    return ['spear','sword','axe','archer','spy','light','marcher','heavy','ram','catapult','knight'];
  }

  /* ===== UI ===== */
  const PANEL_ID='aonyx_timer_panel';
  const old=$(`#${PANEL_ID}`); if(old) old.remove();

  const wrap=document.createElement('div');
  wrap.id=PANEL_ID;
  Object.assign(wrap.style,{
    position:'fixed',top:'76px',right:'16px',width:'760px',zIndex:2147483647,
    background:'#fff',border:'1px solid #222',borderRadius:'8px',
    boxShadow:'0 10px 30px rgba(0,0,0,.18)',font:'13px/1.4 Arial, sans-serif',color:'#111',
    padding:'8px'
  });

  wrap.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:6px;border-bottom:1px solid #eee">
      <div><b>🦦 Aonyx Timer</b> <span style="color:#666;font-size:12px">(${(game_data.market||'de').toUpperCase()})</span></div>
      <button id="ax_close" style="padding:4px 8px;border-radius:6px;background:#ffe9e9;border:1px solid #c33">X</button>
    </div>
    <div id="ax_body" style="padding-top:10px">
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:8px">
        Ziel: <input id="ax_target" placeholder="123|456" style="width:110px"/>
        Zeit: <input id="ax_time" style="width:140px"/>
        Modus:
          <label><input type="radio" name="ax_mode" value="attack" checked/> Angriff</label>
          <label style="margin-left:6px"><input type="radio" name="ax_mode" value="support"/> Support</label>
        <button id="ax_load_vills">Dörfer laden</button>
        <button id="ax_refresh">Laufzeiten aktualisieren</button>
        <div id="ax_countdown" style="margin-left:auto;font-weight:bold">Countdown: --</div>
      </div>
      <div id="ax_table_wrap" style="max-height:420px;overflow:auto;border-top:1px solid #eee;padding-top:8px"></div>
      <div style="margin-top:10px;display:flex;gap:10px;align-items:center">
        <button id="ax_go" style="background:#2b7aea;color:#fff;border:none;padding:9px 14px;border-radius:7px;font-weight:bold">GO (dein Klick)</button>
        <small style="color:#666">Wenn du klickst, fliegen sie.</small>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);

  /* ===== Init ===== */
  requestAnimationFrame(() => {
    const closeBtn = $('#ax_close');
    const targetIn = $('#ax_target');
    const timeIn   = $('#ax_time');
    const btnLoad  = $('#ax_load_vills');
    const btnRef   = $('#ax_refresh');
    const btnGo    = $('#ax_go');

    if (!closeBtn || !targetIn || !timeIn) return;

    closeBtn.onclick = () => wrap.remove();
    targetIn.value = load('target', '');
    timeIn.value = load('time', fmtHMSms(new Date()));
    timeMask(timeIn);

    targetIn.addEventListener('input', () => save('target', targetIn.value));
    timeIn.addEventListener('input', () => save('time', timeIn.value));

    document.querySelectorAll('input[name="ax_mode"]').forEach(r =>
      r.addEventListener('change', () =>
        save('mode', document.querySelector('input[name="ax_mode"]:checked').value)
      )
    );

    if (window.TWMap && typeof TWMap.on === 'function') {
      TWMap.on('click', e => {
        if (e?.coords) {
          targetIn.value = `${e.coords.x}|${e.coords.y}`;
          save('target', targetIn.value);
          try { UI.SuccessMessage(`Ziel: ${targetIn.value}`); } catch(_) {}
        }
      });
    }

    setInterval(() => {
      const t = parseTime(timeIn.value);
      const cd = $('#ax_countdown');
      if (!t || !cd) return;
      const ms = Math.max(0, t.getTime() - Date.now());
      const sec = Math.floor(ms / 1000) % 60;
      const min = Math.floor(ms / 60000);
      const rem = String(ms % 1000).padStart(3, '0');
      cd.textContent = `Countdown: ${min>0?min+'m ':''}${sec}.${rem}s`;
    }, 60);

    if (btnLoad) btnLoad.onclick = async () => {
      const v = await loadVillages();
      if (!v?.length) { try{UI.ErrorMessage('Keine Dörfer gefunden');}catch(_){} return; }
      try{UI.SuccessMessage(`Dörfer geladen (${v.length})`);}catch(_){} buildTable(v);
    };

    if (btnRef) btnRef.onclick = async () => {
      const coord = (targetIn.value||'').trim();
      if (!coord) return UI.ErrorMessage('Kein Ziel');
      const m = coord.match(/^(\d{1,3})\|(\d{1,3})$/);
      if (!m) return UI.ErrorMessage('Ungültiges Ziel');
      const tx = +m[1], ty = +m[2];
      const vills = load('vills', []);
      if (!vills.length) return UI.ErrorMessage('Keine Dörfer geladen');
      const units = availableUnits();

      try{UI.SuccessMessage('Berechne Laufzeiten...');}catch(_){}
      for (const v of vills) {
        for (const u of units) {
          const cell = document.getElementById(`ax_time_${v.id}_${u}`);
          if (cell) cell.textContent = '…';
          const ms = await calcDurationMs(v.id,u,tx,ty);
          if (cell) cell.textContent = ms?`${Math.round(ms/1000)}s`:'n/a';
          await new Promise(r=>setTimeout(r,60));
        }
      }
      try{UI.SuccessMessage('Laufzeiten aktualisiert');}catch(_){}
    };

    if (btnGo) btnGo.onclick = () => {
      const coord = (targetIn.value||'').trim();
      if (!coord) return UI.ErrorMessage('Kein Ziel');
      const m = coord.match(/^(\d{1,3})\|(\d{1,3})$/);
      if (!m) return UI.ErrorMessage('Ungültiges Ziel');
      const tx = +m[1], ty = +m[2];
      const mode = document.querySelector('input[name="ax_mode"]:checked')?.value || 'attack';
      const vills = load('vills', []);
      const units = availableUnits();

      for (const v of vills) {
        const set = load('amounts', {})[v.id] || {};
        const payload = {};
        for (const u of units) {
          const n = +set[u] || 0;
          if (n > 0) payload[u] = n;
        }
        if (Object.keys(payload).length) {
          sendCommand(v.id, tx, ty, mode, payload);
          try{UI.SuccessMessage(`Befehl gesendet aus ${v.name}`);}catch(_){}
          return;
        }
      }
      UI.ErrorMessage('Keine Einheiten zum Senden gesetzt');
    };

    try{UI.SuccessMessage('Aonyx Timer aktiv');}catch(_){}
  });

  /* ===== Backend bleibt identisch ===== */
  function loadVillages(){ /* ... wie vorher ... */ }
  function loadUnitsForVillage(vid){ /* ... wie vorher ... */ }
  function calcDurationMs(vid,unit,tx,ty){ /* ... wie vorher ... */ }
  function sendCommand(vid,tx,ty,type,unitsObj){ /* ... wie vorher ... */ }
  function buildTable(vills){ /* ... wie vorher ... */ }

})();
