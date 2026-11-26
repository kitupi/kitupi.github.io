const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../comercios-precio.js'),'utf8').replace(/^import .*;\n/gm,'');
test('precio solo de montocom confirmado; cambia sin precio alternativo y maneja errores',()=>{
 const salida={textContent:'Precio mensual temporalmente no disponible.'};let recibir,fallar;
 vm.runInNewContext(source,{initializeApp:x=>x,getFirestore:x=>x,doc:(db,...p)=>{assert.deepEqual(p,['Control','tarifa']);return p;},onSnapshot:(ref,opts,ok,error)=>{recibir=ok;fallar=error;},document:{getElementById:id=>{assert.equal(id,'precioMensual');return salida;}},Intl});
 const leer=(montocom,fromCache=false)=>recibir({data:()=>({montocom}),metadata:{fromCache}});
 leer(30000);assert.match(salida.textContent,/30\.000/);
 leer(41000);assert.match(salida.textContent,/41\.000/);
 for(const valor of [null,undefined,0,-1,'30000',1.5,100000001]){leer(valor);assert.match(salida.textContent,/no disponible/);}
 leer(30000,true);assert.match(salida.textContent,/no disponible/);
 leer(5000);fallar(Error());assert.match(salida.textContent,/no disponible/);
});
