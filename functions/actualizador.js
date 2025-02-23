// functions/actualizador.js
function actualizarDato(docId, campo, datoAnterior, datoNuevo) {
  // Registrar el cambio en el historial sin volver a actualizar el documento
  firebase.firestore().collection("historial_cambios").add({
    registro_id: docId,
    accion: "modificación",
    campo_modificado: campo,
    dato_anterior: datoAnterior,
    dato_nuevo: datoNuevo,
    fecha: new Date().toISOString(),
    realizado_por: firebase.auth().currentUser ? firebase.auth().currentUser.email : "desconocido"
  })
  .then(() => {
    console.log("Cambio registrado en el historial para", campo);
  })
  .catch(error => {
    console.error("Error al registrar el cambio:", error);
  });
}
