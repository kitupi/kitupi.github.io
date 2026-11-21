import {
  prepararSelectores,
  cargarSelectores,
  datosSeleccionados,
  mostrarSeleccion,
} from "./selectores-comercios.js?v=80";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  browserSessionPersistence,
  setPersistence,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
  getFunctions,
  httpsCallable,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-functions.js";
// Configuración pública del proyecto; la autorización real se verifica en cada callable.
const app = initializeApp({
  apiKey: "AIzaSyCmyeFnhf-1nH8BWOh9zWSMq-0M5i2247o",
  authDomain: "abc5-93cb8.firebaseapp.com",
  projectId: "abc5-93cb8",
});
const auth = getAuth(app),
  call = httpsCallable(
    getFunctions(app, "southamerica-east1"),
    "administrarComercios",
  );
import {
  estadoComercio,
  etiquetas,
  fecha,
  cantidad,
  ubicacion,
  ordenar,
} from "./panel-comercios-vista.js?v=102";

const $ = (id) => document.getElementById(id);
let lista = [],
  actual = null,
  seleccionado = null,
  ocupado = false,
  epoch = 0;
let pestana = "habilitacion",
  columna = "nombre",
  sentido = 1,
  desfase = 0,
  completa = false;
let solicitudTemporal = null;
const ahora = () => Date.now() + desfase;
prepararSelectores();

function mensaje(texto) {
  $("estado").textContent = texto;
}
function mensajeAlta(texto) {
  $("estadoCrear").textContent = texto;
  $("estadoCrear").hidden = !texto;
}
function falloAccion(texto) {
  $("mensajeAccion").textContent = texto;
}
async function api(datos) {
  const version = epoch;
  const respuesta = await call(datos);
  if (version !== epoch)
    throw new Error("La sesión cambió durante la operación");
  return respuesta.data;
}
async function ejecutar(fn, informarError = mensaje) {
  if (ocupado) return;
  const version = epoch;
  ocupado = true;
  const estados = new Map(
    [...document.querySelectorAll("button")].map((b) => [b, b.disabled]),
  );
  estados.forEach((_, boton) => {
    boton.disabled = true;
  });
  try {
    await fn();
  } catch (error) {
    if (version === epoch)
      informarError(error.message || "No se pudo completar la operación");
  } finally {
    ocupado = false;
    estados.forEach((deshabilitado, boton) => {
      if (boton.isConnected) boton.disabled = deshabilitado;
    });
    pintar();
    estadoAcciones();
  }
}
function datos(form) {
  const d = Object.fromEntries(new FormData(form));
  if (d.domicilios)
    d.domicilios = d.domicilios
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  return { ...d, ...datosSeleccionados(form) };
}
async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    mensaje("Copiado");
  } catch {
    window.prompt("Copiá este texto:", texto);
  }
}
function contacto(nombre, email, contenedor) {
  const fila = document.createElement("div");
  fila.className = "card";
  const p = document.createElement("p");
  p.textContent = nombre + " · " + (email || "—");
  fila.append(p);
  if (email) {
    const a = document.createElement("a");
    a.href = "mailto:" + encodeURIComponent(email);
    a.textContent = "Escribir correo";
    const b = document.createElement("button");
    b.className = "small muted";
    b.textContent = "Copiar email";
    b.onclick = () => copiar(email);
    fila.append(a, " ", b);
  }
  contenedor.append(fila);
}
function estadoEn(elemento, c) {
  const estado = estadoComercio(c, ahora());
  elemento.textContent = etiquetas[estado.nombre];
  elemento.className = "estado estado-" + estado.nombre;
}
function resumenComercio(c) {
  const estado = estadoComercio(c, ahora());
  return etiquetas[estado.nombre] + " · Vencimiento: " + fecha(estado.caduca);
}
function solapa(nombre, enfocar = false) {
  pestana = nombre;
  for (const [id, panel] of [
    ["tabHabilitacion", "habilitacion"],
    ["tabComercios", "comercios"],
  ]) {
    const activo = panel === pestana;
    $(id).setAttribute("aria-selected", String(activo));
    $(id).tabIndex = activo ? 0 : -1;
    $(panel).hidden = !activo;
    if (activo && enfocar) $(id).focus();
  }
}
function boton(texto, fn) {
  const b = document.createElement("button");
  b.className = "small";
  b.textContent = texto;
  b.onclick = () => ejecutar(fn);
  b.disabled = ocupado;
  return b;
}
function celda(fila, texto) {
  const td = document.createElement("td");
  if (texto != null) td.textContent = texto;
  fila.append(td);
  return td;
}
function pintar() {
  const registrados = lista.filter((c) => c.activadoEn && !c.eliminando);
  const total = registrados.length;
  $("totalComercios").textContent = completa ? total : "…";
  for (const [id, estado] of [
    ["porcentajePago", "pago"],
    ["porcentajePrueba", "prueba"],
  ]) {
    const n = registrados.filter(
      (c) => estadoComercio(c, ahora()).nombre === estado,
    ).length;
    $(id).textContent = completa
      ? (total
          ? ((100 * n) / total).toLocaleString("es-AR", {
              maximumFractionDigits: 1,
            })
          : "0") + "%"
      : "…";
  }
  $("alcanceResumen").textContent = completa
    ? "Resumen de todos los comercios activados, incluidos morosos y suspendidos."
    : "Cargando el listado completo…";
  $("topComercios").replaceChildren();
  if (completa) {
    const top = [...registrados]
      .sort(
        (a, b) =>
          (b.seguidoresActuales || 0) - (a.seguidoresActuales || 0) ||
          a.nombre.localeCompare(b.nombre, "es-AR"),
      )
      .slice(0, 3);
    for (const c of top) {
      const li = document.createElement("li");
      li.textContent =
        c.nombre +
        " · " +
        ubicacion(c) +
        " · " +
        cantidad(c.seguidoresActuales) +
        " seguidores";
      $("topComercios").append(li);
    }
    if (!top.length)
      $("topComercios").textContent = "Todavía no hay comercios activados.";
  }
  $("listaPendientes").replaceChildren();
  for (const c of lista
    .filter((c) => !c.activadoEn && !c.eliminando)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es-AR"))) {
    const fila = document.createElement("div");
    fila.className = "card";
    const titulo = document.createElement("strong");
    titulo.textContent = c.nombre + " · CUIT " + c.cuit;
    const texto = document.createElement("p");
    texto.textContent = ubicacion(c);
    fila.append(
      titulo,
      texto,
      boton("Ver comercio", () => abrir(c.cuit)),
    );
    $("listaPendientes").append(fila);
  }
  if (!$("listaPendientes").children.length)
    $("listaPendientes").textContent =
      "No hay comercios pendientes de activación.";
  const filtro = $("filtro").value.trim().toLocaleLowerCase("es-AR");
  const filtrados = ordenar(
    registrados.filter((c) =>
      [c.nombre, c.cuit, ubicacion(c)]
        .join(" ")
        .toLocaleLowerCase("es-AR")
        .includes(filtro),
    ),
    columna,
    sentido,
    ahora(),
  );
  $("filasComercios").replaceChildren();
  $("conteoTabla").textContent =
    filtrados.length + " de " + total + " comercios";
  for (const c of filtrados) {
    const fila = document.createElement("tr");
    const nombre = boton(c.nombre, () => abrir(c.cuit));
    nombre.className = "nombre-button";
    celda(fila).append(nombre);
    celda(fila, c.cuit);
    celda(fila, ubicacion(c));
    celda(fila, fecha(c.activadoEn));
    const estado = estadoComercio(c, ahora());
    estadoEn(celda(fila), c);
    const caduca =
      estado.nombre === "moroso"
        ? estado.caduca
          ? "Hace " +
            Math.max(0, Math.floor((ahora() - estado.caduca) / 86400000)) +
            " días"
          : "—"
        : fecha(estado.caduca);
    celda(fila, caduca);
    const impacto = celda(
      fila,
      "v " +
        cantidad(c.impacto?.vistas) +
        " s " +
        cantidad(c.impacto?.seguimientos) +
        (c.impacto?.parcial ? " *" : ""),
    );
    const actuales = document.createElement("small");
    actuales.style.display = "block";
    actuales.textContent = "Seguidores actuales de productos: " + cantidad(c.seguidoresActuales);
    impacto.append(actuales);
    impacto.title = c.impacto
      ? "Mes " +
        c.impacto.numero +
        " desde la activación · " +
        fecha(c.impacto.inicio) +
        " a " +
        fecha(c.impacto.fin) +
        (c.impacto.parcial
          ? " · Registro parcial desde la actualización del sistema"
          : "")
      : "Sin registros de impacto";
    const ver = boton("Ver", () => historico(c));
    ver.disabled = ocupado || !c.tieneHistorico;
    if (!c.tieneHistorico)
      ver.title = "Disponible al completar el primer mes desde la activación";
    celda(fila).append(ver);
    celda(fila).append(boton("Mi Acción", async () => abrirAccion(c)));
    $("filasComercios").append(fila);
  }
  if (!filtrados.length) {
    const tr = document.createElement("tr"),
      td = celda(
        tr,
        completa ? "No hay comercios que coincidan." : "Cargando comercios…",
      );
    td.colSpan = 9;
    td.className = "table-empty";
    $("filasComercios").append(tr);
  }
  document.querySelectorAll("[data-orden]").forEach((b) => {
    const activo = b.dataset.orden === columna;
    if (activo)
      b.parentElement.setAttribute(
        "aria-sort",
        sentido === 1 ? "ascending" : "descending",
      );
    else b.parentElement.removeAttribute("aria-sort");
    b.disabled = ocupado;
  });
}
async function cargar() {
  const version = epoch;
  completa = false;
  pintar();
  const nuevos = [];
  let cursor = null;
  do {
    const r = await api({ accion: "listar", cursor });
    if (version !== epoch) return;
    nuevos.push(...r.comercios);
    cursor = r.cursor;
    if (r.servidorAhora) desfase = r.servidorAhora - Date.now();
  } while (cursor);
  lista = nuevos;
  completa = true;
  if (seleccionado)
    seleccionado = lista.find((c) => c.cuit === seleccionado.cuit) || null;
  pintar();
}
async function abrir(id) {
  const version = epoch,
    r = await api({ accion: "detalle", comercioId: id });
  if (version !== epoch) return;
  actual = r.comercio;
  $("detalle").hidden = false;
  $("nombreDetalle").textContent = actual.nombre;
  $("resumen").textContent =
    "CUIT " +
    actual.cuit +
    " · " +
    resumenComercio(actual) +
    " · Activación: " +
    fecha(actual.activadoEn) +
    " · Última actividad: " +
    fecha(actual.ultimaActividadEn || actual.activadoEn);
  $("equipo").replaceChildren();
  if (actual.emailSolicitud)
    contacto("Solicitante anterior", actual.emailSolicitud, $("equipo"));
  for (const [uid, m] of Object.entries(actual.miembros || {}))
    contacto(
      (uid === actual.principal ? "Principal: " : "Colaborador: ") + m.nombre,
      m.email,
      $("equipo"),
    );
  for (const k of ["nombre", "titular", "rubro", "localidad", "domicilios"])
    $("editar").elements[k].value = Array.isArray(actual[k])
      ? actual[k].join("\n")
      : actual[k] || "";
  mostrarSeleccion($("editar"), actual);
  $("historial").replaceChildren();
  for (const h of r.historial) {
    const p = document.createElement("p");
    p.textContent =
      fecha(h.fecha) +
      " · " +
      h.accion +
      " · " +
      h.uid +
      (h.detalle?.motivo ? " · " + h.detalle.motivo : "");
    $("historial").append(p);
  }
  const codigo = actual.activacionInicial;
  $("pendientes").textContent = codigo
    ? "Generado: " +
      fecha(codigo.creadoEn) +
      " · Vence: " +
      fecha(codigo.venceEn) +
      (codigo.venceEn <= ahora() ? " · Vencido" : "")
    : "No hay código de activación inicial.";
  $("emitir").hidden = Boolean(actual.activadoEn);
  $("anular").hidden = Boolean(actual.activadoEn) || !codigo;
  $("pagos").replaceChildren();
  if (!r.pagos.length)
    $("pagos").textContent = "Sin pagos comerciales registrados.";
  for (const pago of r.pagos) {
    const p = document.createElement("p");
    p.textContent =
      fecha(pago.fecha) +
      " · " +
      (pago.estado || "") +
      " · " +
      (pago.monto ?? "");
    $("pagos").append(p);
  }
  if (!$("fichaComercio").open) $("fichaComercio").showModal();
}
function abrirAccion(c) {
  seleccionado = c;
  solicitudTemporal = null;
  $("accionNombre").textContent = c.nombre;
  estadoEn($("accionEstado"), c);
  $("diasAccion").value = "";
  $("motivoAccion").value = "";
  falloAccion("");
  estadoAcciones();
  $("accionSalida").showModal();
}
function estadoAcciones() {
  if (!seleccionado) return;
  const e = estadoComercio(seleccionado, ahora());
  const suspendido = e.nombre === "suspendido";
  const gracia = e.nombre === "gracia";
  $("deshabilitar").disabled = ocupado || suspendido || e.nombre === "moroso";
  $("gracia").disabled = ocupado || suspendido || gracia;
  $("borrarComercio").disabled = ocupado;
  $("diasAccion").disabled = ocupado || suspendido;
  $("motivoAccion").disabled = ocupado || suspendido;
  $("plazoAccion").textContent = suspendido
    ? "El plazo vigente es fijo hasta " +
      fecha(e.caduca) +
      ". Para alterarlo se requiere la consola de Firebase."
    : gracia
      ? "La gracia vence el " +
        fecha(e.caduca) +
        ". Su fecha es fija. Podés suspender el comercio sin modificar ese vencimiento."
      : "Los días se cuentan desde la confirmación. El plazo quedará fijo durante su vigencia.";
}
async function temporal(accion) {
  if (!seleccionado) return;
  const dias = Number($("diasAccion").value),
    motivo = $("motivoAccion").value.trim();
  if (
    !Number.isSafeInteger(dias) ||
    dias < 1 ||
    !Number.isFinite(new Date(ahora() + dias * 86400000).getTime())
  ) {
    falloAccion("Ingresá una cantidad entera y positiva de días.");
    return;
  }
  const nombre = accion === "suspensionTemporal" ? "Suspender" : "Dar gracia a";
  const version = epoch,
    cuit = seleccionado.cuit;
  const hasta = ahora() + dias * 86400000;
  if (
    !confirm(
      "¿" +
        nombre +
        " «" +
        seleccionado.nombre +
        "» por " +
        dias +
        " días, hasta " +
        fecha(hasta) +
        "? El plazo no se podrá modificar desde el panel.",
    )
  )
    return;
  const firma = JSON.stringify({ accion, cuit, dias, motivo });
  if (solicitudTemporal?.firma !== firma)
    solicitudTemporal = { firma, id: crypto.randomUUID() };
  const r = await api({
    accion,
    comercioId: cuit,
    dias,
    motivo,
    solicitudId: solicitudTemporal.id,
  });
  if (version !== epoch) return;
  seleccionado[
    accion === "suspensionTemporal" ? "suspensionHasta" : "graciaHasta"
  ] = r.hasta;
  estadoEn($("accionEstado"), seleccionado);
  falloAccion("Acción aplicada hasta " + fecha(r.hasta));
  solicitudTemporal = null;
  await cargar();
  if (seleccionado) estadoEn($("accionEstado"), seleccionado);
}
async function borrar() {
  if (!seleccionado) return;
  const c = seleccionado;
  const confirmacion = prompt(
    "Se borrarán completamente «" +
      c.nombre +
      "», sus productos, fotos y seguimientos. Escribí su CUIT " +
      c.cuit +
      " para confirmar.",
  );
  if (confirmacion !== c.cuit) {
    if (confirmacion != null)
      falloAccion("El CUIT no coincide. No se inició el borrado.");
    return;
  }
  const version = epoch;
  await api({ accion: "borrarComercio", comercioId: c.cuit, confirmacion });
  if (version !== epoch) return;
  $("accionSalida").close();
  seleccionado = null;
  mensaje(
    "Eliminación iniciada. Los productos, fotos y seguimientos se retiran en segundo plano.",
  );
  await cargar();
}
function dibujarGrafico(periodos) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 760 290");
  svg.classList.add("grafico");
  svg.setAttribute("role", "img");
  svg.setAttribute(
    "aria-label",
    "Vistas y nuevos seguimientos por mes desde el alta. Los valores también están en la tabla.",
  );
  const maximo = Math.max(
    1,
    ...periodos.flatMap((p) => [p.vistas || 0, p.seguimientos || 0]),
  );
  const paso = 660 / Math.max(1, periodos.length),
    base = 230;
  const texto = (x, y, t, color = "#52627A") => {
    const e = document.createElementNS(ns, "text");
    e.setAttribute("x", x);
    e.setAttribute("y", y);
    e.setAttribute("fill", color);
    e.setAttribute("font-size", "13");
    e.textContent = t;
    svg.append(e);
  };
  for (let i = 0; i <= 4; i++) {
    const y = base - i * 45,
      linea = document.createElementNS(ns, "line");
    linea.setAttribute("x1", "60");
    linea.setAttribute("x2", "730");
    linea.setAttribute("y1", y);
    linea.setAttribute("y2", y);
    linea.setAttribute("stroke", "#CBD5E1");
    svg.append(linea);
    texto(4, y + 4, cantidad(Math.round((maximo * i) / 4)));
  }
  periodos.forEach((p, i) => {
    const x = 65 + i * paso;
    texto(x + paso / 2 - 6, 252, String(p.numero));
    for (const [campo, color, desplazamiento] of [
      ["vistas", "#2457C5", 0],
      ["seguimientos", "#16834A", paso * 0.36],
    ]) {
      if (p[campo] == null) continue;
      const alto = (180 * p[campo]) / maximo,
        b = document.createElementNS(ns, "rect");
      b.setAttribute("x", x + desplazamiento);
      b.setAttribute("y", base - alto);
      b.setAttribute("width", Math.max(3, paso * 0.3));
      b.setAttribute("height", Math.max(1, alto));
      b.setAttribute("fill", color);
      const t = document.createElementNS(ns, "title");
      t.textContent = "Mes " + p.numero + " · " + campo + ": " + p[campo];
      b.append(t);
      svg.append(b);
    }
  });
  texto(60, 18, "Vistas", "#2457C5");
  texto(150, 18, "Nuevos seguimientos", "#16834A");
  texto(290, 280, "Mes desde la activación");
  $("historicoGrafico").replaceChildren(svg);
}
async function historico(c) {
  const version = epoch;
  $("historicoNombre").textContent = c.nombre;
  estadoEn($("historicoEstado"), c);
  $("historicoMensaje").textContent = "Cargando histórico…";
  $("historicoFilas").replaceChildren();
  $("historicoGrafico").replaceChildren();
  $("historicoSalida").showModal();
  try {
    const r = await api({ accion: "historicoImpacto", comercioId: c.cuit });
    if (version !== epoch || !$("historicoSalida").open) return;
    estadoEn($("historicoEstado"), { ...c, estadoPanel: r.estadoPanel });
    dibujarGrafico(r.periodos);
    for (const p of r.periodos) {
      const fila = document.createElement("tr");
      for (const valor of [
        p.numero + (p.parcial ? " *" : ""),
        fecha(p.inicio),
        fecha(p.fin),
        p.vistas ?? "Sin registro",
        p.seguimientos ?? "Sin registro",
      ])
        celda(fila, valor);
      $("historicoFilas").append(fila);
    }
    $("historicoMensaje").textContent =
      "Últimos " +
      r.periodos.length +
      " períodos completos. * Registro parcial desde la actualización del sistema.";
  } catch (e) {
    if (version === epoch) $("historicoMensaje").textContent = e.message;
  }
}
function mostrarCodigo(r) {
  $("codigo").textContent = r.codigo;
  $("venceCodigo").textContent = "Vence: " + fecha(r.venceEn);
  $("codigoSalida").showModal();
}

$("entrar").onclick = () =>
  ejecutar(async () => {
    await setPersistence(auth, browserSessionPersistence);
    await signInWithPopup(auth, new GoogleAuthProvider());
  });
$("salir").onclick = () => ejecutar(() => signOut(auth));
onAuthStateChanged(auth, async (u) => {
  const version = ++epoch;
  lista = [];
  actual = null;
  seleccionado = null;
  completa = false;
  columna = "nombre";
  sentido = 1;
  desfase = 0;
  $("panel").hidden = true;
  $("detalle").hidden = true;
  $("acceso").hidden = !!u;
  $("salir").hidden = !u;
  $("filtro").value = "";
  for (const id of [
    "codigoSalida",
    "accionSalida",
    "historicoSalida",
    "fichaComercio",
  ])
    $(id).close();
  $("codigo").textContent = "";
  for (const id of [
    "nombreDetalle",
    "resumen",
    "equipo",
    "historial",
    "pagos",
    "pendientes",
    "accionNombre",
    "accionEstado",
    "historicoNombre",
    "historicoEstado",
    "historicoMensaje",
    "historicoFilas",
    "historicoGrafico",
  ])
    $(id).replaceChildren();
  $("crear").reset();
  $("editar").reset();
  mensajeAlta("");
  solapa("habilitacion");
  pintar();
  mensaje("");
  if (!u) return;
  try {
    const t = await u.getIdTokenResult(true);
    if (version !== epoch) return;
    if (t.claims.operadorComercios !== true) {
      mensaje(
        "Esta cuenta no tiene permiso de operador. Cerrá sesión para usar otra.",
      );
      return;
    }
    await cargarSelectores(app);
    if (version !== epoch) return;
    $("panel").hidden = false;
    await cargar();
    if (version === epoch) mensaje("Sesión autorizada.");
  } catch (e) {
    if (version === epoch) mensaje(e.message);
  }
});
$("tabHabilitacion").onclick = () => solapa("habilitacion");
$("tabComercios").onclick = () => solapa("comercios");
document.querySelector(".tabs").addEventListener("keydown", (e) => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
  e.preventDefault();
  solapa(
    e.key === "Home"
      ? "habilitacion"
      : e.key === "End"
        ? "comercios"
        : pestana === "habilitacion"
          ? "comercios"
          : "habilitacion",
    true,
  );
});
document.querySelectorAll("[data-orden]").forEach(
  (b) =>
    (b.onclick = () => {
      sentido = columna === b.dataset.orden ? -sentido : 1;
      columna = b.dataset.orden;
      pintar();
    }),
);
$("filtro").oninput = pintar;
$("recargar").onclick = () => ejecutar(cargar);
$("recargarPendientes").onclick = () => ejecutar(cargar);
$("deshabilitar").onclick = () =>
  ejecutar(() => temporal("suspensionTemporal"), falloAccion);
$("gracia").onclick = () =>
  ejecutar(() => temporal("graciaTemporal"), falloAccion);
$("borrarComercio").onclick = () => ejecutar(borrar, falloAccion);
for (const [boton, dialogo] of [
  ["cerrarAccion", "accionSalida"],
  ["cerrarHistorico", "historicoSalida"],
  ["cerrarFicha", "fichaComercio"],
  ["cerrarCodigo", "codigoSalida"],
])
  $(boton).onclick = () => $(dialogo).close();
$("copiarCodigo").onclick = () => copiar($("codigo").textContent);
$("codigoSalida").addEventListener("close", () => {
  $("codigo").textContent = "";
});
$("crear").onsubmit = (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  mensajeAlta("");
  ejecutar(async () => {
    const d = datos(form);
    d.cuit = d.cuit.replace(/[-\s]/g, "");
    if (!/^[0-9]{11}$/.test(d.cuit)) {
      mensajeAlta(
        "El CUIT debe tener 11 dígitos. Revisalo con la constancia de ARCA.",
      );
      form.elements.cuit.focus();
      return;
    }
    if (
      !confirm(
        "¿Guardar «" +
          d.nombre +
          "» (CUIT " +
          d.cuit +
          ") y generar su código de activación?",
      )
    )
      return;
    const version = epoch;
    mensajeAlta("Generando el código…");
    const r = await api({ accion: "crearConCodigo", ...d });
    if (version !== epoch) return;
    form.reset();
    solapa("habilitacion");
    mostrarCodigo(r);
    mensajeAlta("El comercio quedó pendiente de activación.");
    try {
      await cargar();
    } catch {
      mensaje(
        "El comercio se guardó. Pulsá Actualizar para volver a cargar la lista.",
      );
    }
  }, mensajeAlta);
};
$("editar").onsubmit = (e) => {
  e.preventDefault();
  ejecutar(async () => {
    const d = datos(e.target),
      id = actual.cuit;
    await api({ accion: "datos", comercioId: id, cuit: id, ...d });
    await abrir(id);
    await cargar();
    mensaje("Datos protegidos actualizados.");
  });
};
$("emitir").onclick = () => {
  if (
    !actual ||
    !confirm(
      "¿Generar un nuevo código para «" +
        actual.nombre +
        "» (CUIT " +
        actual.cuit +
        ")? Se invalidará el anterior.",
    )
  )
    return;
  const id = actual.cuit;
  ejecutar(async () => {
    mostrarCodigo(
      await api({ accion: "renovarCodigoInicial", comercioId: id }),
    );
    await abrir(id);
  });
};
$("anular").onclick = () => {
  if (!actual) return;
  const motivo = prompt("Motivo de la anulación");
  if (!motivo) return;
  const id = actual.cuit;
  ejecutar(async () => {
    await api({ accion: "anularCodigoInicial", comercioId: id, motivo });
    await abrir(id);
    await cargar();
    mensaje("Código anulado.");
  });
};
setInterval(() => {
  if (!$("panel").hidden && !ocupado) {
    pintar();
    estadoAcciones();
  }
}, 60000);
