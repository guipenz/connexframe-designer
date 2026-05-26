import { useState, useMemo, useEffect, useRef } from "react";
import logoConnexframe from "./assets/logo.png";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T = {
  // Copper palette
  cu100: "#F5E6D3", cu200: "#E8C99A", cu300: "#D9964E",
  cu400: "#C47B3A", cu500: "#A85F24", cu600: "#7A4A1E", cu700: "#4A2810",
  // Carbon palette
  ca50:  "#E8EAF0", ca100: "#9BAAB8", ca200: "#5A6A7A", ca300: "#384050",
  ca400: "#222C38", ca500: "#161C26", ca600: "#0F1318", ca700: "#090C10", ca800: "#050709",
  // Semantic
  green: "#2ECC71", greenDim: "#1A5C35",
  red: "#E74C3C", redDim: "#5C1A1A",
  blue: "#3B82F6",
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const INSULATION = {
  EPS:{ label:"EPS – Expanded Polystyrene", rPerInch:3.8 },
  XPS:{ label:"XPS – Extruded Polystyrene", rPerInch:5.0 },
};
const CLIMATE_ZONES = [
  {id:1,label:"Zone 1 – Hot Humid",  city:"Miami, FL",      minR:13},
  {id:2,label:"Zone 2 – Hot",        city:"Houston, TX",     minR:13},
  {id:3,label:"Zone 3 – Warm",       city:"Atlanta, GA",     minR:15},
  {id:4,label:"Zone 4 – Mixed",      city:"Baltimore, MD",   minR:20},
  {id:5,label:"Zone 5 – Cool",       city:"Chicago, IL",     minR:20},
  {id:6,label:"Zone 6 – Cold",       city:"Burlington, VT",  minR:25},
  {id:7,label:"Zone 7 – Very Cold",  city:"Duluth, MN",      minR:25},
  {id:8,label:"Zone 8 – Subarctic",  city:"Fairbanks, AK",   minR:25},
];
const VARIANTS = {
  V1:{label:"V1 – Standard",       compositeMin:.60,compositeMax:.68,bridgeFactor:.100,ksFactor:1.00,desc:"Baseline helical GFRP + PU+GMB core"},
  V2:{label:"V2 – Thermal Enh.",   compositeMin:.62,compositeMax:.72,bridgeFactor:.085,ksFactor:1.05,desc:"Optimized GMB density at interface zone"},
  V3:{label:"V3 – High Composite", compositeMin:.72,compositeMax:.80,bridgeFactor:.095,ksFactor:1.15,desc:"Increased twist angle for max shear transfer"},
};
const COMPETITORS = {
  thermomass:{label:"Thermomass",     bf:.18, comp:.30, hex:"#C0392B"},
  hk:        {label:"HK Composites",  bf:.22, comp:.05, hex:"#D35400"},
  thinwall:  {label:"THiN Wall",      bf:.12, comp:.90, hex:"#D4AC0D"},
  steel:     {label:"Steel Conn.",    bf:.56, comp:1.0,  hex:"#7F8C8D"},
};
const CITIES = {
  miami:      {label:"Miami, FL",          hdd:149,  cdd:4038,elec:.123,gas:1.45},
  houston:    {label:"Houston, TX",        hdd:1434, cdd:2829,elec:.118,gas:1.38},
  atlanta:    {label:"Atlanta, GA",        hdd:2827, cdd:1699,elec:.114,gas:1.52},
  baltimore:  {label:"Baltimore, MD",      hdd:4729, cdd:1089,elec:.138,gas:1.61},
  chicago:    {label:"Chicago, IL",        hdd:6498, cdd:842, elec:.129,gas:1.74},
  minneapolis:{label:"Minneapolis, MN",    hdd:8159, cdd:695, elec:.117,gas:1.58},
  seattle:    {label:"Seattle, WA",        hdd:4727, cdd:181, elec:.103,gas:1.63},
  phoenix:    {label:"Phoenix, AZ",        hdd:1125, cdd:4469,elec:.119,gas:1.41},
  nyc:        {label:"New York, NY",       hdd:4848, cdd:1078,elec:.198,gas:1.87},
  boston:     {label:"Boston, MA",         hdd:5621, cdd:777, elec:.228,gas:1.92},
  saltlake:   {label:"Salt Lake City, UT", hdd:5983, cdd:1355,elec:.095,gas:1.44},
  lincoln:    {label:"Lincoln, NE",        hdd:6291, cdd:1244,elec:.107,gas:1.51},
};
const BUILDING_TYPES = {
  warehouse:  {label:"Industrial / Warehouse",area:2000},
  office:     {label:"Commercial Office",      area:3500},
  multifamily:{label:"Multifamily Residential",area:4500},
  retail:     {label:"Retail / Big Box",       area:5000},
  school:     {label:"K-12 School",            area:3000},
  hospital:   {label:"Healthcare / Hospital",  area:6000},
};

// ─── ROI SYSTEMS ──────────────────────────────────────────────────────────────
// Unit costs USD per connector; license fee USD per project;
// install_time_min per connector; service_life_yr; maintenance_USD_per_yr_per_ft2
const ROI_SYSTEMS = {
  connexframe:{
    label:"ConnexFrame",        unitCost:3.85, license:0,    installMin:0.6,
    life:75, maint:0.00, bfRef:.10, compRef:.68, hex:T.cu400, isCF:true,
  },
  thermomass: {
    label:"Thermomass",         unitCost:2.95, license:850,  installMin:0.9,
    life:50, maint:0.02, bfRef:.18, compRef:.30, hex:"#C0392B",
  },
  steel:      {
    label:"Steel Ties",         unitCost:1.10, license:0,    installMin:0.8,
    life:30, maint:0.05, bfRef:.56, compRef:1.0,  hex:"#7F8C8D",
  },
  carbon:     {
    label:"Carbon Fiber",       unitCost:6.20, license:1200, installMin:1.1,
    life:60, maint:0.01, bfRef:.14, compRef:.55, hex:"#34495E",
  },
};

// ─── ENGINE ───────────────────────────────────────────────────────────────────
function calculate(inp) {
  const v=VARIANTS[inp.variant], ins=INSULATION[inp.insulType], z=CLIMATE_ZONES[inp.climateZone-1];
  const rN=inp.insulThick*ins.rPerInch;

  // Total panel thickness influences shear demand at connector interfaces.
  // Reference panel: 89 mm inner + 4" (101.6 mm) insul + 64 mm outer = 254.6 mm.
  // Engineering approximation: spacing scales inversely with sqrt(thickness ratio).
  // Thicker panel → larger lever arm → higher shear → tighter connector spacing → more connectors.
  const totalThicknessMM = inp.wytheInner + (inp.insulThick * 25.4) + inp.wytheOuter;
  const refThicknessMM = 254.6;
  const thicknessFactor = Math.sqrt(refThicknessMM / totalThicknessMM);
  const sp = (457 / v.ksFactor) * thicknessFactor;

  // Edge clearance: minimum distance from any connector to the nearest panel edge (mm)
  const EDGE = 150;

  // Fit maximum N connectors such that (N-1)*sp fits within (panelDim - 2*EDGE).
  // This respects edge clearance on BOTH sides AND distributes connectors evenly.
  const cols = Math.max(1, Math.floor((inp.panelW - 2*EDGE)/sp) + 1);
  const rows = Math.max(1, Math.floor((inp.panelH - 2*EDGE)/sp) + 1);

  // Center the connector grid: equal margin on opposite edges (left=right, top=bottom).
  const marginX = (inp.panelW - (cols-1)*sp) / 2;
  const marginY = (inp.panelH - (rows-1)*sp) / 2;

  const rEff=rN*(1-v.bridgeFactor);
  const comps=Object.entries(COMPETITORS).map(([k,c])=>({k,...c,rEff:rN*(1-c.bf),rLossPct:(c.bf*100).toFixed(1)}));
  const grid=[];
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) grid.push({x:marginX+c*sp,y:marginY+r*sp});
  return {
    rN:rN.toFixed(1), rEff:rEff.toFixed(1), rLoss:(rN-rEff).toFixed(1),
    rLossPct:(v.bridgeFactor*100).toFixed(1),
    comp:((v.compositeMin+v.compositeMax)/2*100).toFixed(0),
    count:cols*rows, cols, rows, spMM:Math.round(sp), spIn:(sp/25.4).toFixed(1),
    comps, ok:rEff>=z.minR, minR:z.minR, grid, zone:z,
    bf:v.bridgeFactor, ...inp,
  };
}
function calcEnergy(rEff,city,btype) {
  const u=1/rEff, a=BUILDING_TYPES[btype].area, c=CITIES[city];
  const hCost=(u*a*c.hdd*24/100000/0.9)*c.gas;
  const cCost=(u*a*c.cdd*24/(3.5*3412))*c.elec;
  return {total:hCost+cCost, heat:hCost, cool:cCost};
}
// Generic energy cost given rEff, custom area (ft²), city
function calcEnergyArea(rEff, city, areaFt2) {
  const u=1/rEff, c=CITIES[city];
  const hCost=(u*areaFt2*c.hdd*24/100000/0.9)*c.gas;
  const cCost=(u*areaFt2*c.cdd*24/(3.5*3412))*c.elec;
  return hCost+cCost;
}

// ─── ROI ENGINE ───────────────────────────────────────────────────────────────
function calcROI(R, roiInp) {
  const {city, areaFt2, laborRate, horizon, discountRate} = roiInp;
  const connectorsPerFt2 = R.count / ((R.panelW/304.8)*(R.panelH/304.8));
  const totalConnectors = Math.ceil(connectorsPerFt2 * areaFt2);

  const systems = Object.entries(ROI_SYSTEMS).map(([k, s])=>{
    const hardware = totalConnectors * s.unitCost;
    const license  = s.license;
    const laborHr  = (totalConnectors * s.installMin) / 60;
    const labor    = laborHr * laborRate;
    const upfront  = hardware + license + labor;

    // Effective R for this system: use V6 variant rEff for ConnexFrame, else apply system bfRef
    const rN = parseFloat(R.rN);
    const rEffSys = k==="connexframe" ? parseFloat(R.rEff) : rN*(1-s.bfRef);
    const annualEnergy = calcEnergyArea(rEffSys, city, areaFt2);
    const annualMaint  = s.maint * areaFt2;
    const annualTotal  = annualEnergy + annualMaint;

    // Replacements within horizon
    const replacements = Math.max(0, Math.ceil(horizon/s.life) - 1);
    const replaceCost  = replacements * upfront * 0.85; // 85% of original = re-install only

    // Cumulative cost curve (year-by-year, discounted)
    const curve = [];
    let cumulative = upfront;
    for (let y=0; y<=horizon; y++) {
      if (y===0) curve.push({y, cum:upfront});
      else {
        const yearCost = annualTotal / Math.pow(1+discountRate, y);
        // Add replacement at life intervals
        const isReplacement = y>0 && y%s.life===0 && y<horizon;
        const repAdd = isReplacement ? (upfront*0.85)/Math.pow(1+discountRate,y) : 0;
        cumulative += yearCost + repAdd;
        curve.push({y, cum:cumulative});
      }
    }

    const lifetimeCost = cumulative;
    return {
      key:k, ...s, hardware, license, labor, upfront,
      rEffSys, annualEnergy, annualMaint, annualTotal,
      replacements, replaceCost, lifetimeCost, curve,
      totalConnectors,
    };
  });

  // Payback vs Thermomass (industry benchmark)
  const cf = systems.find(s=>s.key==="connexframe");
  const tm = systems.find(s=>s.key==="thermomass");
  const upfrontDelta = cf.upfront - tm.upfront; // negative = CF cheaper
  const annualDelta  = tm.annualTotal - cf.annualTotal; // positive = CF saves
  const paybackYears = (upfrontDelta>0 && annualDelta>0) ? upfrontDelta/annualDelta : null;

  return { systems, totalConnectors, cf, tm, upfrontDelta, annualDelta, paybackYears };
}

// ─── BRIDGE → COLOR ───────────────────────────────────────────────────────────
function bfColor(bf) {
  const t=Math.min(1,(bf-.08)/(.56-.08));
  const s=[[14,165,233],[56,189,248],[250,204,21],[249,115,22],[220,38,38]];
  const i=Math.min(Math.floor(t*(s.length-1)),s.length-2), f=t*(s.length-1)-i;
  const r=Math.round(s[i][0]+(s[i+1][0]-s[i][0])*f);
  const g=Math.round(s[i][1]+(s[i+1][1]-s[i][1])*f);
  const b=Math.round(s[i][2]+(s[i+1][2]-s[i][2])*f);
  return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
}

// ─── ANIMATED NUMBER ──────────────────────────────────────────────────────────
function AnimNum({value, prefix="", suffix="", decimals=0}) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(()=>{
    const start=prev.current, end=parseFloat(value), dur=400, t0=performance.now();
    const run=(now)=>{
      const p=Math.min((now-t0)/dur,1);
      const ease=1-Math.pow(1-p,3);
      setDisplay((start+(end-start)*ease).toFixed(decimals));
      if(p<1) requestAnimationFrame(run);
    };
    requestAnimationFrame(run);
    prev.current=end;
  },[value]);
  return <>{prefix}{display}{suffix}</>;
}

// ─── GLOW KPI CARD ────────────────────────────────────────────────────────────
function KpiCard({label, value, unit, sub, accent, warn, icon}) {
  const col = warn ? T.red : accent ? T.cu400 : T.ca100;
  const glowCol = warn ? T.redDim : accent ? T.cu700 : "transparent";
  return (
    <div style={{
      background:`linear-gradient(135deg, ${T.ca600} 0%, ${T.ca700} 100%)`,
      border:`1px solid ${warn?T.redDim:accent?T.cu600:T.ca400}`,
      borderRadius:12, padding:"18px 20px", position:"relative", overflow:"hidden",
      boxShadow: accent||warn ? `0 0 20px ${glowCol}40, inset 0 1px 0 ${col}20` : "inset 0 1px 0 rgba(255,255,255,0.03)",
    }}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:col,opacity:0.85}}/>
      {(accent||warn) && <div style={{position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",background:col,opacity:0.06,filter:"blur(20px)"}}/>}
      <div style={{fontSize:9,color:T.ca200,textTransform:"uppercase",letterSpacing:1.8,marginBottom:10,fontWeight:600}}>{label}</div>
      <div style={{fontSize:30,fontWeight:700,color:col,fontFamily:"'DM Mono',monospace",lineHeight:1,letterSpacing:-0.5}}>
        {(()=>{
          // Animate when value is numeric (or a clean numeric string). Otherwise render raw,
          // so formatted strings like "+$2.0k" or "Day 1" display correctly instead of NaN.
          const numeric = typeof value==="number"
            ? value
            : (typeof value==="string" && /^[+\-−]?\d+(\.\d+)?$/.test(value.trim()) ? parseFloat(value) : null);
          if (numeric === null || Number.isNaN(numeric)) return <>{value}{unit||""}</>;
          return <AnimNum value={numeric} suffix={unit||""} decimals={typeof value==="number"&&value%1!==0?1:0}/>;
        })()}
      </div>
      {sub && <div style={{fontSize:10.5,color:T.ca200,marginTop:8,lineHeight:1.4}}>{sub}</div>}
    </div>
  );
}

// ─── ANIMATED BAR ─────────────────────────────────────────────────────────────
function Bar({label, value, maxVal, color, isCurrent, rightLabel}) {
  const pct=Math.min(100,(value/(maxVal||1))*100);
  return (
    <div style={{marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
        <span style={{fontSize:11.5,color:isCurrent?T.cu300:T.ca100,fontWeight:isCurrent?600:400}}>{label}</span>
        <span style={{fontSize:11,color:isCurrent?T.cu300:T.ca200,fontFamily:"monospace",fontWeight:isCurrent?600:400}}>
          {rightLabel||value.toFixed(1)}
        </span>
      </div>
      <div style={{background:T.ca700,borderRadius:4,height:8,overflow:"hidden",position:"relative"}}>
        <div style={{
          position:"absolute",left:0,top:0,bottom:0,width:`${pct}%`,borderRadius:4,
          background:isCurrent?`linear-gradient(90deg,${T.cu500},${T.cu300})`:color,
          transition:"width 0.6s cubic-bezier(0.34,1.56,0.64,1)",
          boxShadow:isCurrent?`0 0 8px ${T.cu400}60`:"none",
        }}/>
        {isCurrent && <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,background:"linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.12) 50%,transparent 100%)",backgroundSize:"200% 100%",animation:"shimmer 2s infinite",pointerEvents:"none"}}/>}
      </div>
    </div>
  );
}

// ─── PANEL SVG ────────────────────────────────────────────────────────────────
function PanelSVG({panelW, panelH, positions, bf, showHeat=false}) {
  const maxD=230, sc=Math.min(maxD/panelW, maxD/panelH);
  const sw=panelW*sc, sh=panelH*sc;
  const haloR=Math.max(16, (400/Math.max(panelW,panelH))*maxD*0.85);
  const color=showHeat?bfColor(bf):T.cu400;
  return (
    <svg width={sw+32} height={sh+24} viewBox={`-16 -8 ${sw+32} ${sh+24}`} style={{display:"block",margin:"0 auto"}}>
      <defs>
        <linearGradient id={`pbg_${showHeat}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#141824"/><stop offset="100%" stopColor="#0A0D14"/>
        </linearGradient>
        {showHeat && positions.slice(0,100).map((_,i)=>(
          <radialGradient key={i} id={`rg_${i}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor={color} stopOpacity="0.9"/>
            <stop offset="40%"  stopColor={color} stopOpacity="0.4"/>
            <stop offset="80%"  stopColor={color} stopOpacity="0.08"/>
            <stop offset="100%" stopColor={color} stopOpacity="0"/>
          </radialGradient>
        ))}
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1A2030" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect x={0} y={0} width={sw} height={sh} fill={`url(#pbg_${showHeat})`} rx={3}/>
      <rect x={0} y={0} width={sw} height={sh} fill="url(#grid)" rx={3} opacity={0.5}/>
      {showHeat && positions.slice(0,100).map((p,i)=>(
        <circle key={i} cx={(p.x*sc).toFixed(1)} cy={(p.y*sc).toFixed(1)} r={haloR} fill={`url(#rg_${i})`}/>
      ))}
      {positions.map((p,i)=>{
        const x=(p.x*sc).toFixed(1), y=(p.y*sc).toFixed(1);
        return <g key={i}>
          {!showHeat && <circle cx={x} cy={y} r={8} fill={color} opacity={0.08}/>}
          <circle cx={x} cy={y} r={3.5} fill={color} opacity={0.95}/>
        </g>;
      })}
      <rect x={0} y={0} width={sw} height={sh} fill="none" stroke={showHeat?color:T.cu600} strokeWidth={1.2} rx={3}/>
      <text x={sw/2} y={sh+16} textAnchor="middle" fill={T.ca200} fontSize={8} fontFamily="monospace">{(panelW/1000).toFixed(2)} m</text>
      <text x={-10} y={sh/2} textAnchor="middle" fill={T.ca200} fontSize={8} fontFamily="monospace" transform={`rotate(-90,-10,${sh/2})`}>{(panelH/1000).toFixed(2)} m</text>
    </svg>
  );
}

// ─── CUSTOM SLIDER ────────────────────────────────────────────────────────────
function Slider({label, k, min, max, step, value, hint, onChange}) {
  const pct=((value-min)/(max-min)*100).toFixed(0);
  return (
    <div style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
        <span style={{fontSize:10,color:T.ca200,textTransform:"uppercase",letterSpacing:1.2,fontWeight:500}}>{label}</span>
        <span style={{fontSize:11,color:T.cu300,fontFamily:"'DM Mono',monospace",background:T.ca700,padding:"2px 8px",borderRadius:4}}>
          {hint}
        </span>
      </div>
      <div style={{position:"relative",height:20,display:"flex",alignItems:"center"}}>
        <div style={{position:"absolute",left:0,right:0,height:4,background:T.ca500,borderRadius:2}}>
          <div style={{width:`${pct}%`,height:"100%",background:`linear-gradient(90deg,${T.cu600},${T.cu400})`,borderRadius:2}}/>
        </div>
        <input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(k,+e.target.value)}
          style={{position:"absolute",width:"100%",opacity:0,cursor:"pointer",height:20,margin:0}}/>
        <div style={{
          position:"absolute", left:`calc(${pct}% - 8px)`,
          width:16, height:16, borderRadius:"50%",
          background:T.cu400, border:`2px solid ${T.cu300}`,
          boxShadow:`0 0 8px ${T.cu500}80`,
          pointerEvents:"none", transition:"left 0.05s",
        }}/>
      </div>
    </div>
  );
}

// ─── SECTION HEADER ───────────────────────────────────────────────────────────
function SectionHead({icon, title}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
      <span style={{fontSize:13}}>{icon}</span>
      <span style={{fontSize:9,color:T.cu400,textTransform:"uppercase",letterSpacing:2,fontWeight:700}}>{title}</span>
      <div style={{flex:1,height:1,background:`linear-gradient(90deg,${T.cu700},transparent)`}}/>
    </div>
  );
}

// ─── TAB ICONS (refined SVG, replacing emojis) ────────────────────────────────
const TabIcon = ({id, size=14, color="currentColor"}) => {
  const p = {width:size, height:size, viewBox:"0 0 24 24", fill:"none", stroke:color, strokeWidth:1.8, strokeLinecap:"round", strokeLinejoin:"round"};
  if (id==="sizing")     return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/></svg>;
  if (id==="heatmap")    return <svg {...p}><path d="M12 2v6M12 16v6M2 12h6M16 12h6M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24"/><circle cx="12" cy="12" r="3"/></svg>;
  if (id==="energy")     return <svg {...p}><path d="M12 2L4 14h7l-1 8 8-12h-7z"/></svg>;
  if (id==="connectors") return <svg {...p}><circle cx="5" cy="5" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="19" cy="5" r="1.5"/><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/><circle cx="5" cy="19" r="1.5"/><circle cx="12" cy="19" r="1.5"/><circle cx="19" cy="19" r="1.5"/></svg>;
  if (id==="roi")        return <svg {...p}><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>;
  return null;
};

// ─── TABS ─────────────────────────────────────────────────────────────────────
// Each tab has a distinctive icon color (visual semantic cue):
//   Sizing → Blue (measurement/blueprint)
//   Heat Map → Orange (thermal)
//   Energy Savings → Green (money/savings)
//   Connectors → Cyan (product/grid)
//   ROI → Yellow (analytics/value)
const TAB_LIST = [
  {id:"sizing",     label:"Sizing",         color:"#3B82F6"},
  {id:"heatmap",    label:"Heat Map",       color:"#F97316"},
  {id:"energy",     label:"Energy Savings", color:"#2ECC71"},
  {id:"connectors", label:"Connectors",     color:"#06B6D4"},
  {id:"roi",        label:"ROI",            color:"#FACC15"},
];

// ─── CONNECTOR COMPARISON DATA ────────────────────────────────────────────────
// Source: Concrete Industries THiN-Wall Benchmarking (April 2026)
// Reference panel: 36' × 8' × 2" → NU-Tie = 40 connectors (baseline)
const CC_REF_AREA_FT2 = 36 * 8;
const CC_SYSTEMS = [
  {id:"connexframe", label:"ConnexFrame",     refCount:40,  hex:T.cu400,  isCF:true,
   note:"Composite action + lowest λ. AC422 in progress.",
   installMin:0.9, unitCost:4.20},
  {id:"nutie",       label:"NU-Tie",          refCount:40,  hex:"#7AA7C7",
   note:"Baseline reference (Concrete Industries).",
   installMin:1.0, unitCost:4.50},
  {id:"iconx",       label:"IconX",           refCount:82,  hex:"#8A8E96",
   note:"205% of NU-Tie density.",
   installMin:1.0, unitCost:3.80},
  {id:"thermomass",  label:"Thermomass CC",   refCount:204, hex:"#C0392B",
   note:"510% of NU-Tie density. Market leader by certification.",
   installMin:1.1, unitCost:2.10},
  {id:"deltatie",    label:"Delta Tie",       refCount:480, hex:"#4F535A",
   note:"1,200% of NU-Tie density. Grid-based.",
   installMin:0.45, unitCost:1.20},
];

function TabBar({active, onChange}) {
  return (
    <div style={{display:"flex",gap:2,padding:"10px 20px",background:T.ca600,borderBottom:`1px solid ${T.ca400}`}}>
      {TAB_LIST.map(t=>{
        const isActive=active===t.id;
        // Icon color: when active, becomes copper accent (matching button highlight)
        //             when inactive, uses the tab's distinctive color (semantic cue)
        const iconColor = isActive ? T.cu300 : t.color;
        return (
          <button key={t.id} onClick={()=>onChange(t.id)} style={{
            padding:"9px 18px", borderRadius:8, border:"none", cursor:"pointer",
            background:isActive?`linear-gradient(135deg,${T.ca500},${T.ca600})`:"transparent",
            color:isActive?T.cu300:T.ca100,
            fontWeight:isActive?600:500, fontSize:12, letterSpacing:0.3, fontFamily:"'DM Sans',sans-serif",
            boxShadow:isActive?`0 0 0 1px ${T.cu600}, 0 4px 12px ${T.ca800}`:"none",
            transition:"all 0.2s", display:"flex", alignItems:"center", gap:8,
          }}
          onMouseEnter={e=>{
            if(!isActive){
              e.currentTarget.style.background=`${t.color}12`;
              e.currentTarget.style.color="#EDE8E3";
            }
          }}
          onMouseLeave={e=>{
            if(!isActive){
              e.currentTarget.style.background="transparent";
              e.currentTarget.style.color=T.ca100;
            }
          }}>
            <TabIcon id={t.id} size={15} color={iconColor}/> {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: SIZING RESULTS
// ═══════════════════════════════════════════════════════════════════════════════
function SizingTab({R}) {
  return (
    <div>
      <div style={{
        display:"flex",alignItems:"center",gap:10,marginBottom:20,
        background:R.ok?`${T.greenDim}50`:`${T.redDim}50`,
        border:`1px solid ${R.ok?T.greenDim:T.redDim}`,
        borderRadius:10,padding:"10px 18px",
        boxShadow:R.ok?`0 0 16px ${T.greenDim}30`:`0 0 16px ${T.redDim}30`,
      }}>
        <div style={{width:32,height:32,borderRadius:"50%",background:R.ok?`${T.green}20`:`${T.red}20`,border:`1px solid ${R.ok?T.green:T.red}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>
          {R.ok?"✓":"✗"}
        </div>
        <div>
          <div style={{fontSize:13,fontWeight:600,color:R.ok?T.green:T.red}}>
            {R.ok?"ASHRAE 90.1 Compliant":"Below ASHRAE 90.1 Requirement"}
          </div>
          <div style={{fontSize:11,color:T.ca100,marginTop:1}}>
            {R.ok
              ?`Zone ${R.climateZone} requires R-${R.minR} minimum — R-eff ${R.rEff} achieved`
              :`Zone ${R.climateZone} requires R-${R.minR} minimum — R-eff ${R.rEff} insufficient`}
          </div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        <KpiCard label="Connectors" value={R.count} unit="" sub={`${R.cols} cols × ${R.rows} rows`} accent icon="🔩"/>
        <KpiCard label="Spacing" value={R.spIn} unit='"' sub={`${R.spMM} mm o.c.`}/>
        <KpiCard label="Composite Action" value={R.comp} unit="%" sub="ICC-ES AC422 partial" accent/>
        <KpiCard label="Bridge Loss" value={R.rLossPct} unit="%" sub={`R-${R.rEff} effective`} warn={parseFloat(R.rLossPct)>15}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1.2fr",gap:14,marginBottom:14}}>
        <div style={{background:T.ca600,border:`1px solid ${T.ca400}`,borderRadius:12,padding:16}}>
          <SectionHead icon="📍" title="Connector Layout — Plan View"/>
          <div style={{marginBottom:14}}/>
          <PanelSVG panelW={R.panelW} panelH={R.panelH} positions={R.grid} bf={R.bf}/>
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:10,justifyContent:"center"}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:T.cu400,boxShadow:`0 0 6px ${T.cu500}`}}/>
            <span style={{fontSize:10,color:T.ca200}}>ConnexFrame connector position</span>
          </div>
        </div>
        <div style={{background:T.ca600,border:`1px solid ${T.ca400}`,borderRadius:12,padding:16}}>
          <SectionHead icon="📊" title="Effective R-Value vs. Competitors"/>
          <div style={{marginBottom:12}}/>
          <Bar label={`ConnexFrame ${R.variant} (${R.rLossPct}% loss)`} value={parseFloat(R.rEff)} maxVal={parseFloat(R.rN)} color={T.cu400} isCurrent rightLabel={`R-${R.rEff}`}/>
          {R.comps.map(c=><Bar key={c.k} label={`${c.label} (${c.rLossPct}% loss)`} value={c.rEff} maxVal={parseFloat(R.rN)} color={c.hex} rightLabel={`R-${c.rEff.toFixed(1)}`}/>)}
          <div style={{height:1,background:T.ca400,margin:"14px 0"}}/>
          <SectionHead icon="🏗" title="Composite Action"/>
          <div style={{marginBottom:12}}/>
          <Bar label={`ConnexFrame ${R.variant}`} value={parseFloat(R.comp)} maxVal={100} color={T.cu400} isCurrent rightLabel={`${R.comp}%`}/>
          {R.comps.map(c=><Bar key={c.k+"_c"} label={c.label} value={c.comp*100} maxVal={100} color={c.hex} rightLabel={`${(c.comp*100).toFixed(0)}%`}/>)}
          <div style={{marginTop:12,background:T.ca700,borderRadius:8,padding:"10px 12px",fontSize:11,color:T.ca100,lineHeight:1.6,border:`1px solid ${T.cu700}`}}>
            <span style={{color:T.cu300,fontWeight:600}}>ConnexFrame</span> is the only connector delivering high composite action <em>and</em> low thermal bridging simultaneously.
          </div>
        </div>
      </div>

      <div style={{background:T.ca600,border:`1px solid ${T.ca400}`,borderRadius:12,overflow:"hidden"}}>
        <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.ca400}`,display:"flex",alignItems:"center",gap:8}}>
          <SectionHead icon="📋" title="Bill of Materials Summary"/>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead>
            <tr style={{background:T.ca700}}>
              {["Parameter","Value","Reference / Standard"].map(h=>(
                <th key={h} style={{textAlign:"left",padding:"8px 14px",color:T.ca200,fontWeight:500,fontSize:10,textTransform:"uppercase",letterSpacing:1}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ["Panel Dimensions",`${(R.panelW/1000).toFixed(2)} × ${(R.panelH/1000).toFixed(2)} m`,""],
              ["Wythes (Inner / Outer)",`${R.wytheInner} / ${R.wytheOuter} mm`,"Min. 50 mm · ACI 318"],
              ["Insulation",`${R.insulThick}" ${R.insulType}`,`R-${R.rN} nominal · ASTM C518`],
              ["Connector Variant",VARIANTS[R.variant].label,VARIANTS[R.variant].desc],
              ["Connector Count",`${R.count} pcs (${R.cols}×${R.rows})`,`${R.spMM} mm o.c. · ${R.spIn}" o.c.`],
              ["Composite Action",`${R.comp}%`,"ICC-ES AC422 partial composite"],
              ["Effective R-Value",`R-${R.rEff}`,`Zone ${R.climateZone} min: R-${R.minR} · ASHRAE 90.1`],
              ["Thermal Bridge Loss",`${R.rLossPct}% (ΔR = ${R.rLoss})`,"vs. steel connector: ~56% loss"],
            ].map(([p,v,s],i)=>(
              <tr key={i} style={{borderBottom:`1px solid ${T.ca500}`,background:i%2?T.ca700:`${T.ca600}80`}}>
                <td style={{padding:"8px 14px",color:T.ca100}}>{p}</td>
                <td style={{padding:"8px 14px",color:"#EDE8E3",fontFamily:"monospace",fontWeight:500}}>{v}</td>
                <td style={{padding:"8px 14px",color:T.ca200,fontSize:11}}>{s}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: HEAT MAP
// ═══════════════════════════════════════════════════════════════════════════════
function HeatMapTab({R}) {
  const [cmp, setCmp] = useState("steel");
  const vBF=R.bf, cBF=COMPETITORS[cmp].bf, cLabel=COMPETITORS[cmp].label;
  const connBridgePct=((vBF-.08)/(.56-.08)*100).toFixed(0);
  const cmpBridgePct=((cBF-.08)/(.56-.08)*100).toFixed(0);

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18,padding:"12px 16px",background:T.ca600,borderRadius:10,border:`1px solid ${T.ca400}`}}>
        <span style={{fontSize:11,color:T.ca200,fontWeight:500,whiteSpace:"nowrap"}}>Compare against:</span>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {Object.entries(COMPETITORS).map(([k,c])=>(
            <button key={k} onClick={()=>setCmp(k)} style={{
              padding:"5px 14px", borderRadius:6, border:`1px solid ${cmp===k?bfColor(c.bf):T.ca400}`,
              background:cmp===k?`${bfColor(c.bf)}15`:T.ca700,
              color:cmp===k?bfColor(c.bf):T.ca200,
              fontSize:11, fontWeight:cmp===k?600:400, cursor:"pointer",
              transition:"all 0.2s",
            }}>{c.label}</button>
          ))}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        {[
          {label:`ConnexFrame ${R.variant}`,bf:vBF,pct:connBridgePct,isCF:true},
          {label:cLabel,bf:cBF,pct:cmpBridgePct,isCF:false},
        ].map((p,i)=>(
          <div key={i} style={{
            background:p.isCF?`linear-gradient(135deg,${T.ca600},${T.ca700})`:T.ca700,
            border:`1px solid ${p.isCF?T.cu600:T.ca400}`,
            borderRadius:12, padding:16,
            boxShadow:p.isCF?`0 0 20px ${T.cu700}40`:"none",
          }}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:p.isCF?T.cu300:T.ca50}}>{p.label}</div>
                <div style={{fontSize:10,color:T.ca200,marginTop:2}}>Thermal bridge factor: <span style={{color:bfColor(p.bf),fontFamily:"monospace",fontWeight:600}}>{(p.bf*100).toFixed(1)}%</span></div>
              </div>
              <div style={{textAlign:"center",background:T.ca800,borderRadius:8,padding:"6px 12px",border:`1px solid ${bfColor(p.bf)}40`}}>
                <div style={{fontSize:9,color:T.ca200,textTransform:"uppercase",letterSpacing:1}}>Intensity</div>
                <div style={{fontSize:18,fontWeight:700,color:bfColor(p.bf),fontFamily:"monospace"}}>{p.pct}%</div>
              </div>
            </div>
            <PanelSVG panelW={R.panelW} panelH={R.panelH} positions={R.grid} bf={p.bf} showHeat/>
            <div style={{marginTop:12}}>
              <div style={{height:6,borderRadius:3,background:"linear-gradient(90deg,#0EA5E9,#38BDF8,#FACC15,#F97316,#DC2626)",marginBottom:4}}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:T.ca200}}>
                <span>Low bridge loss</span><span>High bridge loss</span>
              </div>
              <div style={{position:"relative",height:10,marginTop:2}}>
                <div style={{
                  position:"absolute",left:`${p.pct}%`,transform:"translateX(-50%)",
                  display:"flex",flexDirection:"column",alignItems:"center",gap:2,
                }}>
                  <div style={{width:2,height:8,background:bfColor(p.bf),borderRadius:1}}/>
                  <div style={{fontSize:8,color:bfColor(p.bf),fontFamily:"monospace",whiteSpace:"nowrap"}}>{(p.bf*100).toFixed(1)}%</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:14}}>
        {[
          {label:"Bridge Factor Advantage",value:`${((cBF-vBF)*100).toFixed(1)} pp`,sub:"percentage points less heat loss at connector"},
          {label:"R-Value Advantage",value:`+${(parseFloat(R.rEff)-(parseFloat(R.rN)*(1-cBF))).toFixed(1)} R`,sub:"effective thermal resistance gained"},
          {label:"Heat Flow Reduction",value:`${((1-(vBF/cBF))*100).toFixed(0)}%`,sub:`less heat flows through ConnexFrame vs ${cLabel.split(" ")[0]}`},
        ].map((m,i)=>(
          <div key={i} style={{background:`linear-gradient(135deg,${T.ca600},${T.ca700})`,border:`1px solid ${T.cu700}`,borderRadius:10,padding:"14px 16px",textAlign:"center"}}>
            <div style={{fontSize:9,color:T.ca200,textTransform:"uppercase",letterSpacing:1.2,marginBottom:8,fontWeight:500}}>{m.label}</div>
            <div style={{fontSize:24,fontWeight:700,color:T.cu300,fontFamily:"monospace"}}>{m.value}</div>
            <div style={{fontSize:10,color:T.ca200,marginTop:6,lineHeight:1.4}}>{m.sub}</div>
          </div>
        ))}
      </div>

      <div style={{background:`${T.ca700}80`,border:`1px solid ${T.cu700}`,borderRadius:8,padding:"10px 14px",fontSize:11,color:T.ca100,lineHeight:1.65}}>
        <span style={{color:T.cu300,fontWeight:600}}>Reading the map: </span>
        Each dot = one ConnexFrame connector. The heat halo visualizes the thermal bridge influence zone where insulation R-value is locally reduced. Cooler colors (blue/teal) = low bridge loss. ConnexFrame's PU+GMB transition zone concentrates and minimizes this zone vs. homogeneous connectors.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: ENERGY SAVINGS
// ═══════════════════════════════════════════════════════════════════════════════
function EnergyTab({R}) {
  const [city, setCity] = useState("chicago");
  const [btype, setBtype] = useState("office");
  const [customArea, setCustomArea] = useState(null);
  const [compareIdx, setCompareIdx] = useState(0);
  const area=customArea||BUILDING_TYPES[btype].area;
  const cd=CITIES[city];
  const cfE=useMemo(()=>calcEnergy(parseFloat(R.rEff),city,btype),[R.rEff,city,btype]);
  const compResults=useMemo(()=>
    R.comps.map(c=>({...c,e:calcEnergy(c.rEff,city,btype),save:calcEnergy(c.rEff,city,btype).total-cfE.total}))
  ,[R.comps,city,btype,cfE]);
  const maxSave=Math.max(...compResults.map(c=>c.save),1);
  const fmt=n=>n>=1000?`$${(n/1000).toFixed(1)}k`:`$${n.toFixed(0)}`;
  const selectedComp = compResults[compareIdx] || compResults[0];

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:18}}>
        {[
          {label:"Project City", elem:(
            <select value={city} onChange={e=>setCity(e.target.value)} style={{width:"100%",background:T.ca600,border:`1px solid ${T.ca400}`,borderRadius:7,color:"#EDE8E3",padding:"9px 12px",fontSize:12,outline:"none"}}>
              {Object.entries(CITIES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
          )},
          {label:"Building Type", elem:(
            <select value={btype} onChange={e=>setBtype(e.target.value)} style={{width:"100%",background:T.ca600,border:`1px solid ${T.ca400}`,borderRadius:7,color:"#EDE8E3",padding:"9px 12px",fontSize:12,outline:"none"}}>
              {Object.entries(BUILDING_TYPES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
          )},
          {label:`Wall Area (ft²) — default: ${BUILDING_TYPES[btype].area.toLocaleString()} ft²`, elem:(
            <input type="number" placeholder={`${BUILDING_TYPES[btype].area}`} value={customArea||""} onChange={e=>setCustomArea(e.target.value?+e.target.value:null)}
              style={{width:"100%",background:T.ca600,border:`1px solid ${T.ca400}`,borderRadius:7,color:"#EDE8E3",padding:"9px 12px",fontSize:12,outline:"none",boxSizing:"border-box"}}/>
          )},
        ].map((f,i)=>(
          <div key={i}>
            <div style={{fontSize:10,color:T.ca200,textTransform:"uppercase",letterSpacing:1,marginBottom:6,fontWeight:500}}>{f.label}</div>
            {f.elem}
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:18}}>
        {[
          {icon:"❄️",label:"Heating Degree Days",val:cd.hdd.toLocaleString(),unit:"HDD/yr"},
          {icon:"☀️",label:"Cooling Degree Days", val:cd.cdd.toLocaleString(),unit:"CDD/yr"},
          {icon:"⚡",label:"Electricity Rate",    val:`$${cd.elec.toFixed(3)}`,unit:"/kWh"},
          {icon:"🔥",label:"Natural Gas Rate",    val:`$${cd.gas.toFixed(2)}`, unit:"/therm"},
        ].map((m,i)=>(
          <div key={i} style={{background:T.ca600,border:`1px solid ${T.ca400}`,borderRadius:10,padding:"12px 14px"}}>
            <div style={{fontSize:20,marginBottom:6}}>{m.icon}</div>
            <div style={{fontSize:9,color:T.ca200,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>{m.label}</div>
            <div style={{fontSize:20,fontWeight:700,color:"#EDE8E3",fontFamily:"monospace"}}>{m.val}</div>
            <div style={{fontSize:10,color:T.ca200,marginTop:2}}>{m.unit}</div>
          </div>
        ))}
      </div>

      <div style={{
        background:`linear-gradient(135deg,${T.ca600} 0%,${T.cu700}30 100%)`,
        border:`2px solid ${T.cu600}`,borderRadius:12,padding:18,marginBottom:16,
        display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,
        boxShadow:`0 0 30px ${T.cu700}40`,
      }}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:10,color:T.cu300,textTransform:"uppercase",letterSpacing:1.5,marginBottom:6,fontWeight:600}}>ConnexFrame {R.variant}</div>
          <div style={{fontSize:11,color:T.ca100,marginBottom:4}}>Annual energy cost thru wall</div>
          <div style={{fontSize:36,fontWeight:700,color:T.cu300,fontFamily:"monospace",lineHeight:1}}>
            <AnimNum value={cfE.total} prefix="$" decimals={0}/>
          </div>
          <div style={{fontSize:11,color:T.ca200,marginTop:6}}>{area.toLocaleString()} ft² wall · {cd.label}</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",borderLeft:`1px solid ${T.ca400}`,borderRight:`1px solid ${T.ca400}`}}>
          <svg width={90} height={90} viewBox="-45 -45 90 90">
            {[{val:cfE.heat,color:"#3B82F6"},{val:cfE.cool,color:"#F97316"}].reduce((acc,seg,i)=>{
              const total=cfE.total, startAngle=i===0?0:(cfE.heat/total)*Math.PI*2;
              const angle=(seg.val/total)*Math.PI*2;
              const r=32;
              const x1=(Math.sin(startAngle)*r).toFixed(2), y1=(-Math.cos(startAngle)*r).toFixed(2);
              const x2=(Math.sin(startAngle+angle)*r).toFixed(2), y2=(-Math.cos(startAngle+angle)*r).toFixed(2);
              const large=angle>Math.PI?1:0;
              acc.push(<path key={i} d={`M0,0 L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`} fill={seg.color} opacity={0.85}/>);
              return acc;
            },[])}
            <circle r={18} fill={T.ca600}/>
            <text textAnchor="middle" y={3} fontSize={9} fill={T.ca100} fontFamily="monospace">R-{R.rEff}</text>
          </svg>
          <div style={{display:"flex",gap:12,marginTop:8,fontSize:11}}>
            <span style={{color:"#3B82F6"}}>❄ Heat {(cfE.heat/cfE.total*100).toFixed(0)}%</span>
            <span style={{color:"#F97316"}}>☀ Cool {(cfE.cool/cfE.total*100).toFixed(0)}%</span>
          </div>
        </div>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:10,color:T.ca200,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>vs {selectedComp?.label||"competitor"}</div>
          <div style={{display:"flex",gap:4,justifyContent:"center",flexWrap:"wrap",marginBottom:8}}>
            {compResults.map((c,i)=>(
              <button key={c.k} onClick={()=>setCompareIdx(i)} style={{
                padding:"3px 8px",borderRadius:10,fontSize:9,letterSpacing:0.3,cursor:"pointer",
                border:`1px solid ${i===compareIdx?T.cu400:T.ca400}`,
                background:i===compareIdx?`${T.cu700}40`:"transparent",
                color:i===compareIdx?T.cu300:T.ca200,
                fontWeight:i===compareIdx?600:400,fontFamily:"'DM Sans',sans-serif",
              }}>{c.label}</button>
            ))}
          </div>
          <div style={{fontSize:11,color:T.ca100,marginBottom:4}}>Annual savings</div>
          <div style={{fontSize:36,fontWeight:700,color:T.green,fontFamily:"monospace",lineHeight:1}}>
            <AnimNum value={selectedComp?.save||0} prefix="$" decimals={0}/>
          </div>
          <div style={{fontSize:11,color:T.ca200,marginTop:6}}>
            30-yr NPV: <span style={{color:T.cu300,fontWeight:600}}>{fmt((selectedComp?.save||0)*30*0.72)}</span>
          </div>
        </div>
      </div>

      <div style={{background:T.ca600,border:`1px solid ${T.ca400}`,borderRadius:12,padding:16,marginBottom:14}}>
        <SectionHead icon="📈" title="Annual Savings vs Each Competitor"/>
        <div style={{marginBottom:14}}/>
        {compResults.map(c=>(
          <div key={c.k} style={{marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
              <div>
                <span style={{fontSize:13,color:"#EDE8E3",fontWeight:500}}>{c.label}</span>
                <span style={{fontSize:10,color:T.ca200,marginLeft:8}}>R-{c.rEff.toFixed(1)} · {c.rLossPct}% bridge</span>
              </div>
              <div style={{textAlign:"right"}}>
                <span style={{fontSize:20,fontWeight:700,color:T.green,fontFamily:"monospace"}}>{fmt(c.save)}</span>
                <span style={{fontSize:10,color:T.ca200,marginLeft:4}}>/year</span>
              </div>
            </div>
            <div style={{background:T.ca700,borderRadius:5,height:10,overflow:"hidden"}}>
              <div style={{
                width:`${(c.save/maxSave*100).toFixed(0)}%`,height:"100%",borderRadius:5,
                background:`linear-gradient(90deg,${T.green},#52C77A)`,
                transition:"width 0.6s cubic-bezier(0.34,1.56,0.64,1)",
                boxShadow:`0 0 8px ${T.green}60`,
              }}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:4,fontSize:10,color:T.ca200}}>
              <span>Their annual cost: <span style={{fontFamily:"monospace"}}>{fmt(c.e.total)}</span></span>
              <span>30-yr NPV: <span style={{color:T.cu300,fontFamily:"monospace",fontWeight:600}}>{fmt(c.save*30*0.72)}</span></span>
            </div>
          </div>
        ))}
      </div>

      <div style={{background:`${T.ca700}80`,border:`1px solid ${T.greenDim}`,borderRadius:8,padding:"10px 14px",fontSize:11,color:T.ca100,lineHeight:1.65}}>
        <span style={{color:T.green,fontWeight:600}}>Methodology: </span>
        Heating = HDD × U × area × 24h ÷ furnace eff. (90%) × gas rate. Cooling = CDD × U × area × 24h ÷ COP (3.5) × elec rate. 30-yr NPV discounted at 6%. Wall area excludes glazing. Results are estimates — engage an energy engineer for project-specific modeling.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: ROI CALCULATOR  ── NEW IN V7
// ═══════════════════════════════════════════════════════════════════════════════
function RoiTab({R}) {
  const [city, setCity]               = useState("chicago");
  const [areaFt2, setAreaFt2]         = useState(10000);
  const [laborRate, setLaborRate]     = useState(65);
  const [horizon, setHorizon]         = useState(30);
  const [discountRate, setDiscount]   = useState(0.06);

  const roi = useMemo(()=>calcROI(R,{city,areaFt2,laborRate,horizon,discountRate}),
    [R,city,areaFt2,laborRate,horizon,discountRate]);

  const fmt   = n => n>=1000 ? `$${(n/1000).toFixed(1)}k` : `$${n.toFixed(0)}`;
  const fmtFull = n => `$${Math.round(n).toLocaleString()}`;

  // Compute max for cumulative chart
  const maxCum = Math.max(...roi.systems.flatMap(s=>s.curve.map(p=>p.cum)));
  const W=560, H=240, PAD={l:60,r:20,t:14,b:32};
  const innerW=W-PAD.l-PAD.r, innerH=H-PAD.t-PAD.b;
  const xScale = y => PAD.l + (y/horizon)*innerW;
  const yScale = c => PAD.t + innerH - (c/maxCum)*innerH;

  // Stacked upfront max
  const maxUpfront = Math.max(...roi.systems.map(s=>s.upfront));

  return (
    <div>
      {/* ── Top: Inputs ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:18}}>
        <div>
          <div style={{fontSize:10,color:T.ca200,textTransform:"uppercase",letterSpacing:1,marginBottom:6,fontWeight:500}}>Project City</div>
          <select value={city} onChange={e=>setCity(e.target.value)} style={{width:"100%",background:T.ca600,border:`1px solid ${T.ca400}`,borderRadius:7,color:"#EDE8E3",padding:"9px 12px",fontSize:12,outline:"none"}}>
            {Object.entries(CITIES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <div style={{fontSize:10,color:T.ca200,textTransform:"uppercase",letterSpacing:1,marginBottom:6,fontWeight:500}}>Wall Area (ft²)</div>
          <input type="number" value={areaFt2} onChange={e=>setAreaFt2(+e.target.value||0)}
            style={{width:"100%",background:T.ca600,border:`1px solid ${T.ca400}`,borderRadius:7,color:"#EDE8E3",padding:"9px 12px",fontSize:12,outline:"none",boxSizing:"border-box"}}/>
        </div>
        <div>
          <div style={{fontSize:10,color:T.ca200,textTransform:"uppercase",letterSpacing:1,marginBottom:6,fontWeight:500}}>Labor Rate ($/hr)</div>
          <input type="number" value={laborRate} onChange={e=>setLaborRate(+e.target.value||0)}
            style={{width:"100%",background:T.ca600,border:`1px solid ${T.ca400}`,borderRadius:7,color:"#EDE8E3",padding:"9px 12px",fontSize:12,outline:"none",boxSizing:"border-box"}}/>
        </div>
        <div>
          <div style={{fontSize:10,color:T.ca200,textTransform:"uppercase",letterSpacing:1,marginBottom:6,fontWeight:500}}>Horizon (years)</div>
          <select value={horizon} onChange={e=>setHorizon(+e.target.value)} style={{width:"100%",background:T.ca600,border:`1px solid ${T.ca400}`,borderRadius:7,color:"#EDE8E3",padding:"9px 12px",fontSize:12,outline:"none"}}>
            {[20,25,30,40,50].map(y=><option key={y} value={y}>{y} yr</option>)}
          </select>
        </div>
        <div>
          <div style={{fontSize:10,color:T.ca200,textTransform:"uppercase",letterSpacing:1,marginBottom:6,fontWeight:500}}>Discount Rate</div>
          <select value={discountRate} onChange={e=>setDiscount(+e.target.value)} style={{width:"100%",background:T.ca600,border:`1px solid ${T.ca400}`,borderRadius:7,color:"#EDE8E3",padding:"9px 12px",fontSize:12,outline:"none"}}>
            {[0.03,0.04,0.05,0.06,0.07,0.08].map(d=><option key={d} value={d}>{(d*100).toFixed(0)}%</option>)}
          </select>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        <KpiCard label="Total Connectors" value={roi.totalConnectors} unit="" sub={`${areaFt2.toLocaleString()} ft² × ${(roi.totalConnectors/areaFt2).toFixed(2)}/ft²`}/>
        <KpiCard label="Upfront vs Thermomass" value={`${roi.upfrontDelta>=0?'+':'−'}${fmt(Math.abs(roi.upfrontDelta))}`} unit="" sub={roi.upfrontDelta<0?"ConnexFrame cheaper upfront":"Thermomass cheaper upfront"} accent={roi.upfrontDelta<0} warn={roi.upfrontDelta>0}/>
        <KpiCard label="Annual Savings vs Thermomass" value={fmt(roi.annualDelta).replace("$","")} unit="" sub={`${horizon}-yr cumulative: ${fmt(roi.annualDelta*horizon)}`} accent/>
        <KpiCard label="Payback Period" value={roi.paybackYears===null?"Day 1":roi.paybackYears.toFixed(1)} unit={roi.paybackYears===null?"":" yr"} sub={roi.paybackYears===null?"ConnexFrame cheaper from year 0":"vs Thermomass benchmark"} accent/>
      </div>

      {/* ── Stacked Upfront Cost ── */}
      <div style={{background:T.ca600,border:`1px solid ${T.ca400}`,borderRadius:12,padding:18,marginBottom:14}}>
        <SectionHead icon="🏗" title="Upfront Cost Decomposition"/>
        <div style={{marginBottom:14}}/>
        {roi.systems.map(s=>{
          const hwPct = (s.hardware/maxUpfront)*100;
          const liPct = (s.license/maxUpfront)*100;
          const laPct = (s.labor/maxUpfront)*100;
          return (
            <div key={s.key} style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:5}}>
                <span style={{fontSize:12,color:s.isCF?T.cu300:"#EDE8E3",fontWeight:s.isCF?700:500}}>{s.label}</span>
                <span style={{fontSize:13,color:s.isCF?T.cu300:"#EDE8E3",fontFamily:"monospace",fontWeight:600}}>{fmtFull(s.upfront)}</span>
              </div>
              <div style={{display:"flex",height:18,background:T.ca700,borderRadius:5,overflow:"hidden",boxShadow:s.isCF?`0 0 10px ${T.cu700}80`:"none"}}>
                <div style={{width:`${hwPct}%`,background:s.isCF?`linear-gradient(90deg,${T.cu500},${T.cu300})`:s.hex,transition:"width 0.6s"}}
                  title={`Hardware: ${fmtFull(s.hardware)}`}/>
                {liPct>0 && <div style={{width:`${liPct}%`,background:T.ca300,transition:"width 0.6s"}} title={`License: ${fmtFull(s.license)}`}/>}
                <div style={{width:`${laPct}%`,background:T.ca200,opacity:0.5,transition:"width 0.6s"}} title={`Labor: ${fmtFull(s.labor)}`}/>
              </div>
              <div style={{display:"flex",gap:14,marginTop:4,fontSize:10,color:T.ca200}}>
                <span>Hardware: <span style={{fontFamily:"monospace",color:T.ca100}}>{fmtFull(s.hardware)}</span></span>
                <span>License: <span style={{fontFamily:"monospace",color:s.license>0?T.red:T.green}}>{s.license>0?fmtFull(s.license):"Free"}</span></span>
                <span>Labor ({(s.totalConnectors*s.installMin/60).toFixed(1)} hr): <span style={{fontFamily:"monospace",color:T.ca100}}>{fmtFull(s.labor)}</span></span>
              </div>
            </div>
          );
        })}
        <div style={{marginTop:8,background:T.ca700,borderRadius:6,padding:"8px 12px",fontSize:11,color:T.ca100,lineHeight:1.55,border:`1px solid ${T.cu700}`}}>
          <span style={{color:T.cu300,fontWeight:600}}>No license fees, no NDA: </span>
          ConnexFrame is open-spec. Hardware + standard labor only — every metric used in this calculation is published.
        </div>
      </div>

      {/* ── Cumulative Cost Curve ── */}
      <div style={{background:T.ca600,border:`1px solid ${T.ca400}`,borderRadius:12,padding:18,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <SectionHead icon="📈" title={`Cumulative Cost Curve · ${horizon}-Year NPV`}/>
        </div>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block"}}>
          {/* Grid lines */}
          {[0,0.25,0.5,0.75,1].map((p,i)=>{
            const y = PAD.t + innerH*(1-p);
            return <g key={i}>
              <line x1={PAD.l} x2={W-PAD.r} y1={y} y2={y} stroke={T.ca400} strokeWidth={0.5} strokeDasharray="3,3"/>
              <text x={PAD.l-6} y={y+3} textAnchor="end" fontSize={9} fill={T.ca200} fontFamily="monospace">{fmt(maxCum*p)}</text>
            </g>;
          })}
          {/* X axis ticks */}
          {[0,horizon/4,horizon/2,horizon*0.75,horizon].map((yr,i)=>(
            <g key={i}>
              <line x1={xScale(yr)} x2={xScale(yr)} y1={PAD.t} y2={H-PAD.b} stroke={T.ca400} strokeWidth={0.3} strokeDasharray="2,4"/>
              <text x={xScale(yr)} y={H-PAD.b+14} textAnchor="middle" fontSize={9} fill={T.ca200} fontFamily="monospace">Yr {Math.round(yr)}</text>
            </g>
          ))}
          {/* Curves */}
          {roi.systems.map(s=>{
            const d = s.curve.map((p,i)=>`${i===0?"M":"L"} ${xScale(p.y).toFixed(1)} ${yScale(p.cum).toFixed(1)}`).join(" ");
            return <g key={s.key}>
              <path d={d} fill="none" stroke={s.hex} strokeWidth={s.isCF?2.5:1.5} opacity={s.isCF?1:0.85}
                style={{filter:s.isCF?`drop-shadow(0 0 4px ${s.hex}80)`:"none"}}/>
              {/* Endpoint dot */}
              <circle cx={xScale(horizon)} cy={yScale(s.lifetimeCost)} r={s.isCF?4:3} fill={s.hex} stroke={T.ca700} strokeWidth={1.5}/>
            </g>;
          })}
          {/* Payback marker */}
          {roi.paybackYears && roi.paybackYears<horizon && (
            <g>
              <line x1={xScale(roi.paybackYears)} x2={xScale(roi.paybackYears)} y1={PAD.t} y2={H-PAD.b}
                stroke={T.green} strokeWidth={1.2} strokeDasharray="4,3"/>
              <rect x={xScale(roi.paybackYears)-30} y={PAD.t-2} width={60} height={16} rx={3} fill={T.greenDim} stroke={T.green} strokeWidth={0.5}/>
              <text x={xScale(roi.paybackYears)} y={PAD.t+9} textAnchor="middle" fontSize={9} fill={T.green} fontWeight={600} fontFamily="monospace">
                Payback {roi.paybackYears.toFixed(1)} yr
              </text>
            </g>
          )}
          {/* Y axis label */}
          <text x={14} y={H/2} textAnchor="middle" fontSize={10} fill={T.ca200} transform={`rotate(-90,14,${H/2})`}>Cumulative cost (USD, NPV)</text>
        </svg>
        {/* Legend */}
        <div style={{display:"flex",flexWrap:"wrap",gap:14,justifyContent:"center",marginTop:8}}>
          {roi.systems.map(s=>(
            <div key={s.key} style={{display:"flex",alignItems:"center",gap:6,fontSize:11}}>
              <div style={{width:14,height:3,background:s.hex,borderRadius:1,boxShadow:s.isCF?`0 0 4px ${s.hex}`:"none"}}/>
              <span style={{color:s.isCF?T.cu300:T.ca100,fontWeight:s.isCF?600:400}}>{s.label}</span>
              <span style={{color:T.ca200,fontFamily:"monospace",fontSize:10}}>· {horizon}yr {fmt(s.lifetimeCost)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 11-Metric Comparison Matrix ── */}
      <div style={{background:T.ca600,border:`1px solid ${T.ca400}`,borderRadius:12,overflow:"hidden",marginBottom:14}}>
        <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.ca400}`}}>
          <SectionHead icon="📊" title="11-Metric Lifetime Comparison Matrix"/>
        </div>
        <div style={{overflowX:"auto",maxWidth:"100%"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:880}}>
          <thead>
            <tr style={{background:T.ca700}}>
              <th style={{textAlign:"left",padding:"10px 14px",color:T.ca200,fontWeight:500,fontSize:10,textTransform:"uppercase",letterSpacing:1,minWidth:160}}>Metric</th>
              {roi.systems.map(s=>(
                <th key={s.key} style={{textAlign:"right",padding:"10px 14px",color:s.isCF?T.cu300:T.ca100,fontWeight:600,fontSize:11,letterSpacing:0.5}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:6}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:s.hex,boxShadow:s.isCF?`0 0 4px ${s.hex}`:"none"}}/>
                    {s.label}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(()=>{
              const rows = [
                {label:"Unit cost (per connector)",     get:s=>fmtFull(s.unitCost),       bestKey:"unitCost",     lower:true},
                {label:"License / project fee",         get:s=>s.license>0?fmtFull(s.license):"Free", bestKey:"license", lower:true},
                {label:"Hardware total",                get:s=>fmtFull(s.hardware),       bestKey:"hardware",     lower:true},
                {label:"Labor cost (install)",          get:s=>fmtFull(s.labor),          bestKey:"labor",        lower:true},
                {label:"Upfront total",                 get:s=>fmtFull(s.upfront),        bestKey:"upfront",      lower:true},
                {label:"Effective R-value",             get:s=>`R-${s.rEffSys.toFixed(1)}`, bestKey:"rEffSys",    lower:false},
                {label:"Composite action",              get:s=>`${(s.compRef*100).toFixed(0)}%`, bestKey:"compRef", lower:false, excludeBest:s=>s.bfRef>0.30},
                {label:"Annual energy cost",            get:s=>fmtFull(s.annualEnergy),   bestKey:"annualEnergy", lower:true},
                {label:"Annual maintenance",            get:s=>s.annualMaint>0?fmtFull(s.annualMaint):"—", bestKey:"annualMaint", lower:true},
                {label:"Service life",                  get:s=>`${s.life} yr`,            bestKey:"life",         lower:false},
                {label:`Lifetime cost (${horizon}-yr NPV)`, get:s=>fmtFull(s.lifetimeCost), bestKey:"lifetimeCost", lower:true, highlight:true},
              ];
              return rows.map((row,i)=>{
                const eligible = row.excludeBest ? roi.systems.filter(s=>!row.excludeBest(s)) : roi.systems;
                const vals = eligible.map(s=>s[row.bestKey]);
                const best = row.lower ? Math.min(...vals) : Math.max(...vals);
                return (
                  <tr key={i} style={{borderBottom:`1px solid ${T.ca500}`,background:i%2?T.ca700:`${T.ca600}80`,...(row.highlight?{background:`${T.cu700}30`}:{})}}>
                    <td style={{padding:"9px 14px",color:row.highlight?T.cu300:T.ca100,fontWeight:row.highlight?600:400}}>{row.label}</td>
                    {roi.systems.map(s=>{
                      const isBest = s[row.bestKey]===best && !(row.excludeBest && row.excludeBest(s));
                      return (
                        <td key={s.key} style={{
                          padding:"9px 14px",textAlign:"right",fontFamily:"monospace",
                          color:isBest ? T.green : (s.isCF ? T.cu300 : "#EDE8E3"),
                          fontWeight:isBest || s.isCF ? 600 : 400,
                          background:isBest ? `${T.greenDim}30` : "transparent",
                        }}>
                          {row.get(s)}
                          {isBest && <span style={{marginLeft:6,fontSize:9}}>✓</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              });
            })()}
          </tbody>
        </table>
        </div>
      </div>

      <div style={{background:`${T.ca700}80`,border:`1px solid ${T.cu700}`,borderRadius:8,padding:"10px 14px",fontSize:11,color:T.ca100,lineHeight:1.65}}>
        <span style={{color:T.cu300,fontWeight:600}}>Methodology: </span>
        Upfront = hardware + license + labor. Annual cost = energy (HDD/CDD × U × area) + maintenance per ft². Lifetime cost discounted at {(discountRate*100).toFixed(0)}% over {horizon} years, with replacement at end of service life (85% reinstall). Green cells = best value in each row. All assumptions published — no NDA, no proprietary curves.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: CONNECTOR COUNT COMPARISON  ── NEW IN V7
// ═══════════════════════════════════════════════════════════════════════════════
function ConnectorsTab({R}) {
  // Convert sidebar panel dimensions (mm) to ft for benchmark scaling
  const panelW_ft = R.panelW / 304.8;
  const panelH_ft = R.panelH / 304.8;
  const panelArea_ft2 = panelW_ft * panelH_ft;
  const scale = panelArea_ft2 / CC_REF_AREA_FT2;

  const [laborRate, setLaborRate]   = useState(45);
  const [previewId, setPreviewId]   = useState("connexframe");

  const rows = useMemo(()=>CC_SYSTEMS.map(s=>{
    const count       = Math.ceil(s.refCount * scale);
    const installMin  = count * s.installMin;
    const installHrs  = installMin / 60;
    const labor       = installHrs * laborRate;
    const material    = count * s.unitCost;
    const total       = labor + material;
    return {...s, count, installMin, installHrs, total, perFt2: total/panelArea_ft2};
  }),[scale, laborRate, panelArea_ft2]);

  const cf = rows.find(r=>r.id==="connexframe");
  const tm = rows.find(r=>r.id==="thermomass");
  const nutie = rows.find(r=>r.id==="nutie");
  const maxCount = Math.max(...rows.map(r=>r.count));
  const savings = tm.total - cf.total;
  const savingsPct = (savings / tm.total) * 100;

  const sorted = [...rows].sort((a,b)=>{
    if (a.id==="connexframe") return -1;
    if (b.id==="connexframe") return 1;
    return a.count - b.count;
  });

  const fmt    = n => `${Math.round(n).toLocaleString()}`;
  const usd    = (n,d=0) => `$${n.toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d})}`;
  const usdK   = n => n>=1000 ? `$${(n/1000).toFixed(1)}k` : `$${n.toFixed(0)}`;

  // Preview SVG layout calculation
  const previewSystem = rows.find(r=>r.id===previewId);
  const aspect = panelW_ft / panelH_ft;
  const stageW = 680, stageH = 240;
  let pw, ph;
  if (aspect > stageW/stageH) { pw = stageW; ph = stageW/aspect; }
  else                         { ph = stageH; pw = stageH*aspect; }
  const px = (720-pw)/2, py = (280-ph)/2;
  const cols = Math.max(1, Math.round(Math.sqrt(previewSystem.count * aspect)));
  const rowsN = Math.ceil(previewSystem.count / cols);
  const dx = pw/(cols+1), dy = ph/(rowsN+1);
  const dotR = Math.max(1.5, Math.min(4, 200/previewSystem.count));
  const dots = [];
  let placed = 0;
  for (let r=1; r<=rowsN && placed<previewSystem.count; r++) {
    for (let c=1; c<=cols && placed<previewSystem.count; c++) {
      dots.push({cx:(px+c*dx).toFixed(1), cy:(py+r*dy).toFixed(1), r:dotR});
      placed++;
    }
  }

  return (
    <div>
      {/* ── Source banner ── */}
      <div style={{
        display:"flex",alignItems:"center",gap:10,marginBottom:18,
        background:`${T.cu700}30`,border:`1px solid ${T.cu700}`,
        borderRadius:10,padding:"10px 16px",
      }}>
        <span style={{fontSize:16}}>📋</span>
        <div style={{flex:1}}>
          <div style={{fontSize:11,color:T.cu300,fontWeight:600,letterSpacing:0.5}}>
            BENCHMARK SOURCE — Concrete Industries THiN-Wall (April 2026)
          </div>
          <div style={{fontSize:10,color:T.ca100,marginTop:2}}>
            Reference panel 36'×8'×2". Density scales linearly with panel area.
            Current panel: {panelW_ft.toFixed(1)}' × {panelH_ft.toFixed(1)}' ({fmt(panelArea_ft2)} ft², scale factor {scale.toFixed(2)}×)
          </div>
        </div>
        <div>
          <div style={{fontSize:9,color:T.ca200,textTransform:"uppercase",letterSpacing:1.2,marginBottom:4,fontWeight:500}}>Labor Rate</div>
          <div style={{display:"flex",alignItems:"center",gap:4,background:T.ca700,border:`1px solid ${T.ca400}`,borderRadius:6,padding:"4px 10px"}}>
            <span style={{color:T.ca200,fontSize:11}}>$</span>
            <input type="number" value={laborRate} onChange={e=>setLaborRate(+e.target.value||0)}
              style={{width:50,background:"transparent",border:"none",color:"#EDE8E3",fontFamily:"'DM Mono',monospace",fontSize:13,fontWeight:600,outline:"none",padding:0}}/>
            <span style={{color:T.ca200,fontSize:11}}>/hr</span>
          </div>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:18}}>
        <KpiCard label="ConnexFrame Connectors" value={cf.count} unit="" sub="Lowest density in class" accent/>
        <KpiCard label="vs Thermomass" value={tm.count-cf.count} unit=" fewer" sub={`${(tm.count/cf.count).toFixed(1)}× less dense`} accent/>
        <KpiCard label="Cost per Panel" value={cf.total} unit="" sub={`${usd(cf.perFt2,2)}/ft²`} accent/>
        <KpiCard label="Savings vs Thermomass" value={savings>0?savingsPct:0} unit="%" sub={savings>0?`${usdK(savings)} per panel`:"—"} accent/>
      </div>

      {/* ── Hero: Preview + Winner ── */}
      <div style={{display:"grid",gridTemplateColumns:"1.1fr 1fr",gap:14,marginBottom:18}}>

        {/* Panel Preview */}
        <div style={{background:T.ca600,border:`1px solid ${T.ca400}`,borderRadius:12,padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <SectionHead icon="🔍" title="Panel Layout Preview"/>
            <div style={{display:"flex",background:T.ca700,borderRadius:6,padding:3,gap:2}}>
              {[
                {id:"connexframe",lbl:"ConnexFrame"},
                {id:"thermomass", lbl:"Thermomass"},
                {id:"deltatie",   lbl:"Delta Tie"},
              ].map(opt=>(
                <button key={opt.id} onClick={()=>setPreviewId(opt.id)} style={{
                  background:previewId===opt.id?`linear-gradient(135deg,${T.cu500},${T.cu400})`:"transparent",
                  color:previewId===opt.id?T.ca800:T.ca200,
                  border:"none",padding:"5px 10px",fontSize:10,fontWeight:600,
                  letterSpacing:0.4,cursor:"pointer",borderRadius:4,
                  transition:"all 0.2s",
                  boxShadow:previewId===opt.id?`0 0 8px ${T.cu500}60`:"none",
                }}>{opt.lbl}</button>
              ))}
            </div>
          </div>

          <div style={{background:T.ca800,borderRadius:8,padding:24,minHeight:280,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg viewBox="0 0 720 280" style={{width:"100%",height:"auto",maxHeight:260}}>
              <defs>
                <filter id="cc-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="1.5" result="blur"/>
                  <feMerge>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <pattern id="cc-concrete" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
                  <rect width="6" height="6" fill={T.ca500}/>
                  <circle cx="2" cy="2" r="0.4" fill={T.ca400}/>
                  <circle cx="4" cy="4" r="0.3" fill={T.ca400}/>
                </pattern>
                <pattern id="cc-insul" x="0" y="0" width="8" height="4" patternUnits="userSpaceOnUse">
                  <rect width="8" height="4" fill="rgba(232,201,154,0.06)"/>
                  <path d="M0 2 L8 2" stroke="rgba(232,201,154,0.14)" strokeWidth="0.3"/>
                </pattern>
              </defs>

              <rect x={px} y={py} width={pw} height={ph}
                fill="url(#cc-concrete)" stroke={T.ca400} strokeWidth="1" rx="2"/>
              <rect x={px+4} y={py+4} width={pw-8} height={ph-8}
                fill="url(#cc-insul)" stroke="rgba(232,201,154,0.18)"
                strokeWidth="0.5" strokeDasharray="2,2"/>

              <text x={px+pw/2} y={py-8} textAnchor="middle" fill={T.ca200} fontSize="10" fontFamily="'DM Mono',monospace">
                {panelW_ft.toFixed(1)}'
              </text>
              <text x={px-8} y={py+ph/2} textAnchor="end" dominantBaseline="middle" fill={T.ca200} fontSize="10" fontFamily="'DM Mono',monospace">
                {panelH_ft.toFixed(1)}'
              </text>

              {dots.map((d,i)=>(
                <circle key={i} cx={d.cx} cy={d.cy} r={d.r}
                  fill={previewSystem.hex}
                  filter={previewId==="connexframe" ? "url(#cc-glow)" : undefined}/>
              ))}

              <g transform={`translate(${px+pw-12}, ${py+ph-12})`}>
                <rect x="-94" y="-22" width="94" height="22" rx="4"
                  fill={previewId==="connexframe" ? T.cu400 : `${T.ca800}E0`}
                  stroke={previewId==="connexframe" ? "transparent" : T.ca400}
                  strokeWidth="0.5"/>
                <text x="-47" y="-7" textAnchor="middle"
                  fill={previewId==="connexframe" ? T.ca800 : "#EDE8E3"}
                  fontSize="11" fontWeight="700" fontFamily="'DM Sans',sans-serif">
                  {fmt(previewSystem.count)} connectors
                </text>
              </g>
            </svg>
          </div>

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:12,fontSize:10,color:T.ca200,flexWrap:"wrap",gap:8}}>
            <span style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{width:10,height:10,borderRadius:"50%",background:previewSystem.hex,boxShadow:previewId==="connexframe"?`0 0 6px ${previewSystem.hex}`:"none"}}/>
              {previewSystem.label} connector
            </span>
            <span style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{width:10,height:10,borderRadius:"50%",background:T.ca400,opacity:0.6}}/>
              Concrete wythe
            </span>
            <span style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{width:10,height:10,borderRadius:"50%",background:T.cu200,opacity:0.4}}/>
              Insulation
            </span>
          </div>
        </div>

        {/* Winner Card */}
        <div style={{
          background:`linear-gradient(135deg,${T.cu700}40 0%,${T.cu700}10 50%,${T.ca600} 100%)`,
          border:`1.5px solid ${T.cu500}`,borderRadius:12,padding:20,
          position:"relative",overflow:"hidden",
          boxShadow:`0 0 30px ${T.cu700}60, inset 0 1px 0 ${T.cu300}30`,
        }}>
          <div style={{position:"absolute",top:0,right:0,width:200,height:200,background:`radial-gradient(circle, ${T.cu500}30, transparent 70%)`,pointerEvents:"none"}}/>

          <div style={{display:"inline-flex",alignItems:"center",gap:6,background:T.cu400,color:T.ca800,padding:"4px 11px",borderRadius:100,fontSize:9,fontWeight:800,letterSpacing:1.2,marginBottom:14}}>
            ★ BEST IN CLASS
          </div>

          <div style={{fontSize:22,fontWeight:800,letterSpacing:0.5,color:"#EDE8E3",marginBottom:3}}>
            ConnexFrame
          </div>
          <div style={{color:T.ca100,fontSize:11,marginBottom:20}}>
            Composite Connector System · Functional Geometric Separation
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18,paddingTop:18,borderTop:`1px solid ${T.cu700}`}}>
            <div>
              <div style={{fontSize:9,color:T.ca200,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600,marginBottom:6}}>Connectors</div>
              <div style={{fontSize:32,fontWeight:700,color:T.cu300,fontFamily:"'DM Mono',monospace",lineHeight:1}}>
                <AnimNum value={cf.count} decimals={0}/>
              </div>
              <div style={{color:T.ca100,fontSize:11,marginTop:5}}>Lowest in class</div>
            </div>
            <div>
              <div style={{fontSize:9,color:T.ca200,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600,marginBottom:6}}>Per Panel</div>
              <div style={{fontSize:32,fontWeight:700,color:T.cu300,fontFamily:"'DM Mono',monospace",lineHeight:1}}>
                <AnimNum value={cf.total} prefix="$" decimals={0}/>
              </div>
              <div style={{color:T.ca100,fontSize:11,marginTop:5}}>{usd(cf.perFt2,2)}/ft²</div>
            </div>
          </div>

          <div style={{marginTop:16,paddingTop:16,borderTop:`1px solid ${T.cu700}`}}>
            <div style={{fontSize:9,color:T.ca200,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600,marginBottom:6}}>
              Savings vs. Thermomass CC
            </div>
            <div style={{display:"flex",alignItems:"baseline",gap:6}}>
              <span style={{color:T.green,fontSize:20,fontWeight:600}}>↓</span>
              <span style={{fontSize:30,fontWeight:700,color:T.green,fontFamily:"'DM Mono',monospace",lineHeight:1}}>
                {savings>0 ? `${savingsPct.toFixed(0)}%` : "—"}
              </span>
              <span style={{color:T.ca100,fontSize:12,marginLeft:8}}>
                · {savings>0 ? usdK(savings) : "—"} per panel
              </span>
            </div>
            <div style={{color:T.ca200,fontSize:10,marginTop:6}}>
              {fmt(tm.count-cf.count)} fewer connectors · {(tm.count/cf.count).toFixed(1)}× less dense
            </div>
          </div>

          <div style={{marginTop:16,display:"inline-flex",alignItems:"center",gap:5,background:`${T.cu700}40`,color:T.cu300,padding:"4px 10px",borderRadius:4,fontSize:9,fontWeight:700,letterSpacing:1,border:`1px solid ${T.cu600}`}}>
            ⚙ AC422 VALIDATION IN PROGRESS · USU PARTNERSHIP
          </div>
        </div>
      </div>

      {/* ── Competitive Landscape Table ── */}
      <div style={{background:T.ca600,border:`1px solid ${T.ca400}`,borderRadius:12,padding:16,marginBottom:14}}>
        <SectionHead icon="📊" title="Competitive Landscape"/>
        <div style={{marginBottom:14}}/>

        {/* Header */}
        <div style={{
          display:"grid",gridTemplateColumns:"2.4fr 1fr 2.5fr 0.9fr 1.3fr",gap:14,
          padding:"0 14px 8px",fontSize:9,letterSpacing:1.2,color:T.ca200,
          fontWeight:600,textTransform:"uppercase",
          borderBottom:`1px solid ${T.ca400}`,
        }}>
          <div>System</div>
          <div style={{textAlign:"right"}}>Connectors</div>
          <div>Density vs. NU-Tie</div>
          <div style={{textAlign:"right"}}>Install</div>
          <div style={{textAlign:"right"}}>Total / Panel</div>
        </div>

        {/* Rows */}
        <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:8}}>
          {sorted.map(r=>{
            const barPct = (r.count / maxCount) * 100;
            const vsBaseline = ((r.count/nutie.count)*100).toFixed(0);
            const deltaVsCF = r.count - cf.count;

            return (
              <div key={r.id} style={{
                display:"grid",gridTemplateColumns:"2.4fr 1fr 2.5fr 0.9fr 1.3fr",gap:14,
                padding:"14px 14px",alignItems:"center",
                background: r.isCF
                  ? `linear-gradient(90deg, ${T.cu700}25 0%, ${T.cu700}08 100%)`
                  : T.ca700,
                border:`1px solid ${r.isCF?T.cu500:T.ca400}`,
                borderRadius:9,
                boxShadow: r.isCF ? `0 0 16px ${T.cu700}30` : "none",
                transition:"all 0.2s",
              }}>
                {/* System */}
                <div style={{display:"flex",alignItems:"center",gap:11}}>
                  <span style={{
                    width:r.isCF?12:10, height:r.isCF?12:10, borderRadius:"50%",
                    background:r.hex, flexShrink:0,
                    boxShadow:r.isCF?`0 0 0 2px ${T.ca700}, 0 0 10px ${r.hex}`:`0 0 0 2px ${T.ca700}`,
                  }}/>
                  <div>
                    <div style={{
                      fontWeight:r.isCF?700:500,
                      fontSize:r.isCF?14:13,
                      color:r.isCF?T.cu300:"#EDE8E3",
                      marginBottom:2,
                    }}>{r.label}</div>
                    <div style={{fontSize:10,color:T.ca200,lineHeight:1.4}}>{r.note}</div>
                  </div>
                </div>

                {/* Count */}
                <div style={{textAlign:"right"}}>
                  <div style={{
                    fontFamily:"'DM Mono',monospace",
                    fontSize:r.isCF?24:20, fontWeight:700,
                    color:r.isCF?T.cu300:"#EDE8E3", lineHeight:1,
                  }}>{fmt(r.count)}</div>
                  <div style={{fontSize:9,color:T.ca200,letterSpacing:1,marginTop:3,textTransform:"uppercase"}}>connectors</div>
                </div>

                {/* Density Bar */}
                <div>
                  <div style={{background:T.ca800,borderRadius:4,height:8,overflow:"hidden",position:"relative"}}>
                    <div style={{
                      position:"absolute",left:0,top:0,bottom:0,
                      width:`${barPct}%`,borderRadius:4,
                      background:r.isCF?`linear-gradient(90deg,${T.cu500},${T.cu300})`:r.hex,
                      boxShadow:r.isCF?`0 0 8px ${T.cu400}80`:"none",
                      transition:"width 0.6s cubic-bezier(0.34,1.56,0.64,1)",
                    }}/>
                    {r.isCF && <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,background:"linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.12) 50%,transparent 100%)",backgroundSize:"200% 100%",animation:"shimmer 2s infinite",pointerEvents:"none"}}/>}
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:5,fontSize:10,color:T.ca200}}>
                    <span>{vsBaseline}% of NU-Tie</span>
                    {r.isCF
                      ? <span style={{color:T.green,fontWeight:600,letterSpacing:0.8}}>★ BENCHMARK</span>
                      : <span style={{color:T.red,fontWeight:500}}>+{fmt(deltaVsCF)} vs CF</span>}
                  </div>
                </div>

                {/* Install */}
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:13,fontWeight:500,color:r.isCF?T.cu300:"#EDE8E3"}}>{r.installHrs.toFixed(1)}h</div>
                  <div style={{fontSize:9,color:T.ca200,marginTop:2}}>{fmt(r.installMin)} min</div>
                </div>

                {/* Cost */}
                <div style={{textAlign:"right"}}>
                  <div style={{
                    fontFamily:"'DM Mono',monospace",
                    fontSize:r.isCF?17:15, fontWeight:700,
                    color:r.isCF?T.cu300:"#EDE8E3",
                  }}>{usd(r.total)}</div>
                  <div style={{fontSize:10,color:T.ca200,marginTop:3}}>{usd(r.perFt2,2)}/ft²</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Cumulative Savings Projection ── */}
      <div style={{background:T.ca600,border:`1px solid ${T.ca400}`,borderRadius:12,padding:16,marginBottom:14}}>
        <SectionHead icon="📈" title="Cumulative Savings vs. Thermomass — Project Scale"/>
        <div style={{marginBottom:14}}/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
          {[
            {lbl:"1 Panel",      n:1},
            {lbl:"100 Panels",   n:100},
            {lbl:"1,000 Panels", n:1000},
            {lbl:"10,000 Panels",n:10000},
          ].map(p=>(
            <div key={p.lbl} style={{
              background:T.ca700,border:`1px solid ${T.ca400}`,borderRadius:9,
              padding:"14px 16px",position:"relative",overflow:"hidden",
            }}>
              <div style={{position:"absolute",top:0,left:0,width:3,height:"100%",
                background:`linear-gradient(180deg,${T.cu400},${T.cu600})`}}/>
              <div style={{fontSize:9,color:T.ca200,textTransform:"uppercase",letterSpacing:1.2,fontWeight:500,marginBottom:6}}>
                {p.lbl}
              </div>
              <div style={{
                fontSize:20,fontWeight:700,fontFamily:"'DM Mono',monospace",lineHeight:1,
                color:savings>0?T.green:T.ca200,
              }}>
                {savings>0 ? usdK(savings*p.n) : "—"}
              </div>
              <div style={{fontSize:9,color:T.ca200,marginTop:4}}>Total savings vs Thermomass</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Methodology ── */}
      <div style={{background:`${T.ca700}80`,border:`1px solid ${T.cu700}`,borderRadius:8,padding:"10px 14px",fontSize:11,color:T.ca100,lineHeight:1.65}}>
        <span style={{color:T.cu300,fontWeight:600}}>Methodology: </span>
        Connector counts for NU-Tie, Thermomass CC, IconX, and Delta Tie are sourced from the
        Concrete Industries THiN-Wall Benchmarking analysis (reference panel 36'×8'×2", April 2026)
        and scaled linearly with current panel area. ConnexFrame count is a working target pending
        AC422 double-shear and AC320 pull-out validation with Utah State University. Unit costs and
        installation rates are user-adjustable inputs and should be calibrated against precaster
        field data before procurement decisions.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// METHODOLOGY MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function MethodologyModal({open, onClose}) {
  useEffect(()=>{
    const onKey=(e)=>{ if(e.key==="Escape") onClose(); };
    if(open) document.addEventListener("keydown",onKey);
    return ()=>document.removeEventListener("keydown",onKey);
  },[open,onClose]);
  if(!open) return null;
  const SECTIONS = [
    {
      title:"Sizing & Layout",
      items:[
        {k:"Connector spacing", v:"sp = 457 mm ÷ ksFactor (variant)"},
        {k:"Connector count",    v:"cols × rows, where each = floor((dim − 150) / sp)"},
        {k:"Nominal R-value",    v:"R_N = insulation_thickness × R/inch (EPS: 3.8 · XPS: 5.0)"},
        {k:"Effective R-value",  v:"R_eff = R_N × (1 − bridgeFactor)"},
        {k:"ASHRAE compliance",  v:"R_eff ≥ R_min(climate_zone) per ASHRAE 90.1-2022 §5.5.5"},
      ],
    },
    {
      title:"Energy Cost (annual)",
      items:[
        {k:"U-factor",         v:"U = 1 / R_eff (Btu / h·ft²·°F)"},
        {k:"Heating cost",     v:"H = (U × area × HDD × 24) / (100,000 × η_furnace) × gas_rate · η=0.90"},
        {k:"Cooling cost",     v:"C = (U × area × CDD × 24) / (3.5 × 3,412) × elec_rate · COP=3.5"},
        {k:"Total annual",     v:"E_annual = H + C"},
      ],
    },
    {
      title:"ROI / NPV (lifecycle)",
      items:[
        {k:"Upfront cost",     v:"U_cost = (connectors × unit_cost) + license_fee + (install_hr × labor_rate)"},
        {k:"Lifetime cost",    v:"L = U_cost + Σ E_annual,y / (1 + r)^y for y in [1, horizon]"},
        {k:"Replacement",      v:"At end of service_life, add U_cost × 0.85 (re-install only) discounted"},
        {k:"Payback period",   v:"PB = ΔUpfront / ΔAnnual (vs Thermomass benchmark)"},
      ],
    },
    {
      title:"Constants & Datasets",
      items:[
        {k:"Climate data",     v:"HDD/CDD per ASHRAE handbook · 12 U.S. cities included"},
        {k:"Rates",            v:"Electricity ($/kWh) and gas ($/therm) per EIA state averages"},
        {k:"Furnace efficiency", v:"η = 0.90 (mid-efficiency gas furnace)"},
        {k:"AC COP",           v:"3.5 (typical commercial split system)"},
        {k:"Discount rate",    v:"User-adjustable 3–8% (default 6%)"},
      ],
    },
    {
      title:"Key References",
      items:[
        {k:"ASHRAE 90.1-2022",         v:"§5.5.5 thermal bridging requirements · effective Mar 2026"},
        {k:"IECC 2024",                v:"§C402.7 envelope provisions"},
        {k:"ICC-ES AC422",             v:"Composite shear connector acceptance criteria"},
        {k:"ASTM C518",                v:"Steady-state thermal transmission (R-value) testing"},
        {k:"ASTM E488",                v:"Anchor pull-out testing"},
        {k:"ACI 318",                  v:"Building code requirements for structural concrete"},
        {k:"Sorensen et al., UNL 2019",v:"Thermal bridging in precast sandwich panels"},
        {k:"ORNL · Kosny 2006",        v:"R-value loss measurements (guarded hot box)"},
        {k:"Concrete Industries (Apr 2026)", v:"THiN-Wall benchmark dataset for connector counts"},
      ],
    },
  ];
  return (
    <div onClick={onClose} style={{
      position:"fixed",inset:0,background:"rgba(5,7,9,0.85)",backdropFilter:"blur(4px)",
      zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:24,
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:T.ca700,border:`1px solid ${T.ca400}`,borderRadius:14,
        maxWidth:880,width:"100%",maxHeight:"90vh",overflowY:"auto",
        boxShadow:`0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px ${T.cu700}`,
      }}>
        <div style={{
          padding:"22px 28px",borderBottom:`1px solid ${T.ca400}`,
          background:`linear-gradient(180deg,${T.ca600},${T.ca700})`,
          display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:1,
        }}>
          <div>
            <div style={{fontSize:9,color:T.cu400,textTransform:"uppercase",letterSpacing:2,fontWeight:700,marginBottom:4}}>Transparency</div>
            <div style={{fontSize:18,fontWeight:700,color:"#EDE8E3",letterSpacing:0.3}}>Methodology &amp; Sources</div>
            <div style={{fontSize:11,color:T.ca200,marginTop:4}}>Every formula, constant, and reference used in this Designer is published. No proprietary curves, no NDA.</div>
          </div>
          <button onClick={onClose} style={{
            background:T.ca800,border:`1px solid ${T.ca400}`,color:T.ca100,
            width:32,height:32,borderRadius:8,cursor:"pointer",fontSize:16,
            display:"flex",alignItems:"center",justifyContent:"center",
          }}>×</button>
        </div>
        <div style={{padding:"22px 28px",display:"flex",flexDirection:"column",gap:22}}>
          {SECTIONS.map((s,i)=>(
            <div key={i}>
              <div style={{fontSize:10,color:T.cu400,textTransform:"uppercase",letterSpacing:1.8,fontWeight:700,marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
                <span style={{width:18,height:1,background:T.cu600}}/>
                {s.title}
              </div>
              <div style={{background:T.ca800,border:`1px solid ${T.ca500}`,borderRadius:8,overflow:"hidden"}}>
                {s.items.map((it,j)=>(
                  <div key={j} style={{
                    display:"grid",gridTemplateColumns:"220px 1fr",gap:12,
                    padding:"10px 14px",fontSize:11.5,lineHeight:1.55,
                    background:j%2?`${T.ca700}40`:"transparent",
                    borderBottom:j<s.items.length-1?`1px solid ${T.ca500}`:"none",
                  }}>
                    <div style={{color:T.ca100,fontWeight:500}}>{it.k}</div>
                    <div style={{color:"#EDE8E3",fontFamily:"'DM Mono',monospace",fontSize:11}}>{it.v}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div style={{
            background:`${T.cu700}25`,border:`1px solid ${T.cu700}`,borderRadius:8,padding:"12px 14px",
            fontSize:11,color:T.ca100,lineHeight:1.6,
          }}>
            <span style={{color:T.cu300,fontWeight:600}}>Engineering review: </span>
            Results are preliminary engineering estimates. Final design requires certified analysis per ACI 318 and ICC-ES AC422 by a licensed Engineer of Record. For project-specific validation, contact <a href="mailto:connexframe@connexframe.com" style={{color:T.cu300,fontWeight:600}}>connexframe@connexframe.com</a>.
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROJECT METADATA BAR
// ═══════════════════════════════════════════════════════════════════════════════
function ProjectMetaBar({meta, setMeta}) {
  const today = new Date().toISOString().slice(0,10);
  const fields = [
    {k:"name",       label:"Project Name", placeholder:"e.g. Warehouse 12 — Phase 2", width:"2fr"},
    {k:"client",     label:"Client",       placeholder:"e.g. Acme Precast Co.",       width:"1.5fr"},
    {k:"jobNumber",  label:"Job #",        placeholder:"e.g. 2026-014",               width:"1fr"},
    {k:"eor",        label:"Engineer of Record", placeholder:"PE Name, License #",    width:"1.5fr"},
    {k:"date",       label:"Date",         placeholder:today, width:"1fr", type:"date"},
  ];
  const cols = fields.map(f=>f.width).join(" ");
  return (
    <div style={{
      background:`linear-gradient(180deg,${T.ca700} 0%,${T.ca800} 100%)`,
      borderBottom:`1px solid ${T.ca400}`,padding:"10px 28px",
      display:"grid",gridTemplateColumns:cols,gap:12,alignItems:"end",
    }}>
      {fields.map(f=>(
        <div key={f.k}>
          <div style={{fontSize:8.5,color:T.ca200,textTransform:"uppercase",letterSpacing:1.3,marginBottom:4,fontWeight:600}}>{f.label}</div>
          <input
            type={f.type||"text"}
            value={meta[f.k]||""}
            placeholder={f.placeholder}
            onChange={e=>setMeta({...meta,[f.k]:e.target.value})}
            style={{
              width:"100%",background:T.ca800,border:`1px solid ${T.ca500}`,
              borderRadius:6,color:"#EDE8E3",padding:"6px 10px",fontSize:11.5,outline:"none",
              fontFamily:"'DM Sans',sans-serif",transition:"border-color 0.15s",
              colorScheme:"dark",
            }}
            onFocus={e=>e.target.style.borderColor=T.cu500}
            onBlur={e=>e.target.style.borderColor=T.ca500}
          />
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BRANDED FOOTER
// ═══════════════════════════════════════════════════════════════════════════════
function BrandFooter() {
  return (
    <div style={{
      background:`linear-gradient(180deg,${T.ca700} 0%,${T.ca800} 100%)`,
      borderTop:`1px solid ${T.ca400}`,padding:"18px 28px",
      display:"grid",gridTemplateColumns:"1.5fr 1fr 1fr 1fr",gap:24,
    }}>
      <div>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <img src={logoConnexframe} alt="ConnexFrame logo" style={{width:26,height:26,objectFit:"contain"}}/>
          <div style={{fontSize:13,fontWeight:800,letterSpacing:1.8}}>
            <span style={{color:"#EDE8E3"}}>CONNEX</span>
            <span style={{color:T.cu300}}>FRAME</span>
          </div>
        </div>
        <div style={{fontSize:10.5,color:T.ca200,lineHeight:1.55}}>
          Composite shear connector system for precast concrete sandwich panels.<br/>
          Engineered for U.S. ASHRAE 90.1-2022 + IECC 2024 compliance.
        </div>
      </div>
      <div>
        <div style={{fontSize:9,color:T.cu400,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,marginBottom:8}}>Company</div>
        <div style={{fontSize:10.5,color:T.ca100,lineHeight:1.7}}>
          PENZ INNOVATIVE ENGINEERING LLC<br/>
          Ocoee, FL · United States<br/>
          R&amp;D: Passo Fundo, RS · Brazil
        </div>
      </div>
      <div>
        <div style={{fontSize:9,color:T.cu400,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,marginBottom:8}}>Intellectual Property</div>
        <div style={{fontSize:10.5,color:T.ca100,lineHeight:1.7}}>
          USPTO Provisional Patent Filed<br/>
          ConnexFrame&trade; (TM planned)<br/>
          ICC-ES AC422 pre-application
        </div>
      </div>
      <div>
        <div style={{fontSize:9,color:T.cu400,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,marginBottom:8}}>Contact</div>
        <div style={{fontSize:10.5,color:T.ca100,lineHeight:1.7}}>
          <a href="mailto:connexframe@connexframe.com" style={{color:T.cu300,textDecoration:"none"}}>connexframe@connexframe.com</a><br/>
          <a href="https://connexframe.com" target="_blank" rel="noreferrer" style={{color:T.cu300,textDecoration:"none"}}>connexframe.com &rarr;</a>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [tab, setTab] = useState("sizing");
  const [inp, setInp] = useState({panelW:3000,panelH:6000,wytheInner:89,wytheOuter:64,insulThick:4,insulType:"EPS",variant:"V1",climateZone:5});
  const set=(k,v)=>setInp(p=>({...p,[k]:v}));
  const R=useMemo(()=>calculate(inp),[inp]);
  const zone=CLIMATE_ZONES[inp.climateZone-1];

  // Project metadata (persisted to localStorage)
  const [meta, setMeta] = useState(()=>{
    try { return JSON.parse(localStorage.getItem("cf_meta")||"{}"); } catch { return {}; }
  });
  useEffect(()=>{
    try { localStorage.setItem("cf_meta", JSON.stringify(meta)); } catch {}
  },[meta]);

  // Methodology modal state
  const [methodOpen, setMethodOpen] = useState(false);

  return (
    <div style={{minHeight:"100vh",background:T.ca800,fontFamily:"'DM Sans','Segoe UI',sans-serif",color:"#EDE8E3",fontSize:13,display:"flex",flexDirection:"column"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box}
        select option{background:${T.ca600}}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:${T.ca800}}::-webkit-scrollbar-thumb{background:${T.cu600};border-radius:3px}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes pulseDot{0%,100%{opacity:1}50%{opacity:0.45}}
        .vcard:hover{border-color:${T.cu500}!important;background:${T.cu700}20!important}
        input[type=date]::-webkit-calendar-picker-indicator{filter:invert(0.7) sepia(1) saturate(2) hue-rotate(-15deg);cursor:pointer}
        .hbtn{transition:all 0.18s}
        .hbtn:hover{background:${T.ca600}!important;border-color:${T.cu500}!important;color:${T.cu300}!important}
        a{transition:color 0.15s}
      `}</style>

      <MethodologyModal open={methodOpen} onClose={()=>setMethodOpen(false)}/>

      {/* ── HEADER ── */}
      <div style={{
        background:`linear-gradient(180deg,${T.ca600} 0%,${T.ca700} 100%)`,
        borderBottom:`1px solid ${T.ca400}`,
        padding:"14px 28px",display:"flex",alignItems:"center",gap:18,
        position:"sticky",top:0,zIndex:100,
        boxShadow:`0 4px 24px ${T.ca800}90`,
      }}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <img src={logoConnexframe} alt="ConnexFrame logo" style={{width:46,height:46,objectFit:"contain",filter:"drop-shadow(0 2px 6px rgba(196,123,58,.4))"}}/>
          <div>
            <div style={{fontSize:20,fontWeight:800,letterSpacing:2.5,lineHeight:1}}>
              <span style={{color:"#EDE8E3"}}>CONNEX</span>
              <span style={{color:T.cu300}}>FRAME</span>
            </div>
            <div style={{fontSize:8,color:T.ca200,letterSpacing:3.5,marginTop:2,fontWeight:500}}>DESIGNER &middot; SIZING + ROI SUITE</div>
          </div>
        </div>

        <div style={{width:1,height:36,background:T.ca400,margin:"0 4px"}}/>

        {/* USPTO patent badge — credibility signal */}
        <div style={{
          display:"flex",alignItems:"center",gap:7,
          background:`${T.cu700}25`,border:`1px solid ${T.cu600}`,
          borderRadius:6,padding:"5px 11px",fontSize:10,
        }}>
          <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={T.cu300} strokeWidth="2">
            <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/>
          </svg>
          <span style={{color:T.cu300,fontWeight:600,letterSpacing:0.5}}>USPTO Provisional Filed</span>
        </div>

        <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
          {/* ASHRAE compliance pill */}
          <div style={{
            display:"flex",alignItems:"center",gap:7,
            background:R.ok?`${T.greenDim}40`:`${T.redDim}40`,
            border:`1px solid ${R.ok?T.greenDim:T.redDim}`,
            borderRadius:6,padding:"5px 11px",fontSize:11,fontWeight:500,
          }}>
            <div style={{width:6,height:6,borderRadius:"50%",background:R.ok?T.green:T.red,boxShadow:`0 0 6px ${R.ok?T.green:T.red}`,animation:"pulseDot 2s infinite"}}/>
            <span style={{color:R.ok?T.green:T.red}}>{R.ok?"ASHRAE 90.1 Compliant":"Below ASHRAE 90.1"}</span>
          </div>

          {/* Methodology trigger */}
          <button className="hbtn" onClick={()=>setMethodOpen(true)} style={{
            background:T.ca700,border:`1px solid ${T.ca400}`,color:T.ca100,
            borderRadius:6,padding:"6px 12px",fontSize:11,fontWeight:500,
            display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontFamily:"inherit",
          }}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            Methodology
          </button>

          {/* Contact CTA */}
          <a href="mailto:connexframe@connexframe.com?subject=ConnexFrame%20Designer%20-%20Engineer%20Inquiry" className="hbtn" style={{
            background:`linear-gradient(135deg,${T.cu500},${T.cu400})`,border:`1px solid ${T.cu400}`,color:T.ca800,
            borderRadius:6,padding:"6px 12px",fontSize:11,fontWeight:700,
            display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontFamily:"inherit",textDecoration:"none",
            boxShadow:`0 2px 10px ${T.cu700}80`,
          }}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            Talk to Engineer
          </a>

          <div style={{fontSize:9,color:T.ca300,background:T.ca800,padding:"4px 9px",borderRadius:6,border:`1px solid ${T.ca400}`,letterSpacing:0.5}}>
            V8 &middot; ICC-ES AC422
          </div>
        </div>
      </div>
      <div style={{height:2,background:`linear-gradient(90deg,${T.cu400},${T.cu600},transparent)`}}/>

      {/* ── PROJECT METADATA BAR ── */}
      <ProjectMetaBar meta={meta} setMeta={setMeta}/>

      <div style={{display:"grid",gridTemplateColumns:"284px 1fr",flex:1,minHeight:"calc(100vh - 200px)"}}>

        {/* ── SIDEBAR ── */}
        <div style={{background:`linear-gradient(180deg,${T.ca600} 0%,${T.ca700} 100%)`,borderRight:`1px solid ${T.ca400}`,overflowY:"auto",padding:20}}>

          <SectionHead icon="📐" title="Panel Geometry"/>
          <div style={{marginBottom:16}}/>
          <Slider label="Panel Width"  k="panelW"    min={600}  max={5000}  step={100} value={inp.panelW}    hint={`${inp.panelW} mm · ${(inp.panelW/304.8).toFixed(1)} ft`}   onChange={set}/>
          <Slider label="Panel Height" k="panelH"    min={1000} max={12000} step={100} value={inp.panelH}    hint={`${inp.panelH} mm · ${(inp.panelH/304.8).toFixed(1)} ft`}   onChange={set}/>
          <Slider label="Inner Wythe"  k="wytheInner" min={50}  max={150}   step={5}   value={inp.wytheInner} hint={`${inp.wytheInner} mm · ${(inp.wytheInner/25.4).toFixed(1)}"`} onChange={set}/>
          <Slider label="Outer Wythe"  k="wytheOuter" min={50}  max={150}   step={5}   value={inp.wytheOuter} hint={`${inp.wytheOuter} mm · ${(inp.wytheOuter/25.4).toFixed(1)}"`} onChange={set}/>

          <div style={{height:1,background:`linear-gradient(90deg,${T.ca400},transparent)`,margin:"18px 0"}}/>
          <SectionHead icon="🧊" title="Insulation"/>
          <div style={{marginBottom:14}}/>

          <div style={{marginBottom:14}}>
            <div style={{fontSize:10,color:T.ca200,textTransform:"uppercase",letterSpacing:1.2,marginBottom:6,fontWeight:500}}>Type</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              {Object.entries(INSULATION).map(([k,v])=>(
                <div key={k} onClick={()=>set("insulType",k)} style={{
                  background:inp.insulType===k?`${T.cu700}60`:T.ca700,
                  border:`1px solid ${inp.insulType===k?T.cu500:T.ca400}`,
                  borderRadius:7,padding:"8px 10px",cursor:"pointer",transition:"all 0.2s",
                  boxShadow:inp.insulType===k?`0 0 10px ${T.cu700}50`:"none",
                }}>
                  <div style={{fontSize:12,fontWeight:600,color:inp.insulType===k?T.cu300:"#EDE8E3"}}>{k}</div>
                  <div style={{fontSize:9,color:T.ca200,marginTop:2}}>R-{v.rPerInch}/in</div>
                </div>
              ))}
            </div>
          </div>
          <Slider label="Thickness" k="insulThick" min={2} max={8} step={0.5} value={inp.insulThick}
            hint={`${inp.insulThick}" · R-${(inp.insulThick*INSULATION[inp.insulType].rPerInch).toFixed(1)} nom.`} onChange={set}/>

          <div style={{height:1,background:`linear-gradient(90deg,${T.ca400},transparent)`,margin:"18px 0"}}/>
          <SectionHead icon="🔩" title="Connector Variant"/>
          <div style={{marginBottom:12}}/>
          {Object.entries(VARIANTS).map(([k,v])=>(
            <div key={k} className="vcard" onClick={()=>set("variant",k)} style={{
              background:inp.variant===k?`linear-gradient(135deg,${T.cu700}60,${T.ca600})`:T.ca700,
              border:`1px solid ${inp.variant===k?T.cu500:T.ca400}`,
              borderRadius:9,padding:"11px 13px",marginBottom:7,cursor:"pointer",transition:"all 0.25s",
              boxShadow:inp.variant===k?`0 0 14px ${T.cu700}60`:"none",
            }}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontWeight:700,fontSize:12,color:inp.variant===k?T.cu300:"#EDE8E3"}}>{v.label}</span>
                <span style={{fontSize:10,color:inp.variant===k?T.cu400:T.ca200,fontFamily:"monospace",background:T.ca800,padding:"2px 6px",borderRadius:4}}>
                  {(v.compositeMin*100).toFixed(0)}–{(v.compositeMax*100).toFixed(0)}%
                </span>
              </div>
              <div style={{fontSize:10,color:T.ca200,marginTop:4}}>{v.desc}</div>
            </div>
          ))}

          <div style={{height:1,background:`linear-gradient(90deg,${T.ca400},transparent)`,margin:"18px 0"}}/>
          <SectionHead icon="🗺" title="ASHRAE Climate Zone"/>
          <div style={{marginBottom:10}}/>
          <select value={inp.climateZone} onChange={e=>set("climateZone",+e.target.value)} style={{width:"100%",background:T.ca700,border:`1px solid ${T.ca400}`,borderRadius:7,color:"#EDE8E3",padding:"9px 12px",fontSize:12,outline:"none"}}>
            {CLIMATE_ZONES.map(z=><option key={z.id} value={z.id}>{z.label} — {z.city}</option>)}
          </select>
          <div style={{marginTop:10,background:`${T.cu700}30`,border:`1px solid ${T.cu700}`,borderRadius:7,padding:"9px 13px",fontSize:11}}>
            <div style={{color:T.ca200,marginBottom:2}}>Min. continuous insulation</div>
            <div style={{color:T.cu300,fontFamily:"monospace",fontSize:15,fontWeight:700}}>R-{zone.minR}</div>
            <div style={{color:T.ca200,fontSize:10,marginTop:2}}>{zone.label} · {zone.city}</div>
          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div style={{display:"flex",flexDirection:"column",background:T.ca800}}>
          <TabBar active={tab} onChange={setTab}/>
          <div style={{padding:22,overflowY:"auto",flex:1}}>
            {tab==="sizing"     && <SizingTab R={R}/>}
            {tab==="heatmap"    && <HeatMapTab R={R}/>}
            {tab==="energy"     && <EnergyTab R={R}/>}
            {tab==="connectors" && <ConnectorsTab R={R}/>}
            {tab==="roi"        && <RoiTab R={R}/>}
          </div>
          <div style={{padding:"10px 20px",background:T.ca700,borderTop:`1px solid ${T.ca400}`,fontSize:10,color:T.ca300,textAlign:"center",lineHeight:1.5}}>
            <span style={{color:T.cu400,fontWeight:600}}>DISCLAIMER &middot; </span>
            Preliminary engineering estimates only. Final design requires certified analysis per ACI 318 and ICC-ES AC422 by a licensed Engineer of Record. <button onClick={()=>setMethodOpen(true)} style={{background:"none",border:"none",color:T.cu300,fontFamily:"inherit",fontSize:"inherit",cursor:"pointer",textDecoration:"underline",padding:0}}>View methodology &amp; sources &rarr;</button>
          </div>
        </div>
      </div>

      {/* ── BRANDED FOOTER ── */}
      <BrandFooter/>
    </div>
  );
}
