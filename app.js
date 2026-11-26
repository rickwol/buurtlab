/* Buurtlab — 3D buurtmodel met kwartierprofielen 2024. HvA Centre of Expertise City Net Zero. */
{
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nf=new Intl.NumberFormat('nl-NL',{maximumFractionDigits:0}),nf1=new Intl.NumberFormat('nl-NL',{maximumFractionDigits:1});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const Q=35040,DT=.25,QD=96,DAYS=365,dow=d=>d%7; // 1 jan 2024 = maandag
const MD=[31,29,31,30,31,30,31,31,30,31,30,31],MN=['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'],WD=['ma','di','wo','do','vr','za','zo'];
const dayStr=(d,short)=>{let m=0,dd=d;while(dd>=MD[m]){dd-=MD[m];m++}return short?WD[dow(d)]+' '+(dd+1):WD[dow(d)]+' '+(dd+1)+' '+MN[m]};
const when=q=>{const d=Math.floor(q/QD),m=(q%QD)*15;return dayStr(d)+', '+String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')};
const rngF=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const gauss=r=>Math.sqrt(-2*Math.log(r()+1e-9))*Math.cos(2*Math.PI*r());
const norm=a=>{let s=0;for(const v of a)s+=v;if(s>0)for(let i=0;i<a.length;i++)a[i]/=s;return a};
const maxOf=a=>{let m=-Infinity;for(const v of a)if(v>m)m=v;return m};

/* ---------- data ---------- */
let P=null,TRAFO={},S={},SHMAX={};
const SCHED={
 woon:null,
 winkel:(d,h)=>dow(d)<6?(h>=8&&h<21):(h>=12&&h<18),
 kantoor:(d,h)=>dow(d)<5&&h>=8&&h<18,
 onderwijs:(d,h)=>dow(d)<5&&h>=8&&h<17,
 logies:()=>true,
 sport:(d,h)=>dow(d)<5?(h>=17&&h<23):(h>=9&&h<18),
 industrie:(d,h)=>(dow(d)<5&&h>=6&&h<22)||(dow(d)===5&&h>=6&&h<14)};
const wDhw=[.1,.05,.05,.05,.1,.4,1.4,1.8,1.2,.7,.5,.5,.5,.4,.4,.5,.7,1,1.3,1.4,1.2,.9,.5,.25];
async function loadData(){
 const txt=await (await fetch('profielen/profielen_2024.csv')).text();
 const lines=txt.split('\n').filter(l=>l&&l[0]!=='#'),hdr=lines[0].split(',');
 P={};hdr.forEach(h=>P[h]=new Float32Array(Q));
 for(let q=0;q<Q;q++){const c=lines[q+1].split(',');for(let k=0;k<hdr.length;k++)P[hdr[k]][q]=+c[k]}
 try{TRAFO=await (await fetch('profielen/trafos_liander.json')).json()}catch(e){TRAFO={}}
 const T=P.temp;S.heat=new Float32Array(Q);S.dhw=new Float32Array(Q);
 for(const k in SCHED)if(SCHED[k])S['h_'+k]=new Float32Array(Q);
 for(let q=0;q<Q;q++){const d=Math.floor(q/QD),h=Math.floor((q%QD)/4),g=Math.max(0,15.5-T[q]),seas=Math.cos(2*Math.PI*(d-15)/365);
  S.heat[q]=g*(h>=6&&h<23?(h<9?1.25:1):.75);S.dhw[q]=wDhw[h]*(1+.1*seas);
  for(const k in SCHED)if(SCHED[k]){const o=SCHED[k](d,h);S['h_'+k][q]=g*(o?1:.4)*(o&&!SCHED[k](d,h-1)?1.4:1)}}
 norm(S.heat);norm(S.dhw);SHMAX.woon=maxOf(S.heat);for(const k in SCHED)if(SCHED[k]){norm(S['h_'+k]);SHMAX[k]=maxOf(S['h_'+k])}}

/* ---------- types ---------- */
const LABELS=[['A+','A+ (nieuwbouw)'],['A','A'],['B','B'],['C','C'],['D','D'],['EFG','E, F of G']];
const SPEC={'A+':30,A:45,B:65,C:90,D:115,EFG:155},LF={'A+':1.15,A:1.12,B:1.05,C:1,D:.92,EFG:.85};
const VERW=[['gas','Cv-ketel (gas)'],['hybride','Hybride warmtepomp'],['wp_lucht','Lucht/water-warmtepomp'],['wp_bodem','Bodemwarmtepomp'],['warmtenet','Warmtenet'],['elektrisch','Elektrisch (direct)']];
const KW=[[3.7,'3,7 kW'],[7.4,'7,4 kW'],[11,'11 kW'],[22,'22 kW']];
const FUNCS={winkel:[['winkel','Winkel of horeca']],kantoor:[['kantoor','Kantoor of zorg'],['onderwijs','Onderwijs'],['logies','Logies'],['sport','Sport of bijeenkomst']],fabriek:[['industrie','Industrie of bedrijf']]};
const KWHM2={winkel:180,kantoor:90,onderwijs:45,logies:110,sport:70,industrie:150};
const TYPES={
 rij:{l:'Rijwoningen',cat:'w',kwh:2700,dhw:1800,d:{aantal:6,m2:110,label:'C',verw:'gas',pv:0,lp:1,lpkw:11,evkwh:2500}},
 vrij:{l:'Vrijstaand',cat:'w',kwh:3300,dhw:1800,d:{aantal:1,m2:160,label:'B',verw:'wp_lucht',pv:6,lp:1,lpkw:11,evkwh:2500}},
 app:{l:'Appartementen',cat:'w',kwh:1900,dhw:1500,d:{aantal:24,m2:75,label:'B',verw:'warmtenet',pv:15,lp:4,lpkw:11,evkwh:2500}},
 winkel:{l:'Winkel',cat:'u',d:{func:'winkel',m2:1200,label:'C',verw:'gas',pv:60,lp:4,lpkw:11,evkwh:2000}},
 kantoor:{l:'Kantoor',cat:'u',d:{func:'kantoor',m2:2500,label:'B',verw:'wp_lucht',pv:80,lp:10,lpkw:11,evkwh:2500}},
 fabriek:{l:'Bedrijfspand',cat:'u',d:{func:'industrie',m2:3000,label:'D',verw:'gas',pv:150,lp:2,lpkw:11,evkwh:2500}},
 laadplein:{l:'Laadplein',cat:'l',d:{lp:8,lpkw:11,gebruik:'publiek',evkwh:4000}},
 batterij:{l:'Batterij',cat:'b',d:{kwh:500,kw:125,bstrat:'piek',doel:0}}};
const ICON={
 rij:'<path d="M2 13l5-5 5 5 5-5 5 5v9H2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
 vrij:'<path d="M4 12l8-7 8 7v9H4z M10 21v-5h4v5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
 app:'<path d="M6 2h12v20H6z M9 6h2M13 6h2M9 10h2M13 10h2M9 14h2M13 14h2" fill="none" stroke="currentColor" stroke-width="1.8"/>',
 winkel:'<path d="M3 9h18v12H3z M2 9l2-5h16l2 5 M9 21v-6h6v6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
 kantoor:'<path d="M5 3h14v18H5z M8 7h8M8 11h8M8 15h8" fill="none" stroke="currentColor" stroke-width="1.8"/>',
 fabriek:'<path d="M2 21V11l5 3v-3l5 3v-3l5 3V4h3v17z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
 laadplein:'<path d="M7 2h8v20H7z M11 6l-2 5h4l-2 5 M15 8h3v8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
 batterij:'<path d="M3 7h16v10H3z M19 10h2v4h-2 M7 10v4M11 10v4M15 10v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>'};
const STRATS=[['ongestuurd','Ongestuurd laden (losse sessies)'],['netbewust','Netbewust laden: begrensd tussen 16 en 21 uur'],['dynamisch','Dynamisch slim laden op buurtbelasting'],
 ['e_normaal','ElaadNL-profiel ongestuurd (gemiddeld, zoals SlimLaden)'],['e_netbewust','ElaadNL-profiel netbewust'],['e_pooling','ElaadNL-profiel capaciteitspooling'],['e_v2g','ElaadNL-profiel V2G']];
const SNOTE={ongestuurd:'Elke sessie laadt direct op vol vermogen vanaf aankomst. Dit is de referentie.',
 netbewust:'Zoals de netbewust-ladenpilots: in het avondpiekvenster wordt het laadvermogen begrensd, daarna laadt de auto door.',
 dynamisch:'Elke sessie verdeelt zijn energie over de kwartieren met de laagste buurtbelasting binnen de verblijfsduur. Dit is de bovengrens van wat sturing kan opleveren.',
 e_normaal:'Schaalt het gemiddelde ElaadNL-profiel met de laadvraag. Zo rekent SlimLaden. Bij weinig laadpunten valt de piek te laag uit.',
 e_netbewust:'Gemiddeld ElaadNL-profiel met netbewust laden, zoals in SlimLaden.',e_pooling:'Gemiddeld ElaadNL-profiel met capaciteitspooling, zoals in SlimLaden.',e_v2g:'Gemiddeld ElaadNL-profiel met V2G, zoals in SlimLaden.'};
const ECOL={e_normaal:'ev_normaal',e_netbewust:'ev_netbewust',e_pooling:'ev_pooling',e_v2g:'ev_v2g'};

/* ---------- simulation ---------- */
function nonEV(o){
 const ty=TYPES[o.type],base=new Float32Array(Q),heat=new Float32Array(Q),pv=new Float32Array(Q);
 if(ty.cat==='l'||ty.cat==='b')return{base,heat,pv};
 let shA=0,dhwA=0,hs=S.heat,hmax=SHMAX.woon,prof,ann;
 if(ty.cat==='w'){ann=ty.kwh*o.aantal;prof=P.woon;shA=SPEC[o.label]*o.m2*o.aantal;dhwA=ty.dhw*o.aantal}
 else{const f=o.func||ty.d.func;ann=KWHM2[f]*o.m2;prof=P[f];shA=SPEC[o.label]*.75*o.m2;hs=S['h_'+f];hmax=SHMAX[f]}
 const k=ann/8760;for(let q=0;q<Q;q++)base[q]=k*prof[q];
 if(shA+dhwA>0){const lf=LF[o.label],v=o.verw,cap=.6*shA*hmax,T=P.temp;
  for(let q=0;q<Q;q++){const qh=shA*hs[q],w=dhwA*S.dhw[q],ca=clamp((3.1+.09*T[q])*lf,1.5,5.2);
   const e=v==='elektrisch'?qh+w:v==='wp_lucht'?qh/ca+w/2.6:v==='wp_bodem'?qh/(4.3*lf)+w/3:v==='hybride'?Math.min(qh,cap)/ca:0;heat[q]=e/DT}}
 if(o.pv>0){const k2=o.pv*900/8760;for(let q=0;q<Q;q++)pv[q]=k2*P.zon[q]}
 return{base,heat,pv}}
const pattern=o=>{const c=TYPES[o.type].cat;return c==='w'?'thuis':o.type==='winkel'?'publiek':c==='u'?'werk':o.gebruik};
function sessions(o,idx){
 const out=[],n=o.lp|0,kw=+o.lpkw,kwhY=+o.evkwh,pat=pattern(o);if(!n||!kwhY||!kw)return out;
 for(let p=0;p<n;p++){const r=rngF(o.id*7919+p*104729+13);let busy=0;
  for(let d=0;d<DAYS;d++){const s=[];
   if(pat==='thuis'){if(r()<.42){const a=clamp(18.2+gauss(r)*2.2,11,23.8);s.push([a,24+clamp(7.3+gauss(r)*.8,5,10),kwhY/(365*.42)])}}
   else if(pat==='werk'){if(dow(d)<5&&r()<.6){const a=clamp(8.2+gauss(r)*.9,5.5,12);s.push([a,a+clamp(8.5+gauss(r)*.8,4,11),kwhY/(261*.6)])}}
   else{const k=Math.floor(r()*3.2);for(let j=0;j<k;j++){const a=8+r()*14;s.push([a,a+1.5+r()*3.5,kwhY/(365*1.125)])}s.sort((x,y)=>x[0]-y[0])}
   for(const [a,dp,e0] of s){let aq=Math.max(d*QD+Math.round(a*4),busy);const dq=Math.min(Q,d*QD+Math.round(dp*4));if(aq>=dq)continue;
    const e=Math.min(e0*(.5+r()),kw*(dq-aq)*DT);out.push([aq,dq,e,kw,idx]);busy=dq}}}
 return out}
function chargeDirect(s,arr,capFn){let[aq,dq,e,kw]=s;for(let q=aq;q<dq&&e>1e-9;q++){const p=capFn?capFn(q,kw):kw,add=Math.min(e,p*DT);arr[q]+=add/DT;e-=add}}
function chargeValley(s,arr,L){const[aq,dq,e0,kw]=s;let e=e0;const sl=[];for(let q=aq;q<dq;q++)sl.push(q);sl.sort((a,b)=>L[a]-L[b]);
 for(const q of sl){if(e<=1e-9)break;const add=Math.min(e,kw*DT);arr[q]+=add/DT;L[q]+=add/DT;e-=add}}
function battery(b,L){
 const kwh=Math.max(1,+b.kwh),pmax=Math.max(0,+b.kw),smin=kwh*.1,smax=kwh*.9,E=.96,out=new Float32Array(Q);
 const doel=+b.doel>0?+b.doel:(state.trafo||400)*.9,chg=doel*.8;let soc=kwh*.5;
 let dm=null;if(b.bstrat==='prijs'){dm=new Float32Array(DAYS);for(let d=0;d<DAYS;d++){let s=0;for(let q=0;q<QD;q++)s+=P.prijs[d*QD+q];dm[d]=s/QD}}
 for(let q=0;q<Q;q++){let p=0;const l=L[q];
  if(b.bstrat==='piek'){if(l>doel)p=-(l-doel);else if(l<chg)p=Math.min(pmax,chg-l)}
  else if(b.bstrat==='zon')p=-l;
  else{const pr=P.prijs[q],m=dm[Math.floor(q/QD)];p=pr<m?pmax:pr>m?-pmax:0}
  p=clamp(p,-pmax,pmax);
  if(p>0){p=Math.max(0,Math.min(p,(smax-soc)/(DT*E)));soc+=p*DT*E}else if(p<0){p=Math.min(0,Math.max(p,-(soc-smin)*E/DT));soc+=p*DT/E}
  out[q]=p;L[q]+=p}
 return out}

/* ---------- state ---------- */
const SAMPLE=()=>{let id=0;const mk=(type,i,j,x)=>Object.assign({id:++id,type,i,j,name:TYPES[type].l},TYPES[type].d,x);
 return{v:2,n:8,trafo:630,strat:'ongestuurd',nbkw:4,objs:[
  mk('rij',1,1,{name:'Rij Lindelaan',label:'C',verw:'gas',lp:2}),mk('rij',2,1,{name:'Rij Lindelaan oost',label:'B',verw:'hybride',pv:18,lp:3}),
  mk('rij',3,1,{name:'Nieuwbouw De Hof',aantal:8,m2:120,label:'A+',verw:'wp_lucht',pv:32,lp:5}),
  mk('vrij',5,1,{name:'Villa Parkzicht'}),mk('vrij',6,1,{name:'Boerderij',label:'D',verw:'gas',pv:0,m2:200}),
  mk('app',1,4,{name:'Flat Merelhof',label:'B',verw:'warmtenet',pv:20}),mk('app',2,4,{name:'Woontoren Kade',aantal:32,label:'A',verw:'wp_bodem',pv:30,lp:8}),
  mk('rij',3,6,{name:'Arbeidershuisjes',aantal:5,m2:85,label:'EFG',verw:'gas'}),
  mk('winkel',5,4,{name:'Supermarkt'}),mk('kantoor',6,4,{name:'Kantoor Stationsplein'}),mk('kantoor',6,6,{name:'Basisschool De Linde',func:'onderwijs',m2:1800,label:'C',verw:'gas',pv:40,lp:3}),
  mk('fabriek',5,6,{name:'Werkplaats Noord'}),mk('laadplein',2,6,{name:'Laadplein Marktveld'})]}};
const KEY='buurtlab-v2';
let state;try{state=JSON.parse(localStorage.getItem(KEY))}catch(e){}
if(!state||state.v!==2||!Array.isArray(state.objs))state=SAMPLE();
let sel=null,tool=null,moving=false,heatOn=false,R=null;
const hist=[JSON.stringify(state)];
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}};
function commit(){const j=JSON.stringify(state);if(hist[hist.length-1]!==j){hist.push(j);if(hist.length>40)hist.shift()}save()}
const byId=id=>state.objs.find(o=>o.id===id);
const occ=(i,j)=>state.objs.find(o=>o.i===i&&o.j===j);
let N=clamp(+state.n||8,4,28);const TILE=12,pos=k=>(k-(N-1)/2)*TILE;
function setState(s,push=true){state=s;N=clamp(+state.n||8,4,28);sel=null;syncControls();buildGround();rebuildAll();renderName();renderEditor();if(push)commit();recompute()}
function renderName(){const b=state.buurt;$('#bname').textContent=b?`${b.naam}, ${b.gemeente} (${b.code}). ${nf.format(b.vbo)} verblijfsobjecten uit de BAG, samengevoegd tot ${state.objs.length} blokken.`:'Ontwerp een buurt of importeer een bestaande, en zie de piekvraag op het net per kwartier.';
 const g=state.grid,gi=$('#grid-info');gi.hidden=!g;if(g)gi.textContent=`Liander: ${g[0]} trafo's in deze buurt · capaciteit ${nf.format(g[1])} kW · NBL-limiet ${nf.format(g[2])} kW · som gemeten pieken ${nf.format(g[3])} kW`}
function syncControls(){$('#trafo').value=state.trafo;$('#strat').value=state.strat||'ongestuurd';$('#nbkw').value=state.nbkw??4;$('#nb-wrap').hidden=state.strat!=='netbewust';$('#strat-note').textContent=SNOTE[state.strat||'ongestuurd']}

/* ---------- results ---------- */
function recompute(){
 if(!P)return;
 const T={base:new Float32Array(Q),heat:new Float32Array(Q),ev:new Float32Array(Q),pv:new Float32Array(Q),bat:new Float32Array(Q)};
 const objs=state.objs,parts=objs.map(nonEV),L0=new Float32Array(Q);
 for(const p of parts)for(let q=0;q<Q;q++){T.base[q]+=p.base[q];T.heat[q]+=p.heat[q];T.pv[q]+=p.pv[q]}
 for(let q=0;q<Q;q++)L0[q]=T.base[q]+T.heat[q]-T.pv[q];
 const ss=[];objs.forEach((o,k)=>{if(o.lp>0)for(const s of sessions(o,k))ss.push(s)});ss.sort((a,b)=>a[0]-b[0]);
 const evRef=new Float32Array(Q);for(const s of ss)chargeDirect(s,evRef);
 const st=state.strat||'ongestuurd',evObj=objs.map(o=>o.lp>0?new Float32Array(Q):null);
 if(ECOL[st]){const pr=P[ECOL[st]];objs.forEach((o,k)=>{if(!evObj[k])return;const kk=o.lp*o.evkwh/8760;for(let q=0;q<Q;q++)evObj[k][q]=kk*pr[q]})}
 else if(st==='dynamisch'){const L=L0.slice();for(const s of ss)chargeValley(s,evObj[s[4]],L)}
 else{const nb=+state.nbkw||0,cap=st==='netbewust'?(q,kw)=>{const h=(q%QD)>>2;return h>=16&&h<21?Math.min(kw,nb):kw}:null;for(const s of ss)chargeDirect(s,evObj[s[4]],cap)}
 for(const a of evObj)if(a)for(let q=0;q<Q;q++)T.ev[q]+=a[q];
 const L=new Float32Array(Q);for(let q=0;q<Q;q++)L[q]=L0[q]+T.ev[q];
 const batObj=objs.map(o=>o.type==='batterij'?battery(o,L):null);
 for(const a of batObj)if(a)for(let q=0;q<Q;q++)T.bat[q]+=a[q];
 const per={};let sumPk=0;
 objs.forEach((o,k)=>{const p=parts[k],e=evObj[k],b=batObj[k],net=new Float32Array(Q);let pk=0,yr=0,ex=0;
  for(let q=0;q<Q;q++){const v=p.base[q]+p.heat[q]-p.pv[q]+(e?e[q]:0)+(b?b[q]:0);net[q]=v;if(v>pk)pk=v;if(v>0)yr+=v*DT;else ex-=v*DT}
  per[o.id]={net,pk,yr,ex};sumPk+=pk});
 let pk=0,pki=0,mn=0,yr=0,refPk=0;const ref=new Float32Array(Q);
 for(let q=0;q<Q;q++){const v=L[q];if(v>pk){pk=v;pki=q}if(v<mn)mn=v;if(v>0)yr+=v*DT;ref[q]=L0[q]+evRef[q];if(ref[q]>refPk)refPk=ref[q]}
 const sorted=L.slice().sort().reverse(),sref=ref.slice().sort().reverse(),tr=state.trafo||400;let above=0;for(const v of L)if(v>tr)above++;
 const pd=Math.floor(pki/QD);
 R={...T,net:L,ref,pk,pki,exp:-mn,yr,sorted,sref,per,sumPk,above,trafo:tr,refPk,wStart:clamp((pd-3)*QD,0,Q-7*QD)};
 renderKpi();drawWeek();drawLdc();renderWho();tint();if(sel)renderEditor(true)}
let rt;const schedule=()=>{clearTimeout(rt);rt=setTimeout(recompute,150)};

function renderKpi(){
 const load=R.pk/R.trafo*100,steer=Math.abs(R.refPk-R.pk)>.5;
 $('#k-peak').textContent=nf.format(R.pk);
 $('#k-delta').innerHTML=steer?`Zonder sturing ${nf.format(R.refPk)} kW: <b>${R.pk<R.refPk?'−':'+'}${nf.format(Math.abs(R.refPk-R.pk))} kW</b> (${nf1.format((R.pk/R.refPk-1)*100)}%)`:'';
 $('#k-when').textContent=R.pk>0?'op '+when(R.pki)+' · '+nf1.format(P.temp[R.pki])+' °C in De Bilt':'Nog geen afname';
 $('#k-bar').style.width=Math.min(100,load)+'%';$('#meter').classList.toggle('over',load>100);
 $('#k-load').innerHTML='<b>'+nf.format(load)+'%</b> van de capaciteit';
 $('#k-yr').textContent=nf.format(R.yr/1000)+' MWh';
 $('#k-exp').textContent=nf.format(R.exp)+' kW';
 $('#k-hrs').textContent=nf.format(R.above)+' ('+nf1.format(R.above/4)+' uur)';
 $('#k-gf').textContent=R.sumPk?nf1.format(R.pk/R.sumPk*100)+'%':'–';
 let w=0,l=0;for(const o of state.objs){if(TYPES[o.type].cat==='w')w+=o.aantal;l+=o.lp||0}
 $('#k-cnt').textContent=nf.format(w)+' / '+nf.format(l);
 $('#t-week').textContent=R.pk>0?'Piekweek: '+nf.format(R.pk)+' kW op '+when(R.pki):'Piekweek';
 $('#t-ldc').textContent=R.above?nf1.format(R.above/4)+' uur boven de capaciteit':'Jaarduurkromme: binnen de capaciteit'}

/* ---------- charts ---------- */
const nice=r=>{const p=Math.pow(10,Math.floor(Math.log10(r||1))),f=r/p;return(f<1.5?1:f<3?2:f<7?5:10)*p};
function axisY(y,lo,hi,W,m){const st=nice((hi-lo)/4);let s='';for(let v=Math.ceil(lo/st)*st;v<=hi+1e-9;v+=st){const yy=y(v);s+=`<line x1="${m.l}" x2="${W-m.r}" y1="${yy}" y2="${yy}" stroke="var(--line)"/><text x="${m.l-6}" y="${yy+4}" text-anchor="end" font-size="12" fill="var(--mute)">${nf.format(v)}</text>`}return s}
function hline(y,v,W,m,col,lab,dy){return`<line x1="${m.l}" x2="${W-m.r}" y1="${y(v)}" y2="${y(v)}" stroke="${col}" stroke-width="1.5" stroke-dasharray="6 4"/><text x="${W-m.r-4}" y="${y(v)+(dy||-6)}" text-anchor="end" font-size="12" fill="${col}">${lab}</text>`}
function drawWeek(){
 const box=$('#f-week'),s=box.querySelector('svg'),W=box.clientWidth,Hh=box.clientHeight;if(!R||!W)return;
 const st=R.wStart,n=7*QD,m={l:52,r:12,t:16,b:28},nbl=state.grid?state.grid[2]:0;let hi=Math.max(R.trafo,nbl)*1.08,lo=0;
 for(let k=0;k<n;k++){const i=st+k;hi=Math.max(hi,R.base[i]+R.heat[i]+R.ev[i]+Math.max(0,R.bat[i]),R.ref[i]);lo=Math.min(lo,-R.pv[i]+Math.min(0,R.bat[i]))}
 const x=k=>m.l+(W-m.l-m.r)*k/(n-1),y=v=>m.t+(Hh-m.t-m.b)*(hi-v)/(hi-lo);
 const stp=Math.max(1,Math.floor(n/(W-m.l-m.r)));const ks=[];for(let k=0;k<n;k+=stp)ks.push(k);
 const area=(a,b,c)=>{let d='M';for(const k of ks)d+=x(k).toFixed(1)+','+y(b(k)).toFixed(1)+' ';for(let j=ks.length-1;j>=0;j--)d+='L'+x(ks[j]).toFixed(1)+','+y(a(ks[j])).toFixed(1)+' ';return`<path d="${d}Z" fill="${c}" opacity=".9"/>`};
 const B=k=>R.base[st+k],BH=k=>B(k)+R.heat[st+k],BHE=k=>BH(k)+R.ev[st+k],BHEB=k=>BHE(k)+Math.max(0,R.bat[st+k]),Z=()=>0,PV=k=>-R.pv[st+k],PVB=k=>PV(k)+Math.min(0,R.bat[st+k]);
 let g=axisY(y,lo,hi,W,m);
 for(let k=0;k<n;k+=QD){g+=`<line x1="${x(k)}" x2="${x(k)}" y1="${m.t}" y2="${Hh-m.b}" stroke="var(--line)" stroke-dasharray="2 3"/><text x="${x(Math.min(k+QD/2,n-1))}" y="${Hh-8}" text-anchor="middle" font-size="12" fill="var(--mute)">${W<520?WD[dow(Math.floor((st+k)/QD))]:dayStr(Math.floor((st+k)/QD),true)}</text>`}
 g+=area(Z,B,'var(--base)')+area(B,BH,'var(--heat)')+area(BH,BHE,'var(--blue)')+area(BHE,BHEB,'var(--bat)')+area(PV,Z,'var(--pv)')+area(PVB,PV,'var(--bat)');
 const line=(f,c,w,da)=>{let p='';for(const k of ks)p+=x(k).toFixed(1)+','+y(f(k)).toFixed(1)+' ';return`<polyline points="${p}" fill="none" stroke="${c}" stroke-width="${w}"${da?` stroke-dasharray="${da}"`:''}/>`};
 if(Math.abs(R.refPk-R.pk)>.5)g+=line(k=>R.ref[st+k],'var(--mute)',1.3,'4 3');
 g+=line(k=>R.net[st+k],'var(--ink)',1.6);
 g+=hline(y,R.trafo,W,m,'var(--bad)',`capaciteit ${nf.format(R.trafo)} kVA`);
 if(nbl&&Math.abs(nbl-R.trafo)>R.trafo*.03)g+=hline(y,nbl,W,m,'var(--nbl)',`NBL-limiet ${nf.format(nbl)} kW`,14);
 if(R.pk>0){const k=R.pki-st,px=x(k),py=y(R.pk);g+=`<circle cx="${px}" cy="${py}" r="5" fill="var(--accent)" stroke="var(--ink)" stroke-width="1.5"/><text x="${px+(px>W*.7?-9:9)}" y="${Math.max(py-8,14)}" text-anchor="${px>W*.7?'end':'start'}" font-size="13" font-weight="600" fill="var(--ink)">${nf.format(R.pk)} kW</text>`}
 g+=`<text x="${m.l}" y="11" font-size="12" fill="var(--mute)">kW</text>`;s.innerHTML=g}
function drawLdc(){
 const box=$('#f-ldc'),s=box.querySelector('svg'),W=box.clientWidth,Hh=box.clientHeight;if(!R||!W)return;
 const m={l:52,r:12,t:16,b:28},hi=Math.max(R.sorted[0],R.sref[0],R.trafo*1.08,1),lo=Math.min(0,R.sorted[Q-1]);
 const x=h=>m.l+(W-m.l-m.r)*h/(Q-1),y=v=>m.t+(Hh-m.t-m.b)*(hi-v)/(hi-lo);
 let g=axisY(y,lo,hi,W,m);const stp=Math.max(1,Math.floor(Q/W));
 const pl=a=>{let p='';for(let h=0;h<Q;h+=stp)p+=x(h).toFixed(1)+','+y(a[h]).toFixed(1)+' ';return p+x(Q-1)+','+y(a[Q-1])};
 g+=`<path d="M${x(0)},${y(0)} L${pl(R.sorted).split(' ').join(' L')} L${x(Q-1)},${y(0)}Z" fill="var(--accent)" opacity=".28"/>`;
 if(Math.abs(R.refPk-R.pk)>.5)g+=`<polyline points="${pl(R.sref)}" fill="none" stroke="var(--mute)" stroke-width="1.3" stroke-dasharray="4 3"/>`;
 g+=`<polyline points="${pl(R.sorted)}" fill="none" stroke="var(--ink)" stroke-width="1.8"/>`+hline(y,R.trafo,W,m,'var(--bad)','',0);
 if(R.above){const xa=x(R.above);g+=`<line x1="${xa}" x2="${xa}" y1="${y(R.trafo)}" y2="${Hh-m.b}" stroke="var(--bad)"/><text x="${xa+6}" y="${y(R.trafo)+16}" font-size="12" fill="var(--bad)">${nf1.format(R.above/4)} uur</text>`}
 [0,2000,4000,6000,8760].forEach(h=>{if(W<420&&(h===2000||h===6000))return;g+=`<text x="${x(h*4)}" y="${Hh-8}" text-anchor="${h===0?'start':h===8760?'end':'middle'}" font-size="12" fill="var(--mute)">${nf.format(h)}</text>`});
 g+=`<text x="${m.l}" y="11" font-size="12" fill="var(--mute)">kW · uren per jaar →</text>`;s.innerHTML=g}
function renderWho(){
 const i=R.pki,rows=state.objs.map(o=>({o,v:R.per[o.id].net[i]})).sort((a,b)=>b.v-a.v),mx=Math.max(1,...rows.map(r=>r.v));
 $('#who-sub').textContent=R.pk>0?'Netto bijdrage per object op '+when(R.pki)+'. Klik om aan te passen.':'';
 $('#contrib').innerHTML=rows.slice(0,10).map(r=>`<div class="cb" data-id="${r.o.id}" role="button" tabindex="0"><b>${esc(r.o.name)}</b><span class="tr"><i style="width:${Math.max(0,r.v/mx*100)}%"></i></span><em>${nf.format(r.v)} kW</em></div>`).join('')||'<p class="note">Nog geen gebouwen.</p>';
 const c=[['Basisverbruik',R.base[i],'var(--base)'],['Warmte',R.heat[i],'var(--heat)'],['Laden',R.ev[i],'var(--blue)'],['Batterij',R.bat[i],'var(--bat)'],['Zon',-R.pv[i],'var(--pv)']],cm=Math.max(1,...c.map(a=>Math.abs(a[1])));
 $('#comp').innerHTML=c.map(a=>`<div class="cb"><b>${a[0]}</b><span class="tr"><i style="width:${Math.abs(a[1])/cm*100}%;background:${a[2]}"></i></span><em>${nf.format(a[1])} kW</em></div>`).join('')+
  `<p class="note">Som van de afzonderlijke objectpieken: ${nf.format(R.sumPk)} kW. Buurtpiek: ${nf.format(R.pk)} kW. Niet alles piekt tegelijk.</p>`}

/* ---------- 3D ---------- */
const view=$('#view');let renderer,scene,camera,controls,ray,mouse,plots=[],groups={},ring,ghost,world,mats={},sunL,groundG,plotGeo;
const isDark=()=>{const t=document.documentElement.dataset.theme;return t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches};
function initThree(){
 if(!window.THREE)throw new Error('geen three');
 renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(2,devicePixelRatio));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 view.appendChild(renderer.domElement);
 scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(38,1,1,1000);
 controls=new THREE.OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.maxPolarAngle=1.32;controls.minDistance=30;
 scene.add(new THREE.HemisphereLight(0xffffff,0x8a9a7a,.75));
 sunL=new THREE.DirectionalLight(0xfff4e0,.9);sunL.castShadow=true;sunL.shadow.mapSize.set(2048,2048);sunL.shadow.camera.near=10;scene.add(sunL);
 const M=(c,o)=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.85,flatShading:true},o));
 mats={asph:M('#626a76'),plot:M('#9cc67a'),roof:M('#c65a3a'),roofG:M('#9ca5af'),pv:M('#1c2a4d',{roughness:.35,metalness:.3}),post:M('#1f5eff'),wp:M('#fbfbfb'),dark:M('#3a4250'),acc:M('#f5b700'),glass:M('#7fa6d1',{roughness:.25,metalness:.35}),chim:M('#a5482f'),white:M('#f4f4f4'),bat:M('#7446c9'),brick:M('#b9775a')};
 world=new THREE.Group();scene.add(world);
 ring=new THREE.Mesh(new THREE.RingGeometry(6.4,7.2,40),new THREE.MeshBasicMaterial({color:0xf5b700,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.35;ring.visible=false;scene.add(ring);
 ghost=new THREE.Mesh(new THREE.BoxGeometry(TILE-2.4,4,TILE-2.4),new THREE.MeshBasicMaterial({color:0xf5b700,transparent:true,opacity:.35}));ghost.visible=false;scene.add(ghost);
 ray=new THREE.Raycaster();mouse=new THREE.Vector2();buildGround();applyTheme();
 const ro=new ResizeObserver(()=>{const w=view.clientWidth,h=view.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix()});ro.observe(view);
 let down=null;const el=renderer.domElement;
 el.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY]});
 el.addEventListener('pointerup',e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<6)click(e);down=null});
 el.addEventListener('pointermove',hover);el.addEventListener('pointerleave',()=>{ghost.visible=false});
 const loop=()=>{controls.update();renderer.render(scene,camera);requestAnimationFrame(loop)};loop()}
function buildGround(){if(!scene)return;if(groundG)scene.remove(groundG);groundG=new THREE.Group();plots=[];
 const g=new THREE.Mesh(new THREE.BoxGeometry(N*TILE+8,1,N*TILE+8),mats.asph);g.position.y=-.5;g.receiveShadow=true;groundG.add(g);
 plotGeo=plotGeo||new THREE.BoxGeometry(TILE-2,.3,TILE-2);
 for(let i=0;i<N;i++)for(let j=0;j<N;j++){const p=new THREE.Mesh(plotGeo,mats.plot);p.position.set(pos(i),.15,pos(j));p.receiveShadow=true;p.userData.tile={i,j};groundG.add(p);plots.push(p)}
 scene.add(groundG);const f=N/8,h=N*TILE/2+14;
 Object.assign(sunL.shadow.camera,{left:-h,right:h,top:h,bottom:-h,far:300+N*14});sunL.position.set(-50*f,90*Math.max(1,f*.8),45*f);sunL.shadow.camera.updateProjectionMatrix();
 controls.maxDistance=240*Math.max(1,f);camera.far=1200*Math.max(1,f);camera.position.set(72*f,78*f,96*f);controls.target.set(0,0,4*f);camera.updateProjectionMatrix()}
function applyTheme(){if(!scene)return;const d=isDark();scene.background=new THREE.Color(d?'#0f1621':'#dbe6ee');mats.plot.color.set(d?'#4c7440':'#9cc67a');mats.asph.color.set(d?'#2c333e':'#626a76')}
function pick(e){const r=renderer.domElement.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(mouse,camera)}
function hover(e){if(!tool&&!moving){ghost.visible=false;return}pick(e);const h=ray.intersectObjects(plots)[0];
 if(h){const t=h.object.userData.tile,free=!occ(t.i,t.j);ghost.visible=true;ghost.position.set(pos(t.i),2.3,pos(t.j));ghost.material.color.set(free?0xf5b700:0xc62828)}else ghost.visible=false}
function click(e){pick(e);
 const hb=ray.intersectObjects(world.children,true)[0];
 if(hb&&!tool&&!moving){let g=hb.object;while(g&&!g.userData.id)g=g.parent;if(g){select(g.userData.id);return}}
 const ht=ray.intersectObjects(plots)[0];if(!ht)return;
 const {i,j}=ht.object.userData.tile,o=occ(i,j);
 if(moving&&sel){if(!o){const s=byId(sel);s.i=i;s.j=j;build(s);commit();select(sel)}moving=false;ghost.visible=false;setHint();return}
 if(tool){if(o){select(o.id);return}add(tool,i,j);return}
 select(o?o.id:null)}
function box(g,w,h,d,m,x,y,z){const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);b.position.set(x,y,z);b.castShadow=b.receiveShadow=true;g.add(b);return b}
function gable(g,w,len,hh,m,x,y,z){const s=new THREE.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(0,hh);s.lineTo(-w/2,0);
 const geo=new THREE.ExtrudeGeometry(s,{depth:len,bevelEnabled:false});geo.translate(0,0,-len/2);geo.rotateY(Math.PI/2);const b=new THREE.Mesh(geo,m);b.position.set(x,y,z);b.castShadow=true;g.add(b);return b}
function posts(g,n,x0,z0,dx,max){for(let k=0;k<Math.min(n,max);k++){box(g,.45,1.5,.45,mats.post,x0+k*dx,1.05,z0);box(g,.6,.25,.6,mats.acc,x0+k*dx,1.9,z0)}}
function roofPv(g,n,w,y,z0,rows){for(let k=0;k<n;k++){const c=k%5,r=Math.floor(k/5);const p=box(g,1.4,.1,1,mats.pv,-w/2+1.2+c*(w-2.4)/4,y,z0+r*2.2);p.rotation.x=-.5}}
function build(o){
 if(!world)return;if(groups[o.id])world.remove(groups[o.id]);
 const g=new THREE.Group(),wall=new THREE.MeshStandardMaterial({color:'#f1ede4',roughness:.9,flatShading:true});
 g.userData={id:o.id,wall,base:'#f1ede4'};const wp=o.verw==='wp_lucht'||o.verw==='hybride';
 if(o.type==='rij'){const n=clamp(o.aantal,1,14),uw=Math.min(2.6,10/n),W=uw*n,x0=-W/2+uw/2,hh=clamp(2.6+o.m2/80,3.5,6.5);
  box(g,W,hh,6.5,wall,0,hh/2+.3,0);for(let k=1;k<n;k++)box(g,.12,hh,6.6,mats.dark,-W/2+k*uw,hh/2+.3,0);
  gable(g,7,W+.2,2.8,mats.roof,0,hh+.3,0);
  if(o.pv>0){const f=Math.min(1,o.pv/(o.aantal*4)),pw=W*.92*f,p=box(g,pw,.12,2.6,mats.pv,-W*.46+pw/2,hh+1.75,2.2);p.rotation.x=Math.atan(2.8/3.5)}
  posts(g,Math.round(o.lp*n/Math.max(1,o.aantal)),x0,4.6,uw,n);if(wp)for(let k=0;k<Math.min(n,6);k++)box(g,.9,.9,.6,mats.wp,x0+k*uw,.75,-3.8)}
 else if(o.type==='vrij'){const n=clamp(o.aantal,1,4),sz=n===1?6.5:4.2,sp=n===1?[[0,0]]:[[-2.6,-2.6],[2.6,2.6],[2.6,-2.6],[-2.6,2.6]].slice(0,n);
  sp.forEach(([x,z],k)=>{const hh=n===1?4.2:3.2;box(g,sz,hh,sz,wall,x,hh/2+.3,z);gable(g,sz+.6,sz+.4,2.4,mats.roof,x,hh+.3,z);
   if(o.pv>0){const p=box(g,sz*.8,.12,sz*.38,mats.pv,x,hh+1.5,z+sz*.22);p.rotation.x=Math.atan(2.4/(sz/2+.3))}
   if(k<o.lp)posts(g,1,x+sz/2+.6,z+sz/2,0,1);if(wp)box(g,.9,.9,.6,mats.wp,x-sz/2-.7,.75,z)})}
 else if(o.type==='app'){const fl=clamp(Math.ceil(o.aantal/6),2,14),hh=fl*2.8;box(g,9,hh,7,wall,0,hh/2+.3,0);
  for(let f=0;f<fl;f++)box(g,9.08,.9,7.08,mats.glass,0,f*2.8+1.7,0);box(g,9.2,.5,7.2,mats.roofG,0,hh+.55,0);
  if(o.pv>0)roofPv(g,Math.min(10,Math.ceil(o.pv/5)),9,hh+1.1,-2);posts(g,o.lp,-4,4.7,1.15,8);if(o.verw==='wp_bodem'||o.verw==='wp_lucht')box(g,2,1,1.4,mats.wp,3,hh+1.3,2)}
 else if(o.type==='winkel'){const w=clamp(Math.sqrt(o.m2)/3.4,6,10.2),hh=4.6;box(g,w,hh,8,wall,0,hh/2+.3,-.6);box(g,w+.2,.6,1.6,mats.acc,0,3.3,3.9);box(g,w*.5,1,.3,mats.acc,0,hh-.4,3.45);box(g,w*.8,2.2,.1,mats.glass,0,1.5,3.42);
  if(o.pv>0)roofPv(g,Math.min(10,Math.ceil(o.pv/8)),w,hh+.7,-3.5);posts(g,o.lp,-w/2+.8,4.9,1.4,6)}
 else if(o.type==='kantoor'&&(o.func||'kantoor')!=='kantoor'){const w=clamp(Math.sqrt(o.m2)/3,7,10.2),fl=clamp(Math.round(o.m2/1500)+1,1,4),hh=fl*3.4;
  const mm=o.func==='onderwijs'?mats.brick:wall;box(g,w,hh,8.5,mm,0,hh/2+.3,0);for(let f=0;f<fl;f++)box(g,w+.08,1,8.58,mats.glass,0,f*3.4+2,0);box(g,w+.3,.4,8.8,mats.white,0,hh+.5,0);
  if(o.func==='onderwijs'){g.userData.wall=mats.brick===mm?null:wall}
  if(o.pv>0)roofPv(g,Math.min(10,Math.ceil(o.pv/8)),w,hh+1,-3);posts(g,o.lp,-w/2+.8,5.2,1.3,7)}
 else if(o.type==='kantoor'){const fl=clamp(Math.round(o.m2/450),1,14),hh=fl*3.3;box(g,7,hh,7,mats.glass,0,hh/2+.3,0);
  for(let f=1;f<=fl;f++)box(g,7.15,.35,7.15,mats.white,0,f*3.3+.3,0);box(g,7.4,.4,7.4,mats.white,0,.5,0);g.userData.wall=null;
  if(o.pv>0)roofPv(g,Math.min(6,Math.ceil(o.pv/12)),7,hh+1,-1.5);posts(g,o.lp,-4.9,5.1,1.1,9);if((o.verw||'').startsWith('wp')||o.verw==='hybride')box(g,2,1,1.4,mats.wp,0,hh+1.1,2.6)}
 else if(o.type==='fabriek'){const hh=5.5;box(g,10,hh,8,wall,0,hh/2+.3,-.8);
  for(let k=0;k<4;k++){const s=new THREE.Shape();s.moveTo(-1,0);s.lineTo(1,0);s.lineTo(1,2.2);s.lineTo(-1,0);const geo=new THREE.ExtrudeGeometry(s,{depth:8,bevelEnabled:false});geo.translate(0,0,-4);const m=new THREE.Mesh(geo,mats.roofG);m.position.set(-3.75+k*2.5,hh+.3,-.8);m.castShadow=true;g.add(m);box(g,.1,2.1,8,mats.glass,-3.7+k*2.5+1.05,hh+1.35,-.8)}
  const c=new THREE.Mesh(new THREE.CylinderGeometry(.5,.6,7,10),mats.chim);c.position.set(4,hh+3.5,-3.8);c.castShadow=true;g.add(c);
  box(g,3,3.2,.2,mats.dark,-2.5,1.9,3.25);if(o.pv>0)box(g,4.5,.1,3,mats.pv,2.5,hh+.4,1.8);posts(g,o.lp,1.5,4.6,1.2,4)}
 else if(o.type==='batterij'){const n=clamp(Math.ceil(o.kwh/500),1,4);box(g,10,.12,8,mats.dark,0,.36,0);
  for(let k=0;k<n;k++){const z=-2.6+k*(n>1?5.2/(n-1):0);box(g,6,2.6,1.6,mats.white,0,1.7,z);box(g,6.1,.35,1.65,mats.bat,0,2.6,z)}
  for(let k=0;k<4;k++)box(g,.12,1.4,8,mats.dark,k<2?-4.9:4.9,1,0);g.userData.wall=null}
 else{box(g,10,.12,10,mats.dark,0,.36,0);const n=Math.min(o.lp,16),per=Math.ceil(n/2);
  for(let k=0;k<n;k++){const row=k<per?-1:1,c=k<per?k:k-per,x=-4.2+c*(8.4/Math.max(1,per-1));box(g,.12,.02,3.2,mats.white,x+.6,.43,row*2.6);box(g,.45,1.5,.45,mats.post,x,1.1,row*4.2);box(g,.6,.25,.6,mats.acc,x,1.95,row*4.2)}
  g.userData.wall=null}
 g.position.set(pos(o.i),0,pos(o.j));world.add(g);groups[o.id]=g}
function rebuildAll(){if(!world)return;for(const k in groups)world.remove(groups[k]);groups={};state.objs.forEach(build);placeRing();tint()}
function tint(){if(!world||!window.THREE)return;const hot=new THREE.Color('#de5129');let mx=1;if(heatOn&&R)for(const o of state.objs){const p=R.per[o.id];if(p)mx=Math.max(mx,p.net[R.pki])}
 for(const o of state.objs){const g=groups[o.id];if(!g||!g.userData.wall)continue;const c=new THREE.Color(g.userData.base);
  if(heatOn&&R&&R.per[o.id])c.lerp(hot,clamp(R.per[o.id].net[R.pki]/mx,0,1));g.userData.wall.color.copy(c)}}
function placeRing(){if(!ring)return;const o=sel&&byId(sel);ring.visible=!!o;if(o)ring.position.set(pos(o.i),.35,pos(o.j))}

/* ---------- UI ---------- */
$('#bar').innerHTML=Object.entries(TYPES).map(([k,t])=>`<button class="tool" data-t="${k}" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>${t.l}</button>`).join('');
$('#strat').innerHTML=STRATS.map(([v,t])=>`<option value="${v}">${t}</option>`).join('');
function setTool(t){tool=t&&tool!==t?t:null;moving=false;document.querySelectorAll('.tool').forEach(b=>b.setAttribute('aria-pressed',b.dataset.t===tool));if(!tool&&ghost)ghost.visible=false;setHint()}
function setHint(){$('#hint').textContent=moving?'Klik op een leeg kavel om het gebouw te verplaatsen. Esc annuleert.':tool?`${TYPES[tool].l}: klik op een leeg kavel om te plaatsen. Esc stopt.`:'Sleep om te draaien, scroll om te zoomen. Klik op een gebouw om het aan te passen.'}
const nextId=()=>Math.max(0,...state.objs.map(o=>o.id))+1;
function add(type,i,j){const id=nextId(),cnt=state.objs.filter(o=>o.type===type).length+1;
 const o=Object.assign({id,type,i,j,name:TYPES[type].l+' '+cnt},TYPES[type].d);state.objs.push(o);build(o);tint();commit();select(id);recompute()}
function select(id){sel=id;placeRing();renderEditor();if(id&&innerWidth<=900)$('.side').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})}
const FIELDS={
 name:{l:'Naam',t:'text'},aantal:{l:'Aantal woningen',t:'num',min:1,max:2000},m2:{l:o=>TYPES[o.type].cat==='w'?'m² per woning':'Vloeroppervlak (m²)',t:'num',min:20,max:200000},
 func:{l:'Functie (profiel)',t:'sel',o:o=>FUNCS[o.type]},label:{l:'Energielabel / isolatie',t:'sel',o:LABELS},verw:{l:'Verwarming',t:'sel',o:VERW},pv:{l:'Zonnepanelen (kWp totaal)',t:'num',min:0,max:20000},
 lp:{l:'Laadpunten',t:'num',min:0,max:2000},lpkw:{l:'Vermogen per laadpunt',t:'sel',o:KW,n:1},evkwh:{l:'Laadvraag per punt (kWh/jaar)',t:'num',min:0,max:50000},
 gebruik:{l:'Gebruikers',t:'sel',o:[['publiek','Publiek (buurtbewoners)'],['werk','Werknemers (overdag)']]},
 kwh:{l:'Capaciteit (kWh)',t:'num',min:10,max:20000},kw:{l:'Vermogen (kW)',t:'num',min:1,max:10000},
 bstrat:{l:'Strategie',t:'sel',o:[['piek','Peak shaving op doelvermogen'],['zon','Eigen verbruik zon'],['prijs','Prijs (day-ahead 2024)']]},
 doel:{l:'Doelvermogen buurt (kW, 0 = 90% van de capaciteit)',t:'num',min:0,max:50000}};
const LAYOUT={w:['name','aantal|m2','label','verw','pv','lp|lpkw','evkwh'],u:['name','func','m2','label','verw','pv','lp|lpkw','evkwh'],l:['name','gebruik','lp|lpkw','evkwh'],b:['name','kwh|kw','bstrat','doel']};
function fieldHtml(o,k){const f=FIELDS[k],l=typeof f.l==='function'?f.l(o):f.l,id='f-'+k,opts=typeof f.o==='function'?f.o(o):f.o;
 if(f.t==='sel')return`<label class="fld"><span>${l}</span><select id="${id}" data-k="${k}">${opts.map(([v,t])=>`<option value="${v}"${String(o[k])===String(v)?' selected':''}>${t}</option>`).join('')}</select></label>`;
 return`<label class="fld"><span>${l}</span><input id="${id}" data-k="${k}" ${f.t==='num'?`type="number" inputmode="decimal" min="${f.min}" max="${f.max}"`:'type="text" maxlength="60"'} value="${esc(o[k]??'')}"></label>`}
function renderEditor(onlyStats){
 const ed=$('#editor'),o=sel&&byId(sel);
 if(!o){ed.innerHTML=`<h2>Ontwerpen</h2><p>Kies een type in de bouwbalk en klik op een leeg kavel. Klik op een gebouw om omvang, functie, isolatie, verwarming, zonnepanelen en laadpunten aan te passen.</p><p class="note">Of importeer een bestaande buurt uit de BAG en ontwerp daarop verder: vervang de cv-ketels, voeg laadpleinen toe of zet er een batterij bij.</p>`;return}
 const p=R&&R.per[o.id],stats=p?`<dl class="mini" id="ostats"><dt>Jaarafname</dt><dd>${nf1.format(p.yr/1000)} MWh</dd><dt>Eigen piek</dt><dd>${nf.format(p.pk)} kW</dd><dt>Op buurtpiek</dt><dd>${nf.format(p.net[R.pki])} kW</dd><dt>${o.type==='batterij'?'Ontladen':'Teruglevering'}</dt><dd>${nf1.format(p.ex/1000)} MWh</dd></dl>`:'';
 if(onlyStats&&$('#ostats')){$('#ostats').outerHTML=stats;return}
 const lay=LAYOUT[TYPES[o.type].cat];
 ed.innerHTML=`<p class="lab">${TYPES[o.type].l}${o.src?' · uit BAG':''}</p><h2>${esc(o.name)}</h2>`+lay.map(r=>r.includes('|')?`<div class="two">${r.split('|').map(k=>fieldHtml(o,k)).join('')}</div>`:fieldHtml(o,r)).join('')+stats+
  (o.src?`<p class="note">${esc(o.src)}</p>`:'')+`<div class="acts" style="margin-top:6px"><button class="btn" id="mv">Verplaatsen</button><button class="btn" id="dup">Dupliceren</button><button class="btn warn" id="del">Verwijderen</button></div>`;
 ed.querySelectorAll('[data-k]').forEach(el=>{
  const up=()=>{const k=el.dataset.k,f=FIELDS[k];let v=el.value;if(f.t==='num'||f.n){v=parseFloat(v);if(!isFinite(v))return;if(f.min!=null)v=clamp(v,f.min,f.max)}o[k]=v;
   if(k==='name'){ed.querySelector('h2').textContent=v;renderWho();return}build(o);tint();schedule()};
  el.addEventListener('input',up);el.addEventListener('change',()=>{up();commit()})});
 $('#mv').onclick=()=>{moving=true;tool=null;document.querySelectorAll('.tool').forEach(b=>b.setAttribute('aria-pressed','false'));setHint()};
 $('#dup').onclick=()=>{const t=freeNear(o.i,o.j);if(!t)return;const id=nextId(),c=Object.assign({},o,{id,i:t[0],j:t[1],name:o.name+' (kopie)'});delete c.src;state.objs.push(c);build(c);commit();select(id);recompute()};
 $('#del').onclick=del}
function freeNear(i0,j0){for(let r=0;r<N;r++)for(let di=-r;di<=r;di++)for(let dj=-r;dj<=r;dj++){if(Math.max(Math.abs(di),Math.abs(dj))!==r)continue;const i=i0+di,j=j0+dj;if(i>=0&&j>=0&&i<N&&j<N&&!occ(i,j))return[i,j]}return null}
function del(){if(!sel)return;state.objs=state.objs.filter(o=>o.id!==sel);if(groups[sel]){world.remove(groups[sel]);delete groups[sel]}sel=null;placeRing();commit();renderEditor();recompute()}
$('#bar').addEventListener('click',e=>{const b=e.target.closest('.tool');if(b)setTool(b.dataset.t)});
$('#contrib').addEventListener('click',e=>{const r=e.target.closest('.cb');if(r){select(+r.dataset.id);window.scrollTo({top:0,behavior:'smooth'})}});
$('#contrib').addEventListener('keydown',e=>{if(e.key==='Enter'){const r=e.target.closest('.cb');if(r)select(+r.dataset.id)}});
$('#heatmap').onclick=e=>{heatOn=!heatOn;e.currentTarget.setAttribute('aria-pressed',heatOn);e.currentTarget.textContent=heatOn?'Normale kleuren':'Kleur op piekbijdrage';tint()};
$('#trafo').addEventListener('input',e=>{const v=parseFloat(e.target.value);if(v>0){state.trafo=v;schedule()}});$('#trafo').addEventListener('change',commit);
$('#strat').addEventListener('change',e=>{state.strat=e.target.value;syncControls();commit();recompute()});
$('#nbkw').addEventListener('change',e=>{const v=parseFloat(e.target.value);if(v>=0){state.nbkw=v;commit();recompute()}});
function undo(){if(hist.length<2)return;hist.pop();setState(JSON.parse(hist[hist.length-1]),false);save()}
$('#undo').onclick=undo;
$('#reset').onclick=()=>setState(SAMPLE());
$('#clear').onclick=()=>setState({v:2,n:8,trafo:400,strat:state.strat,nbkw:state.nbkw,objs:[]});
document.addEventListener('keydown',e=>{const inField=/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName);
 if(e.key==='Escape'){moving=false;setTool(null)}
 else if((e.ctrlKey||e.metaKey)&&e.key==='z'&&!inField){e.preventDefault();undo()}
 else if((e.key==='Delete'||e.key==='Backspace')&&!inField&&sel){e.preventDefault();del()}});
$('#jdet').addEventListener('toggle',()=>{if($('#jdet').open)$('#json').value=JSON.stringify(state)});
$('#copy').onclick=async()=>{$('#json').value=JSON.stringify(state);try{await navigator.clipboard.writeText($('#json').value);$('#jmsg').textContent='Gekopieerd.'}catch(e){$('#json').select();$('#jmsg').textContent='Selecteer en kopieer handmatig.'}};
$('#load').onclick=()=>{try{const s=JSON.parse($('#json').value);if(!Array.isArray(s.objs))throw 0;const n=clamp(+s.n||8,4,28);
 s.objs=s.objs.filter(o=>TYPES[o.type]).map((o,k)=>Object.assign({},TYPES[o.type].d,o,{id:+o.id||1000+k,i:clamp(+o.i|0,0,n-1),j:clamp(+o.j|0,0,n-1),name:String(o.name||TYPES[o.type].l).slice(0,60)}));
 setState({v:2,n,trafo:+s.trafo||400,strat:STRATS.some(x=>x[0]===s.strat)?s.strat:'ongestuurd',nbkw:+s.nbkw||4,buurt:s.buurt,grid:s.grid,objs:s.objs});$('#jmsg').textContent='Geladen.'}
 catch(e){$('#jmsg').textContent='Dit is geen geldige buurt-JSON.'}};
new MutationObserver(applyTheme).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',applyTheme);
const chartRo=new ResizeObserver(()=>{drawWeek();drawLdc()});chartRo.observe($('#f-week'));chartRo.observe($('#f-ldc'));

/* ---------- import uit BAG + CBS (PDOK) ---------- */
const LS='https://api.pdok.nl/bzk/locatieserver/search/v3_1/free',BAG='https://api.pdok.nl/kadaster/bag/ogc/v2/collections/',
 CBS=y=>`https://api.pdok.nl/cbs/wijken-en-buurten-${y}/ogc/v1/collections/buurten/items`;
const UTIL={winkelfunctie:['winkel','winkel','Winkels'],bijeenkomstfunctie:['kantoor','sport','Bijeenkomst'],kantoorfunctie:['kantoor','kantoor','Kantoren'],gezondheidszorgfunctie:['kantoor','kantoor','Zorg'],
 onderwijsfunctie:['kantoor','onderwijs','School'],logiesfunctie:['kantoor','logies','Logies'],sportfunctie:['kantoor','sport','Sport'],celfunctie:['kantoor','logies','Cellen'],industriefunctie:['fabriek','industrie','Bedrijven']};
const labelFromYear=y=>!y||y<1946?'EFG':y<1975?'D':y<1992?'C':y<2006?'B':y<2015?'A':'A+';
const ist=t=>{$('#imp-st').textContent=t};
async function getJSON(u){const r=await fetch(u,{headers:{Accept:'application/geo+json, application/json'}});if(!r.ok)throw new Error('HTTP '+r.status+' van '+new URL(u).host);return r.json()}
async function allItems(u,lab){let out=[],p=0;while(u&&p<60){const j=await getJSON(u);out=out.concat(j.features||[]);ist(`${lab}: ${nf.format(out.length)} opgehaald…`);const nx=(j.links||[]).find(l=>l.rel==='next');u=nx?nx.href:null;p++}return out}
const inRing=(pt,r)=>{let c=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const[xi,yi]=r[i],[xj,yj]=r[j];if((yi>pt[1])!==(yj>pt[1])&&pt[0]<(xj-xi)*(pt[1]-yi)/(yj-yi)+xi)c=!c}return c};
const inPolys=(pt,polys)=>polys.some(p=>inRing(pt,p[0])&&!p.slice(1).some(h=>inRing(pt,h)));
const pid=s=>{const m=String(s).match(/\d{16}/);return m?m[0]:String(s)};
let pick_=null,sugT;
$('#imp-open').onclick=()=>{const p=$('#imp'),o=p.hidden;p.hidden=!o;$('#imp-open').setAttribute('aria-expanded',o);if(o)$('#imp-q').focus()};
$('#imp-close').onclick=()=>{$('#imp').hidden=true;$('#imp-open').setAttribute('aria-expanded','false')};
$('#imp-q').addEventListener('input',e=>{const q=e.target.value.trim();pick_=null;$('#imp-go').disabled=true;clearTimeout(sugT);
 const m=q.toUpperCase().match(/^BU[0-9A-Z]{8}$/);if(m){pick_={code:m[0],naam:m[0],gemeente:''};$('#imp-go').disabled=false;$('#imp-sug').innerHTML='';return}
 if(q.length<3){$('#imp-sug').innerHTML='';return}
 sugT=setTimeout(async()=>{try{const j=await getJSON(`${LS}?q=${encodeURIComponent(q)}&fq=type:buurt&fl=weergavenaam,buurtcode,buurtnaam,gemeentenaam&rows=8`);
  const docs=(j.response&&j.response.docs)||[];
  $('#imp-sug').innerHTML=docs.map((d,k)=>`<button type="button" role="option" aria-selected="false" data-k="${k}">${esc(d.buurtnaam||d.weergavenaam)}<small>${esc(d.gemeentenaam||'')} · ${esc(d.buurtcode||'')}</small></button>`).join('')||'<p class="note">Geen buurt gevonden.</p>';
  $('#imp-sug').onclick=ev=>{const b=ev.target.closest('button');if(!b)return;const d=docs[+b.dataset.k];pick_={code:d.buurtcode,naam:d.buurtnaam||d.weergavenaam,gemeente:d.gemeentenaam||''};
   $('#imp-sug').querySelectorAll('button').forEach(x=>x.setAttribute('aria-selected',x===b));$('#imp-go').disabled=false}}
  catch(err){$('#imp-sug').innerHTML=`<p class="note">Zoeken lukt niet (${esc(err.message)}). Vul de buurtcode in, bijv. BU03440420.</p>`}},250)});
$('#imp-go').onclick=async()=>{if(!pick_)return;const b=$('#imp-go');b.disabled=true;
 try{const s=await importBuurt(pick_,{lp:+$('#imp-lp').value||0,pv:+$('#imp-pv').value||0,wp:$('#imp-wp').checked});setState(s);ist(`Klaar: ${nf.format(s.buurt.vbo)} verblijfsobjecten samengevoegd tot ${s.objs.length} blokken op een grid van ${s.n}×${s.n}.`)}
 catch(err){ist('Importeren mislukt: '+err.message+(location.protocol==='file:'?' Open Buurtlab via een webserver.':' Werkt het hier niet, gebruik dan rickwol.github.io/buurtlab.'))}
 b.disabled=false};
async function importBuurt(pk,opt){
 ist('Buurtgrens ophalen bij CBS…');let f=null;
 for(const y of[2025,2026,2024]){try{const j=await getJSON(`${CBS(y)}?f=json&buurtcode=${encodeURIComponent(pk.code)}`);if(j.features&&j.features.length){f=j.features[0];break}}catch(e){}}
 if(!f)throw new Error('buurtcode '+pk.code+' niet gevonden bij CBS.');
 const gm=f.geometry,polys=gm.type==='Polygon'?[gm.coordinates]:gm.coordinates,pr=f.properties||{};
 let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(const p of polys)for(const[x,y]of p[0]){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y)}
 const bb=[x0,y0,x1,y1].map(v=>v.toFixed(6)).join(',');
 const vbos=await allItems(`${BAG}verblijfsobject/items?f=json&limit=1000&bbox=${bb}`,'Verblijfsobjecten');
 const pands=await allItems(`${BAG}pand/items?f=json&limit=1000&bbox=${bb}`,'Panden');
 ist('Gebouwen samenvoegen…');
 return buildFromBag({polys,vbos,pands,code:pk.code,naam:pr.buurtnaam||pk.naam,gemeente:pr.gemeentenaam||pk.gemeente,opt})}
function buildFromBag({polys,vbos,pands,code,naam,gemeente,opt}){
 const lat0=(polys[0][0].reduce((s,p)=>s+p[1],0))/polys[0][0].length,lon0=polys[0][0][0][0],kx=111320*Math.cos(lat0*Math.PI/180),ky=110574;
 const XY=([lo,la])=>[(lo-lon0)*kx,(la-lat0)*ky];
 const bad=/ingetrokken|niet gerealiseerd|ten onrechte|gesloopt/i;
 const pmap={};for(const p of pands){const pr=p.properties||{};if(bad.test(pr.status||'')||!p.geometry)continue;pmap[pid(pr.identificatie)]={pr,geo:p.geometry}}
 const byP={};let nV=0;
 for(const v of vbos){const pr=v.properties||{};if(bad.test(pr.status||'')||!v.geometry)continue;const c=v.geometry.coordinates;if(!inPolys(c,polys))continue;
  const ps=Array.isArray(pr.pand)?pr.pand:pr.pand?[pr.pand]:[];const id=ps.length?pid(ps[0]):'v'+nV;nV++;
  (byP[id]=byP[id]||{w:0,wm2:0,u:{},str:{},pt:c}).pt=byP[id].pt;const B=byP[id];
  const gd=String(pr.gebruiksdoel||'').split(/[,;]/)[0].trim(),m2=+pr.oppervlakte||0;
  if(gd==='woonfunctie'){B.w++;B.wm2+=m2}else if(UTIL[gd]){B.u[gd]=(B.u[gd]||0)+m2}
  const st=pr.openbare_ruimte_naam;if(st)B.str[st]=(B.str[st]||0)+1}
 const blocks=[],single=[];
 for(const id in byP){const B=byP[id],P_=pmap[id],bj=P_?+P_.pr.bouwjaar:0,ring=P_&&P_.geo.type==='Polygon'?P_.geo.coordinates[0]:P_&&P_.geo.type==='MultiPolygon'?P_.geo.coordinates[0][0]:null;
  const cen=ring?XY([ring.reduce((s,p)=>s+p[0],0)/ring.length,ring.reduce((s,p)=>s+p[1],0)/ring.length]):XY(B.pt);
  const street=Object.entries(B.str).sort((a,b)=>b[1]-a[1])[0];
  if(B.w>=4)blocks.push({type:'app',aantal:B.w,m2:B.wm2/B.w,bj,x:cen[0],y:cen[1],street:street&&street[0]});
  else if(B.w>0)single.push({id,w:B.w,m2:B.wm2,bj,x:cen[0],y:cen[1],ring,street:street&&street[0]});
  for(const gd in B.u){const m2=B.u[gd];if(m2<30)continue;const[t,fn,nm]=UTIL[gd];blocks.push({type:t,func:fn,m2,bj,x:cen[0],y:cen[1],street:street&&street[0],nm})}}
 const parent=single.map((_,k)=>k),find=k=>{while(parent[k]!==k){parent[k]=parent[parent[k]];k=parent[k]}return k};
 const vmap=new Map();single.forEach((s,k)=>{if(!s.ring)return;const seen=new Set();for(const[x,y]of s.ring){const key=x.toFixed(6)+','+y.toFixed(6);if(seen.has(key))continue;seen.add(key);const l=vmap.get(key);if(l)l.push(k);else vmap.set(key,[k])}});
 const pairs=new Map();for(const l of vmap.values())for(let a=0;a<l.length;a++)for(let b=a+1;b<l.length;b++){const key=l[a]<l[b]?l[a]+'|'+l[b]:l[b]+'|'+l[a];pairs.set(key,(pairs.get(key)||0)+1)}
 for(const[key,c]of pairs)if(c>=2){const[a,b]=key.split('|').map(Number);parent[find(a)]=find(b)}
 const cl={};single.forEach((s,k)=>{(cl[find(k)]=cl[find(k)]||[]).push(s)});
 for(const k in cl){let m=cl[k];const xs=m.map(s=>s.x),ys=m.map(s=>s.y);const ax=Math.max(...xs)-Math.min(...xs)>=Math.max(...ys)-Math.min(...ys)?'x':'y';m.sort((a,b)=>a[ax]-b[ax]);
  for(let c=0;c<m.length;c+=10){const ch=m.slice(c,c+10),w=ch.reduce((s,a)=>s+a.w,0),m2=ch.reduce((s,a)=>s+a.m2,0),bj=Math.round(ch.reduce((s,a)=>s+a.bj*a.w,0)/w);
   const st={};ch.forEach(a=>{if(a.street)st[a.street]=(st[a.street]||0)+a.w});const street=Object.entries(st).sort((a,b)=>b[1]-a[1])[0];
   blocks.push({type:w<=2&&ch.length<=2?'vrij':'rij',aantal:w,m2:m2/w,bj,x:ch.reduce((s,a)=>s+a.x,0)/ch.length,y:ch.reduce((s,a)=>s+a.y,0)/ch.length,street:street&&street[0]})}}
 if(!blocks.length)throw new Error('geen gebouwen gevonden in deze buurt.');
 let bx0=Infinity,by0=Infinity,bx1=-Infinity,by1=-Infinity;for(const b of blocks){bx0=Math.min(bx0,b.x);bx1=Math.max(bx1,b.x);by0=Math.min(by0,b.y);by1=Math.max(by1,b.y)}
 const span=Math.max(bx1-bx0,by1-by0,50);let n=clamp(Math.ceil(span/50)+1,8,24),merged;
 for(let f=1;;f++){const cell=span/(n-1)*f,grp={};
  for(const b of blocks){const lab=labelFromYear(b.bj),ci=Math.floor((b.x-bx0)/cell),cj=Math.floor((by1-b.y)/cell);
   const key=[b.type,b.func||'',b.type==='rij'||b.type==='vrij'||b.type==='app'?lab:'',ci,cj].join('|');const g=grp[key]=grp[key]||{...b,aantal:0,m2s:0,bjs:0,ws:0,xs:0,ys:0,k:0,streets:{}};
   const w=b.aantal||1;g.aantal+=b.aantal||0;g.m2s+=b.aantal?b.m2*b.aantal:b.m2;g.bjs+=(b.bj||0)*w;g.ws+=w;g.xs+=b.x;g.ys+=b.y;g.k++;if(b.street)g.streets[b.street]=(g.streets[b.street]||0)+w}
  merged=Object.values(grp);if(merged.length<=n*n*.8||f>6)break}
 const objs=[],used=new Set();let id=0;merged.sort((a,b)=>(b.aantal||b.m2s/100)-(a.aantal||a.m2s/100));
 const cell=span/(n-1);let lpAcc=0,pvAcc=0;
 for(const g of merged){const x=g.xs/g.k,y=g.ys/g.k;let i=clamp(Math.round((x-bx0)/cell),0,n-1),j=clamp(Math.round((by1-y)/cell),0,n-1);
  if(used.has(i+','+j)){let best=null,bd=1e9;for(let a=0;a<n;a++)for(let c=0;c<n;c++){if(used.has(a+','+c))continue;const d=(a-i)**2+(c-j)**2;if(d<bd){bd=d;best=[a,c]}}if(!best)continue;[i,j]=best}
  used.add(i+','+j);const bj=Math.round(g.bjs/g.ws)||0,lab=labelFromYear(bj),st=Object.entries(g.streets).sort((a,b)=>b[1]-a[1])[0],sn=st?st[0]:'';
  const o=Object.assign({id:++id,type:g.type,i,j},TYPES[g.type].d);
  if(TYPES[g.type].cat==='w'){o.aantal=g.aantal;o.m2=Math.round(g.m2s/g.aantal)||80;o.label=lab;o.verw=opt.wp&&bj>=2015?'wp_lucht':'gas';
   lpAcc+=g.aantal*opt.lp/100;o.lp=Math.floor(lpAcc);lpAcc-=o.lp;pvAcc+=g.aantal*opt.pv/100;const npv=Math.floor(pvAcc);pvAcc-=npv;o.pv=Math.round(npv*(g.type==='app'?1:3.5)*10)/10;
   o.name=(g.type==='app'?'Flat ':g.type==='vrij'?'Huis ':'Rij ')+(sn||'zonder straat')+(bj?` (${bj})`:'');
   o.src=`${g.aantal} woningen, gemiddeld ${o.m2} m², bouwjaar ≈ ${bj||'onbekend'}, label geschat ${lab}`}
  else{o.m2=Math.round(g.m2s);o.func=g.func;o.label=lab;o.verw='gas';o.pv=0;o.lp=0;o.name=g.nm+(sn?' '+sn:'');o.src=`${nf.format(o.m2)} m² ${g.nm.toLowerCase()} uit de BAG, bouwjaar ≈ ${bj||'onbekend'}`}
  objs.push(o)}
 const nw=objs.reduce((s,o)=>s+(TYPES[o.type].cat==='w'?o.aantal:0),0),grid=TRAFO[code]||null;
 return{v:2,n,trafo:grid?grid[1]:Math.max(400,Math.ceil(nw/120)*400),strat:state.strat||'ongestuurd',nbkw:state.nbkw??4,buurt:{code,naam,gemeente,vbo:nV},grid,objs}}
window.__buurtlab={buildFromBag,get state(){return state},get R(){return R},recompute,setState};

/* ---------- start ---------- */
syncControls();setHint();renderName();renderEditor();
try{initThree()}catch(err){view.innerHTML='<p class="hint" style="position:static;margin:20px">De 3D-weergave kon niet laden in deze browser. Het rekenwerk werkt wel.</p>'}
rebuildAll();
loadData().then(()=>{$('#loading').remove();recompute()}).catch(err=>{$('#loading').textContent='De profielen konden niet worden geladen ('+err.message+'). Open Buurtlab via een webserver, bijvoorbeeld rickwol.github.io/buurtlab.'});
}
