"use strict";

// pre114: contrato compartido por altas/ediciones. Se cuentan puntos de código,
// nunca unidades UTF-16: un emoji simple no consume dos posiciones ni se corta.
const REGLAS = {
  nombre: [60, false, false, true],
  descripcionGratis: [100, true, true, true],
  descripcionPago: [120, true, true, true],
  descripcionProducto: [300, true, true, true],
  descripcionComercio: [500, true, true, false],
  horarios: [200, true, true, false],
  domicilio: [150, false, false, true],
  direccion: [150, false, false, false],
  telefono: [80, false, false, false],
  whatsapp: [30, false, false, false],
  facebook: [250, false, false, false],
  enlaceParticular: [2048, false, false, false],
  stock: [7, false, false, false],
};
const emojis = /[\p{Extended_Pictographic}\p{Regional_Indicator}\p{Emoji_Modifier}\u200D\uFE0F\u20E3\u{E0020}-\u{E007F}]/u;
// Conservar ZWJ, selectores y etiquetas necesarios para secuencias emoji.
const invisibles = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u00AD\u061C\u180E\u200B\u200E\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/gu;
function limpiar(v, multilinea) {
  if (typeof v !== "string") throw Error("Ingresá un texto válido");
  if (v.length > 20000) throw Error("El texto pegado es demasiado largo");
  // Un sustituto aislado no es un carácter Unicode válido.
  for (const c of v) if (/^[\uD800-\uDFFF]$/.test(c)) throw Error("El texto contiene un carácter inválido");
  let s = v.normalize("NFC").replace(/\r\n?|[\u2028\u2029]/g, "\n")
      .replace(invisibles, "").replace(/[\t\p{Zs}]+/gu, " ");
  if (!multilinea) return s.replace(/\s+/gu, " ").trim();
  return s.split("\n").map(l => l.trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
function validar(v, tipo, etiqueta = "Este campo") {
  const regla = REGLAS[tipo];
  if (!regla) throw Error("Tipo de campo inválido");
  const [max, multilinea, permiteEmojis, requerido] = regla;
  const s = limpiar(v, multilinea);
  if (requerido && !s) throw Error(`${etiqueta}: completá el texto`);
  if (!permiteEmojis && emojis.test(s)) throw Error(`${etiqueta}: usá texto sin emojis`);
  if ([...s].length > max) throw Error(`${etiqueta}: máximo ${max} caracteres`);
  if (tipo === "stock" && s && (!/^\d+$/.test(s) || Number(s) > 1000000))
    throw Error("Cantidad: ingresá un entero entre 0 y 1000000");
  if (tipo === "whatsapp" && s && !/^\+?[\d ()-]{6,30}$/.test(s)) throw Error("WhatsApp inválido");
  if (tipo === "telefono" && s && (!/^[+\d ()/.,;-]+$/.test(s) || !/\d/.test(s))) throw Error("Teléfono inválido");
  if ((tipo === "facebook" || tipo === "enlaceParticular") && s) {
    let u; try { u = new URL(s); } catch { throw Error("Enlace de Facebook inválido"); }
    if (u.protocol !== "https:" || !["facebook.com", "www.facebook.com", "m.facebook.com", "web.facebook.com"].includes(u.hostname)
        || u.username || u.password || /[\s\\]/u.test(s)) throw Error("Usá un enlace https de Facebook o Marketplace");
  }
  return s;
}
// Los valores ya guardados que no se modifican no se recortan ni se rechazan.
function conservar(v, anterior, tipo, etiqueta) {
  return typeof anterior === "string" && v === anterior ? anterior : validar(v, tipo, etiqueta);
}
function callable(v, tipo, etiqueta, ErrorHttp) {
  try { return validar(v, tipo, etiqueta); }
  catch (e) { throw new ErrorHttp("invalid-argument", e.message); }
}
export { REGLAS, limpiar, validar, conservar, callable };
