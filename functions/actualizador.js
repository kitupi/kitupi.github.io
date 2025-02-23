function actualizarDato(docId, campo, nuevoValor) {
  // Obtener el documento actual
  const docRef = db.collection("registros").doc(docId);
  docRef.get().then((doc) => {
    if (doc.exists) {
      const datosAntiguos = doc.data();
      const valorAntiguo = datosAntiguos[campo];

      // Actualizar el campo en el documento
      let updateObject = {};
      updateObject[campo] = nuevoValor;
      docRef.update(updateObject)
        .then(() => {
          // Registrar el cambio en el historial
          db.collection("historial_cambios").add({
            registro_id: docId,
            accion: "modificación",
            campo_modificado: campo,
            dato_anterior: valorAntiguo,
            dato_nuevo: nuevoValor,
            fecha: new Date().toISOString(),
            realizado_por: firebase.auth().currentUser.email
          })
          .then(() => {
            console.log("Cambio registrado en el historial");
          })
          .catch(error => console.error("Error al registrar el cambio:", error));
        })
        .catch(error => console.error("Error al actualizar el documento:", error));
    } else {
      console.error("El documento no existe");
    }
  })
  .catch(error => console.error("Error al obtener el documento:", error));
}
