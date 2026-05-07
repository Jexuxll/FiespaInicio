const CLAVE_SECRETA = "luis";
const USUARIO_POR_DEFECTO = "Usuario";
let nombreJugador = localStorage.getItem("nombreJugador") || "";

function actualizarAlturaViewport() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty("--vh", `${vh}px`);
}

actualizarAlturaViewport();
window.addEventListener("resize", actualizarAlturaViewport);
window.addEventListener("orientationchange", actualizarAlturaViewport);

// ===============================
// GOOGLE FORMS (ENVÍO DE RESPUESTAS)
// ===============================

const FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSdnVUO847DbfLZRgosgbX6uupVWoaPryeoUuuZPyc-aR_xEUA/formResponse";
const ENTRY_ALIAS = "entry.788093874";
const ENTRY_CAPITULO = "entry.138641531";
const ENTRY_RESPUESTAS = [
  "entry.1826188647",
  "entry.454956127",
  "entry.1458453985" // Rellena aquí el entry del 3er campo en Google Forms.
];

function obtenerRespuestasCapitulo(capId, cantidadRespuestas) {
  const respuestas = [];
  for (let i = 1; i <= cantidadRespuestas; i++) {
    respuestas.push(localStorage.getItem("opcion_" + capId + "_" + i) || "");
  }
  return respuestas;
}

function contarPasosConOpciones(capitulo) {
  return capitulo.pasos.filter((paso) => Array.isArray(paso.opciones) && paso.opciones.length > 0).length;
}

function enviarAGoogleForms(capId, cantidadRespuestas = 2){

  const alias = localStorage.getItem("nombreJugador") || "Anonimo";
  const capitulo = capId;
  const respuestas = obtenerRespuestasCapitulo(capId, cantidadRespuestas);

  console.log("Enviando:", { alias, capitulo, respuestas });

  const datos = new URLSearchParams();

  datos.append(ENTRY_ALIAS, alias);
  datos.append(ENTRY_CAPITULO, capitulo);

  respuestas.forEach((respuesta, index) => {
    const entryId = ENTRY_RESPUESTAS[index];

    if (!respuesta) return;

    if (!entryId) {
      console.warn("Falta configurar el ENTRY de Google Forms para la respuesta", index + 1);
      return;
    }

    datos.append(entryId, respuesta);
  });

  fetch(FORM_URL, {
    method: "POST",
    mode: "no-cors",
    body: datos
  });
}



// SONIDO
let sonidoTecla = document.getElementById("tecleo");
if (sonidoTecla) {
  sonidoTecla.volume = 0.15;
}

let audioHabilitado = true;
// let tecladoHabilitado = true;
const audiosActivos = new Set();

function detenerTodoAudio() {
  if (sonidoTecla) {
    sonidoTecla.pause();
    sonidoTecla.currentTime = 0;
  }

  audiosActivos.forEach((audio) => {
    audio.pause();
    audio.currentTime = 0;
  });

  audiosActivos.clear();
}

function resolverRutasAudio(rutaAudio) {
  const rutas = [rutaAudio];

  if (rutaAudio.startsWith("audio/")) {
    rutas.push("../" + rutaAudio);
  } else if (rutaAudio.startsWith("../audio/")) {
    rutas.push(rutaAudio.replace("../", ""));
  }

  return rutas;
}

function formatearTiempo(segundos) {
  const valorSeguro = Math.max(0, Math.floor(segundos || 0));
  const mins = Math.floor(valorSeguro / 60);
  const secs = valorSeguro % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function formatearAvisoMicrofono(estado) {
  return `MICRÓFONO ${estado}`;
}

function ocultarYEliminarElemento(elemento, espera = 0, callback) {
  if (!elemento) {
    if (callback) callback();
    return;
  }

  setTimeout(() => {
    elemento.classList.add("mensajeTemporalOcultando");

    setTimeout(() => {
      elemento.remove();
      mensajesDiv.scrollTop = mensajesDiv.scrollHeight;
      if (callback) callback();
    }, 240);
  }, espera);
}

function crearBloqueAudioDirecto() {
  const contenedor = document.createElement("div");
  contenedor.className = "mensajeSistema mensajeAudioDirecto";

  const tarjeta = document.createElement("div");
  tarjeta.className = "audioDirecto";

  const ondas = document.createElement("div");
  ondas.className = "audioDirectoOndas";
  for (let i = 0; i < 40; i++) {
    const barra = document.createElement("span");
    barra.className = "audioDirectoOnda";
    barra.style.setProperty("--d", `${(i % 16) * 0.05}s`);
    ondas.appendChild(barra);
  }

  tarjeta.appendChild(ondas);
  contenedor.appendChild(tarjeta);
  mensajesDiv.appendChild(contenedor);
  mensajesDiv.scrollTop = mensajesDiv.scrollHeight;

  return { contenedor };
}

function reproducirAudioNarrativo(rutaAudio, opciones = {}, callback) {
  if (!rutaAudio || !audioHabilitado || document.hidden) {
    if (callback) callback();
    return;
  }

  const DURACION_CIERRE_ONDA = 360;

  const volumen = typeof opciones.volumen === "number" ? opciones.volumen : 0.8;
  const desde = typeof opciones.desde === "number" ? Math.max(0, opciones.desde) : 0;
  const hasta = typeof opciones.hasta === "number" ? Math.max(0, opciones.hasta) : null;
  const duracion = typeof opciones.duracion === "number" ? Math.max(0, opciones.duracion) : null;
  const autoPlay = opciones.autoPlay !== false;

  const ui = crearBloqueAudioDirecto();
  const rutas = resolverRutasAudio(rutaAudio);
  let indiceRuta = 0;

  function intentarReproducir() {
    if (indiceRuta >= rutas.length) {
      ui.contenedor.classList.remove("activo");
      ui.contenedor.classList.remove("cerrando");
      if (callback) callback();
      return;
    }

    const clip = new Audio(rutas[indiceRuta]);
    indiceRuta++;
    clip.volume = volumen;
    clip.preload = "metadata";
    clip.load();

    audiosActivos.add(clip);

    let finalizado = false;
    let limiteFin = null;

    const limpiar = () => {
      audiosActivos.delete(clip);
      clip.pause();
      clip.removeAttribute("src");
      clip.load();
    };

    const finalizar = () => {
      if (finalizado) return;
      finalizado = true;
      ui.contenedor.classList.remove("activo");
      ui.contenedor.classList.add("cerrando");
      limpiar();
      setTimeout(() => {
        ocultarYEliminarElemento(ui.contenedor, 0, callback);
      }, DURACION_CIERRE_ONDA);
    };

    const fallarIntento = () => {
      if (finalizado) return;
      finalizado = true;
      limpiar();
      intentarReproducir();
    };

    const prepararAudio = () => {
      const duracionTotal = Number.isFinite(clip.duration) ? clip.duration : 0;
      clip.currentTime = Math.min(desde, duracionTotal);

      if (hasta !== null && duracion !== null) {
        limiteFin = Math.min(duracionTotal || Infinity, hasta, desde + duracion);
      } else if (hasta !== null) {
        limiteFin = Math.min(duracionTotal || Infinity, hasta);
      } else if (duracion !== null) {
        limiteFin = Math.min(duracionTotal || Infinity, desde + duracion);
      } else {
        limiteFin = duracionTotal || Infinity;
      }

      if (limiteFin <= desde) {
        limiteFin = duracionTotal || Infinity;
      }

      if (autoPlay) {
        clip.play().then(() => {
          ui.contenedor.classList.remove("cerrando");
          ui.contenedor.classList.add("activo");
        }).catch(fallarIntento);
      }
    };

    clip.addEventListener("loadedmetadata", prepararAudio, { once: true });
    clip.addEventListener("timeupdate", () => {
      if (finalizado) return;

      if (Number.isFinite(limiteFin) && clip.currentTime >= limiteFin) {
        finalizar();
      }
    });
    clip.addEventListener("ended", finalizar, { once: true });
    clip.addEventListener("error", fallarIntento, { once: true });
  }

  intentarReproducir();
}

function pausarAudioPorSalida() {
  audioHabilitado = false;
  detenerTodoAudio();
}

function restaurarAudio() {
  audioHabilitado = true;
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pausarAudioPorSalida();
  } else {
    restaurarAudio();
  }
});

window.addEventListener("pagehide", pausarAudioPorSalida);
window.addEventListener("beforeunload", pausarAudioPorSalida);
window.addEventListener("blur", pausarAudioPorSalida);
window.addEventListener("focus", restaurarAudio);

const btnReiniciar = document.getElementById("btnReiniciar");
if (btnReiniciar) {
  btnReiniciar.addEventListener("click", () => {
    pausarAudioPorSalida();
    window.location.reload();
  });
}

// BOTÓN MUTE TECLEO
// const btnMute = document.getElementById("btnMute");
// if (btnMute) {
//   btnMute.addEventListener("click", () => {
//     tecladoHabilitado = !tecladoHabilitado;
//     btnMute.textContent = tecladoHabilitado ? "[AUDIO: ON]" : "[AUDIO: OFF]";
//     btnMute.classList.toggle("silenciado", !tecladoHabilitado);
//     btnMute.title = tecladoHabilitado ? "AUDIO: ON" : "AUDIO: OFF";
//   });
// }

let escrituraEnCurso = null;

function saltarAnimacionEscritura() {
  if (escrituraEnCurso) {
    const estado = escrituraEnCurso;
    clearTimeout(estado.timeoutId);
    estado.div.textContent = estado.texto;
    escrituraEnCurso = null;
    detenerTodoAudio();

    if (estado.callback) {
      estado.callback();
    }
  }
}

function esCampoTexto(elemento) {
  if (!elemento) return false;
  const tag = elemento.tagName;
  return tag === "INPUT" || tag === "TEXTAREA";
}

function debeIgnorarToqueAvance(elemento) {
  if (!elemento || !elemento.closest) return false;
  return Boolean(elemento.closest("button, input, textarea"));
}

document.addEventListener("pointerdown", (e) => {
  if (debeIgnorarToqueAvance(e.target)) return;
  saltarAnimacionEscritura();
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  if (esCampoTexto(document.activeElement)) return;

  e.preventDefault();
  saltarAnimacionEscritura();
});

// ===============================
// INTRO (ANTES DEL CHAT)
// ===============================

function pedirNombre() {

  // Si ya existe, saltamos
  if (nombreJugador) {
    setTimeout(() => comprobarNuevosCapitulos(), 800);
    return;
  }

  agregarMensajeSistema("¿Hay alguien ahí? ¿Quién eres?", () => {

    opcionesDiv.innerHTML = "";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "ESCRIBE TU NOMBRE...";
    input.className = "inputNombre";

    input.addEventListener("keydown", function(e){
      if(e.key === "Enter" && input.value.trim() !== ""){

        nombreJugador = input.value.trim();
        localStorage.setItem("nombreJugador", nombreJugador);

        opcionesDiv.innerHTML = "";

        agregarMensajeJugador("Soy " + nombreJugador, () => {
          setTimeout(() => comprobarNuevosCapitulos(), 800);
        });
      }
    });

    opcionesDiv.appendChild(input);
    input.focus();
  });
}

// ===============================
// CAPÍTULOS
// ===============================

const capitulos = [
  {
    id: "Capitulo_01",
    fecha: "2026-05-06",
    pasos: [
      {
        mensajes: [
          () =>`${nombreJugador || "Usuario"}, menos mal... Soy Pablo`,
          "Tenía miedo de que no averiguases cómo entrar en el sistema",
          "Disculpa el rollo paranoico pero es la opción más segura en estos momentos"
        ]
      },
      {
        opciones: [
          {
            texto: "Cuéntame qué pasa",
            valor: "IR -10",
            mensajes: [
              "¿Qué pasa, Pablo?",
              "¿Por qué tanto secretismo?"
            ],
            respuesta: [
              "Es algo complicado de explicar"
            ]
          },
          {
            texto: "Se te ha ido la pinza",
            valor: "IR +10",
            mensajes: [
              "¿Qué coño dices?", 
              "¿Qué tonterías te estás montando?"
            ],
            respuesta: [
              "No es ninguna tontería, te lo juro",
            ]
          }
        ],
        respuesta: [ 
          "Estoy metido en algo único",
          "En serio, creo que esto es muy gordo y no puedo dejar que nadie meta las narices...",
          "El otro día en las termas... Pasó algo",
          "De verdad, no vas a creértelo, pero al menos presta atención"
        ]
      },
      {
        opciones: [
          {
            texto: "Desembucha",
            valor: "IR -10",
            mensajes: [
              "Venga, tío, suéltalo de una vez", 
              "¿De qué me estás hablando?"
            ],
            respuesta: [
              () =>`Voy, ${nombreJugador || "Usuario"}, no me presiones...`,
            ]
          },
          {
            texto: "Me estás asustando",
            valor: "IR +10",
            mensajes: [
              "Pablo, ¿esto es en serio?",
              "No estoy entendiendo nada", 
              "Me estás asustando"
            ],
            respuesta: [
              "Tranquilo, no quiero asustarte"
            ]
          }
        ],
        respuesta: [ 
          "Joder, no sé ni por dónde empezar",
          "Llevo días sin dormir y me siento rarísimo...",
          { audio: "audio/lab.mp3", avisoSistema: formatearAvisoMicrofono("ACTIVO"), volumen: 0.7, desde: 0, duracion: 6 },
          "Mierda, viene alguien",
          "No te imaginas desde dónde te estoy escribiendo... Fliparías",
          "Tengo que salir de aquí antes de que me pillen, pero volveré dentro de dos días",
          "Hablamos entonces, vale?",
          "No me dejes tirado, por favor..."
        ]
      }
    ]
  },

  {
    id: "Capitulo_02",
    fecha: "2026-05-08",
    pasos: [
      {
        mensajes: [
          () =>`${nombreJugador || "Usuario"}?, Me recibes?`,
          "Perdona lo del otro día, tengo que andarme con mucho ojo...",
          "Siento que cualquier paso en falso puede acabar MUY mal para mí y... para mi descubrimiento."
        ],
      },
      {
      opciones: [
        {
          texto: "Preocuparse",
          valor: "IR +10",
          mensajes: [
            "Qué coño dices Pablo?",
            "Déjate de tonterías",
            "Esto no es normal"
          ],
          respuesta: [
            "Ya sé que no es normal, por eso te lo estoy contando por aquí",
          ]
        },
        {
          texto: "Indagar",
          valor: "IR -10",
          mensajes: [
            "Cuéntame de una vez de qué va todo esto",
            "Porque me estoy poniendo de los nervios",
          ],
          respuesta: [
            "Tranquilízate, no quiero que te pongas nervioso",
          ]
        }
      ],
      respuesta: [ 
            "Te explico",
            "Lo que te intentaba decir el otro día era que descubrí algo en las termas del molino hace unos días",
            "Era de noche y el río había inundado las pozas",
            "Yo iba tranquilamente de regreso a casa después de mi habitual caminata vespertina buscando pájaros",
            "Y entonces lo vi, parecía que estaba esperando a que alguien le encontrase..."
      ]
    },
    {
      opciones: [
        {
          texto: "Dudar",
          valor: "IR +10",
          mensajes: [
            "Esto da bastante mal rollo, Pablo", 
            "Dime que no tocaste nada y te fuiste a tu casa",
          ]
        },
        {
          texto: "Curiosear",
          valor: "IR -10",
          mensajes: [
            "¿Y qué hiciste?", 
            "¿Te acercaste?",
            "¿¿LO TOCASTE??"
          ]
        }
      ],  
      respuesta: [ 
          "Pues me temo que sí, lo toqué...",
          "Bueno más bien me tocó él a mí",
          "Era como una pequeña pelota verde intenso, brillaba en la oscuridad y se balanceaba ligeramente como un blandiblú",
          "En cuanto acerqué la mano para tocarlo noté un latigazo en la yema del dedo y puf",
          "El \"bicho\" se esfumó",
          { audio: "audio/tos.mp3", avisoSistema: formatearAvisoMicrofono("ACTIVO"), volumen: 0.6, desde: 0, duracion: 5 },
          "Tengo que dejarte, no me encuentro muy bien",
          "Últimamente estoy muy cansado, será por andar constantemente huyendo, supongo",
          "Nos vemos dentro de dos días, no le cuentes a nadie nada de esto..."
        ]
      }
    ]
  },

  {
    id: "Capitulo_03",
    fecha: "2026-05-10",
    pasos: [
      {
        mensajes: [
          () => `${nombreJugador || "Usuario"}? Sigo aquí, he tenido que gastar todas mis lz en el curro, pero ya no puedo faltar más sin excusa...`,
          "Así que he cambiado de estrategia, voy a hacer como si nada el tiempo que pueda",
          "Creo que mis compañeros están un poco rayados, pero me es imposible disimular mejor",
          "Cada vez que voy a tomar café, acabo potando, así que ahora solo tomo agua caliente",
          "Tampoco puedo tomar la tortilla que tanto me gustaba, ahora la encuentro asquerosa"
        ]
      },
      {
        opciones: [
          {
            texto: "Sugerir ir al hospital",
            valor: "IR +10",
            mensajes: [
              "Esto no es ni medio normal",
              "Has pillado un parásito fijo, Pablo",
              "Tiene que verte un médico"
            ],
            respuesta: [
              "Nada de médicos, si estoy perfectamente joder",
              "De hecho, me encuentro mejor que nunca"
            ]
          },
          {
            texto: "Preguntar por \"El bicho\"",
            valor: "IR -10",
            mensajes: [
              "Tío, eso tiene que estar relacionado con el blandiblú ese",
              "Qué pasó después?",
              "Me dejaste a medias..."
            ],
            respuesta: [
              "Pues seguramente, pero por lo demás estoy mejor que nunca",
            ]
          }
        ],
        respuesta: [ 
            "Han pasado muchas cosas desde que hablamos...",
            "Pasé una noche TERRIBLE, la peor de mi vida",
            "Vomité y cagué de un color que dudo que exista siquiera, fue horrible",
            "Pero desde esa noche...",
            "Todo es distinto",
            "He optado por abrazar los \"efectos secundarios\"",
            "Me siento de puta madre"
        ]
      },
      {
        opciones: [
          {
            texto: "Advertir del peligro",
            valor: "IR -10",
            mensajes: [
              "Está claro que algo te infectó, Pablo", 
              "Y algo chungo, además",
              "Tienes que hacer algo YA"
            ]
          },
          {
            texto: "Preguntar por los efectos",
            valor: "IR +10",
            mensajes: [
              "¿Qué efectos secundarios?", 
              "¿Buenos o malos?",
              "Igual te conviertes en Venom jajaja"
            ]
          }
        ],
        respuesta: [ 
            "A ver, no es nada del otro jueves, simplemente el tema de la comida",
            "Lo que antes me encantaba ya no puedo ni olerlo",
            "Sólo como pescado, panga, en realidad. Me encanta la panga",
            "También sudo mucho, aunque no es sudor sudor, es como...",
            "Más denso. Y siento que hace mucho calor y el aire es espeso",
            "No sé, supongo que se me pasará en unos días. Ir al río me deja como nuevo"
        ]
      },
      {
        opciones: [
          {
            texto: "Buscar explicaciones",
            valor: "IR -10",
            mensajes: [
              "Vale, ya veo que no me estás tomando el pelo", 
              "Pero... y la paranoia del principio?",
              "¿No te perseguía alguien?"
            ]
          },
          {
            texto: "Hartarse",
            valor: "IR +10",
            mensajes: [
              "Vamos a ver, Pablo", 
              "Suponiendo que esto sea real, que no lo es, pero bueno",
              "¿Por qué cojones tanto misterio, si luego vas al trabajo tan pichi?",
              "¿No te das cuenta de que no cuela?"
            ]
          }
        ]
      }
    ]
  },

  {
    id: "Capitulo_04",
    fecha: "2026-05-12",
    pasos: [
      {
        mensajes: [
          () => `${(nombreJugador || "Usuario")}, hola. Siento haberme puesto a la defensiva el otro día.`,
          "He estado releyendo nuestras conversaciones y... la verdad, no sé de qué paranoia me hablabas",
          "Estoy perfectamente",
          "Supongo que solo necesitaba mi espacio"
        ]
      },
      {
        opciones: [
          {
            texto: "Dudar",
            valor: "IR +10",
            mensajes: [
              "¿Cómo que perfectamente?",
              "¡Estabas aterrado, decías que te perseguían!",
              "¿Por qué hablamos por aquí, entonces?"
            ],
            respuesta: [
              "Ah… ya. No sé, sería cosa de la fiebrre, no lo recuerdo",
              "Lo que sí recuerdo es haber rotto el movbil, así que me temo que esta es la única manera de seguir en contactpoç"
            ]
          },
          {
            texto: "Curiosear",
            valor: "IR -10",
            mensajes: [
              "Me alegro de que estés mejor, pero dabas bastante mal rollo...",
              "¿Qué ha cambiado?"
            ]
          }
        ],
        respuesta: [ 
              "Verás… Ahora somos uno. Y lo entiendo todo. Él no es un pparásito",
              "Es... una mejorra. Mi mente está cvristalina",
              "Es conmo si llevara toda mi vida respirando a medias y por fin hubiera lllenado los pulmones de vberdadç"
        ]
      },
      {
        opciones: [
          {
            texto: "Asustarse",
            valor: "IR +10",
            mensajes: [
              "Pablo, me estás dando miedo",
              "Hablas como si te hubieran lavado el cerebro"
            ]
          },
          {
            texto: "Escuchar",
            valor: "IR -10",
            mensajes: [
              "Suena una locura, pero transmites mucha paz", 
              "¿Y ahora qué vas a hacer?"
            ]
          }
        ],
        respuesta: [ 
              "Ahora veo a la gente por la calle y me dais ppena. Estáis todos tan secos",
              "Camináis aislados, llenos de estrés, de ansiedad... El no quiere nada de eso",
              "Siento que formo parte de algo más, ojalá pudieras sentirloç",
              "Me he dado cuenta de que no puedo ghuardarme esto para nmi. Es mi nuevo propósito",
              "He estado pensanddo mucho en vosotrosd, en mis amigos. No podéis quedaros así",
              "Aúnm no sé myuy bien cómo hsacerlo",
              "Tengo la garganta súper rreseca y me cuesta tecleawr porque mis dedos segregan una esspecie de aceite continuuio",
              "Voy a sumerggirme un rato en el agua dffría para pensar con claridad en el siguiente paspo",
              "Conéctatye dentro de un parr dfe días",
              "Para entonces tendré umn plan para que podamos vernosç",
              () => `Descamnsa, ${(nombreJugador || "Usuario")}`
        ]
      }
    ]
  },

  {
     id: "Capitulo_05",
    fecha: "2026-05-14",
    mensajeConexionExtra: "> Mensaje programado entrante",
    pasos: [
      {
        mensajes: [
        () => `Hola, ${(nombreJugador || "Usuario")}`,
          "He tenido que dictar este mensaje para poder hablar contigo, mi estructura corporal actual no me permite teclear correctamente.",
          "Lamentablemente ya no estoy aquí, he dejado este mensaje grabado. El aire se me hacía insoportable. Supongo que así es como debe ser.",
          "Me gustaría explicarte mejor las cosas y ofrecerte una alternativa a la penosa realidad en la que vivimos.",
          "Tendrás la oportunidad de ver de lo que soy capaz y solventar todas tus dudas antes de... \nBueno, antes de que todo cambie, digamos.",
          "Recibirás una invitación por correo en los próximos días...\nNo faltes...\nAquí todo es mejor...",
          "Un abrazo,\nPABLO."
        ]
      },
      {
        opciones: [
          {
            texto: "Ir a la policía",
            valor: "IR +20",
            mensajes: [
              "Decides hacer capturas de todo e ir ahora mismo a comisaría, pero aún así, esperas la oportunidad de poder despedirte una última vez"
            ]
          },
          {
            texto: "Aceptar lo inevitable",
            valor: "IR -20",
            mensajes: [
              "La decisión de Pablo te deja pensativo. ¿A qué se refería con lo de que \"todo cambie\"? \nEsperas impaciente la carta",
            ]
          }
        ]
      }
    ]
  }
];

const MENSAJE_CONEXION_CAPITULO = "> CONEXIÓN ESTABLECIDA";
const MENSAJE_DESCONEXION_CAPITULO = "> CONEXIÓN FINALIZADA";
const MENSAJE_SERVIDOR_UNION = "> Pablo se ha conectado.";
const MENSAJE_SERVIDOR_SALIDA = "> Pablo se ha desconectado.";

// ===============================
// ELEMENTOS
// ===============================

const login = document.getElementById("login");
const sistema = document.getElementById("sistema");
const saludo = document.getElementById("saludo");
const mensajesDiv = document.getElementById("mensajes");
const opcionesDiv = document.getElementById("opciones");

function irAlUltimoMensaje() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      mensajesDiv.scrollTop = mensajesDiv.scrollHeight;
    });
  });
}

// ===============================
// LOGIN
// ===============================

document.getElementById("loginForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const clave = document.getElementById("clave").value.trim();
  const error = document.getElementById("error");
  const alias = USUARIO_POR_DEFECTO;

  if (clave !== CLAVE_SECRETA) {
    error.textContent = "CLAVE INCORRECTA.";
    return;
  }

  localStorage.setItem("alias", alias);

  // 🔥 NO LIMPIAR HISTORIAL, mantenerlo
  // localStorage.removeItem("chatHistorial");

  iniciarSistema(alias);
});

const claveInput = document.getElementById("clave");
if (claveInput) {
  claveInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      document.getElementById("loginForm").requestSubmit();
    }
  });
}

const aliasGuardado = localStorage.getItem("alias");
if (aliasGuardado) iniciarSistema(USUARIO_POR_DEFECTO);

// ===============================
// INICIO SISTEMA
// ===============================

function iniciarSistema(alias) {
  login.classList.add("oculto");
  sistema.classList.remove("oculto");
  saludo.textContent = `ACCESO A TERMINAL AUTORIZADO.`;

  mensajesDiv.innerHTML = "";
  opcionesDiv.innerHTML = "";
  mensajesDiv.innerHTML = "";
  opcionesDiv.innerHTML = "";

  const historial = localStorage.getItem("chatHistorial");
  const capIndex = localStorage.getItem("capituloActual");
  const pasoIndex = localStorage.getItem("pasoActual");

  lanzarIntro(() => {
    if (historial) {
      mensajesDiv.innerHTML = historial;
      irAlUltimoMensaje();
    }

    if (capIndex !== null && pasoIndex !== null) {
      lanzarCapitulo(parseInt(capIndex), parseInt(pasoIndex));
    } else {
      comprobarNuevosCapitulos();
    }
  });
}


// ===============================
// INTRO
// ===============================

function lanzarIntro(callback) {
  mensajesDiv.innerHTML = "";

  const ESPERA_SALIDA_INTRO_MS = 1000;

  const intro = [
    "INICIANDO PROTOCOLO DE CONEXIÓN...",
    "SERVIDOR: SECURE_BLAIRS_1998",
    "ESTADO: ENCRIPTACIÓN ACTIVA",
    "> Mensaje entrante detectado."
  ];

  let i = 0;

  function continuarFlujo() {
    if (nombreJugador) {
      if (callback) {
        callback();
      } else {
        comprobarNuevosCapitulos();
      }
    } else {
      pedirNombre();
    }
  }

  function desaparecerIntro(callbackSalida) {
    mensajesDiv.innerHTML = "";
    if (callbackSalida) callbackSalida();
  }

  function siguiente() {
    if (i < intro.length) {
      agregarMensajeSistema(intro[i], () => {
        i++;
        setTimeout(siguiente, 500);
      });
    } else {
      setTimeout(() => {
        desaparecerIntro(continuarFlujo);
      }, ESPERA_SALIDA_INTRO_MS);
    }
  }

  siguiente();
}

// ===============================
// CONTROL CAPÍTULOS
// ===============================

function comprobarNuevosCapitulos() {

  const hoy = new Date();
  let todosCompletados = true;

  for (let i = 0; i < capitulos.length; i++) {

    const cap = capitulos[i];
    const anterior = capitulos[i - 1];

    const decision = localStorage.getItem("decision_" + cap.id);

    if (hoy >= new Date(cap.fecha)) {

      // 🔥 SI NO HA RESPONDIDO ESTE CAPÍTULO → LO REPRODUCIMOS DESDE 0
      if (!decision) {

        todosCompletados = false;

        // SOLO si el anterior está completado
        if (i === 0 || localStorage.getItem("decision_" + anterior.id)) {
          lanzarCapitulo(i);
        }

        break;
      }

      // SI YA ESTÁ COMPLETADO → PASA AL SIGUIENTE
    } else {
      todosCompletados = false;
    }
  }
}


// ===============================
// LANZAR CAPÍTULO
// ===============================

function lanzarCapitulo(index, pasoInicial = 0){

  const cap = capitulos[index];
  let pasoActual = pasoInicial;

  function normalizarRespuestas(respuesta) {
    if (respuesta === undefined || respuesta === null) {
      return [];
    }
    return Array.isArray(respuesta) ? respuesta : [respuesta];
  }

  function construirRespuestaFinal(op, paso) {
    const personalizada = normalizarRespuestas(op.respuesta);
    const comun = normalizarRespuestas(paso.respuesta);

    // Si hay respuesta por opcion, va primero y luego la comun del paso.
    if (personalizada.length > 0) {
      return [...personalizada, ...comun];
    }

    return comun;
  }

  function agregarMensajePorTipo(tipoMensaje, texto, callback) {
    if (tipoMensaje === "jugador") {
      agregarMensajeJugador(texto, callback);
      return;
    }

    if (tipoMensaje === "indicador") {
      agregarIndicadorAccion(texto, callback);
      return;
    }

    agregarMensajeSistema(texto, callback);
  }

  function procesarElementoSecuencia(elemento, tipoMensaje, callback) {
    let contenido = elemento;

    if (typeof contenido === "function") {
      contenido = contenido();
    }

    if (contenido && typeof contenido === "object" && !Array.isArray(contenido)) {
      const audio = contenido.audio;
      const texto = contenido.texto;
      const volumen = typeof contenido.volumen === "number" ? contenido.volumen : 0.8;
      const desde = typeof contenido.desde === "number" ? contenido.desde : undefined;
      const hasta = typeof contenido.hasta === "number" ? contenido.hasta : undefined;
      const duracion = typeof contenido.duracion === "number" ? contenido.duracion : undefined;
      const avisoSistema = contenido.avisoSistema;
      const cierreSistema = contenido.cierreSistema;

      if (audio) {
        const aviso = avisoSistema === false ? "" : (typeof avisoSistema === "string" ? avisoSistema : formatearAvisoMicrofono("ACTIVO"));
        const cierre = cierreSistema === false ? "" : (typeof cierreSistema === "string" ? cierreSistema : formatearAvisoMicrofono("DESACTIVADO"));

        const continuarDespuesCierre = () => {
          if (typeof texto === "string" && texto.length > 0) {
            agregarMensajePorTipo(tipoMensaje, texto, callback);
          } else if (callback) {
            callback();
          }
        };

        const mostrarCierre = () => {
          if (!(tipoMensaje === "sistema" && cierre.length > 0)) {
            continuarDespuesCierre();
            return;
          }

          const divCierre = document.createElement("div");
          divCierre.className = "mensajeSistema mensajeEstadoMicro";
          mensajesDiv.appendChild(divCierre);
          mensajesDiv.scrollTop = mensajesDiv.scrollHeight;

          escribirTexto(divCierre, cierre, () => {
            setTimeout(() => {
              ocultarYEliminarElemento(divCierre, 0, continuarDespuesCierre);
            }, 2000);
          });
        };

        const reproducir = () => {
          reproducirAudioNarrativo(audio, { volumen, desde, hasta, duracion }, () => {
            setTimeout(mostrarCierre, 120);
          });
        };

        if (tipoMensaje === "sistema" && aviso.length > 0) {
          const divEstado = document.createElement("div");
          divEstado.className = "mensajeSistema mensajeEstadoMicro";
          divEstado.classList.add("activo");
          mensajesDiv.appendChild(divEstado);
          mensajesDiv.scrollTop = mensajesDiv.scrollHeight;
          escribirTexto(divEstado, aviso, () => {
            setTimeout(() => {
              ocultarYEliminarElemento(divEstado, 0, reproducir);
            }, 1000);
          });
        } else {
          reproducir();
        }

        return;
      }

      if (typeof texto === "string") {
        agregarMensajePorTipo(tipoMensaje, texto, callback);
        return;
      }
    }

    agregarMensajePorTipo(tipoMensaje, String(contenido ?? ""), callback);
  }

  // Guardar estado
  localStorage.setItem("capituloActual", index);
  localStorage.setItem("pasoActual", pasoActual);

  function completarCapitulo() {
    // 🔥 MARCAR CAPÍTULO COMO COMPLETADO
    localStorage.setItem("decision_" + cap.id, "completado");

    // Limpiar pasos del capítulo
    for (let p = 0; p < cap.pasos.length; p++) {
      localStorage.removeItem("paso_" + cap.id + "_" + p);
      localStorage.removeItem("opcion_" + cap.id + "_" + p);
    }

    // Limpiar estado del capítulo
    localStorage.removeItem("capituloActual");
    localStorage.removeItem("pasoActual");
    localStorage.removeItem("enviado_" + cap.id);

    comprobarNuevosCapitulos();
  }

  function ejecutarPaso(){

    // Insertar marcador de fecha al inicio del capítulo (estilo WhatsApp)
    if (pasoActual === 0 && !localStorage.getItem("cap_fecha_" + cap.id)) {
      localStorage.setItem("cap_fecha_" + cap.id, "guardada");
      const [y, m, d] = cap.fecha.split("-");
      const fechaFormateada = `${d}/${m}/${y}`;
      const div = document.createElement("div");
      div.className = "fechaCapitulo";
      div.textContent = `— ${fechaFormateada} —`;
      mensajesDiv.appendChild(div);
      guardarHistorial();
      ejecutarPaso();
      return;
    }

    // Mensajes del servidor al inicio de cada capítulo (después de la fecha)
    if (pasoActual === 0 && !localStorage.getItem("cap_inicio_servidor_" + cap.id)) {
      localStorage.setItem("cap_inicio_servidor_" + cap.id, "mostrada");
      agregarMensajeServidor(MENSAJE_CONEXION_CAPITULO, () => {
        setTimeout(() => {
          agregarMensajeServidor(MENSAJE_SERVIDOR_UNION, () => {
            if (cap.mensajeConexionExtra) {
              setTimeout(() => {
                agregarMensajeServidor(cap.mensajeConexionExtra, () => {
                  guardarHistorial();
                  ejecutarPaso();
                }, "mensajeConexionExtra");
              }, 260);
            } else {
              guardarHistorial();
              ejecutarPaso();
            }
          }, "mensajeServidorUnion");
        }, 260);
      });
      return;
    }

    const paso = cap.pasos[pasoActual];

      if(!paso){
        // Mensajes del servidor al finalizar cada capítulo
        if (!localStorage.getItem("cap_fin_servidor_" + cap.id)) {
          localStorage.setItem("cap_fin_servidor_" + cap.id, "mostrada");
          
          // Comprobar si es el último capítulo
          const esUltimoCapitulo = index === capitulos.length - 1;
          
          if (esUltimoCapitulo) {
            // Mostrar mensaje de servidor estropeado usando el mismo sistema que el resto
            const mensajesFinal = [
              "> ERROR: CONEXIÓN PERDIDA",
              "> SERVIDOR NO DISPONIBLE",
              "> RECONECTANDO...",
              "> FALLO CRÍTICO DEL SISTEMA",
              "> EL SISTEMA SE AUTODESTRUIRÁ",
            ];
            
            let msgIndex = 0;
            const mostrarSiguiente = () => {
              if (msgIndex < mensajesFinal.length) {
                const msg = mensajesFinal[msgIndex];
                const claseExtra = undefined;
                msgIndex++;
                agregarMensajeServidor(msg, () => {
                  setTimeout(mostrarSiguiente, 220);
                }, claseExtra);
              } else {
                guardarHistorial();
                completarCapitulo();
              }
            };
            mostrarSiguiente();
          } else {
            // Mensajes normales de desconexión
            agregarMensajeServidor(MENSAJE_SERVIDOR_SALIDA, () => {
              setTimeout(() => {
                agregarMensajeServidor(MENSAJE_DESCONEXION_CAPITULO, () => {
                  guardarHistorial();
                  completarCapitulo();
                });
              }, 220);
            }, "mensajeServidorSalida");
          }
          return;
        }

        completarCapitulo();
        return;
      }


    // 🔥 MENSAJES (VARIOS)
    if(paso.mensajes){

      let i = 0;

      function escribirMensajes(){
        if(i < paso.mensajes.length){

          procesarElementoSecuencia(paso.mensajes[i], "sistema", ()=>{
            i++;
            setTimeout(escribirMensajes, 400);
          });

        }else{
          pasoActual++;
          localStorage.setItem("pasoActual", pasoActual);
          guardarHistorial();
          setTimeout(ejecutarPaso, 400);
        }
      }

      escribirMensajes();
      return;
    }

    // 🔥 OPCIONES
    if(paso.opciones){
      // Verificar si ya se respondió este paso
      const opcionGuardada = localStorage.getItem("opcion_" + cap.id + "_" + pasoActual);
      if(opcionGuardada){
        // Simular la selección
        const op = paso.opciones.find(o => (o.valor || o.texto) === opcionGuardada || o.texto === opcionGuardada);
        if(op){
          opcionesDiv.innerHTML = "";

          // RESPUESTA: personalizada primero y luego la comun del paso.
          let respuestaFinal = construirRespuestaFinal(op, paso);

          let j = 0;

          function escribirRespuesta(){
            if(j < respuestaFinal.length){
              procesarElementoSecuencia(respuestaFinal[j], "sistema", ()=>{
                j++;
                setTimeout(escribirRespuesta, 400);
              });
            }else{
              pasoActual++;
              localStorage.setItem("pasoActual", pasoActual);
              guardarHistorial();
              setTimeout(ejecutarPaso, 400);
            }
          }

          escribirRespuesta();
        } else {
          mostrarOpcionesPaso(paso);
        }
      } else {
        mostrarOpcionesPaso(paso);
      }
    }
  }

  function mostrarOpcionesPaso(paso){

    opcionesDiv.innerHTML = "";

    paso.opciones.forEach(op => {

      const btn = document.createElement("button");
      btn.textContent = op.texto;

      btn.onclick = ()=>{
        // Marcar paso como respondido y guardar opción
        localStorage.setItem("paso_" + cap.id + "_" + pasoActual, "respondido");
        localStorage.setItem("opcion_" + cap.id + "_" + pasoActual, op.valor || op.texto);

        // 🚀 Enviar cuando ya están todas las respuestas del capítulo.
        const totalRespuestasCapitulo = contarPasosConOpciones(cap);
        const respuestasCapitulo = obtenerRespuestasCapitulo(cap.id, totalRespuestasCapitulo);
        const estanTodasLasRespuestas = respuestasCapitulo.every((respuesta) => Boolean(respuesta));

        const yaEnviado = localStorage.getItem("enviado_" + cap.id);

        if(estanTodasLasRespuestas && !yaEnviado){
          enviarAGoogleForms(cap.id, totalRespuestasCapitulo);
          localStorage.setItem("enviado_" + cap.id, "true");
        }

        opcionesDiv.innerHTML = "";

        // 🟢 MENSAJES DEL JUGADOR
        let i = 0;
        const tipoMensajeJugador = cap.id === "Capitulo_05" ? "indicador" : "jugador";

        function escribirJugador(){
          if(i < op.mensajes.length){
            procesarElementoSecuencia(op.mensajes[i], tipoMensajeJugador, ()=>{
              i++;
              setTimeout(escribirJugador, 300);
            });
          }else{
            guardarHistorial();
            setTimeout(escribirRespuesta, 400);
          }
        }

        // 🔴 RESPUESTA: personalizada primero y luego la comun del paso.
        let respuestaFinal = construirRespuestaFinal(op, paso);

        let j = 0;

        function escribirRespuesta(){
          if(j < respuestaFinal.length){
            procesarElementoSecuencia(respuestaFinal[j], "sistema", ()=>{
              j++;
              setTimeout(escribirRespuesta, 400);
            });
          }else{
            pasoActual++;
            localStorage.setItem("pasoActual", pasoActual);
            guardarHistorial();
            setTimeout(ejecutarPaso, 400);
          }
        }

        escribirJugador();
      };

      opcionesDiv.appendChild(btn);
    });
  }

  ejecutarPaso();
}

// ===============================
// EFECTO ESCRITURA PRO
// ===============================

function escribirTexto(div, texto, callback) {

  let i = 0;
  let timeoutId = null;

  escrituraEnCurso = {
    div,
    texto,
    callback,
    timeoutId
  };

  function escribir() {

    if (i < texto.length) {

      div.textContent = texto.substring(0, i) + "█";

      if (texto[i] !== " " && audioHabilitado && /*tecladoHabilitado &&*/ sonidoTecla && !document.hidden) {
        const clip = sonidoTecla.cloneNode(true);
        clip.volume = 0.15;
        clip.currentTime = 0;

        audiosActivos.add(clip);

        const limpiarClip = () => {
          audiosActivos.delete(clip);
        };

        clip.addEventListener("ended", limpiarClip, { once: true });
        clip.addEventListener("error", limpiarClip, { once: true });

        clip.play().catch(() => {});
      }

      let velocidad = 20 + Math.random() * 40;

      if (texto[i] === "." || texto[i] === ",") {
        velocidad = 300;
      }

      i++;
      mensajesDiv.scrollTop = mensajesDiv.scrollHeight;

      timeoutId = setTimeout(escribir, velocidad);
      if (escrituraEnCurso) {
        escrituraEnCurso.timeoutId = timeoutId;
      }

    } else {

      div.textContent = texto;
      escrituraEnCurso = null;

      // No guardar aquí

      if (callback) callback();
    }
  }

  escribir();
}

function borrarTextoIntro(div, callback) {
  let texto = div.textContent || "";
  let i = texto.length;
  let timeoutId = null;

  function borrar() {
    if (i > 0) {
      div.textContent = texto.substring(0, i - 1) + "█";

      let velocidad = 20 + Math.random() * 40;

      if (texto[i - 1] === "." || texto[i - 1] === ",") {
        velocidad = 300;
      }

      i--;
      timeoutId = setTimeout(borrar, velocidad);
    } else {
      div.textContent = "";
      if (callback) callback();
    }
  }

  borrar();
}

// ===============================
// MENSAJES
// ===============================


function agregarMensajeSistema(texto, callback) {
  const div = document.createElement("div");
  div.className = "mensajeSistema";
  mensajesDiv.appendChild(div);

  escribirTexto(div, texto, callback);
}

function agregarMensajeServidor(texto, callback, claseExtra) {
  const div = document.createElement("div");
  div.className = "mensajeSistema mensajeServidor" + (claseExtra ? " " + claseExtra : "");
  mensajesDiv.appendChild(div);

  escribirTexto(div, texto, callback);
}

function agregarMensajeJugador(texto, callback) {
  const div = document.createElement("div");
  div.className = "mensajeJugador";
  mensajesDiv.appendChild(div);

  escribirTexto(div, texto, callback);
}

function agregarIndicadorAccion(texto, callback) {
  const div = document.createElement("div");
  div.className = "mensajeJugador mensajeIndicadorAccion";
  mensajesDiv.appendChild(div);

  escribirTexto(div, texto, callback);
}

// ===============================
// OPCIONES
// ===============================

function mostrarOpciones(index) {
  const cap = capitulos[index];
  opcionesDiv.innerHTML = "";

  cap.opciones.forEach(op => {
    const btn = document.createElement("button");
    btn.textContent = op.texto;

    btn.onclick = () => {
      opcionesDiv.innerHTML = "";

      mostrarJugadorMultiple(op.mensajes || op.texto, () => {

        setTimeout(() => {

          mostrarRespuestaMultiple(op.respuesta, () => {

            localStorage.setItem("decision_" + cap.id, op.texto);

            setTimeout(() => comprobarNuevosCapitulos(), 800);

          });

        }, 500);

      });

    };


    opcionesDiv.appendChild(btn);
  });
}

// ===============================
// RESPUESTA
// ===============================

function responder(opcion, cap) {

  localStorage.setItem("decision_" + cap.id, opcion.texto);
  opcionesDiv.innerHTML = "";

  agregarMensajeJugador(opcion.texto, () => {

    setTimeout(() => {

      agregarMensajeSistema(opcion.respuesta, () => {
        setTimeout(() => comprobarNuevosCapitulos(), 800);
      });

    }, 500);

  });
}

function mostrarRespuestaMultiple(respuestas, callback){

  // Si es solo texto normal → lo convertimos en array
  if(!Array.isArray(respuestas)){
    respuestas = [respuestas];
  }

  let i = 0;

  function siguiente(){

    if(i < respuestas.length){

      agregarMensajeSistema(respuestas[i], () => {
        i++;
        setTimeout(siguiente, 600);
      });

    } else {
      if(callback) callback();
    }

  }

  siguiente();
}

function mostrarJugadorMultiple(respuestas, callback){

  if(!Array.isArray(respuestas)){
    respuestas = [respuestas];
  }

  let i = 0;

  function siguiente(){

    if(i < respuestas.length){

      agregarMensajeJugador(respuestas[i], () => {
        i++;
        setTimeout(siguiente, 500);
      });

    } else {
      if(callback) callback();
    }

  }

  siguiente();
}

let guardandoChat = false;

// ===============================
// GUARDAR HISTORIAL
// ===============================

function guardarHistorial() {
  localStorage.setItem("chatHistorial", mensajesDiv.innerHTML);
}