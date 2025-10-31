// Aonyx Timer v6.0 — TW-Standard, echte Laufzeiten, ms-Countdown, kein Auto-Send.
// Credits: Eigenbau; nutzt offizielle TribalWars-Objekte/Endpunkte (game_data, TribalWars.post, TWMap).
// Ton: nur Optik. Wenn’s nicht lädt: bist du nicht auf screen=map oder screen=place.

(function(){
  'use strict';

  // ===== Guard =====
  if (!window.TribalWars || !window.game_data) {
    alert('Aonyx Timer: Bitte im Spiel ausführen (Karte oder Versammlungsplatz).');
    return;
  }

  // ===== Tiny utils =====
  const LS = 'aonyx_v6_';
  const $id = (x)=>document.getElementById(x);
  const save = (k,v)=>localStorage.setItem(LS+k, JSON.stringify(v));
  const load = (k,d=null)=>{ try{ const s=localStorage.getItem(LS+k); return s?JSON.parse(s):d; }catch(_){ return d; } };
  const pad2=(n)=>String(n).padStart(2,'0');
  const pad3=(n)=>String(n).padStart(3,'0');
  const fmtHMSms = (d)=>`${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}.${pad3(d.getMilliseconds())}`;
  function parseTime(s){
    if(!s) return null;
    const m=s.trim().match(/^(\d{1,2})(?::?(\d{2}))?(?::?(\d{2}))?(?:\.(\d{1,3}))?$/);
    if(!m) return null;
    const d=new Date();
    d.setHours(+m[1]||0, +m[2]||0, +m[3]||0, Number((m[4]||'0').padEnd(3,'0')));
    return d;
  }
  function maskTime(input){
    input.addEventListener('input',()=>{
      const raw=input.value.replace(/\D/g,'').slice(0,9);
      let h=raw.slice(0,2), m=raw.slice(2,4), s=raw.slice(4,6), ms=raw.slice(6,9);
      if(h.length===1) h='0'+h;
      if(m && m.length===1) m='0'+m;
      if(s && s.length===1) s='0'+s;
      let out=''; if(h) out+=h; if(m) out+=':'+m; if(s) out+=':'+s; if(ms) out+='.'+ms;
      input.value=out;
    });
    input.addEventListener('blur',()=>{ const d=parseTime(input.value); input.value=d?fmtHMSms(d):''; });
  }
  const UNIT_LABEL = {
    spear:'Speer', sword:'Schwert', axe:'Axt', archer:'Bogenschütze', spy:'Späher',
    light:'Leichte Kav.', marcher:'Beritt. Bogi', heavy:'Schwere Kav.',
    ram:'Ramme', catapult:'Katapult', knight:'Paladin'
  };
  const allWorldUnits = ()=> (Array.isArray(game_data.units) && game_data.units.length ? game_data.units.slice() : Object.keys(game_data.units_data||{}));

  // ===== Panel (TW-Standard Look) =====
  const PANEL_ID='aonyx_timer_v6_panel';
  const old=document.getElementById(PANEL_ID); if(old) old.remove();

  const panel=document.createElement('div');
  panel.id=PANEL_ID;
  Object.assign(panel.style,{
    position:'fixed', top:'10%', left:'50%', transform:'translateX(-50%)',
    width:'920px', background:'#fff', border:'1px solid #C1A264', borderRadius:'6px',
    boxShadow:'0 10px 35px rgba(0,0,0,.25)', zIndex: 2147483647, font:'13px/1.4 Arial, sans-serif'
  });
  panel.innerHTML = `
    <div class="vis" style="border:0">
      <table class="vis" style="width:100%;border-bottom:1px solid #dec79b">
        <tr>
          <th style="text-align:left">🦦 Aonyx Timer v6</th>
          <th style="text-align:right"><button id="ax_close" class="btn">Schließen</button></th>
        </tr>
      </table>

      <div style="padding:8px">
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:6px">
          <label>Ziel: <input id="ax_target" placeholder="123|456" style="width:110px"></label>
          <label>Zielzeit: <input id="ax_time" style="width:140px"></label>
          <label><input type="radio" name="ax_mode" value="attack" checked> Angriff</label>
          <label><input type="radio" name="ax_mode" value="support"> Unterstützung</label>
          <button id="ax_load_vill" class="btn">Dörfer laden</button>
          <button id="ax_calc_all" class="btn">Alle berechnen</button>
          <span id="ax_countdown" style="margin-left:auto;font-weight:bold">Countdown: --</span>
        </div>

        <div id="ax_table_wrap" style="max-height:420px;overflow:auto;border-top:1px solid #eee;padding-top:8px">
          <div style="color:#666">Noch keine Dörfer geladen.</div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:10px">
          <button id="ax_go" class="btn evt-confirm-btn btn-confirm-yes">GO (Countdown starten)</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  // Wire basics
  $id('ax_close').onclick = ()=> panel.remove();
  const targetEl=$id('ax_target');
  const timeEl=$id('ax_time');
  targetEl.value = load('target','');
  timeEl.value = load('time', fmtHMSms(new Date()));
  maskTime(timeEl);
  targetEl.addEventListener('input',()=>save('target',targetEl.value));
  timeEl.addEventListener('input',()=>save('time',timeEl.value));

  // Map hook → set target on click
  try{
    if (window.TWMap && typeof TWMap.on === 'function'){
      TWMap.on('click', e=>{
        if(e && e.coords){ targetEl.value = `${e.coords.x}|${e.coords.y}`; save('target',targetEl.value); }
      });
    }
  }catch(_){}

  // Countdown (optisch)
  setInterval(()=>{
    const t=parseTime(timeEl.value); const out=$id('ax_countdown'); if(!t||!out){return;}
    const ms=Math.max(0, t.getTime()-Date.now());
    out.textContent = `Countdown: ${Math.floor(ms/60000)}m ${(Math.floor(ms/1000)%60)}.${String(ms%1000).padStart(3,'0')}s`;
  },60);

  // ===== Data layer =====
  async function loadVillages(){
    // 1) Übersicht holen (HTML)
    try{
      const html = await new Promise(res=>TribalWars.get('game.php',{screen:'overview_villages',mode:'combined',village:game_data.village.id},res));
      const doc = document.implementation.createHTMLDocument('v'); doc.documentElement.innerHTML = html;
      const links=[...doc.querySelectorAll('a[href*="village="]')];
      const seen=new Set(); const v=[];
      links.forEach(a=>{
        const m=(a.getAttribute('href')||'').match(/village=(\d+)/);
        if(m && !seen.has(m[1])){
          seen.add(m[1]);
          v.push({ id:m[1], name:a.textContent.trim() });
        }
      });
      // 2) map/village.txt join (Koordinaten)
      try{
        const txt = await new Promise((res,rej)=>jQuery.get(location.origin+'/map/village.txt',res).fail(rej));
        const idx=new Map();
        String(txt).split('\n').forEach(line=>{
          const [id,x,y]=line.split(',');
          if(id && x && y) idx.set(String(id),{x:+x,y:+y});
        });
        v.forEach(o=>Object.assign(o, idx.get(o.id)||{}));
      }catch(_){}
      if(v.length){ save('villages',v); return v; }
    }catch(_){}

    // Fallback: nur aktuelles Dorf
    const dv=game_data.village;
    const one=[{id:String(dv.id), name:dv.name, x:+dv.x, y:+dv.y}];
    save('villages',one);
    return one;
  }

  async function loadUnitsForVillage(vid){
    // Versuche Farm-Endpoints zuerst
    const actions=['get_farm_units','get_units','get_farm_units_v2','list'];
    for(const act of actions){
      try{
        const resp = await new Promise(res=>TribalWars.post('game.php',{screen:'am_farm',ajax:'1',ajaxaction:act,village:vid},r=>res(r)));
        try{
          const j=(typeof resp==='string')?JSON.parse(resp):resp;
          const u=j?.units || j?.response?.units || j?.data?.units || null;
          if(u && Object.keys(u).length) return u;
        }catch(_){}
      }catch(_){}
    }
    // Fallback: place-Seite parsen
    try{
      const html=await new Promise(res=>TribalWars.get('game.php',{screen:'place',village:vid},res));
      const doc=document.implementation.createHTMLDocument('p'); doc.documentElement.innerHTML=html;
      const out={}; const units=allWorldUnits();
      units.forEach(u=>{
        const sel=doc.querySelector(`#units_entry_all_${u},#units_entry_${u},span[id*="units_entry"][id*="${u}"]`);
        if(sel){ const txt=(sel.textContent||'').replace(/\./g,''); const m=txt.match(/(\d+)/); if(m) out[u]=+m[1]; }
      });
      return out;
    }catch(_){ return {}; }
  }

  function calculateTravelMs(vid, unit, tx, ty){
    return new Promise(resolve=>{
      try{
        TribalWars.post('game.php',
          {screen:'place', ajax:'1', ajaxaction:'calculate_time', village:vid, x:tx, y:ty, unit, h:game_data.csrf},
          (resp)=>{
            try{
              const j=(typeof resp==='string')?JSON.parse(resp):resp;
              const ms=j?.response?.duration || j?.data?.duration || j?.duration || null;
              resolve(ms?+ms:null);
            }catch(e){
              const m=String(resp).match(/"duration"\s*:\s*(\d+)/);
              resolve(m?+m[1]:null);
            }
          });
      }catch(_){ resolve(null); }
    });
  }

  function sendCommand(vid, tx, ty, type, unitsObj){
    const base = { screen:'place', ajax:'1', ajaxaction:'command', village:vid, type, x:tx, y:ty, h:game_data.csrf };
    const payload = Object.assign(base, Object.fromEntries(Object.entries(unitsObj).map(([k,v])=>[`units[${k}]`,v])));
    TribalWars.post('game.php', payload, (r)=>console.log('[Aonyx] send resp:', r));
  }

  // ===== UI table =====
  let VILLAGES = load('villages', []);
  let ACTIVE_ROW = null; // {vid, unit, tx, ty, ms}

  function buildTable(vills){
    const units = allWorldUnits();
    let html = `
      <table class="vis" style="width:100%;border-collapse:collapse">
        <thead>
          <tr>
            <th style="width:26px"></th>
            <th>Dorf</th>
            <th style="width:110px">Koords</th>
            <th>Einheit</th>
            <th style="width:90px">Verfügbar</th>
            <th style="width:120px">Laufzeit</th>
            <th style="width:120px">Senden</th>
            <th style="width:100px">Aktion</th>
          </tr>
        </thead>
        <tbody>
    `;
    for(const v of vills){
      html += `<tr><td colspan="8" style="background:#f7f7f7"><b>${v.name||'?'}</b> — (${v.x||0}|${v.y||0}) — id:${v.id} <button class="btn ax_chk" data-vid="${v.id}" style="margin-left:8px">Units prüfen</button></td></tr>`;
      for(const u of units){
        const avail = load('avail',{})[v.id]?.[u] ?? '—';
        const setAmt = load('amts',{})[v.id]?.[u] ?? 0;
        html += `
          <tr>
            <td style="text-align:center"><input type="radio" name="ax_pick" class="ax_pick" data-vid="${v.id}" data-unit="${u}"></td>
            <td>${v.name||'?'}</td>
            <td>${(v.x??'?')}|${(v.y??'?')}</td>
            <td>${UNIT_LABEL[u]||u}</td>
            <td id="ax_av_${v.id}_${u}" style="text-align:right">${avail}</td>
            <td id="ax_t_${v.id}_${u}">-</td>
            <td><input class="ax_amt" data-vid="${v.id}" data-unit="${u}" value="${setAmt}" style="width:80px"></td>
            <td><button class="btn ax_calc" data-vid="${v.id}" data-unit="${u}">Berechnen</button></td>
          </tr>
        `;
      }
    }
    html += `</tbody></table>`;
    $id('ax_table_wrap').innerHTML = html;

    // Wire: Units prüfen
    document.querySelectorAll('.ax_chk').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const vid=btn.dataset.vid;
        try{ UI.SuccessMessage('Lese Einheiten…'); }catch(_){}
        const units = await loadUnitsForVillage(vid);
        const map = load('avail',{}); map[vid]=Object.assign(map[vid]||{}, units||{}); save('avail',map);
        Object.entries(units||{}).forEach(([k,v])=>{
          const el=$id(`ax_av_${vid}_${k}`); if(el) el.textContent = v;
        });
        try{ UI.SuccessMessage('Einheiten aktualisiert'); }catch(_){}
      });
    });

    // Wire: Einzelberechnung
    document.querySelectorAll('.ax_calc').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const vid=btn.dataset.vid, unit=btn.dataset.unit;
        const m=(targetEl.value||'').trim().match(/^(\d{1,3})\|(\d{1,3})$/);
        if(!m){ try{UI.ErrorMessage('Ungültiges Ziel');}catch(_){alert('Ungültiges Ziel');} return; }
        const tx=+m[1], ty=+m[2];
        const cell = $id(`ax_t_${vid}_${unit}`); if(cell) cell.textContent='…';
        const ms = await calculateTravelMs(vid, unit, tx, ty);
        if(cell){
          if(ms){ cell.textContent = `${Math.round(ms/1000)}s`; cell.style.color='#000'; }
          else { cell.textContent = 'n/a'; cell.style.color='#c33'; }
        }
      });
    });

    // Wire: Menge speichern
    document.querySelectorAll('.ax_amt').forEach(inp=>{
      inp.addEventListener('input', ()=>{
        const vid=inp.dataset.vid, unit=inp.dataset.unit, val=+inp.value||0;
        const am=load('amts',{}); am[vid]=am[vid]||{}; am[vid][unit]=val; save('amts',am);
      });
    });

    // Wire: Auswahl (Pick)
    document.querySelectorAll('.ax_pick').forEach(r=>{
      r.addEventListener('change', ()=>{
        const vid=r.dataset.vid, unit=r.dataset.unit;
        const m=(targetEl.value||'').trim().match(/^(\d{1,3})\|(\d{1,3})$/);
        if(!m){ ACTIVE_ROW=null; return; }
        const tx=+m[1], ty=+m[2];
        const tcell=$id(`ax_t_${vid}_${unit}`);
        let ms=null;
        if(tcell && /^\d+s$/.test(tcell.textContent.trim())){
          ms = parseInt(tcell.textContent)*1000;
        }
        ACTIVE_ROW = { vid, unit, tx, ty, ms };
      });
    });
  }

  // ===== Buttons =====
  $id('ax_load_vill').onclick = async ()=>{
    try{ UI.SuccessMessage('Dörfer laden…'); }catch(_){}
    VILLAGES = await loadVillages();
    buildTable(VILLAGES);
    try{ UI.SuccessMessage(`Dörfer geladen: ${VILLAGES.length}`); }catch(_){}
  };

  $id('ax_calc_all').onclick = async ()=>{
    const m=(targetEl.value||'').trim().match(/^(\d{1,3})\|(\d{1,3})$/);
    if(!m){ try{UI.ErrorMessage('Ungültiges Ziel');}catch(_){alert('Ungültiges Ziel');} return; }
    const tx=+m[1], ty=+m[2];
    if(!VILLAGES || !VILLAGES.length){ try{UI.ErrorMessage('Erst Dörfer laden');}catch(_){alert('Erst Dörfer laden');} return; }
    const units=allWorldUnits();
    try{ UI.SuccessMessage('Berechne alle Laufzeiten…'); }catch(_){}
    for(const v of VILLAGES){
      for(const u of units){
        const cell=$id(`ax_t_${v.id}_${u}`); if(cell) cell.textContent='…';
        const ms=await calculateTravelMs(v.id,u,tx,ty);
        if(cell){
          if(ms){ cell.textContent=`${Math.round(ms/1000)}s`; cell.style.color='#000'; }
          else { cell.textContent='n/a'; cell.style.color='#c33'; }
        }
        await new Promise(r=>setTimeout(r,60));
      }
    }
    try{ UI.SuccessMessage('Fertig.'); }catch(_){}
  };

  // ===== Countdown & Prefill (kein Auto-Send) =====
  let armTimer=null;

  function highlightButton(kind){ // 'attack' | 'support'
    try{
      const attackBtn = document.getElementById('target_attack') || document.querySelector('button[name="attack"],input[name="attack"]');
      const supportBtn = document.getElementById('target_support') || document.querySelector('button[name="support"],input[name="support"]');
      [attackBtn,supportBtn].forEach(b=>{ if(b){ b.style.outline=''; b.style.boxShadow=''; } });
      const b = (kind==='support')? supportBtn : attackBtn;
      if(b){ b.scrollIntoView({block:'center',behavior:'smooth'}); b.style.outline='3px solid #ff9900'; b.style.boxShadow='0 0 10px #ff9900'; }
    }catch(_){}
  }
  function clearHighlight(){
    try{
      const attackBtn = document.getElementById('target_attack') || document.querySelector('button[name="attack"],input[name="attack"]');
      const supportBtn = document.getElementById('target_support') || document.querySelector('button[name="support"],input[name="support"]');
      [attackBtn,supportBtn].forEach(b=>{ if(b){ b.style.outline=''; b.style.boxShadow=''; } });
    }catch(_){}
  }
  function setCoordsAndUnits(tx,ty, unitsObj){
    const x = document.getElementById('inputx') || document.querySelector('input[name="x"]');
    const y = document.getElementById('inputy') || document.querySelector('input[name="y"]');
    if(x) x.value = tx;
    if(y) y.value = ty;
    Object.entries(unitsObj||{}).forEach(([k,v])=>{
      const inp=document.querySelector(`input[name="${k}"]`);
      if(inp) inp.value = v;
    });
  }

  $id('ax_go').onclick = ()=>{
    // ensure selection
    const picked = document.querySelector('input.ax_pick:checked');
    if(!picked){ try{UI.ErrorMessage('Wähle eine Zeile (links anklicken).');}catch(_){alert('Wähle eine Zeile.');} return; }
    const mode = document.querySelector('input[name="ax_mode"]:checked')?.value || 'attack';
    const t = parseTime(timeEl.value);
    if(!t){ try{UI.ErrorMessage('Ungültige Zielzeit');}catch(_){alert('Ungültige Zielzeit');} return; }

    const vid=picked.dataset.vid, unit=picked.dataset.unit;
    const m=(targetEl.value||'').trim().match(/^(\d{1,3})\|(\d{1,3})$/);
    if(!m){ try{UI.ErrorMessage('Ungültiges Ziel');}catch(_){alert('Ungültiges Ziel');} return; }
    const tx=+m[1], ty=+m[2];

    // Menge holen
    const amtEl = document.querySelector(`.ax_amt[data-vid="${vid}"][data-unit="${unit}"]`);
    const amount = amtEl ? (+amtEl.value||0) : 0;
    if(amount<=0){ try{UI.ErrorMessage('Menge > 0 setzen');}catch(_){alert('Menge > 0 setzen');} return; }

    // Laufzeit (ms): falls nicht berechnet, nochmal holen
    const tcell=$id(`ax_t_${vid}_${unit}`);
    const pre = (tcell && /^\d+s$/.test(tcell.textContent.trim())) ? parseInt(tcell.textContent)*1000 : null;

    const arm = async ()=>{
      let travelMs = pre;
      if(!travelMs){ travelMs = await calculateTravelMs(vid,unit,tx,ty); }
      if(!travelMs){ try{UI.ErrorMessage('Keine Laufzeit ermittelbar');}catch(_){alert('Keine Laufzeit ermittelbar');} return; }

      const sendAt = t.getTime() - travelMs;

      // Overlay für scharfen Countdown
      const overlayId='ax_overlay';
      const old=document.getElementById(overlayId); if(old) old.remove();
      const ov=document.createElement('div');
      ov.id=overlayId;
      Object.assign(ov.style,{position:'fixed',left:'50%',top:'50%',transform:'translate(-50%,-50%)',background:'#fff',border:'1px solid #C1A264',borderRadius:'6px',padding:'12px 16px',zIndex:2147483647,boxShadow:'0 10px 35px rgba(0,0,0,.25)',minWidth:'360px',textAlign:'center'});
      ov.innerHTML = `
        <div style="font-weight:bold;margin-bottom:6px">ARMED — ${UNIT_LABEL[unit]||unit} aus Dorf ${vid}</div>
        <div id="ax_live" style="font-size:18px">–</div>
        <div style="margin-top:8px"><button id="ax_abort" class="btn">Abbrechen</button></div>
        <div style="margin-top:6px;color:#666;font-size:12px">Ich fülle Formular & markiere den Button. <b>Du</b> klickst senden.</div>
      `;
      document.body.appendChild(ov);

      const PREP_FILL_MS_BEFORE = 500;
      const HIGHLIGHT_MS_BEFORE = 350;

      const unitsObj = {}; unitsObj[unit]=amount;

      function tick(){
        const now=Date.now();
        const rem=sendAt-now;
        const live=$id('ax_live'); if(live){
          const pos=Math.max(0,rem);
          live.textContent = `${Math.floor(pos/60000)}m ${Math.floor(pos/1000)%60}.${String(pos%1000).padStart(3,'0')}s`;
        }
        if(rem <= PREP_FILL_MS_BEFORE && !tick._filled){
          setCoordsAndUnits(tx,ty,unitsObj);
          tick._filled=true;
        }
        if(rem <= HIGHLIGHT_MS_BEFORE && !tick._hl){
          highlightButton(mode==='support'?'support':'attack');
          tick._hl=true;
        }
        if(rem <= 0){
          clearInterval(armTimer); armTimer=null; clearHighlight(); ov.remove();
          try{ UI.InfoMessage('T-0 erreicht. Dein Klick.'); }catch(_){ alert('T-0 erreicht. Dein Klick.'); }
        }
      }
      tick();
      armTimer=setInterval(tick, 60);

      $id('ax_abort').onclick = ()=>{ clearInterval(armTimer); armTimer=null; clearHighlight(); ov.remove(); try{UI.InfoMessage('Abgebrochen');}catch(_){ } };
    };

    // Stelle sicher, dass wir am richtigen Dorf sind (screen=place für dieses vid muss erreichbar sein)
    TribalWars.get('game.php',{screen:'place',village:vid}, ()=> arm());
  };

  // Auto-build if cached villages
  if (VILLAGES && VILLAGES.length) buildTable(VILLAGES);
})();
