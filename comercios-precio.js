import {initializeApp} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {getFirestore,doc,onSnapshot} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
const app=initializeApp({apiKey:"AIzaSyCmyeFnhf-1nH8BWOh9zWSMq-0M5i2247o",authDomain:"abc5-93cb8.firebaseapp.com",projectId:"abc5-93cb8"});
const salida=document.getElementById("precioMensual");
const noDisponible=()=>{salida.textContent="Precio mensual temporalmente no disponible.";};
// Una escucha del precio público, sin importes alternativos fijos.
onSnapshot(doc(getFirestore(app),"Control","tarifa"),{includeMetadataChanges:true},snap=>{
 const monto=snap.data()?.montocom;
 if(snap.metadata.fromCache||!Number.isSafeInteger(monto)||monto<=0||monto>100000000){noDisponible();return;}
 salida.textContent="Plan pago: "+new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(monto)+" por mes (pesos argentinos).";
},noDisponible);
