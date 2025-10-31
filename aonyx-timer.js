// Aonyx Timer v6.1 FIX — Läuft fehlerfrei, Regex korrigiert, echte Laufzeiten.
// Du klickst selbst. Kein Autosend. Designed for Karte & Versammlungsplatz.

(function(){
  'use strict';
  if(!window.TribalWars||!window.game_data){
    alert('Aonyx Timer: bitte im Spiel öffnen (Karte oder Versammlungsplatz).');
    return;
  }

  const LS='aonyx_v61_';
  const $id=id=>document.getElementById(id);
  const save=(k,v)=>localStorage.setItem(LS+k,JSON.stringify(v));
  const load=(k,d=null)=>{try{const s=localStorage.getItem(LS+k);return s?JSON.parse(s):d;}catch(_){return d;}};
  const pad2=n=>String(n).padStart(2,'0'), pad3=n=>String(n).padStart(3,'0');
  const fmtHMSms=d=>`${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}.${pad3(d.getMilliseconds())}`;
  const parseTime=s=>{
    if(!s)return null;
    const m=s.trim().match(/^(\d{1,2})(?::?(\d{2}))?(?::?(\d{2}))?(?:\.(\d{1,3}))?$/);
    if(!m)return null;
    const d=new Date();
    d.setHours(+m[1]||0,+m[2]||0,+m[3]||0,Number((m[4]||'0').padEnd(3,'0')));
    return d;
  };
  const maskTime=input=>{
    input.addEventListener('input',()=>{
      const r=input.value.replace(/\D/g,'').slice(0,9);
      let h=r.slice(0,2),m=r.slice(2,4),s=r.slice(4,6),ms=r.slice(6,9);
      if(h.length===1)h='0'+h;if(m&&m.length===1)m='0'+m;if(s&&s.length===1)s='0'+s;
      let o='';if(h)o+=h;if(m)o+=':'+m;if(s)o+=':'+s;if(ms)o+='.'+ms;input.value=o;
    });
    input.addEventListener('blur',()=>{const d=parseTime(input.value);input.value=d?fmtHMSms(d):'';});
  };

  const UNIT_LABEL={
    spear:'Speer',sword:'Schwert',axe:'Axt',archer:'Bogenschütze',spy:'Späher',
    light:'Leichte Kav.',marcher:'Beritt. Bogi',heavy:'Schwere Kav.',
    ram:'Ramme',catapult:'Katapult',knight:'Paladin'
  };
  const allUnits=()=>Array.isArray(game_data.units)&&game_data.units.length?game_data.units.slice():Object.keys(game_data.units_data||{});

  // === UI ===
  const PID='aonyx_v61_panel';
  document.getElementById(PID)?.remove();
  const p=document.createElement('div');
  Object.assign(p.style,{position:'fixed',top:'10%',left:'50%',transform:'translateX(-50%)',
    width:'900px',background:'#fff',border:'1px solid #C1A264',borderRadius:'6px',
    boxShadow:'0 10px 35px rgba(0,0,0,.25)',zIndex:2147483647,font:'13px Arial'});
  p.innerHTML=`
    <div class="vis">
      <table class="vis" style="width:100%;border-bottom:1px solid #dec79b"><tr>
        <th style="text-align:left">🦦 Aonyx Timer v6.1</th>
        <th style="text-align:right"><button id="ax_close" class="btn">X</button></th>
      </tr></table>
      <div style="padding:8px">
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          Ziel:<input id="ax_target" style="width:110px" placeholder="123|456">
          Zeit:<input id="ax_time" style="width:140px">
          <label><input type="radio" name="ax_mode" value="attack" checked>Angriff</label>
          <label><input type="radio" name="ax_mode" value="support">Unterstützung</label>
          <button id="ax_load" class="btn">Dörfer laden</button>
          <button id="ax_calc_all" class="btn">Alle berechnen</button>
          <span id="ax_count" style="margin-left:auto;font-weight:bold">Countdown: --</span>
        </div>
        <div id="ax_tbl" style="max-height:400px;overflow:auto;border-top:1px solid #ddd;margin-top:6px">
          <div style="color:#666;padding:4px">Noch keine Dörfer.</div>
        </div>
        <div style="text-align:right;margin-top:6px">
          <button id="ax_go" class="btn evt-confirm-btn btn-confirm-yes">GO</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(p);
  $id('ax_close').onclick=()=>p.remove();

  const targetEl=$id('ax_target'),timeEl=$id('ax_time');
  targetEl.value=load('target','');timeEl.value=load('time',fmtHMSms(new Date()));maskTime(timeEl);
  targetEl.oninput=()=>save('target',targetEl.value);timeEl.oninput=()=>save('time',timeEl.value);

  try{
    if(TWMap&&typeof TWMap.on==='function'){
      TWMap.on('click',e=>{if(e?.coords){targetEl.value=`${e.coords.x}|${e.coords.y}`;save('target',targetEl.value);}});
    }
  }catch(_){}
  setInterval(()=>{
    const t=parseTime(timeEl.value),o=$id('ax_count');
    if(!t||!o)return;
    const ms=Math.max(0,t.getTime()-Date.now());
    o.textContent=`Countdown: ${Math.floor(ms/60000)}m ${Math.floor(ms/1000)%60}.${String(ms%1000).padStart(3,'0')}s`;
  },60);

  // === Data ===
  async function loadVillages(){
    try{
      const resp=await new Promise(res=>TribalWars.post('game.php',{screen:'am_farm',ajax:'1',ajaxaction:'list',village:game_data.village.id},res));
      const j=typeof resp==='string'?JSON.parse(resp):resp;
      if(j?.villages?.length){
        const v=j.villages.map(o=>({id:String(o.id),name:o.name||`v${o.id}`,x:+o.x,y:+o.y}));
        save('villages',v);return v;
      }
    }catch(_){}
    const dv=game_data.village;
    return[{id:String(dv.id),name:dv.name,x:+dv.x,y:+dv.y}];
  }

  async function loadUnits(vid){
    try{
      const html=await new Promise(res=>TribalWars.get('game.php',{screen:'place',village:vid},res));
      const d=document.implementation.createHTMLDocument('p');d.documentElement.innerHTML=html;
      const out={};allUnits().forEach(u=>{
        const s=d.querySelector(`#units_entry_all_${u},#units_entry_${u},span[id*="units_entry"][id*="${u}"]`);
        if(s){const m=(s.textContent||'').replace(/\./g,'').match(/(\d+)/);if(m)out[u]=+m[1];}});
      return out;
    }catch(_){return{};}
  }

  function calcMs(vid,unit,tx,ty){
    return new Promise(r=>{
      TribalWars.post('game.php',{screen:'place',ajax:'1',ajaxaction:'calculate_time',village:vid,x:tx,y:ty,unit,h:game_data.csrf},resp=>{
        try{const j=typeof resp==='string'?JSON.parse(resp):resp;const ms=j?.response?.duration||j?.data?.duration||j?.duration;r(ms?+ms:null);}
        catch(e){const m=String(resp).match(/"duration"\s*:\s*(\d+)/);r(m?+m[1]:null);}
      });
    });
  }

  // === Table ===
  let VILL=[],ACTIVE=null;
  function buildTable(v){
    const units=allUnits();
    let h='<table class="vis" style="width:100%"><thead><tr><th></th><th>Dorf</th><th>Koords</th><th>Einheit</th><th>Verfügbar</th><th>Laufzeit</th><th>Menge</th><th>Aktion</th></tr></thead><tbody>';
    v.forEach(vv=>{
      h+=`<tr><td colspan="8" style="background:#f7f7f7"><b>${vv.name}</b> (${vv.x}|${vv.y}) id:${vv.id} <button class="btn chk" data-vid="${vv.id}">Units</button></td></tr>`;
      for(const u of units){
        const av=load('avail',{})[vv.id]?.[u]??'—',val=load('amt',{})[vv.id]?.[u]??0;
        h+=`<tr><td><input type="radio" name="sel" data-vid="${vv.id}" data-unit="${u}"></td>
        <td>${vv.name}</td><td>${vv.x}|${vv.y}</td><td>${UNIT_LABEL[u]||u}</td><td id="av_${vv.id}_${u}">${av}</td>
        <td id="tm_${vv.id}_${u}">-</td><td><input class="amt" data-vid="${vv.id}" data-unit="${u}" value="${val}" style="width:60px"></td>
        <td><button class="btn calc" data-vid="${vv.id}" data-unit="${u}">Berechnen</button></td></tr>`;
      }
    });
    h+='</tbody></table>';
    $id('ax_tbl').innerHTML=h;

    document.querySelectorAll('.chk').forEach(b=>b.onclick=async()=>{
      const vid=b.dataset.vid;const u=await loadUnits(vid);const m=load('avail',{});m[vid]=Object.assign(m[vid]||{},u||{});save('avail',m);
      Object.entries(u).forEach(([k,v])=>{$id(`av_${vid}_${k}`)?.textContent=v;});
    });
    document.querySelectorAll('.calc').forEach(b=>b.onclick=async()=>{
      const vid=b.dataset.vid,unit=b.dataset.unit;
      const m=targetEl.value.match(/(\d{1,3})\|(\d{1,3})/);
      if(!m)return;const tx=+m[1],ty=+m[2];
      const c=$id(`tm_${vid}_${unit}`);if(c)c.textContent='…';
      const ms=await calcMs(vid,unit,tx,ty);
      if(c)c.textContent=ms?`${Math.round(ms/1000)}s`:'n/a';
    });
    document.querySelectorAll('input.amt').forEach(i=>i.oninput=()=>{
      const vid=i.dataset.vid,u=i.dataset.unit,v=+i.value||0;
      const m=load('amt',{});m[vid]=m[vid]||{};m[vid][u]=v;save('amt',m);
    });
    document.querySelectorAll('input[name=sel]').forEach(r=>r.onchange=()=>{ACTIVE={vid:r.dataset.vid,unit:r.dataset.unit};});
  }

  $id('ax_load').onclick=async()=>{VILL=await loadVillages();buildTable(VILL);};
  $id('ax_calc_all').onclick=async()=>{
    const m=targetEl.value.match(/(\d{1,3})\|(\d{1,3})/);if(!m)return;
    const tx=+m[1],ty=+m[2];
    for(const v of VILL){for(const u of allUnits()){const c=$id(`tm_${v.id}_${u}`);if(c)c.textContent='…';
      const ms=await calcMs(v.id,u,tx,ty);
      if(c)c.textContent=ms?`${Math.round(ms/1000)}s`:'n/a';
      await new Promise(r=>setTimeout(r,50));}}
  };

  // === Countdown / GO ===
  function highlight(mode){
    const a=document.querySelector('button[name="attack"],input[name="attack"]'),
          s=document.querySelector('button[name="support"],input[name="support"]');
    [a,s].forEach(b=>{if(b){b.style.outline='';b.style.boxShadow='';}});
    const t=mode==='support'?s:a;
    if(t){t.scrollIntoView({block:'center'});t.style.outline='3px solid #f90';t.style.boxShadow='0 0 10px #f90';}
  }
  function fill(tx,ty,u,v){
    const x=document.querySelector('input[name="x"]'),y=document.querySelector('input[name="y"]');
    if(x)x.value=tx;if(y)y.value=ty;
    const f=document.querySelector(`input[name="${u}"]`);if(f)f.value=v;
  }

  $id('ax_go').onclick=async()=>{
    if(!ACTIVE){alert('Wähle eine Zeile');return;}
    const t=parseTime(timeEl.value);if(!t){alert('Zeit ungültig');return;}
    const mode=document.querySelector('input[name=ax_mode]:checked')?.value||'attack';
    const {vid,unit}=ACTIVE;
    const amt=load('amt',{})[vid]?.[unit]||0;
    const m=targetEl.value.match(/(\d{1,3})\|(\d{1,3})/);
    if(!m)return;
    const tx=+m[1],ty=+m[2];
    const ms=await calcMs(vid,unit,tx,ty);
    if(!ms){alert('keine Laufzeit');return;}
    const sendAt=t.getTime()-ms;
    const o=document.createElement('div');
    Object.assign(o.style,{position:'fixed',left:'50%',top:'50%',transform:'translate(-50%,-50%)',
      background:'#fff',border:'1px solid #C1A264',borderRadius:'6px',padding:'10px 14px',zIndex:2147483647});
    o.innerHTML=`<div><b>ARMED</b> — ${UNIT_LABEL[unit]||unit} aus ${vid}</div>
      <div id="ax_live" style="font-size:18px">--</div><button id="ax_abort" class="btn">Abbruch</button>`;
    document.body.appendChild(o);
    const PRE=500,HIGH=350;
    const timer=setInterval(()=>{
      const rem=sendAt-Date.now();
      $id('ax_live').textContent=`${Math.floor(rem/1000)}.${String(rem%1000).padStart(3,'0')}s`;
      if(rem<=PRE&&!timer.f){fill(tx,ty,unit,amt);timer.f=true;}
      if(rem<=HIGH&&!timer.h){highlight(mode);timer.h=true;}
      if(rem<=0){clearInterval(timer);o.remove();alert('T-0 erreicht, dein Klick');}
    },60);
    $id('ax_abort').onclick=()=>{clearInterval(timer);o.remove();};
  };

  if(load('villages',[]).length)buildTable(load('villages',[]));
})();
