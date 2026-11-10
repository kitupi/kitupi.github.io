import {prepararSelectores,cargarSelectores,datosSeleccionados,mostrarSeleccion} from './selectores-comercios.js?v=80';
import {initializeApp} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged,browserSessionPersistence,setPersistence} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import {getFunctions,httpsCallable} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-functions.js';
// Configuración pública del proyecto; la autorización real se verifica en cada callable.
const app=initializeApp({apiKey:'AIzaSyCmyeFnhf-1nH8BWOh9zWSMq-0M5i2247o',authDomain:'abc5-93cb8.firebaseapp.com',projectId:'abc5-93cb8'});
const auth=getAuth(app),call= httpsCallable(getFunctions(app,'southamerica-east1'),'administrarComercios');
const $=id=>document.getElementById(id),fecha=v=>v?new Date(v).toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires'}):'—';
let lista=[],cursor=null,actual=null,ocupado=false,epoch=0,pestana='pendientes';
prepararSelectores();
function mensaje(t){$('estado').textContent=t;}
function mensajeAlta(texto) {
  const estado = $('estadoCrear');
  estado.textContent = texto;
  estado.hidden = !texto;
}
async function ejecutar(fn, informarError = mensaje) {
  if (ocupado) return;
  ocupado = true;
  document.querySelectorAll('button').forEach(b => b.disabled = true);
  try {
    await fn();
  } catch (e) {
    informarError(e.message || 'No se pudo completar la operación');
  } finally {
    ocupado = false;
    document.querySelectorAll('button').forEach(b => b.disabled = false);
  }
}
async function api(d){return (await call(d)).data;}
function datos(form){const d=Object.fromEntries(new FormData(form));if(d.domicilios)d.domicilios=d.domicilios.split('\n').map(s=>s.trim()).filter(Boolean);return {...d,...datosSeleccionados(form)};}
async function copiar(texto){try{await navigator.clipboard.writeText(texto);mensaje('Copiado');}catch{window.prompt('Copiá este texto:',texto);}}
function correo(email,subject='',body=''){return 'mailto:'+encodeURIComponent(email)+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);}
function contacto(nombre,email,contenedor){const row=document.createElement('div');row.className='card';const p=document.createElement('p');p.textContent=nombre+' · '+email;row.append(p);const a=document.createElement('a');a.href=correo(email);a.textContent='Escribir correo';row.append(a);const b=document.createElement('button');b.className='muted';b.textContent='Copiar email';b.onclick=()=>copiar(email);row.append(' ',b);contenedor.append(row);}
const mesLocal = new Intl.DateTimeFormat('en-CA', {
  year:'numeric', month:'2-digit', timeZone:'America/Argentina/Buenos_Aires'
});
function mesActual() {
  const partes = Object.fromEntries(mesLocal.formatToParts().map(p => [p.type, p.value]));
  return partes.year + '-' + partes.month;
}
function estadoComercio(c) {
  const ahora = Date.now();
  if (!c.activadoEn) return 'Pendiente';
  if (c.pagoHasta > ahora) return 'Activo';
  if ((c.pruebaHasta ?? (c.pruebaUsada ? c.hasta : 0)) > ahora) return 'Prueba';
  return 'Sin renovar';
}
function resumenComercio(c) {
  const estado = estadoComercio(c);
  const vence = estado === 'Activo' ? c.pagoHasta : c.pruebaHasta || c.hasta;
  return estado + (c.suspendido ? ' · Suspendido' : '') +
    (vence ? ' · Vencimiento: ' + fecha(vence) : '');
}
function datosRegistrado(c) {
  const admin = c.miembros?.[c.principal]?.email || '—';
  const seguidores = c.seguimientosMes?.mes === mesActual() ? c.seguimientosMes.cantidad : 0;
  return 'Administrador: ' + admin + ' · Activación: ' + fecha(c.activadoEn) +
    ' · Última actividad: ' + fecha(c.ultimaActividadEn || c.activadoEn) +
    ' · Nuevos seguimientos del mes: ' + seguidores;
}
function pintar() {
  const pendientes = pestana === 'pendientes';
  $('tabPendientes').setAttribute('aria-pressed', String(pendientes));
  $('tabRegistrados').setAttribute('aria-pressed', String(!pendientes));
  const filtro = $('filtro').value.trim().toLocaleLowerCase('es-AR');
  const comercios = lista.filter(c => Boolean(c.activadoEn) !== pendientes &&
    [c.nombre, c.cuit, c.localidad].join(' ').toLocaleLowerCase('es-AR').includes(filtro));
  comercios.sort($('orden').value === 'fecha'
    ? (a,b) => (b.activadoEn || b.creadoEn) - (a.activadoEn || a.creadoEn)
    : (a,b) => a.nombre.localeCompare(b.nombre, 'es-AR'));
  $('lista').replaceChildren();
  for (const c of comercios) {
    const fila = document.createElement('div');
    fila.className = 'card';
    const titulo = document.createElement('strong');
    titulo.textContent = c.nombre + ' · CUIT ' + c.cuit;
    const resumen = document.createElement('p');
    resumen.textContent = resumenComercio(c);
    fila.append(titulo, resumen);
    if (!pendientes) {
      const datos = document.createElement('p');
      datos.textContent = datosRegistrado(c);
      fila.append(datos);
    }
    const boton = document.createElement('button');
    boton.textContent = 'Ver comercio';
    boton.onclick = () => ejecutar(() => abrir(c.cuit));
    fila.append(boton);
    $('lista').append(fila);
  }
  if (!comercios.length) $('lista').textContent = 'No hay comercios cargados que coincidan.';
  $('mas').hidden = !cursor;
}
async function cargar(mas=false){const version=epoch,r=await api({accion:'listar',cursor:mas?cursor:null});if(version!==epoch)return;lista=mas?[...lista,...r.comercios]:r.comercios;cursor=r.cursor;pintar();}
async function abrir(id) {
  const version = epoch, r = await api({accion:'detalle', comercioId:id});
  if (version !== epoch) return;
  actual = r.comercio;
  $('detalle').hidden = false;
  $('nombreDetalle').textContent = actual.nombre;
  $('resumen').textContent = 'CUIT ' + actual.cuit + ' · ' + resumenComercio(actual) +
    (actual.activadoEn ? ' · ' + datosRegistrado(actual) : '');
  $('equipo').replaceChildren();
  if (actual.emailSolicitud) contacto('Solicitante anterior', actual.emailSolicitud, $('equipo'));
  for (const [uid,m] of Object.entries(actual.miembros))
    contacto((uid === actual.principal ? 'Principal: ' : 'Colaborador: ') + m.nombre, m.email, $('equipo'));
  for (const k of ['nombre','titular','rubro','localidad','domicilios'])
    $('editar').elements[k].value = Array.isArray(actual[k]) ? actual[k].join('\n') : actual[k];
  mostrarSeleccion($('editar'), actual);
  $('historial').replaceChildren();
  for (const h of r.historial) {
    const p = document.createElement('p');
    p.textContent = fecha(h.fecha) + ' · ' + h.accion + ' · ' + h.uid + (h.detalle?.motivo ? ' · ' + h.detalle.motivo : '');
    $('historial').append(p);
  }
  const codigo = actual.activacionInicial;
  $('pendientes').textContent = codigo
    ? 'Generado: ' + fecha(codigo.creadoEn) + ' · Vence: ' + fecha(codigo.venceEn) +
      (codigo.venceEn <= Date.now() ? ' · Vencido' : '')
    : 'No hay código de activación inicial.';
  $('emitir').hidden = Boolean(actual.activadoEn);
  $('anular').hidden = Boolean(actual.activadoEn) || !codigo;
  $('pagos').replaceChildren();
  if (!r.pagos.length) $('pagos').textContent = 'Sin pagos comerciales registrados.';
  for (const pago of r.pagos) {
    const p = document.createElement('p');
    p.textContent = fecha(pago.fecha) + ' · ' + (pago.estado || '') + ' · ' + (pago.monto ?? '');
    $('pagos').append(p);
  }
}
function mostrarCodigo(r) {
  $('codigo').textContent = r.codigo;
  $('venceCodigo').textContent = 'Vence: ' + fecha(r.venceEn);
  $('codigoSalida').showModal();
}
$('entrar').onclick=()=>ejecutar(async()=>{await setPersistence(auth,browserSessionPersistence);await signInWithPopup(auth,new GoogleAuthProvider());});
$('salir').onclick=()=>ejecutar(()=>signOut(auth));
onAuthStateChanged(auth,async u=>{const version=++epoch;lista=[];actual=null;cursor=null;$('panel').hidden=true;$('detalle').hidden=true;$('lista').replaceChildren();$('equipo').replaceChildren();$('historial').replaceChildren();$('pagos').replaceChildren();$('crear').reset();mensajeAlta('');$('editar').reset();$('codigoSalida').close();$('codigo').textContent='';$('acceso').hidden=!!u;$('salir').hidden=!u;if(!u)return;try{const t=await u.getIdTokenResult(true);if(version!==epoch)return;if(t.claims.operadorComercios!==true){mensaje('Esta cuenta no tiene permiso de operador. Cerrá sesión para usar otra.');return;}await cargarSelectores(app);if(version!==epoch)return;$('panel').hidden=false;await cargar();mensaje('Sesión autorizada.');}catch(e){mensaje(e.message);}});
$('tabPendientes').onclick=()=>{pestana='pendientes';pintar();};
$('tabRegistrados').onclick=()=>{pestana='registrados';pintar();};
$('orden').onchange=pintar;
$('filtro').oninput=pintar;$('recargar').onclick=()=>ejecutar(()=>cargar());$('mas').onclick=()=>ejecutar(()=>cargar(true));
$('crear').onsubmit = e => {
  e.preventDefault();
  const form = e.currentTarget;
  mensajeAlta('');
  ejecutar(async () => {
    const d = datos(form);
    d.cuit = d.cuit.replace(/[-\s]/g, '');
    if (!/^[0-9]{11}$/.test(d.cuit)) {
      mensajeAlta('El CUIT debe tener 11 dígitos. Revisalo con la constancia de ARCA.');
      form.elements.cuit.focus();
      return;
    }
    if (!confirm('¿Guardar «' + d.nombre + '» (CUIT ' + d.cuit + ') y generar su código de activación?')) return;
    mensajeAlta('Generando el código…');
    const r = await api({accion:'crearConCodigo', ...d});
    form.reset();
    pestana = 'pendientes';
    mostrarCodigo(r);
    mensajeAlta('El comercio quedó pendiente de activación.');
    try {
      await cargar();
      await abrir(r.comercioId);
    } catch (e) {
      mensaje('El comercio se guardó. Pulsá Actualizar para volver a cargar la lista.');
    }
  }, mensajeAlta);
};
$('editar').onsubmit=e=>{e.preventDefault();ejecutar(async()=>{const d=datos(e.target);await api({accion:'datos',comercioId:actual.cuit,cuit:actual.cuit,...d});await abrir(actual.cuit);await cargar();mensaje('Datos protegidos actualizados.');});};
$('emitir').onclick = () => {
  if (!actual || !confirm('¿Generar un nuevo código para «' + actual.nombre + '» (CUIT ' + actual.cuit + ')? Se invalidará el anterior.')) return;
  const comercioId = actual.cuit;
  ejecutar(async () => {
    mostrarCodigo(await api({accion:'renovarCodigoInicial', comercioId}));
    await abrir(comercioId);
  });
};
$('copiarCodigo').onclick = () => copiar($('codigo').textContent);
$('cerrarCodigo').onclick = () => $('codigoSalida').close();
$('codigoSalida').addEventListener('close', () => { $('codigo').textContent = ''; });
$('anular').onclick = () => {
  if (!actual) return;
  const motivo = prompt('Motivo de la anulación');
  if (!motivo) return;
  const comercioId = actual.cuit;
  ejecutar(async () => {
    await api({accion:'anularCodigoInicial', comercioId, motivo});
    await abrir(comercioId);
    mensaje('Código anulado.');
  });
};
$('suspender').onclick=()=>{if(!actual)return;const motivo=prompt(actual.suspendido?'Motivo para levantar la suspensión':'Motivo de suspensión');if(!motivo)return;ejecutar(async()=>{await api({accion:'suspender',comercioId:actual.cuit,suspendido:!actual.suspendido,motivo});await abrir(actual.cuit);});};

