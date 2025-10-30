// Aonyx Timer v2.5
// Wenn du das liest, läuft’s. Wenn nicht, klick weniger.
// Credits: basiert auf Routinen von PornoPommes, aufgeräumt & verschärft von dir.

(function(){
  'use strict';

  if (!window.TribalWars || typeof TribalWars.post !== 'function' || !window.game_data) {
    alert('Aonyx Timer: Im Spiel ausführen (nicht auf der Loginseite).');
    return;
  }

  /* ===== Helfer ===== */
  const LS = 'aonyx_timer_v25_';
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
// Panel anhängen, dann sicherstellen, dass DOM-Elemente existieren
document.body.appendChild(wrap);

requestAnimationFrame(() => {
  const closeBtn = document.getElementById('ax_close');
  const targetIn = document.getElementById('ax_target');
  const timeIn = document.getElementById('ax_time');

  if (!closeBtn || !targetIn || !timeIn) {
    console.warn('[Aonyx] UI-Elemente fehlen – Timer konnte nicht initialisiert werden.');
    return;
  }

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

  // Klick auf Karte = Ziel übernehmen
  try {
    if (window.TWMap && typeof TWMap.on === 'function') {
      TWMap.on('click', e => {
        if (e?.coords) {
          targetIn.value = `${e.coords.x}|${e.coords.y}`;
          save('target', targetIn.value);
        }
      });
    }
  } catch (_) {}

  // Countdown
  setInterval(() => {
    const t = parseTime(timeIn.value);
    const cd = document.getElementById('ax_countdown');
    if (!t || !cd) return;
    const ms = Math.max(0, t.getTime() - Date.now());
    const sec = Math.floor(ms / 1000) % 60;
    const min = Math.floor(ms / 60000);
    const rem = String(ms % 1000).padStart(3, '0');
    cd.textContent = `Countdown: ${min > 0 ? min + 'm ' : ''}${sec}.${rem}s`;
  }, 60);

  try { UI.SuccessMessage('Aonyx Timer aktiv.'); } catch (_) {}
});


  /* ===== Backend ===== */
  function loadVillages(){
    return new Promise(resolve=>{
      TribalWars.post('game.php',{screen:'am_farm',ajax:'1',ajaxaction:'list',village:game_data.village.id},function(resp){
        try{
          const j=(typeof resp==='string')?JSON.parse(resp):resp;
          if(j?.villages?.length){
            const v=j.villages.map(o=>({id:String(o.id),name:o.name||('v'+o.id),x:+o.x||0,y:+o.y||0}));
            save('vills',v);resolve(v);return;
          }
        }catch(_){}
        TribalWars.get('game.php',{screen:'overview_villages',mode:'combined',village:game_data.village.id},function(html){
          try{
            const doc=document.implementation.createHTMLDocument('v');doc.documentElement.innerHTML=html;
            const links=Array.from(doc.querySelectorAll('a[href*="village="]'));const seen=new Set(),v=[];
            links.forEach(a=>{const m=(a.getAttribute('href')||'').match(/village=(\d+)/);if(m&&!seen.has(m[1])){seen.add(m[1]);v.push({id:m[1],name:a.textContent.trim(),x:0,y:0});}});
            jQuery.get(location.origin+'/map/village.txt',function(txt){
              const idx=new Map();String(txt).split('\n').forEach(line=>{const[id,x,y]=line.split(',');if(id&&x&&y)idx.set(String(id),{x:+x,y:+y});});
              const withCoords=v.map(vv=>idx.has(vv.id)?Object.assign(vv,idx.get(vv.id)):vv);save('vills',withCoords);resolve(withCoords);
            }).fail(()=>{save('vills',v);resolve(v);});
          }catch(e){save('vills',[]);resolve([]);}
        });
      });
    });
  }

  function loadUnitsForVillage(vid){
    return new Promise(resolve=>{
      const actions=['get_farm_units','get_units','get_farm_units_v2'];let i=0;
      function step(){
        if(i>=actions.length){
          TribalWars.get('game.php',{screen:'place',village:vid},function(html){
            try{
              const doc=document.implementation.createHTMLDocument('p');doc.documentElement.innerHTML=html;
              const out={};availableUnits().forEach(u=>{const s=doc.querySelector(`#units_entry_all_${u},#units_entry_${u},span[id*="units_entry"][id*="${u}"]`);if(s){const m=s.textContent.replace(/\./g,'').match(/(\d+)/);if(m)out[u]=+m[1];}});
              resolve(out);
            }catch(e){resolve({});}
          });
          return;
        }
        const action=actions[i++];
        TribalWars.post('game.php',{screen:'am_farm',ajax:'1',ajaxaction:action,village:vid},function(resp){
          try{const j=(typeof resp==='string')?JSON.parse(resp):resp;const u=j?.units||j?.response?.units||{};if(u&&Object.keys(u).length){resolve(u);}else step();}catch(_){step();}});
      }step();
    });
  }

  function calcDurationMs(vid,unit,tx,ty){
    return new Promise(resolve=>{
      TribalWars.get('game.php',{village:vid,screen:'place'},function(){
        TribalWars.post('game.php',{village:vid,screen:'place',ajax:'1',ajaxaction:'calculate_time',x:tx,y:ty,unit:unit,h:game_data.csrf},function(resp){
          try{const j=(typeof resp==='string')?JSON.parse(resp):resp;const ms=j?.response?.duration??j?.data?.duration??j?.duration??null;resolve(ms?+ms:null);}
          catch(_){const m=String(resp).match(/"duration"\\s*:\\s*(\\d+)/);resolve(m?+m[1]:null);}
        });
      });
    });
  }

  function sendCommand(vid,tx,ty,type,unitsObj){
    const payload=Object.assign({village:vid,screen:'place',ajax:'1',ajaxaction:'command',x:tx,y:ty,type:type,h:game_data.csrf},
      Object.fromEntries(Object.entries(unitsObj).map(([k,v])=>[`units[${k}]`,v])));
    TribalWars.post('game.php',payload,function(resp){
      try{UI.SuccessMessage('Aonyx: Befehl gesendet');}catch(_){}console.log('[Aonyx]',resp);
    });
  }

  /* ===== Tabelle ===== */
  function buildTable(vills){
    const w=$('#ax_table_wrap');const units=availableUnits();
    let html='<table class="vis" style="width:100%;border-collapse:collapse"><thead><tr><th>Dorf</th><th>Einheit</th><th>Verfügbar</th><th>Laufzeit</th><th>Senden</th><th>Aktion</th></tr></thead><tbody>';
    for(const v of vills){
      html+=`<tr><td colspan="6" style="background:#f7f7f7;padding:6px"><b>${v.name}</b> (${v.x}|${v.y}) (id:${v.id}) <button class="ax_chk btn" data-vid="${v.id}" style="margin-left:8px">Units prüfen</button></td></tr>`;
      for(const u of units){
        const avail=load('avail',{})?.[v.id]?.[u]??'—';const amt=load('amounts',{})?.[v.id]?.[u]??0;
        html+=`<tr><td>${UNIT_LABEL[u]||u}</td><td>${u}</td><td><span id="ax_av_${v.id}_${u}">${avail}</span></td><td id="ax_time_${v.id}_${u}">-</td><td><input class="ax_amt" data-vid="${v.id}" data-unit="${u}" value="${amt}" style="width:70px"></td><td><button class="ax_calc btn" data-vid="${v.id}" data-unit="${u}">calc</button></td></tr>`;
      }
    }
    html+='</tbody></table>';w.innerHTML=html;

    w.querySelectorAll('.ax_chk').forEach(btn=>{
      btn.addEventListener('click',async()=>{
        const vid=btn.dataset.vid;try{UI.SuccessMessage('Units…');}catch(_){}const units=await loadUnitsForVillage(vid);
        const map=load('avail',{});map[vid]=Object.assign(map[vid]||{},units||{});save('avail',map);
        Object.entries(units||{}).forEach(([k,v])=>{const sp=$(`ax_av_${vid}_${k}`);if(sp)sp.textContent=v;});
      });
    });

    w.querySelectorAll('.ax_calc').forEach(btn=>{
      btn.addEventListener('click',async()=>{
        const vid=btn.dataset.vid,unit=btn.dataset.unit;const coord=($('#ax_target').value||'').trim();
        if(!coord)return UI.ErrorMessage('Kein Ziel');const m=coord.match(/^(\\d{1,3})\\|(\\d{1,3})$/);if(!m)return UI.ErrorMessage('Ziel kaputt');
        const tx=+m[1],ty=+m[2];const cell=$(`ax_time_${vid}_${unit}`);if(cell)cell.textContent='…';
        const ms=await calcDurationMs(vid,unit,tx,ty);cell.textContent=ms?`${Math.round(ms/1000)}s`:'n/a';
        const tgt=parseTime($('#ax_time').value);const ok=(tgt&&ms)?(tgt.getTime()-ms>Date.now()):null;
        cell.style.color=ok==null?'#333':(ok?'#078a07':'#c33');
      });
    });

    w.querySelectorAll('.ax_amt').forEach(inp=>{
      inp.addEventListener('input',()=>{const vid=inp.dataset.vid,unit=inp.dataset.unit,val=+inp.value||0;const map=load('amounts',{});map[vid]=map[vid]||{};map[vid][unit]=val;save('amounts',map);});
    });
  }

  $('#ax_load_vills').onclick=async()=>{const v=await loadVillages();if(!v||!v.length){try{UI.ErrorMessage('Keine Dörfer.');}catch(_){}return;}try{UI.SuccessMessage('Dörfer geladen');}catch(_){}buildTable(v);};
  $('#ax_refresh').onclick=async()=>{const coord=($('#ax_target').value||'').trim();if(!coord)return UI.ErrorMessage('Kein Ziel');const m=coord.match(/^(\\d{1,3})\\|(\\d{1,3})$/);if(!m)return UI.ErrorMessage('Ziel kaputt');const tx=+m[1],ty=+m[2];const vills=load('vills',[]);if(!vills.length)return UI.ErrorMessage('Keine Dörfer geladen');const units=availableUnits();for(const v of vills){for(const u of units){const cell=$(`ax_time_${v.id}_${u}`);if(cell)cell.textContent='…';const ms=await calcDurationMs(v.id,u,tx,ty);if(cell)cell.textContent=ms?`${Math.round(ms/1000)}s`:'n/a';await new Promise(r=>setTimeout(r,60));}}try{UI.SuccessMessage('Laufzeiten aktualisiert');}catch(_){}};  
  $('#ax_go').onclick=()=>{const coord=($('#ax_target').value||'').trim();if(!coord)return UI.ErrorMessage('Kein Ziel');const m=coord.match(/^(\\d{1,3})\\|(\\d{1,3})$/);if(!m)return UI.ErrorMessage('Ziel kaputt');const tx=+m[1],ty=+m[2];const mode=document.querySelector('input[name="ax_mode"]:checked')?.value||'attack';const vills=load('vills',[]);const units=availableUnits();for(const v of vills){const set=load('amounts',{})[v.id]||{};const payload={};for(const u of units){const n=+set[u]||0;if(n>0)payload[u]=n;}if(Object.keys(payload).length){sendCommand(v.id,tx,ty,mode,payload);return;}}UI.ErrorMessage('Keine Mengen gesetzt');};

(function init(){
  if (!load('time', null)) save('time', fmtHMSms(new Date()));
  try { UI.SuccessMessage('Aonyx Timer bereit.'); } catch(_) {}
})();
})();

