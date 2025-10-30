// 🦦 Aonyx Timer v3.3 — Frame-fix Edition
// hängt sich in das Spiel-Frame ein, funktioniert auf Karte & Versammlungsplatz

(function(){
  'use strict';
  if (!window.TribalWars || !window.game_data) {
    alert('Aonyx Timer: Bitte im Spiel ausführen (Karte oder Versammlungsplatz).');
    return;
  }

  const LS = 'aonyx_timer_v33_';
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

  const save=(k,v)=>localStorage.setItem(LS+k,JSON.stringify(v));
  const load=(k,d=null)=>{try{const s=localStorage.getItem(LS+k);return s?JSON.parse(s):d;}catch(_){return d;}};

  const UNIT_LABEL={
    spear:'Speer', sword:'Schwert', axe:'Axt', archer:'Bogenschütze', spy:'Späher',
    light:'Leichte Kav.', marcher:'Beritt. Bogi', heavy:'Schwere Kav.',
    ram:'Ramme', catapult:'Katapult', knight:'Paladin'
  };

  const frame = window.frames.main || window;
  const doc = (frame.document || document);

  function $(id){ return doc.getElementById(id); }

  const wrap = doc.createElement('div');
  wrap.id = 'aonyx_timer_panel';
  Object.assign(wrap.style,{
    position:'fixed',top:'70px',right:'16px',zIndex:999999,
    background:'#fff',border:'1px solid #111',borderRadius:'8px',
    padding:'10px',font:'13px Arial',width:'720px',
    boxShadow:'0 4px 20px rgba(0,0,0,.25)'
  });
  wrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ccc;padding-bottom:6px">
      <b>🦦 Aonyx Timer v3.3</b>
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
  doc.body.appendChild(wrap);

  // === Jetzt wirklich initialisieren ===
  function initUI(attempt=1){
    const closeBtn = $('#ax_close');
    const targetIn = $('#ax_target');
    const timeIn   = $('#ax_time');
    const loadBtn  = $('#ax_load');
    const calcBtn  = $('#ax_calc');
    const goBtn    = $('#ax_go');
    const tableDiv = $('#ax_table');

    if (!closeBtn || !loadBtn || !calcBtn || !goBtn) {
      if (attempt < 10) {
        console.warn(`[Aonyx] Frame UI noch nicht bereit (${attempt})`);
        return setTimeout(()=>initUI(attempt+1),200);
      } else {
        console.error('[Aonyx] UI konnte nicht initialisiert werden.');
        return;
      }
    }

    // === UI ready ===
    closeBtn.onclick = ()=>wrap.remove();
    targetIn.value = load('target','');
    timeIn.value = load('time',fmtHMSms(new Date()));
    timeMask(timeIn);

    targetIn.addEventListener('input',()=>save('target',targetIn.value));
    timeIn.addEventListener('input',()=>save('time',timeIn.value));

    setInterval(()=>{
      const t=parseTime(timeIn.value), cd=$('#ax_count');
      if(!t||!cd)return;
      const ms=Math.max(0,t.getTime()-Date.now());
      const s=Math.floor(ms/1000)%60, m=Math.floor(ms/60000);
      cd.textContent=`Countdown: ${m>0?m+'m ':''}${s}.${String(ms%1000).padStart(3,'0')}s`;
    },60);

    let villages=[];
    loadBtn.onclick = ()=>{
      villages = getVillages();
      if(!villages.length) return UI.ErrorMessage('Keine Dörfer gefunden');
      UI.SuccessMessage(`${villages.length} Dörfer geladen`);
      buildTable();
    };

    function getVillages(){
      let list=[];
      if (window.TWMap?.villages) {
        list = Object.values(TWMap.villages).map(v=>({id:v.id,name:v.name,x:v.x,y:v.y}));
      } else if (game_data.player?.villages) {
        const vmap = game_data.player.villages;
        list = Object.keys(vmap).map(id=>({id,name:vmap[id].name,x:vmap[id].x,y:vmap[id].y}));
      } else list=[{id:game_data.village.id,name:game_data.village.name,x:game_data.village.x,y:game_data.village.y}];
      return list;
    }

    function calcTravel(unit, fx,fy, tx,ty){
      const ud=game_data.units_data?.[unit];
      if(!ud)return null;
      const dist=Math.hypot(fx-tx,fy-ty);
      const mins=ud.speed*(game_data.config.unit_speed/game_data.config.speed);
      return Math.round(dist*mins*60000);
    }

    function buildTable(){
      const units = Object.keys(game_data.units_data||{});
      let html='<table class="vis" style="width:100%;border-collapse:collapse"><thead><tr><th>Dorf</th><th>Einheit</th><th>Laufzeit</th><th>Menge</th></tr></thead><tbody>';
      for(const v of villages){
        html+=`<tr><td colspan="4" style="background:#f7f7f7"><b>${v.name}</b> (${v.x}|${v.y})</td></tr>`;
        for(const u of units){
          html+=`<tr><td>${UNIT_LABEL[u]||u}</td><td>${u}</td><td id="ax_t_${v.id}_${u}">-</td>
          <td><input class="ax_amt" data-vid="${v.id}" data-unit="${u}" style="width:60px" value="${load('amounts',{})?.[v.id]?.[u]||0}"></td></tr>`;
        }
      }
      html+='</tbody></table>';
      tableDiv.innerHTML = html;
    }

    calcBtn.onclick=()=>{
      const coord=(targetIn.value||'').trim();
      const m=coord.match(/^(\d{1,3})\|(\d{1,3})$/);
      if(!m)return UI.ErrorMessage('Ungültiges Ziel');
      const tx=+m[1],ty=+m[2];
      for(const v of villages){
        for(const u of Object.keys(game_data.units_data||{})){
          const cell=$(`#ax_t_${v.id}_${u}`);
          if(!cell)continue;
          const ms=calcTravel(u,v.x,v.y,tx,ty);
          cell.textContent=ms?`${Math.round(ms/1000)}s`:'n/a';
        }
      }
      UI.SuccessMessage('Laufzeiten berechnet');
    };

    goBtn.onclick=()=>{
      UI.SuccessMessage('GO gedrückt – Simulation aktiv');
    };

    UI.SuccessMessage('Aonyx Timer aktiv im Frame');
  }

  setTimeout(()=>initUI(),200);

})();
