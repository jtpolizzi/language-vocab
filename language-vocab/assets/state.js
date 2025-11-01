export const LS = {
  get(k, d){ try{ return JSON.parse(localStorage.getItem(k)) ?? d }catch{return d} },
  set(k, v){ localStorage.setItem(k, JSON.stringify(v)) }
};

const subs = new Set();
export const State = {
  words: [],
  filters: LS.get('v23:filters', { starred:false, weight:[0,1,2,3,4] }),
  sort:    LS.get('v23:sort',    { key:'spanish', dir:'asc' }),
  columns: LS.get('v23:columns', { star:true, weight:true, spanish:true, english:true, pos:true, cefr:true, tags:true }),
  order:   LS.get('v23:order',   []),
  set(key, val){
    this[key] = val;
    if(['filters','sort','columns','order','words'].includes(key)) LS.set('v23:'+key, val);
    subs.forEach(fn=>fn());
  }
};
export function subscribe(fn){ subs.add(fn); return ()=>subs.delete(fn) }

export const Prog = {
  star(id){ return LS.get('v23:star:'+id, false) },
  setStar(id,v){ LS.set('v23:star:'+id, !!v); subs.forEach(fn=>fn()) },
  weight(id){ const v=LS.get('v23:wt:'+id,0); return (v>=0&&v<=4)?v:0 },
  setWeight(id,v){ LS.set('v23:wt:'+id, Math.max(0,Math.min(4, v|0))); subs.forEach(fn=>fn()) },
};

export function stableId(es,en){
  const s = (es||'')+'|'+(en||'');
  let h=2166136261>>>0; for(let i=0;i<s.length;i++){h^=s.charCodeAt(i); h=Math.imul(h,16777619)}
  return 'w_'+(h>>>0).toString(16);
}

export function mapRaw(raw){
  return raw.map(w=>({
    id: stableId(w.Spanish||w.es||w.word, w.English||w.en||w.gloss),
    es: (w.Spanish||w.es||w.word||'').trim(),
    en: (w.English||w.en||w.gloss||'').trim(),
    pos: (w.POS||w.pos||'').trim(),
    cefr: (w.CEFR||w.cefr||'').trim(),
    tags: (w.Tags||w.tags||'').trim()
  }));
}

export function applyFilters(list){
  let out = [...list];
  if(State.filters.starred) out = out.filter(w=>Prog.star(w.id));
  const set = new Set(State.filters.weight);
  out = out.filter(w=> set.has(Prog.weight(w.id)) );
  return out;
}

export function sortWords(list){
  const {key,dir} = State.sort; const m = dir==='asc'?1:-1;
  const get = (w)=>{
    if(key==='star') return Prog.star(w.id)?1:0;
    if(key==='weight') return Prog.weight(w.id);
    if(key==='spanish') return w.es.toLowerCase();
    if(key==='english') return w.en.toLowerCase();
    return (w[key]||'').toLowerCase();
  };
  return [...list].sort((a,b)=> get(a)>get(b)? m : get(a)<get(b)? -m : 0);
}

export function shuffledIds(list){
  const ids = list.map(w=>w.id);
  for(let i=ids.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [ids[i],ids[j]]=[ids[j],ids[i]]; }
  return ids;
}
