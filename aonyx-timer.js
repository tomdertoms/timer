// 🦦 Aonyx Timer v4.3 — robuste Dorf-Erkennung (am_farm → overview_villages → map/village.txt)
(function () {
  'use strict';
  if (!window.TribalWars || !window.game_data) {
    alert('Aonyx Timer: bitte im Spiel (Karte / Versammlungsplatz / AM) ausführen.');
    return;
  }

  const LS='aonyx_timer_v43_';
  const save=(k,v)=>localStorage.setItem(LS+k,JSON.stringify(v));
  const load=(k,d=null)=>{try{const s=localStorage.getItem(LS+k);return s?JSON.parse(s):d;}catch(_){return d;}};
  const p2=n=>String(n).padStart(2,'0'), p3=n=>String(n).padStart(3,'0');
  const fmt=d=>`${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}.${p3(d.getMilliseconds())}`;
  const parse=(s)=>{if(!s)return null;const m=s.trim().match(/^(\d{1,2}):?(\d{2})?:?(\d{2})?(?:\.(\d{1,3}))?$/);if(!m)return null;
    const d=new Date();d.setHours(+m[1]||0,+m[2]||0,+m[3]||0,Number((m[4]||'0').padEnd(3,'0')));return d;};
  const timeMask=i=>{i.addEventListener('input',()=>{const r=i.value.replace(/\D/g,'').slice(0,9);
    let h=r.slice(0,2),m=r.slice(2,4),s=r.slice(4,6),ms=r.slice(6,9); if(h.length===1)h='0'+h; if(m&&m.length===1)m='0'+m; if(s&&s.length===1)s='0'+s;
    let o=''; if(h)o+=h; if(m)o+=':'+m; if(s)o+=':'+s; if(ms)o+='.'+ms; i.value=o;});
    i.addEventListener('blur',()=>{const d=parse(i.value); i.value=d?fmt(d):'';});};

  const UNIT_LABEL={spear:'Speer',sword:'Schwert',axe:'Axt',archer:'Bogenschütze',spy:'Späher',
    light:'Leichte Kav.',marcher:'Beritt. Bogi',heavy:'Schwere Kav.',ram:'Ramme',catapult:'Katapult',knight:'Paladin'};

  const root=document.querySelector('#content_value')||document.body;
  const old=document.getElementById('aonyx_timer_dialog'); if(old) old.remove();

  const dialog=document.createElement('div');
  dialog.id='aonyx_timer_dialog';
  Object.assign(dialog.style,{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
    background:'#f9f5e9',border:'2px solid #553',borderRadius:'6px',zIndex:999999,padding:'10px',width:'720px',
    boxShadow:'0 8px 25px rgba(0,0,0,.4)',font:'13px Arial',color:'#111'});
  dialog.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;background:#e1d2b1;padding:4px 8px;border-radius:4px">
      <b>🦦 Aonyx Timer</b>
      <button id="ax_close" style="background:#fdd;border:1px solid #a33;border-radius:4px;padding:1px 6px">X</button>
    </div>
    <div style="margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      Ziel: <input id="ax_target" placeholder="123|456" style="width:110px"/>
      Zeit: <input id="ax_time" style="width:150px"/>
      <label><input type="radio" name="ax_mode" value="attack" checked> Angriff</label>
      <label><input type="radio" name="ax_mode" value="support"> Support</label>
      <button id="ax_load">Dörfer laden</button>
      <button id="ax_calc">Laufzeiten</button>
      <div id="ax_cd" style="margin-left:auto;font-weight:bold">Countdown: --</div>
    </div>
    <div id="ax_table" style="margin-top:10px;max-height:360px;overflow:auto;border-top:1px solid #ccc;padding-top:6px;background:#fff"></div>
    <div style="margin-top:10px;text-align:right">
      <button id="ax_go" style="background:#2b7aea;color:#fff;border:none;padding:8px 14px;border-radius:6px;font-weight:bold">GO (dein Klick)</button>
    </div>`;
  root.appendChild(dialog);

  const $=id=>document.getElementById(id);
  const target=$('ax_target'), time=$('ax_time'), table=$('ax_table');
  $('ax_close').onclick=()=>dialog.remove();
  target.value=load('target',''); time.value=load('time',fmt(new Date())); timeMask(time);
  target.addEventListener('input',()=>save('target',target.value)); time.addEventListener('input',()=>save('time',time.value));
  setInterval(()=>{const t=parse(time.value),el=$('ax_cd'); if(!t||!el)return; const ms=Math.max(0,t.getTime()-Date.now());
    el.textContent=`Countdown: ${Math.floor(ms/60000)}m ${(Math.floor(ms/1000)%60)}.${String(ms%1000).padStart(3,'0')}s`;},60);

  // ======= Dorf-Lader: am_farm → overview_villages → map/village.txt =======
  async function loadVillages(){
    // Try #1: AM Farm (schnell & sauber, wenn verfügbar)
    try{
      const v1 = await new Promise((res)=>TribalWars.post('game.php',
        {screen:'am_farm',ajax:'1',ajaxaction:'list',village:game_data.village.id},
        (r)=>{try{const j=(typeof r==='string')?JSON.parse(r):r;res(j?.villages?.map(x=>({id:String(x.id),name:x.name,x:+x.x,y:+x.y}))||null);}catch{res(null);}}));
      if (v1 && v1.length) return uniqueById(v1);
    }catch{}

    // Try #2: Overview parse
    let ids=[], rows=[];
    try{
      const html = await new Promise(res=>TribalWars.get('game.php',
        {screen:'overview_villages',mode:'combined',village:game_data.village.id}, res));
      const doc=document.implementation.createHTMLDocument('v'); doc.documentElement.innerHTML=html;
      const links=[...doc.querySelectorAll('a[href*="village="]')];
      const seen=new Set();
      links.forEach(a=>{
        const href=a.getAttribute('href')||'';
        const m=href.match(/village=(\d+)/); if(!m) return;
        const id=m[1]; if(seen.has(id)) return; seen.add(id);
        ids.push(id);
        rows.push({id, name:(a.textContent||'').trim()});
      });
    }catch{}

    // Try #3: map/village.txt → ids zu Koordinaten joinen
    if (ids.length){
      try{
        const txt = await new Promise((res,rej)=>jQuery.get(location.origin+'/map/village.txt',res).fail(rej));
        const idx=new Map();
        String(txt).split('\n').forEach(line=>{
          const [id,x,y]=line.split(',');
          if(id && x && y) idx.set(String(id), {x:+x, y:+y});
        });
        const out = rows.map(v=>Object.assign(v, idx.get(v.id)||{})).filter(v=>Number.isFinite(v.x)&&Number.isFinite(v.y));
        if (out.length) return uniqueById(out);
      }catch{}
    }

    // Last resort: aktuelles Dorf
    const v=game_data.village;
    return [{id:String(v.id),name:v.name,x:+v.x,y:+v.y}];
  }
  const uniqueById=(arr)=>Array.from(new Map(arr.map(o=>[o.id,o])).values());

  // ======= Reisezeit (aus Weltdaten, stabil & schnell) =======
  function travelMs(unit, fx,fy, tx,ty){
    const ud=game_data.units_data?.[unit]; if(!ud) return null;
    const dist=Math.hypot(fx-tx,fy-ty);
    const mins = ud.speed * (game_data.config.unit_speed / game_data.config.speed);
    return Math.round(dist * mins * 60000);
  }

  function buildTable(vills){
    const units = Object.keys(game_data.units_data||{});
    let html = '<table class="vis" style="width:100%;border-collapse:collapse"><thead><tr>'
      + '<th style="text-align:left">Dorf</th><th>Einheit</th><th>Laufzeit</th><th>Menge</th></tr></thead><tbody>';
    for(const v of vills){
      html += `<tr><td colspan="4" style="background:#f7f7f7"><b>${v.name}</b> (${v.x}|${v.y})</td></tr>`;
      for(const u of units){
        html += `<tr>
          <td>${UNIT_LABEL[u]||u}</td>
          <td>${u}</td>
          <td id="ax_t_${v.id}_${u}">-</td>
          <td><input class="ax_amt" data-vid="${v.id}" data-unit="${u}" style="width:70px" value="${load('amts',{})?.[v.id]?.[u]||0}"></td>
        </tr>`;
      }
    }
    html += '</tbody></table>';
    table.innerHTML = html;

    // persist Mengen
    table.querySelectorAll('.ax_amt').forEach(inp=>{
      inp.addEventListener('input',()=>{
        const m=load('amts',{}); const vid=inp.dataset.vid, u=inp.dataset.unit;
        m[vid]=m[vid]||{}; m[vid][u]=+inp.value||0; save('amts',m);
      });
    });
  }

  // Buttons
  let VILLS = [];
  $('ax_load').onclick = async ()=>{
    UI.SuccessMessage('Lade Dörfer…');
    VILLS = await loadVillages();
    buildTable(VILLS);
    UI.SuccessMessage(`Dörfer geladen: ${VILLS.length}`);
  };

  $('ax_calc').onclick = ()=>{
    if (!VILLS.length) return UI.ErrorMessage('Erst Dörfer laden.');
    const m = (target.value||'').trim().match(/^(\d{1,3})\|(\d{1,3})$/);
    if (!m) return UI.ErrorMessage('Ungültiges Ziel');
    const tx=+m[1], ty=+m[2];
    const units = Object.keys(game_data.units_data||{});
    for (const v of VILLS){
      for (const u of units){
        const cell = document.getElementById(`ax_t_${v.id}_${u}`);
        if (!cell) continue;
        const ms = travelMs(u, v.x, v.y, tx, ty);
        cell.textContent = ms ? `${Math.round(ms/1000)}s` : 'n/a';
      }
    }
    UI.SuccessMessage('Laufzeiten berechnet.');
  };

  $('ax_go').onclick = ()=>{
    UI.SuccessMessage('GO gedrückt — (hier bleibt es bei deinem Klick).');
  };

  UI.SuccessMessage('Aonyx Timer aktiv.');
})();
