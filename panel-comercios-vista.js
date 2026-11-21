// Presentación pura para que orden, estados y períodos se puedan verificar sin sesión.
export const etiquetas = {
  pendiente: "Pendiente",
  prueba: "Prueba",
  pago: "Pago",
  moroso: "Moroso",
  suspendido: "Suspendido",
  gracia: "Gracia",
};
export const fecha = (valor) =>
  valor
    ? new Date(valor).toLocaleString("es-AR", {
        timeZone: "America/Argentina/Buenos_Aires",
      })
    : "—";
export function estadoComercio(c, ahora) {
  if (!c.activadoEn) return { nombre: "pendiente", caduca: 0 };
  if (c.suspendido || c.suspensionHasta > ahora)
    return { nombre: "suspendido", caduca: c.suspensionHasta || 0 };
  if (c.graciaHasta > ahora) return { nombre: "gracia", caduca: c.graciaHasta };
  if (c.pagoHasta > ahora) return { nombre: "pago", caduca: c.pagoHasta };
  const prueba = c.pruebaHasta || (c.pruebaUsada ? c.hasta : 0);
  if (prueba > ahora) return { nombre: "prueba", caduca: prueba };
  const base = Math.max(c.hasta || 0, c.pruebaHasta || 0, c.pagoHasta || 0);
  return {
    nombre: base > ahora ? "pago" : "moroso",
    caduca: base > ahora ? base : Math.max(base, c.graciaHasta || 0),
  };
}
export function cantidad(numero) {
  if (numero == null) return "—";
  if (numero < 1000) return String(numero);
  return (numero / 1000).toFixed(2).replace(/\.00$/, "") + "k";
}
export const ubicacion = (c) =>
  [c.localidad, c.provincia].filter(Boolean).join(", ");
export function ordenar(comercios, columna, sentido, ahora) {
  const valor = (c) => {
    switch (columna) {
      case "cuit":
        return c.cuit;
      case "ubicacion":
        return ubicacion(c);
      case "alta":
        return c.activadoEn || 0;
      case "estado":
        return etiquetas[estadoComercio(c, ahora).nombre];
      case "caduca":
        return estadoComercio(c, ahora).caduca;
      case "impacto":
        return c.impacto?.vistas ?? -1;
      default:
        return c.nombre || "";
    }
  };
  return [...comercios].sort((a, b) => {
    const va = valor(a),
      vb = valor(b);
    const comparacion =
      typeof va === "number"
        ? va - vb
        : String(va).localeCompare(String(vb), "es-AR", {
            numeric: true,
            sensitivity: "base",
          });
    const secundario =
      columna === "impacto"
        ? (a.impacto?.seguimientos ?? -1) - (b.impacto?.seguimientos ?? -1)
        : 0;
    return (
      (comparacion || secundario) * sentido ||
      a.nombre.localeCompare(b.nombre, "es-AR") ||
      a.cuit.localeCompare(b.cuit)
    );
  });
}
