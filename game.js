import * as THREE from './lib/three.module.min.js';
const $=i=>document.getElementById(i),clamp=(v,a,b)=>v<a?a:v>b?b:v,sstep=(a,b,x)=>{x=clamp((x-a)/(b-a),0,1);return x*x*(3-2*x)};
const S={time:'mist',car:'sedan',color:'#eceff1',q:1,sound:true,auto:true};
try{Object.assign(S,JSON.parse(localStorage.getItem('calmroad')||'{}'))}catch(e){}
const save=()=>{try{localStorage.setItem('calmroad',JSON.stringify(S))}catch(e){}};

/* ---------- road path ---------- */
const STEP=5,N=24,CL=STEP*N,HW=4,PTS=[{x:0,y:0,z:0,h:0}];
const curv=s=>(.0045*Math.sin(s*.0031+.7)+.0028*Math.sin(s*.0087+2.1)+.0012*Math.sin(s*.021))*sstep(0,250,s);
const elev=s=>(8*Math.sin(s*.0042)+3.5*Math.sin(s*.0113+1)+1.2*Math.sin(s*.027))*sstep(0,200,s);
function ensure(i){while(PTS.length<=i){const k=PTS.length-1,p=PTS[k],h=p.h+curv(k*STEP)*STEP,m=(p.h+h)/2;PTS.push({x:p.x+Math.sin(m)*STEP,y:elev((k+1)*STEP),z:p.z+Math.cos(m)*STEP,h})}}
const _p={x:0,y:0,z:0,h:0},_w={x:0,y:0,z:0};
function at(s){s=Math.max(0,s);const i=Math.floor(s/STEP);ensure(i+1);const t=s/STEP-i,a=PTS[i],b=PTS[i+1];_p.x=a.x+(b.x-a.x)*t;_p.y=a.y+(b.y-a.y)*t;_p.z=a.z+(b.z-a.z)*t;_p.h=a.h+(b.h-a.h)*t;return _p}
const tOff=(s,l)=>{const a=Math.abs(l),sd=l<0?1:2.3;return -.15*sstep(HW,HW+1,a)+(Math.sin(s*.021+a*.05+sd)*1.3+Math.sin(s*.057-a*.09+sd)*.8)*sstep(5,30,a)+sstep(7,45,a)*(2+3.5*Math.sin(s*.009+sd))*(l<0?1:.6)};
function wp(s,l){const p=at(s);_w.x=p.x-Math.cos(p.h)*l;_w.z=p.z+Math.sin(p.h)*l;_w.y=p.y+tOff(s,l);return _w}
const gY=(s,l)=>at(s).y+tOff(s,l);

/* ---------- renderer / scene ---------- */
const renderer=new THREE.WebGLRenderer({canvas:$('c'),antialias:false,powerPreference:'high-performance'});
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(65,1,.3,800);
scene.fog=new THREE.Fog(0xffffff,30,500);
const hemi=new THREE.HemisphereLight(0xffffff,0x444444,1),sun=new THREE.DirectionalLight(0xffffff,1);
scene.add(hemi,sun,sun.target);
const sky=new THREE.Mesh(new THREE.SphereGeometry(1,24,12),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
 uniforms:{top:{value:new THREE.Color()},hor:{value:new THREE.Color()},sc:{value:new THREE.Color()},sd:{value:new THREE.Vector3(0,1,0)}},
 vertexShader:'varying vec3 v;void main(){v=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:'uniform vec3 top,hor,sc,sd;varying vec3 v;void main(){float h=clamp(v.y,0.,1.);vec3 c=mix(hor,top,pow(h,.5));float d=max(dot(normalize(v),normalize(sd)),0.);c+=sc*(pow(d,64.)*.9+pow(d,5.)*.18);gl_FragColor=vec4(c,1.);\n#include <colorspace_fragment>\n}'}));
sky.frustumCulled=false;sky.renderOrder=-1;scene.add(sky);

const TIMES={
 mist:{n:'Mist',top:'#8fa2a8',hor:'#e3e3d8',fn:30,ff:520,hs:'#dfe6e8',hg:'#6b6a45',hi:1.9,sc:'#fff4e0',si:1.6,sd:[.4,.6,.3],night:0},
 clear:{n:'Clear',top:'#3f86d6',hor:'#cfe5f2',fn:80,ff:950,hs:'#cfe3ff',hg:'#6b7a45',hi:2.1,sc:'#fff6e6',si:3,sd:[.5,.8,.2],night:0},
 golden:{n:'Golden',top:'#35527f',hor:'#f4b57a',fn:50,ff:750,hs:'#ffd3a8',hg:'#4a4a2e',hi:1.5,sc:'#ffb066',si:3.2,sd:[-.2,.22,.9],night:0},
 night:{n:'Night',top:'#02040b',hor:'#0f1a2e',fn:8,ff:380,hs:'#2a3b66',hg:'#0b0f12',hi:.5,sc:'#6f86c8',si:.4,sd:[.3,.6,-.3],night:1}};
const sunDir=new THREE.Vector3();
function applyTime(){const T=TIMES[S.time]||TIMES.mist,u=sky.material.uniforms;
 u.top.value.set(T.top);u.hor.value.set(T.hor);u.sc.value.set(T.night?'#9fb4ff':T.sc);sunDir.set(...T.sd).normalize();u.sd.value.copy(sunDir);
 scene.fog.color.set(T.hor);scene.fog.near=T.fn;scene.fog.far=Math.min(T.ff,camera.far*.9);renderer.setClearColor(T.hor);
 hemi.color.set(T.hs);hemi.groundColor.set(T.hg);hemi.intensity=T.hi;sun.color.set(T.sc);sun.intensity=T.si;
 if(car)car.userData.sp.intensity=T.night?160:0}

/* ---------- textures ---------- */
function ctex(w,h,fn,rep){const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;if(rep)t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t}
const rnd=Math.random;
const roadTex=ctex(256,256,(x,w,h)=>{x.fillStyle='#4d4f52';x.fillRect(0,0,w,h);for(let i=0;i<5000;i++){const v=60+rnd()*50|0;x.fillStyle=`rgba(${v},${v},${v+3},.5)`;x.fillRect(rnd()*w,rnd()*h,2,2)}x.fillStyle='#dcdcd6';[[12,6],[238,6],[119,5],[132,5]].forEach(([a,b])=>x.fillRect(a,0,b,h))},1);
const grassTex=ctex(128,128,(x,w,h)=>{x.fillStyle='#b8b8b8';x.fillRect(0,0,w,h);for(let i=0;i<1600;i++){const v=140+rnd()*100|0;x.fillStyle=`rgb(${v},${v},${v})`;x.fillRect(rnd()*w,rnd()*h,2,3)}},1);
const tuftTex=ctex(64,64,(x,w,h)=>{for(let i=0;i<16;i++){const bx=6+rnd()*52,tx=bx+(rnd()-.5)*24,th=18+rnd()*40,g=x.createLinearGradient(0,h,0,h-th);g.addColorStop(0,'#8a8a8a');g.addColorStop(1,'#fff');x.strokeStyle=g;x.lineWidth=2.2;x.beginPath();x.moveTo(bx,h);x.quadraticCurveTo(bx,h-th*.6,tx,h-th);x.stroke()}});
const blobTex=ctex(64,64,(x,w,h)=>{const g=x.createRadialGradient(32,32,2,32,32,32);g.addColorStop(0,'rgba(0,0,0,.9)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,w,h)});

/* ---------- world chunks ---------- */
const roadMat=new THREE.MeshLambertMaterial({map:roadTex,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
const terrMat=new THREE.MeshLambertMaterial({vertexColors:true,map:grassTex});
const tuftMat=new THREE.MeshLambertMaterial({map:tuftTex,alphaTest:.45,side:THREE.DoubleSide});
const tuftG=new THREE.BufferGeometry();
tuftG.setAttribute('position',new THREE.Float32BufferAttribute([-.8,0,0,.8,0,0,.8,1.3,0,-.8,1.3,0,0,0,-.8,0,0,.8,0,1.3,.8,0,1.3,-.8],3));
tuftG.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1,0,0,1,0,1,1,0,1],2));
tuftG.setAttribute('normal',new THREE.Float32BufferAttribute(new Array(24).fill(0).map((_,i)=>i%3===1?1:0),3));
tuftG.setIndex([0,1,2,0,2,3,4,5,6,4,6,7]);
const crownG=new THREE.IcosahedronGeometry(1,1),crownM=new THREE.MeshLambertMaterial({flatShading:true});
const trunkG=new THREE.CylinderGeometry(.18,.28,1,6).translate(0,.5,0),trunkM=new THREE.MeshLambertMaterial({color:0x4a3a2a});
const LATS=[4,5.5,8,12,18,26,36,48];
const grid=(R,C)=>{const o=[];for(let r=0;r<R-1;r++)for(let c=0;c<C-1;c++){const a=r*C+c,b=a+1,d=a+C,e=d+1;o.push(a,b,d,b,e,d)}return o};
const chunks=new Map(),tc=new THREE.Color(),dm=new THREE.Object3D();
function buildChunk(k){
 const g=new THREE.Group(),s0=k*CL,R=N+1;
 const mesh=(pos,uv,col,C,mat)=>{const ge=new THREE.BufferGeometry();ge.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));ge.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));if(col)ge.setAttribute('color',new THREE.Float32BufferAttribute(col,3));ge.setIndex(grid(R,C));ge.computeVertexNormals();const m=new THREE.Mesh(ge,mat);m.userData.own=1;g.add(m)};
 let pos=[],uv=[];
 for(let i=0;i<R;i++){const s=s0+i*STEP;for(const l of[-HW,HW]){const p=wp(s,l);pos.push(p.x,p.y+.02,p.z);uv.push(l>0?1:0,s/8)}}
 mesh(pos,uv,null,2,roadMat);
 for(const side of[-1,1]){pos=[];uv=[];const col=[],ls=(side<0?LATS.slice().reverse():LATS).map(v=>v*side);
  for(let i=0;i<R;i++){const s=s0+i*STEP;for(const l of ls){const p=wp(s,l);pos.push(p.x,p.y,p.z);uv.push(l/6,s/6);const a=Math.abs(l);tc.setHSL(.17+.05*Math.sin(s*.02+l*.06)+rnd()*.02,.38,.2+rnd()*.1+.05*sstep(8,40,a));col.push(tc.r,tc.g,tc.b)}}
  mesh(pos,uv,col,ls.length,terrMat)}
 const n=[120,260,480][S.q],gm=new THREE.InstancedMesh(tuftG,tuftMat,n);
 for(let i=0;i<n;i++){const s=s0+rnd()*CL,l=(rnd()<.5?-1:1)*(HW+.6+Math.pow(rnd(),1.7)*34),p=wp(s,l);dm.position.set(p.x,p.y,p.z);dm.rotation.set(0,rnd()*6.28,0);const sc=.9+rnd()*1.5;dm.scale.set(sc,sc*(.8+rnd()*.6),sc);dm.updateMatrix();gm.setMatrixAt(i,dm.matrix);tc.setHSL(.14+rnd()*.07,.45,.32+rnd()*.15);gm.setColorAt(i,tc)}
 gm.frustumCulled=false;g.add(gm);
 const tn=6,cm=new THREE.InstancedMesh(crownG,crownM,tn),tm=new THREE.InstancedMesh(trunkG,trunkM,tn);
 for(let i=0;i<tn;i++){const s=s0+rnd()*CL,l=(rnd()<.5?-1:1)*(11+rnd()*30),p=wp(s,l),r=1.4+rnd()*1.4;
  dm.position.set(p.x,p.y,p.z);dm.rotation.set(0,0,0);dm.scale.set(r,3*r,r);dm.updateMatrix();tm.setMatrixAt(i,dm.matrix);
  dm.position.y=p.y+3.2*r;dm.scale.set(2.2*r,2.6*r,2.2*r);dm.updateMatrix();cm.setMatrixAt(i,dm.matrix);tc.setHSL(.2+rnd()*.08,.3,.26+rnd()*.1);cm.setColorAt(i,tc)}
 cm.frustumCulled=tm.frustumCulled=false;g.add(cm,tm);
 scene.add(g);chunks.set(k,g)}
function drop(g){scene.remove(g);g.traverse(o=>{if(o.isInstancedMesh)o.dispose();else if(o.userData.own)o.geometry.dispose()})}
let sPos=20;
function manage(force){const kc=Math.floor(sPos/CL),A=[5,7,9][S.q];let made=0;
 for(let k=Math.max(0,kc-1);k<=kc+A;k++)if(!chunks.has(k)){if(made&&!force)break;buildChunk(k);made++}
 for(const[k,c]of chunks)if(k<kc-1||k>kc+A+2){drop(c);chunks.delete(k)}}

/* ---------- car ---------- */
const CARS={
 sedan:{L:4.7,W:1.85,b:[[-2.35,.34],[-2.35,.82],[-1.3,.92],[1.1,.92],[2.35,.7],[2.35,.34]],c:[[-1.4,.9],[-.7,1.38],[.55,1.38],[1.3,.9]]},
 coupe:{L:4.5,W:1.9,b:[[-2.25,.32],[-2.25,.74],[-1.1,.86],[1.1,.84],[2.25,.55],[2.25,.32]],c:[[-1.2,.84],[-.5,1.24],[.3,1.24],[1.05,.84]]},
 suv:{L:4.7,W:1.95,b:[[-2.35,.42],[-2.35,1.12],[-1,1.14],[1.2,1.06],[2.35,.8],[2.35,.42]],c:[[-2.25,1.08],[-1.9,1.68],[.4,1.68],[1.3,1.06]]}};
function ext(pts,w,bev){const sh=new THREE.Shape(pts.map(p=>new THREE.Vector2(p[0],p[1]))),g=new THREE.ExtrudeGeometry(sh,{depth:w,bevelEnabled:true,bevelSize:bev,bevelThickness:bev,bevelSegments:3,curveSegments:1});g.translate(0,0,-w/2);g.rotateY(-Math.PI/2);return g}
function buildCar(){
 const D=CARS[S.car]||CARS.sedan,g=new THREE.Group(),bm=new THREE.MeshStandardMaterial({color:S.color,roughness:.3,metalness:.15}),
 gl=new THREE.MeshStandardMaterial({color:0x10151c,roughness:.12,metalness:.5}),blk=new THREE.MeshLambertMaterial({color:0x141414});
 g.add(new THREE.Mesh(ext(D.b,D.W-.2,.1),bm));
 const cw=D.W-.55;g.add(new THREE.Mesh(ext(D.c,cw,.08),gl));
 const t0=D.c[1],t1=D.c[2],roof=new THREE.Mesh(new THREE.BoxGeometry(cw-.1,.05,t1[0]-t0[0]+.25),bm);roof.position.set(0,t0[1]+.1,(t0[0]+t1[0])/2+.02);g.add(roof);
 const skirt=new THREE.Mesh(new THREE.BoxGeometry(D.W-.1,.12,D.L-.6),blk);skirt.position.y=.3;g.add(skirt);
 const tail=new THREE.MeshBasicMaterial({color:0x6a1010}),head=new THREE.MeshBasicMaterial({color:0xfff5d8});
 for(const x of[-.62,.62]){const a=new THREE.Mesh(new THREE.BoxGeometry(.55,.12,.05),tail);a.position.set(x,.78,-D.L/2-.12);g.add(a);const b=new THREE.Mesh(new THREE.BoxGeometry(.45,.1,.05),head);b.position.set(x,.62,D.L/2+.12);g.add(b)}
 const wh=[],wg=new THREE.CylinderGeometry(.34,.34,.26,18).rotateZ(Math.PI/2),rg=new THREE.CylinderGeometry(.21,.21,.28,10).rotateZ(Math.PI/2),rm=new THREE.MeshLambertMaterial({color:0x9a9fa5});
 for(const sx of[-1,1])for(const sz of[-1,1]){const pv=new THREE.Group(),sp=new THREE.Group();sp.add(new THREE.Mesh(wg,blk),new THREE.Mesh(rg,rm));pv.add(sp);pv.position.set(sx*(D.W/2-.08),.34,sz*D.L*.32);g.add(pv);wh.push({pv,sp,front:sz>0})}
 const sh=new THREE.Mesh(new THREE.PlaneGeometry(D.W+1,D.L+1.2),new THREE.MeshBasicMaterial({map:blobTex,transparent:true,depthWrite:false,opacity:.55}));sh.rotation.x=-Math.PI/2;sh.position.y=.06;g.add(sh);
 const sp=new THREE.SpotLight(0xfff1d0,0,110,.55,.6,1.2);sp.position.set(0,.9,2.2);sp.target.position.set(0,0,25);g.add(sp,sp.target);
 g.userData={wh,tail,sp,D};g.rotation.order='YXZ';return g}
let car;function setCar(){if(car)scene.remove(car);car=buildCar();scene.add(car);applyTime()}

/* ---------- state & input ---------- */
let v=0,lx=0,phi=0,steer=0,thr=0,padS=0,brkB=0,bstB=0,camMode=0,camH=0,running=false,hud=0;
const K={},thEl=$('thr'),thK=thEl.querySelector('i'),pad=$('pad'),padK=pad.querySelector('i');
const CAMS=[['CHASE',7.5,2.9],['FAR',14,5.5],['HOOD',0,0]];
const hold=(el,on,off)=>{el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture?.(e.pointerId);on();el.classList.add('on')});['pointerup','pointercancel','lostpointercapture'].forEach(n=>el.addEventListener(n,()=>{off();el.classList.remove('on')}))};
hold($('brk'),()=>brkB=1,()=>brkB=0);hold($('bst'),()=>bstB=1,()=>bstB=0);
function slide(el,fn,end){let on=0;el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture(e.pointerId);on=1;fn(e)});el.addEventListener('pointermove',e=>{if(on)fn(e)});['pointerup','pointercancel'].forEach(n=>el.addEventListener(n,()=>{on=0;end&&end()}))}
const setThr=e=>{const r=thEl.getBoundingClientRect();thr=clamp(1-(e.clientY-r.top-20)/(r.height-40),0,1);thK.style.bottom=thr*(r.height-41)+'px'};
slide(thEl,setThr);
const setPad=e=>{const r=pad.getBoundingClientRect(),m=(r.width-60)/2;padS=clamp((e.clientX-r.left-r.width/2)/m,-1,1);padK.style.transform=`translateX(${padS*m}px)`};
slide(pad,setPad,()=>{padS=0;padK.style.transform=''});
const cycleCam=()=>{camMode=(camMode+1)%3;$('cam').textContent=CAMS[camMode][0];camSnap=1};let camSnap=1;
const reset=()=>{v=0;lx=0;phi=0;steer=0;thr=0;thK.style.bottom='0'};
$('cam').onclick=cycleCam;$('rst').onclick=reset;
$('snd').onclick=()=>{S.sound=!S.sound;save();drawPanel();initAudio()};
const panel=$('panel'),togglePanel=()=>{panel.hidden=!panel.hidden;if(!panel.hidden)drawPanel()};
$('gear').onclick=togglePanel;$('x').onclick=togglePanel;
addEventListener('keydown',e=>{K[e.code]=1;if(e.code==='KeyC')cycleCam();if(e.code==='KeyR')reset();if(e.code==='Escape')togglePanel();if(e.code==='Space')e.preventDefault()});
addEventListener('keyup',e=>K[e.code]=0);

/* ---------- settings panel ---------- */
const ROWS=[['time','World',Object.entries(TIMES).map(([k,t])=>[k,t.n])],['car','Vehicle',[['sedan','Sedan'],['coupe','Coupe'],['suv','SUV']]],
 ['color','Paint',['#eceff1','#c0392b','#2f6fb5','#1b1d20','#e0b030','#3f8f5a'].map(c=>[c,''])],['q','Quality',[[0,'Low'],[1,'Medium'],[2,'High']]],
 ['auto','Autodrive',[[true,'On'],[false,'Off']]],['sound','Sound',[[true,'On'],[false,'Off']]]];
function drawPanel(){const R=$('rows');R.innerHTML='';for(const[k,lab,opts]of ROWS){const row=document.createElement('div');row.className='row';row.innerHTML=`<span>${lab}</span>`;const w=document.createElement('div');
 for(const[val,n]of opts){const b=document.createElement('button');b.className='chip'+(S[k]===val?' sel':'');b.textContent=n;if(k==='color'){b.style.background=val;b.classList.add('sw')}
  b.onclick=()=>{S[k]=val;save();if(k==='time')applyTime();else if(k==='car'||k==='color')setCar();else if(k==='q')setQuality();else if(k==='sound')initAudio();drawPanel()};w.appendChild(b)}
 row.appendChild(w);R.appendChild(row)}}

/* ---------- audio ---------- */
let AC,o1,o2,eg,wg2;
function initAudio(){try{if(!AC){AC=new(window.AudioContext||window.webkitAudioContext)();o1=AC.createOscillator();o2=AC.createOscillator();o1.type='sawtooth';o2.type='triangle';
 const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=360;eg=AC.createGain();eg.gain.value=0;o1.connect(f);o2.connect(f);f.connect(eg);eg.connect(AC.destination);o1.start();o2.start();
 const b=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
 const ns=AC.createBufferSource();ns.buffer=b;ns.loop=true;const wf=AC.createBiquadFilter();wf.type='lowpass';wf.frequency.value=700;wg2=AC.createGain();wg2.gain.value=0;ns.connect(wf);wf.connect(wg2);wg2.connect(AC.destination);ns.start()}
 if(AC.state==='suspended')AC.resume()}catch(e){}}
addEventListener('pointerdown',()=>{if(AC&&AC.state==='suspended')AC.resume()});
function audioUpdate(eff){if(!AC)return;const t=AC.currentTime,f=36+v*2.4+eff*18;o1.frequency.setTargetAtTime(f,t,.08);o2.frequency.setTargetAtTime(f*2.01,t,.08);
 eg.gain.setTargetAtTime(S.sound?.05+.035*eff:0,t,.15);wg2.gain.setTargetAtTime(S.sound?clamp(v/60,0,1)*.14:0,t,.2)}

/* ---------- sizing / quality ---------- */
let dyn=1;
function resize(){renderer.setPixelRatio(Math.min(devicePixelRatio||1,[1,1.5,2][S.q])*dyn);renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}
function setQuality(){camera.far=[5,7,9][S.q]*CL+100;sky.scale.setScalar(camera.far*.9);for(const c of chunks.values())drop(c);chunks.clear();resize();applyTime();manage(true)}
addEventListener('resize',resize);

/* ---------- simulation ---------- */
function step(dt){
 const eff=Math.max(thr,K.KeyW||K.ArrowUp?1:0),brk=brkB||K.Space||K.KeyS||K.ArrowDown?1:0,bst=bstB||K.ShiftLeft||K.ShiftRight?1:0;
 const off=Math.abs(lx)>HW+.3,vmax=(bst?78:48)*(off?.45:1);
 let a=eff*(bst?14:8.5)*(1-v/vmax)-.0016*v*v-(v>.1?.25:0)-brk*20;if(v>vmax)a-=(v-vmax)*.8;if(off)a-=v*.35;
 v=Math.max(0,v+a*dt);
 const ks=(K.KeyD||K.ArrowRight?1:0)-(K.KeyA||K.ArrowLeft?1:0),tgt=Math.abs(padS)>.02?padS:ks;
 steer+=(tgt-steer)*Math.min(1,dt*9);
 const rate=1.1/(1+v*.035),gain=Math.max(rate*Math.min(1,v/4),.15);let sv=steer;
 if(S.auto&&Math.abs(tgt)<.05&&v>.5){const pt=clamp(lx*.05,-.35,.35);sv=clamp(-(2.2*(pt-phi)+curv(sPos)*v)/gain,-1,1)}
 const yaw=-sv*rate*Math.min(1,v/4),dh=curv(sPos)*v*Math.cos(phi);
 phi=clamp(phi+(yaw-dh)*dt,-1.3,1.3);sPos+=v*Math.cos(phi)*dt;lx=clamp(lx-v*Math.sin(phi)*dt,-44,44);
 const p=at(sPos),h=p.h,py=p.y,hh=h+phi,x=p.x-Math.cos(h)*lx,z=p.z+Math.sin(h)*lx,y=py+tOff(sPos,lx);
 const slope=(gY(sPos+2,lx)-gY(sPos-2,lx))/4;
 car.position.set(x,y,z);car.rotation.set(-Math.atan(slope),hh,-sv*clamp(v/40,0,1)*.04);
 for(const w of car.userData.wh){w.sp.rotation.x+=v/.34*dt;if(w.front)w.pv.rotation.y=-sv*.4}
 car.userData.tail.color.setHex(brk?0xff2a2a:0x6a1010);
 sun.position.set(x+sunDir.x*100,y+sunDir.y*100,z+sunDir.z*100);sun.target.position.set(x,y,z);
 audioUpdate(eff);
 /* camera */
 const d=((hh-camH+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;camH+=camSnap?d:d*(1-Math.exp(-4*dt));
 const[,dist,ht]=CAMS[camMode];camera.fov=(camMode===2?75:62)+clamp(v/70,0,1)*14;camera.updateProjectionMatrix();
 if(camMode===2){const o=car.localToWorld(new THREE.Vector3(0,1.25,.5)),f=new THREE.Vector3(0,0,1).applyQuaternion(car.quaternion);camera.position.copy(o);camera.lookAt(o.x+f.x*20,o.y+f.y*20,o.z+f.z*20)}
 else{const fx=Math.sin(camH),fz=Math.cos(camH),tx=x-fx*dist,tz=z-fz*dist,ty=y+ht,k=camSnap?1:1-Math.exp(-8*dt);
  camera.position.x+=(tx-camera.position.x)*k;camera.position.y+=(ty-camera.position.y)*k;camera.position.z+=(tz-camera.position.z)*k;camera.lookAt(x+fx*6,y+1.1,z+fz*6)}
 camSnap=0;sky.position.copy(camera.position);
 if(++hud%6===0){$('spd').firstChild.textContent=(v*3.6).toFixed(1);$('dst').firstChild.textContent=((sPos-20)/1000).toFixed(1);$('auto').textContent=S.auto?'AUTODRIVE':''}
}

/* ---------- main loop ---------- */
let last=performance.now(),fa=0,fn=0;
function loop(t){requestAnimationFrame(loop);const raw=(t-last)/1000;last=t;const dt=Math.min(.05,raw);
 if(running){step(dt);manage(false)}else{sky.position.copy(camera.position)}
 renderer.render(scene,camera);
 fa+=raw;if(++fn>=90){const fps=fn/fa;fa=fn=0;if(fps<42&&dyn>.55){dyn-=.1;resize()}else if(fps>57&&dyn<1){dyn=Math.min(1,dyn+.05);resize()}}}

setCar();setQuality();camera.position.set(0,3,12);camera.lookAt(0,1,26);
$('cam').textContent=CAMS[0][0];
$('go').onclick=async()=>{running=true;$('start').hidden=true;camSnap=1;initAudio();
 try{await document.documentElement.requestFullscreen?.({navigationUI:'hide'})}catch(e){}
 try{await screen.orientation?.lock?.('landscape')}catch(e){}
 try{navigator.wakeLock?.request('screen').catch(()=>{})}catch(e){}};
requestAnimationFrame(loop);
