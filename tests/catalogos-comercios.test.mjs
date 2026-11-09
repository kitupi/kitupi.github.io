import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {crearIndice,sugerir,resolver} from '../catalogos-comercios.mjs';
const datos=JSON.parse(await readFile(new URL('../localidades_v2.json',import.meta.url),'utf8'));
const index=crearIndice(datos.localidades);
test('identidades y etiquetas inequívocas',()=>{assert.equal(index.length,13504);assert.equal(new Set(index.map(l=>l.etiqueta)).size,index.length);});
test('búsqueda sin distinción de tildes y límite de resultados',()=>{assert.ok(sugerir(index,'Palpalá').some(l=>l.id==='ar-9-100005-palpala'));assert.ok(sugerir(index,'san').length<=20);assert.equal(sugerir(index,'').length,0);});
test('no resolver texto libre por nombre',()=>{assert.equal(resolver(index,'Palpalá'),null);const l=sugerir(index,'palpala')[0];assert.equal(resolver(index,l.etiqueta).id,l.id);});
