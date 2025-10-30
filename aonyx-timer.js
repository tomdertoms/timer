// Aonyx Timer v3.0
// Komplett lokal, keine Fetches. Nutzt echte TWMap/game_data Werte.

(function() {
  'use strict';

  if (!window.TribalWars || !window.game_data || !window.TWMap) {
    alert('Aonyx Timer: Bitte im Spiel ausführen (Map oder Versammlungsplatz).');
    return;
  }

  const LS = 'aonyx_timer_v3_';
  const $ = id => document.getElementById(id);
  const save = (k,v)=>localStorage.setItem(LS+k,JSON.stringify(v));
  const load = (k,d=null)=>{try{const s=localStorage.getItem(LS+k);return s?JSON.parse(s):d;}catch(_){return d;}};

  const pad2=n=>String(n).padStart(2,'0');
  const pad3=n=>String(n).padStart(3,'0');
  const fmtHMSms=d=>`${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}.${pad3(d.getMilliseconds())}`;
  const parseTime=s=>{if(!s)return null;const m=s.trim().match(/^(\d{1,2}):?(\d{2})?:?(\d{2})?(?:\.(\d{1,3}))?$/);if(!m)return null;
    const d=new Date();d.setHours(+m[1]||0,+m[2]||0,+m[3]||0,Number((m[4]||'0').padEnd(3,'0')));return d;};
  const timeMask=i=>{i.addEventListener('input',()=>{const r=i.value.replace(/\D/g,'').slice(0,9);
    let h=r.slice(0,2),m=r.slice(2,4),s=r.slice(4,6),ms=r.slice(6,9);
    if(h.length===1)h='0'+h;if(m&&m.length===1)m='0'+m;if(s&&s.length===1)s='0'+s;
    let o='';if(h)o+=h;if(m)o+=':'+m;if(s)o+=':'+s;if(ms)o+='.'+ms;i.value=o;});
    i.addEventListener('blur',()=>{const d=parseTime(i.value);i.value=d?fmtHMSms(d):'';});};

  const UNIT_LABEL={
    spear:'Speer', sword:'Schwert', axe:'Axt', archer:'Bogenschütze', spy:'Späher',
    light:'Leichte Kav.', marcher:'Beritt. Bogi', heavy:'Schwere Kav.',
    ram:'Ramme', catapult:'Katapult', knight:'Paladin'
  };

  function availableUnits() {
    return Object.keys(game_data.units_data || {});
  }

  function getVillages() {
    const vmap = TWMap.villages || {};
    return Object.values(vmap).map(v=>({
      id:v.id, name:v.name || `(${v.x}|${v.y})`, x:v.x, y:v.y
    }));
  }

  function calcTravel(unit, fromX, fromY, toX, toY) {
    const ud = game_data.units_data?.[unit];
    if (!ud) return null;
    const dist = Math.hypot(fromX - toX, fromY - toY);
    const mins = ud.speed * (game_data.config.unit_speed / game_data.config.speed);
    return Math.round(dist * mins * 60000);
  }

  function sendCommand(vid, tx, ty, type, unitsObj) {
    const data = {
      village: vid,
      screen: 'place',
      ajax: 'command',
      type,
      x: tx, y: ty,
      h: game_data.csrf
    };
    Object.entries(unitsObj).forEach(([k,v]) => data[`units[${k}]`] = v);
    TribalWars.post('game.php', data, (r)=>console.log('[Aonyx send]',r));
  }

  /* ===== UI ===== */
  const PANEL_ID = 'aonyx_timer_panel';
  const old = $(PANEL_ID); if (old) old.remove();
  const wrap = document.createElement('div');
  wrap.id = PANEL_ID;
  Object.assign(wrap.style,{
    position:'fixed',top:'70px',right:'16px',zIndex:999999,
    background:'#fff',border:'1px solid #111',borderRadius:'8px',
    padding:'10px',font:'13px Arial',width:'700px',
    boxShadow:'0 4px 20px rgba(0,0,0,.25)'
  });
  wrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ccc;padding-bottom:6px">
      <b>🦦 Aonyx Timer v3.0</b>
      <button id="ax_close" style="background:#fdd;border:1px solid #a33;border-radius:6px;padding:2px 6px">X</button>
    </div>
    <div style="margin-top:8px">
      Ziel: <input id="ax_target" placeholder="123|456" style="width:100px"/>
      Zeit: <input id="ax_time" style="width:140px"/>
      <label><input type="radio" name="ax_mode" value="attack" checked> Angriff</label>
      <label><input type="radio" name="ax_mode" value="support"> Support</label>
      <button id="ax_load">Dörfer laden</button>
      <button id="ax_calc">Laufzeiten berechnen</button>
      <div id="ax_count" style="float:right;font-weight:bold">--</div>
    </div>
    <div id="ax_table" style="margin-top:10px;max-height:400px;overflow:auto;border-top:1px solid #ccc;padding-top:6px"></div>
    <div style="margin-top:10px">
      <button id="ax_go" style="background:#2b7aea;color:#fff;border:none;padding:8px 14px;border-radius:6px;font-weight:bold">GO (dein Klick)</button>
    </div>
  `;
  document.body.appendChild(wrap);

  const closeBtn = $('#ax_close');
  const targetIn = $('#ax_target');
  const timeIn   = $('#ax_time');
  const loadBtn  = $('#ax_load');
  const calcBtn  = $('#ax_calc');
  const goBtn    = $('#ax_go');
  const tableDiv = $('#ax_table');

  closeBtn.onclick = ()=>wrap.remove();
  targetIn.value = load('target','');
  timeIn.value = load('time',fmtHMSms(new Date()));
  timeMask(timeIn);

  targetIn.addEventListener('input',()=>save('target',targetIn.value));
  timeIn.addEventListener('input',()=>save('time',timeIn.value));

  if (TWMap && typeof TWMap.on === 'function') {
    TWMap.on('click', e=>{
      if (e?.coords) {
        targetIn.value = `${e.coords.x}|${e.coords.y}`;
        save('target',targetIn.value);
        UI.SuccessMessage(`Ziel gesetzt: ${targetIn.value}`);
      }
    });
  }

  // Countdown
  setInterval(()=>{
    const t=parseTime(timeIn.value), cd=$('#ax_count');
    if(!t||!cd)return;
    const ms=Math.max(0,t.getTime()-Date.now());
    const s=Math.floor(ms/1000)%60, m=Math.floor(ms/60000);
    cd.textContent=`Countdown: ${m>0?m+'m ':''}${s}.${String(ms%1000).padStart(3,'0')}s`;
  },60);

  let villages=[];
  loadBtn.onclick = ()=>{
    villages=getVillages();
    UI.SuccessMessage(`${villages.length} Dörfer geladen`);
    buildTable();
  };

  function buildTable(){
    const units=availableUnits();
    let html='<table class="vis" style="width:100%;border-collapse:collapse"><thead><tr><th>Dorf</th><th>Einheit</th><th>Laufzeit</th><th>Menge</th></tr></thead><tbody>';
    for(const v of villages){
      html+=`<tr><td colspan="4" style="background:#f7f7f7"><b>${v.name}</b> (${v.x}|${v.y})</td></tr>`;
      for(const u of units){
        html+=`<tr><td>${UNIT_LABEL[u]||u}</td><td>${u}</td><td id="ax_t_${v.id}_${u}">-</td>
        <td><input class="ax_amt" data-vid="${v.id}" data-unit="${u}" style="width:60px" value="${load('amounts',{})?.[v.id]?.[u]||0}"></td></tr>`;
      }
    }
    html+='</tbody></table>';
    tableDiv.innerHTML=html;
    tableDiv.querySelectorAll('.ax_amt').forEach(inp=>{
      inp.addEventListener('input',()=>{
        const vid=inp.dataset.vid,unit=inp.dataset.unit,val=+inp.value||0;
        const map=load('amounts',{});map[vid]=map[vid]||{};map[vid][unit]=val;save('amounts',map);
      });
    });
  }

  calcBtn.onclick=()=>{
    const coord=(targetIn.value||'').trim();
    const m=coord.match(/^(\d{1,3})\|(\d{1,3})$/);
    if(!m)return UI.ErrorMessage('Ungültiges Ziel');
    const tx=+m[1],ty=+m[2];
    const my=game_data.village;
    const units=availableUnits();
    for(const v of villages){
      for(const u of units){
        const cell=$(`#ax_t_${v.id}_${u}`);
        if(!cell)continue;
        const ms=calcTravel(u,v.x,v.y,tx,ty);
        cell.textContent=ms?`${Math.round(ms/1000)}s`:'n/a';
      }
    }
    UI.SuccessMessage('Laufzeiten berechnet');
  };

  goBtn.onclick=()=>{
    const coord=(targetIn.value||'').trim();
    const m=coord.match(/^(\d{1,3})\|(\d{1,3})$/);
    if(!m)return UI.ErrorMessage('Ungültiges Ziel');
    const tx=+m[1],ty=+m[2];
    const mode=document.querySelector('input[name="ax_mode"]:checked')?.value||'attack';
    const units=availableUnits();
    for(const v of villages){
      const set=load('amounts',{})[v.id]||{};
      const payload={};
      for(const u of units){
        const n=+set[u]||0;
        if(n>0)payload[u]=n;
      }
      if(Object.keys(payload).length){
        sendCommand(v.id,tx,ty,mode,payload);
        UI.SuccessMessage(`Befehl gesendet aus ${v.name}`);
        return;
      }
    }
    UI.ErrorMessage('Keine Mengen gesetzt');
  };

  UI.SuccessMessage('Aonyx Timer aktiv');

})();
