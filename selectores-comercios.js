import {getFirestore,collection,getDocs} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
import {crearIndice,sugerir,resolver,normalizar} from './catalogos-comercios.mjs?v=80';
let indice=[],rubros=[],carga=null;
const controles=[];
export function prepararSelectores(){
 for(const id of ['crear','editar']){
  const form=document.getElementById(id),localidad=form.elements.localidad,rubro=form.elements.rubro;
  for(const [nombre,input] of [['localidad',localidad],['rubro',rubro]]){
   const lista=document.createElement('datalist');lista.id=`${id}-${nombre}-opciones`;input.setAttribute('list',lista.id);input.after(lista);
   const actualizar=()=>{input.setCustomValidity('');const opciones=nombre==='localidad'?sugerir(indice,input.value).map(l=>l.etiqueta):rubros.filter(r=>normalizar(r).includes(normalizar(input.value)));lista.replaceChildren(...opciones.map(v=>{const o=document.createElement('option');o.value=v;return o;}));};
   input.addEventListener('input',actualizar);input.addEventListener('focus',actualizar);
   input.addEventListener('change',()=>{const ok=nombre==='localidad'?resolver(indice,input.value):rubros.includes(input.value);input.setCustomValidity(ok?'':`Elegí ${nombre==='localidad'?'una localidad':'un rubro'} de las sugerencias`);});
   controles.push({input,actualizar});
  }
 }
}
export async function cargarSelectores(app){
 if(carga)return carga;
 carga=(async()=>{const [respuesta,categorias]=await Promise.all([fetch('./localidades_v2.json?v=80'),getDocs(collection(getFirestore(app),'Rubros'))]);if(!respuesta.ok)throw Error('No se pudo cargar el catálogo de localidades. Recargá la página.');const archivo=await respuesta.json();if(archivo.version!==1 || !Array.isArray(archivo.localidades) || !archivo.localidades.length)throw Error('Catálogo de localidades inválido');indice=crearIndice(archivo.localidades);rubros=categorias.docs.map(d=>d.id).sort((a,b)=>a.localeCompare(b,'es'));if(!rubros.length)throw Error('No hay rubros disponibles en Firestore');for(const c of controles)c.actualizar();})();
 try{await carga;}catch(e){carga=null;throw e;}
}
export function datosSeleccionados(form){
 const l=resolver(indice,form.elements.localidad.value),r=form.elements.rubro.value;
 if(!l){form.elements.localidad.setCustomValidity('Elegí una localidad de las sugerencias');form.elements.localidad.reportValidity();throw Error('Seleccioná una localidad válida');}
 if(!rubros.includes(r)){form.elements.rubro.setCustomValidity('Elegí un rubro de las sugerencias');form.elements.rubro.reportValidity();throw Error('Seleccioná un rubro válido');}
 return {localidadId:l.id,localidad:l.nombre,rubro:r};
}
export function mostrarSeleccion(form,comercio){
 const l=indice.find(l=>l.id===comercio.localidadId);
 form.elements.localidad.value=l?l.etiqueta:comercio.localidad||'';
 form.elements.rubro.value=comercio.rubro||'';
 // Registros anteriores sin ID requieren elegir la localidad; no inferir por un nombre ambiguo.
 for(const campo of ['localidad','rubro'])form.elements[campo].setCustomValidity('');
}
