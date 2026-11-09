export const normalizar=s=>String(s??'').normalize('NFD').replace(/\p{M}/gu,'').trim().toLowerCase();
export function crearIndice(localidades){
 const etiquetas=new Map();
 for(const l of localidades){const e=`${l.nombre}, ${l.departamento}, ${l.provincia}`;etiquetas.set(e,(etiquetas.get(e)||0)+1);}
 return localidades.map(l=>{const e=`${l.nombre}, ${l.departamento}, ${l.provincia}`;return {...l,etiqueta:etiquetas.get(e)>1?`${e} [${l.id}]`:e,busqueda:normalizar(e),prefijo:normalizar(l.nombre)};});
}
export function sugerir(indice,consulta){const q=normalizar(consulta);if(!q)return [];return indice.filter(l=>l.busqueda.includes(q)).sort((a,b)=>Number(!a.prefijo.startsWith(q))-Number(!b.prefijo.startsWith(q))||a.etiqueta.localeCompare(b.etiqueta,'es')).slice(0,20);}
export function resolver(indice,etiqueta){return indice.find(l=>l.etiqueta===etiqueta)||null;}
