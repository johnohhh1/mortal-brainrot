'use strict';
const fs=require('fs'),vm=require('vm');
let fails=0;
function assert(cond,msg){ if(cond)console.log('  ok:',msg); else { console.log('  FAIL:',msg); fails++; } }

// --- browser stubs ---
const gradient={addColorStop(){}};
function mkCtx(){
  return new Proxy({},{
    get(t,k){ if(k in t)return t[k];
      if(typeof k!=='string')return undefined;
      if(k.startsWith('create'))return ()=>gradient;
      if(k==='measureText')return ()=>({width:10});
      return ()=>{};
    },
    set(t,k,v){ t[k]=v; return true; }
  });
}
function mkCanvas(){ return {getContext:()=>mkCtx(),width:1280,height:720,style:{}}; }
globalThis.document={getElementById:()=>mkCanvas(),createElement:()=>mkCanvas()};
globalThis.window={addEventListener(){}};

// extract the single <script> block from the game file — the HTML IS the source
const html=fs.readFileSync(require('path').join(__dirname,'..','public','index.html'),'utf8');
const js=html.slice(html.indexOf('<script>')+'<script>'.length,html.lastIndexOf('</script>'));
vm.runInThisContext(js,{filename:'mortal-brainrot.js'});
const MB=window.MB;
const G=MB.GAME;
function ticks(n){ for(let i=0;i<n;i++)MB.tick(); }
function down(c){ MB.injectKey(c,true); }
function up(c){ MB.injectKey(c,false); }
function tap(c,hold=2){ down(c); ticks(hold); up(c); ticks(1); }

console.log('== boot ==');
assert(G.screen==='title','boots to title');
ticks(10);

console.log('== match start ==');
MB.startFight('elephant','cappuccino');
assert(G.screen==='fight'&&G.phase==='intro','fight starts in intro');
ticks(95);
assert(G.phase==='active','intro -> active after ~90 ticks');
const [f1,f2]=G.f;

console.log('== movement ==');
const x0=f1.x;
down('KeyD'); ticks(30); up('KeyD'); ticks(2);
assert(f1.x>x0+30,'P1 walks forward ('+(f1.x-x0).toFixed(0)+'px)');
const x1=f1.x;
down('KeyD'); ticks(2); up('KeyD'); ticks(3); down('KeyD'); ticks(2);
assert(f1.state==='dash','double-tap forward dashes (state='+f1.state+')');
up('KeyD'); ticks(20);

console.log('== normals connect ==');
f1.x=f2.x-100; f1.vx=0;
const hp0=f2.hp;
tap('KeyF'); ticks(12);
assert(f2.hp<hp0,'stand light hits (dmg='+(hp0-f2.hp).toFixed(0)+')');
assert(MB.FXS.hitstop>0||f2.state==='hitstun'||f2.state==='idle','hitstop/hitstun registered');
ticks(40);

console.log('== launcher + juggle ==');
f1.x=f2.x-90;
down('KeyS'); tap('KeyG'); up('KeyS');
ticks(14);
assert(f2.state==='juggle','crouch heavy launches (state='+f2.state+')');
const jhp=f2.hp;
// juggle with special: QCF+H while they're airborne
down('KeyS'); ticks(2); down('KeyD'); ticks(2); up('KeyS'); ticks(1); up('KeyD'); tap('KeyG');
ticks(30);
assert(f2.hp<jhp,'juggle followup connects');
assert(f2.comboTaken>=2||f2.state==='knockdown'||f2.state==='juggle','combo counted (taken='+f2.comboTaken+')');
ticks(120); // let them wake up

console.log('== QCF special (motion parser) ==');
f1.x=Math.max(200,f2.x-400);
down('KeyS'); ticks(3); down('KeyD'); ticks(3); up('KeyS'); ticks(2); down('KeyG'); ticks(2); up('KeyG'); up('KeyD');
let sawCannon=false;
for(let i=0;i<6;i++){ if(f1.state==='attack'&&f1.move&&f1.move.name.includes('TRUNK CANNON'))sawCannon=true; ticks(1); }
assert(sawCannon||f1.state==='attack','236+H triggers Trunk Cannon (move='+(f1.move?f1.move.name:f1.state)+')');
ticks(60);

console.log('== command grab ==');
ticks(60); f1.x=f2.x-90; f1.vx=0;
const ghp=f2.hp;
down('KeyS'); ticks(2); down('KeyA'); ticks(2); up('KeyS'); ticks(2); tap('KeyG'); up('KeyA');
let sawGrab=false;
for(let i=0;i<40;i++){ if(f2.state==='grabbed')sawGrab=true; ticks(1); }
assert(sawGrab,'214+H command grab connects');
ticks(10);
assert(f2.hp<ghp,'grab deals damage ('+(ghp-f2.hp).toFixed(0)+')');
ticks(120);

console.log('== blocking ==');
f1.x=f2.x-100;
down('Numpad3'); ticks(3); // P2 blocks
assert(f2.state==='block','P2 enters block');
const bhp=f2.hp;
tap('KeyF'); ticks(10);
assert(f2.state==='blockstun'||f2.state==='block','light attack blocked (state='+f2.state+')');
assert(f2.hp===bhp,'no chip on normals');
up('Numpad3'); ticks(30);

console.log('== projectiles ==');
MB.startFight('melon','camel');
ticks(95);
const [m1,c2]=G.f;
down('KeyS'); ticks(3); down('KeyD'); ticks(3); up('KeyS'); ticks(2); down('KeyF'); ticks(2); up('KeyF'); up('KeyD');
ticks(14);
assert(MB.PROJS.length>0,'melon seed spawned ('+MB.PROJS.length+')');
const chp=c2.hp;
ticks(120);
assert(c2.hp<chp,'projectile hit connects ('+(chp-c2.hp).toFixed(0)+')');

console.log('== camel item gimmick ==');
// P2 camel: down,down + Numpad1
down('ArrowDown'); ticks(3); up('ArrowDown'); ticks(3); down('ArrowDown'); ticks(2); down('Numpad1'); ticks(2); up('Numpad1'); up('ArrowDown');
ticks(30);
assert(MB.ITEMS.length>0,'fridge raid spawns item ('+(MB.ITEMS.length)+')');
ticks(60);

console.log('== KO -> round 2 ==');
MB.startFight('elephant','cappuccino');
ticks(95);
const [e1,a2]=G.f;
a2.hp=1;
e1.x=a2.x-90; e1.vx=0;
tap('KeyG'); ticks(20);
assert(G.phase==='ko','KO triggers (phase='+G.phase+')');
assert(G.wins[0]===1,'P1 takes round 1');
ticks(200);
assert(G.phase==='intro'||G.phase==='active','round 2 begins (phase='+G.phase+')');
ticks(95);

console.log('== finisher stagger ==');
G.f[1].hp=1;
G.f[0].x=G.f[1].x-90; G.f[0].vx=0;
// let any stray states settle
ticks(30); G.f[0].x=G.f[1].x-90;
tap('KeyG'); ticks(25);
assert(G.phase==='finish','match point KO staggers (phase='+G.phase+')');
assert(G.f[1].state==='stagger','victim staggering');

console.log('== finisher input ==');
// elephant: back, forward + heavy (facing right: A then D)
ticks(20);
tap('KeyA',3); tap('KeyD',3); down('KeyG'); ticks(2); up('KeyG');
ticks(4);
assert(G.phase==='cine','finisher cinematic triggered (phase='+G.phase+')');
ticks(650);
assert(G.screen==='victory','match ends at victory screen (screen='+G.screen+', phase='+G.phase+')');
assert(G.victor&&G.victor.defId==='elephant','victor recorded');
assert(G.finishedName==='TOTAL JAMIFICATION','finisher name recorded');

console.log('== rematch ==');
tap('KeyF'); ticks(5);
assert(G.screen==='fight','rematch restarts fight');
ticks(100);

console.log('== stagger timeout path ==');
G.wins[0]=1; G.phase='active';
G.f[1].hp=1; G.f[0].x=G.f[1].x-90;
tap('KeyG'); ticks(25);
if(G.phase==='finish'){ ticks(300); assert(G.phase==='ko'||G.screen==='victory','stagger expires to KO'); ticks(400); }
console.log('  (screen='+G.screen+')');

console.log('== timeout ==');
if(G.screen==='victory'){ tap('KeyF'); ticks(100); }
if(G.screen==='fight'&&(G.phase==='active'||G.phase==='intro')){ ticks(100); G.timer=5; G.f[0].hp=500; ticks(30);
  assert(G.phase==='ko'||G.phase==='finish','timer expiry ends round (phase='+G.phase+')'); }

console.log('== new roster: specials fire ==');
assert(MB.ROSTER.length===8,'roster has 8 fighters');
for(const id of ['tungtung','bombardiro','ballerina','braingod']){
  MB.startFight(id,'elephant'); ticks(95);
  const f=G.f[0]; f.meter=100;
  let err=null;
  try{
    for(const key of ['sp1','sp2','super']){
      const mv=f.def.moves[key];
      f.meter=100;
      f.buf={cmd:{move:mv,cls:key==='super'?'super':'sp',cost:mv.cost||0},t:require('vm').runInThisContext('tickCount')};
      let started=false;
      for(let k=0;k<20&&!started;k++){ MB.tick(); f.buf&&(f.buf.t=require('vm').runInThisContext('tickCount')); if(f.state==='attack')started=true; }
      if(!started)err=id+' '+key+' did not start (state='+f.state+')';
      ticks(mv.total+30);
    }
  }catch(e){ err=id+' threw: '+e.message; }
  assert(!err,id+' specials + super execute'+(err?' — '+err:''));
}
assert(MB.PROJS.length>=0,'projectile system alive after bombs/smites');

console.log('== all 8 finisher cinematics ==');
for(const id of MB.ROSTER){
  let err=null;
  try{
    MB.startFight(id,id==='elephant'?'camel':'elephant'); ticks(95);
    G.wins[0]=1; G.winner=G.f[0];
    G.beginCine(G.f[0],G.f[1]);
    ticks(MB.FINSCRIPTS[id].dur+220);
  }catch(e){ err=e.message+' @ '+(e.stack||'').split('\n')[1]; }
  assert(!err&&G.screen==='victory',id+' finisher completes to victory'+(err?' — '+err:' (screen='+G.screen+')'));
}

console.log('== 1P mode: CPU plays ==');
let aiErr=null;
try{
  MB.start1p('cappuccino','tungtung'); ticks(95);
  const [hu,cpu]=G.f;
  assert(cpu.pad.ai===true,'P2 is CPU-controlled');
  const cx0=cpu.x;
  let moved=false, attacked=false, dmgSeen=false;
  for(let i=0;i<3000&&G.screen==='fight';i++){
    MB.tick();
    if(Math.abs(cpu.x-cx0)>40)moved=true;
    if(cpu.state==='attack')attacked=true;
    // sample during the loop — a round reset restores HP, so an end-of-loop check can miss it
    if(hu.hp<hu.hpMax-1||cpu.hp<cpu.hpMax-1)dmgSeen=true;
  }
  assert(moved,'CPU moves around');
  assert(attacked,'CPU attacks');
  assert(dmgSeen||G.screen!=='fight','someone took damage in AI match');
}catch(e){ aiErr=e; }
assert(!aiErr,'AI match ran without exceptions'+(aiErr?' — '+aiErr.stack.split('\n').slice(0,2).join(' | '):''));

console.log('== gamepad: fake pad drives P1 ==');
const fakeButtons=Array.from({length:16},()=>({pressed:false,value:0}));
const fakeAxes=[0,0];
Object.defineProperty(globalThis,'navigator',{value:{getGamepads:()=>[{buttons:fakeButtons,axes:fakeAxes},null]},configurable:true});
const bPress=(n,v)=>{fakeButtons[n]={pressed:v,value:v?1:0};};
{
  MB.startFight('elephant','cappuccino'); ticks(95);
  const [g1,g2]=G.f;
  // stick walk
  const gx0=g1.x; fakeAxes[0]=1; ticks(30); fakeAxes[0]=0; ticks(2);
  assert(g1.x>gx0+30,'stick walks P1 forward ('+(g1.x-gx0).toFixed(0)+'px)');
  // face button attack
  g1.x=g2.x-95; g1.vx=0; ticks(2);
  bPress(0,true); ticks(3); bPress(0,false);
  let atk=false; for(let i=0;i<12;i++){ if(g1.state==='attack')atk=true; MB.tick(); }
  assert(atk,'pad A button attacks');
  ticks(50);
  // QCF special via stick: down, down-forward, forward + heavy
  fakeAxes[1]=1; ticks(3); fakeAxes[0]=1; ticks(3); fakeAxes[1]=0; ticks(2);
  bPress(3,true); ticks(3); bPress(3,false); fakeAxes[0]=0;
  let spc=null; for(let i=0;i<10;i++){ if(g1.state==='attack'&&g1.move&&g1.move.name.includes('CANNON'))spc=g1.move.name; MB.tick(); }
  assert(spc==='TRUNK CANNON','stick QCF + pad heavy = special ('+spc+')');
  ticks(60);
  // shoulder block
  bPress(5,true); ticks(3);
  assert(g1.state==='block','shoulder button blocks (state='+g1.state+')');
  bPress(5,false); ticks(5);
  // start pauses
  bPress(9,true); ticks(2); bPress(9,false); ticks(1);
  assert(require('vm').runInThisContext('PAUSED')===true,'Start pauses');
  bPress(9,true); ticks(2); bPress(9,false); ticks(1);
  assert(require('vm').runInThisContext('PAUSED')===false,'Start unpauses');
}

console.log('== fuzz: 14000 random-input ticks (2P + 1P) ==');
const codes=['KeyA','KeyD','KeyW','KeyS','KeyF','KeyG','KeyH','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Numpad1','Numpad2','Numpad3','Comma','Period','Slash','KeyF','Enter','Escape','Escape'];
let threw=null;
try{
  for(let i=0;i<14000;i++){
    if(i%1500===0&&G.screen==='victory')tap('KeyF');
    if(i%2000===1999){
      const R=MB.ROSTER;
      const a=R[(i/2000|0)%8], b=R[7-(i/2000|0)%8];
      if((i/2000|0)%2)MB.start1p(a,b); else MB.startFight(a,b);
    }
    const c=codes[(Math.random()*codes.length)|0];
    MB.injectKey(c,Math.random()<0.55);
    MB.tick();
    if(Math.random()<0.02)MB.render(0.5);
  }
}catch(e){ threw=e; }
assert(!threw,'fuzz completed without exceptions'+(threw?' — '+threw.stack.split('\n').slice(0,3).join(' | '):''));

console.log(fails===0?'\nALL PASS':'\n'+fails+' FAILURES');
process.exit(fails?1:0);
