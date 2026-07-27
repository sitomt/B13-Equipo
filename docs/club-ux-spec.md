# Baktun 13 - Especificación UX del área Club

Estado: propuesta funcional validada mediante revisión heurística y recorridos simulados por rol.

Esta especificación no modifica la aplicación. Define el comportamiento que deberá implementarse y probarse por bloques.

## 1. Objetivos

- Convertir `Club` en una herramienta de consulta operativa, no en un gestor genérico de documentos.
- Permitir que cualquier trabajador encuentre información y actúe con pocos pasos.
- Dar a dirección y responsables las mismas capacidades bajo el rol `Admin`.
- Evitar que limpieza y mantenimiento conozcan siquiera la existencia de credenciales.
- Mantener todo el contenido recuperable mediante archivo y versiones.
- Generar notificaciones internas por usuario y preparar su posterior envío por push.

## 2. Decisiones Cerradas

- `Contactos útiles`, `Accesos y contraseñas`, `Reuniones`, `Manuales y protocolos` y `Políticas` son módulos fijos.
- Los módulos fijos no se renombran ni se eliminan.
- Dirección y los dos responsables comparten el rol `Admin`.
- Los admins pueden crear, editar, publicar, archivar, restaurar y eliminar definitivamente.
- Todos los trabajadores pueden consultar todos los contactos.
- Las credenciales tienen dos audiencias: `Solo admins` y `Admins y coaches`.
- Limpieza y mantenimiento no ven el módulo de credenciales, resultados relacionados ni enlaces directos.
- Mostrar o copiar una contraseña exige confirmar nuevamente el PIN.
- Reuniones admite PDF e imágenes, incluidas capturas de pantalla.
- Manuales, protocolos y políticas combinan lectura dentro de la aplicación y archivo original opcional.
- Las políticas no tienen confirmación de lectura.
- El contenido archivado se conserva.
- Al sustituir una contraseña se conserva el historial de la operación, pero no el secreto anterior.
- La primera fase entrega notificaciones dentro de la aplicación. La segunda extiende los mismos eventos a push.

## 3. Arquitectura De Información

### 3.0 Puerta De Seguridad Obligatoria

Antes de implementar Credenciales o adjuntos privados se deberá sustituir la identidad local por una identidad autenticada individual y aplicar autorización en servidor.

Condiciones mínimas:

- Supabase Auth para identificar a cada persona.
- Rol y permisos administrados como datos no editables por el usuario.
- RLS en todas las tablas expuestas.
- Consultas que devuelvan únicamente filas autorizadas.
- Función de servidor para comprobar PIN, limitar intentos y entregar un único secreto autorizado.
- Auditoría de cada revelado, copia, creación, modificación y archivo de credenciales.
- Bucket privado y políticas RLS para actas y archivos.
- URLs autenticadas o temporales; nunca URLs públicas permanentes.

El módulo Credenciales no puede publicarse mientras estas condiciones no estén verificadas. Ocultarlo en React no constituye autorización.

### 3.1 Club Para Admin

1. Calendario anual.
2. Manuales y protocolos.
3. Políticas.
4. Contactos útiles.
5. Reuniones.
6. Accesos y contraseñas.
7. Gestión del club.

`Gestión del club` conserva equipo, áreas y zonas, etiquetas de incidencias y franjas del gimnasio. Ya no ofrece crear categorías documentales.

### 3.2 Club Para Coach

1. Calendario anual.
2. Manuales y protocolos visibles para coaches.
3. Políticas visibles para coaches.
4. Contactos útiles.
5. Reuniones visibles para coaches.
6. Accesos y contraseñas compartidos con coaches.

### 3.3 Club Para Limpieza Y Mantenimiento

La navegación principal deberá incorporar `Club`, porque actualmente estos roles no tienen acceso.

Dentro de Club verán:

1. Calendario anual.
2. Contactos útiles.
3. Manuales, protocolos, políticas o reuniones compartidos expresamente con su rol.

No verán:

- Accesos y contraseñas.
- Contadores que revelen credenciales.
- Resultados de búsqueda relacionados.
- Acciones administrativas.

### 3.4 Patrón Común De Los Módulos

- Cabecera con botón `Volver`, título literal y botón `+` de 44 x 44 px solo para admins.
- Búsqueda debajo de la cabecera cuando haya contenido suficiente para justificarla.
- Listado de una columna, optimizado para lectura rápida.
- Una única acción primaria por pantalla.
- Menú `Más` para editar, archivar y otras acciones secundarias.
- Volver conserva búsqueda, filtros y posición de desplazamiento.
- Los enlaces de notificación abren directamente el elemento, no solamente el inicio de Club.
- No se utilizan `Categoría`, `Nuevo documento`, `Editar documento` ni `Borrar categoría`.

## 4. Contactos Útiles

### 4.1 Pantalla De Lista

Orden:

1. Contactos marcados como prioritarios.
2. Resto de contactos ordenados por servicio.

Cada contacto muestra:

- Servicio u oficio.
- Nombre.
- Empresa, si existe.
- Teléfono.
- Acción `Llamar`.
- Acción `WhatsApp`.
- Menú `Más`.

Ejemplo:

```text
FONTANERÍA
José Martínez · Fontanería Martínez
612 345 678

[Llamar] [WhatsApp] [Más]
```

`Llamar` y `WhatsApp` permanecen visibles porque son las tareas principales. Editar y archivar quedan dentro de `Más`.

### 4.2 Consulta Por Cualquier Trabajador

1. Abrir `Club`.
2. Abrir `Contactos útiles`.
3. Buscar por servicio, nombre o empresa, si es necesario.
4. Pulsar `Llamar` para abrir el marcador nativo con el número preparado.
5. Pulsar `WhatsApp` para abrir una conversación con el contacto.
6. Regresar conserva búsqueda y posición.

No se pide confirmación antes de abrir el marcador o WhatsApp.

Si WhatsApp no puede abrirse:

- Mensaje: `No hemos podido abrir WhatsApp.`
- Acción alternativa: `Copiar teléfono`.
- Acción secundaria: `Cancelar`.

### 4.3 Alta Por Admin

1. Pulsar `+`, con etiqueta accesible `Añadir contacto`.
2. Completar:
   - Servicio u oficio, obligatorio.
   - Nombre, obligatorio.
   - Empresa, opcional.
   - Teléfono, obligatorio.
   - `Este número tiene WhatsApp`, activado por defecto.
   - Notas, opcional.
3. Pulsar `Guardar contacto`.
4. Volver a la lista con el nuevo contacto resaltado brevemente.

El teclado del teléfono debe ser numérico. El sistema normaliza prefijo y espacios sin alterar el valor que ve el usuario.

### 4.4 Edición Y Archivo

- `Más > Editar contacto` abre el mismo formulario.
- `Más > Archivar contacto` pide confirmación.
- Tras archivar: `Contacto archivado` con acción `Deshacer`.
- El archivo solo es visible para admins.
- Restaurar devuelve el contacto a su posición correspondiente.

### 4.5 Estados Y Errores

- Vacío admin: `Todavía no hay contactos útiles` / `Añade el primer contacto del gimnasio.`
- Sin resultados: `No hay contactos para “fontanero”.`
- Teléfono inválido: `Introduce un teléfono válido.`
- Error al guardar: `No se ha podido guardar. Tus cambios siguen aquí.`
- Sin conexión: se muestran los contactos cargados previamente y el mensaje `Información guardada en este dispositivo. Puede no estar actualizada.`

### 4.6 Criterios De Aceptación

- Todos los roles pueden abrir Contactos.
- Se puede iniciar una llamada o WhatsApp con un único toque desde la lista.
- Los controles táctiles miden al menos 44 x 44 px y están separados al menos 8 px.
- Solo admins ven alta, edición, archivo y archivo histórico.
- Una búsqueda nunca pierde su estado al regresar de un contacto.

## 5. Accesos Y Contraseñas

### 5.1 Permisos

| Rol | Acceso |
| --- | --- |
| Admin | Ve todas las credenciales y puede administrarlas. |
| Coach | Ve únicamente `Admins y coaches`. |
| Limpieza | No ve el módulo ni indicios de su existencia. |
| Mantenimiento | No ve el módulo ni indicios de su existencia. |

La seguridad no puede depender de ocultar elementos en la interfaz. El servidor solo debe devolver los registros y secretos autorizados para la persona.

### 5.2 Pantalla De Lista

La lista nunca muestra secretos.

Cada fila muestra:

- Servicio.
- Usuario o identificador, si existe.
- Contraseña representada como puntos.
- Última actualización.
- Audiencia, visible solo para admins.
- `Mostrar`, `Copiar` y `Más`.

La búsqueda utiliza servicio y usuario. Nunca indexa ni busca contraseñas.

### 5.3 Reautenticación

Aunque una sesión temporal reduciría fricción, la decisión confirmada es pedir nuevamente el PIN antes de cada revelado o copia.

1. Pulsar `Mostrar` o `Copiar`.
2. Abrir una pantalla segura: `Confirma tu PIN para ver la contraseña de Alarma del gimnasio`.
3. Introducir los cuatro dígitos.
4. El servidor valida identidad, permiso, PIN y límite de intentos para esa acción.
5. `Mostrar` revela el secreto durante 15 segundos.
6. `Copiar` lo copia sin mostrarlo.
7. Una nueva revelación o copia vuelve a solicitar el PIN.
8. Al minimizar, bloquear, cerrar sesión o abandonar la aplicación, cualquier secreto visible se oculta inmediatamente.

`Copiar` no revela el valor y confirma únicamente `Contraseña copiada`.

### 5.4 PIN Incorrecto

- Primeros intentos: `El PIN no es correcto. Inténtalo de nuevo.`
- Tras cinco fallos consecutivos: bloqueo temporal aplicado en servidor y mensaje `Acceso bloqueado temporalmente por seguridad.`
- El PIN no admite pegar y nunca aparece en registros o mensajes.
- Cancelar vuelve a la lista sin revelar información.

### 5.5 Alta Y Edición Por Admin

Campos:

- Servicio, obligatorio.
- Usuario o correo, opcional.
- Contraseña, obligatoria.
- Enlace, opcional.
- Notas, opcionales y nunca destinadas a guardar otros secretos.
- Visibilidad:
  - `Solo admins`, valor inicial.
  - `Admins y coaches`.

Antes de guardar se muestra una frase explícita:

`Podrán consultar esta contraseña: admins y coaches.`

Al cambiar la contraseña:

- Se registra autor y fecha del cambio.
- Se elimina el valor secreto anterior.
- No se incluye el secreto en notificaciones ni historiales.

### 5.6 Seguridad Y Conexión

- Las contraseñas no se guardan para consulta offline.
- Sin conexión: `Necesitas conexión para consultar contraseñas.`
- El secreto debe solicitarse al servidor después de validar PIN y permisos.
- Un enlace directo no autorizado vuelve a Club con `No tienes acceso a esta sección.`
- Cambiar de rol, cerrar sesión o enviar la app a segundo plano vuelve a ocultar todo.

### 5.7 Criterios De Aceptación

- Limpieza y mantenimiento no reciben nombres, usuarios, contadores ni secretos.
- Un coach no puede obtener una credencial `Solo admins`, ni manipulando la URL.
- Ninguna contraseña aparece en la lista, búsqueda, notificación o historial.
- Mostrar y copiar exigen una nueva validación de PIN.
- Enviar la app a segundo plano oculta inmediatamente cualquier secreto.
- La contraseña anterior no se conserva tras una rotación.

## 6. Reuniones

### 6.1 Pantalla De Lista

Orden cronológico descendente y agrupación por año.

Cada elemento muestra:

- Fecha como título principal.
- Miniatura si es imagen o icono si es PDF.
- Primera línea de las notas, si existen.
- Audiencia, solo para admins.

No se exige título. La etiqueta se genera como `Reunión · 27 jul 2026`.

### 6.2 Subir Acta

1. Pulsar `+`, con etiqueta accesible `Subir acta`.
2. La fecha aparece con el día actual y puede modificarse.
3. Elegir una fuente:
   - `Hacer foto`.
   - `Elegir imágenes`.
   - `Subir PDF`.
4. Adjuntar un PDF o hasta cinco imágenes.
5. Añadir notas opcionales.
6. Elegir audiencia. Valor inicial recomendado: `Admins y coaches`, con posibilidad de incluir limpieza o mantenimiento cuando corresponda.
7. Revisar la previsualización.
8. Pulsar `Publicar acta`.

El archivo es obligatorio. Las notas no lo son.

Formatos iniciales: PDF, JPG y PNG. Los archivos HEIC seleccionados desde iPhone se convierten a un formato previsualizable antes de publicarse. Límite recomendado: 15 MB por acta.

Los archivos se guardan en un bucket privado. La aplicación obtiene acceso autenticado o una URL temporal después de comprobar la audiencia.

### 6.3 Consulta

- Una imagen se abre a pantalla completa con zoom y rotación.
- Varias imágenes se recorren verticalmente; no mediante un carrusel obligatorio.
- Un PDF se previsualiza dentro de la aplicación y ofrece `Abrir archivo`.
- Las notas aparecen después del archivo.
- El menú admin permite editar notas, sustituir archivo, cambiar audiencia o archivar.

### 6.4 Estados Y Errores

- Vacío admin: `Todavía no hay actas` / `Sube una imagen o un PDF de la primera reunión.`
- Vacío empleado: `No hay reuniones compartidas contigo.`
- Subida: progreso visible y botón bloqueado para evitar duplicados.
- Formato incorrecto: `Sube un PDF, JPG, PNG o HEIC.`
- Archivo grande: `El archivo supera el límite de 15 MB.`
- Fallo: `No se ha podido completar la subida. Tu borrador sigue guardado.`
- Conflicto: `Esta reunión cambió mientras la editabas. Revisa la versión más reciente.`

### 6.5 Criterios De Aceptación

- Un admin puede publicar una captura desde iPhone sin escribir un título.
- Cancelar una selección de archivo no elimina las notas ya escritas.
- Una subida fallida conserva fecha, audiencia y notas.
- El trabajador solo ve reuniones dirigidas a su rol.
- Imágenes y PDF pueden consultarse sin descargar obligatoriamente.
- Un enlace de archivo caducado se renueva solamente si el usuario sigue teniendo permiso.

## 7. Manuales Y Protocolos

### 7.1 Pantalla De Biblioteca

- Buscador por título, resumen y contenido.
- Filtro segmentado `Todos`, `Manuales`, `Protocolos` cuando exista suficiente contenido.
- Lista de filas, no una cuadrícula de tarjetas.
- Cada fila muestra tipo, título, resumen de dos líneas y fecha de actualización.
- Los admins ven además audiencia y estado `Borrador` o `Publicado`.

### 7.2 Crear Contenido

1. Pulsar `+`, con etiqueta accesible `Crear manual o protocolo`.
2. Elegir `Manual` o `Protocolo`.
3. Escribir título obligatorio.
4. Escribir resumen breve.
5. Crear contenido con una herramienta sencilla:
   - Títulos de sección.
   - Texto.
   - Lista con viñetas.
   - Pasos numerados.
   - Lista de comprobación.
6. Adjuntar opcionalmente PDF o imagen original.
7. Elegir audiencia.
8. Guardar como borrador o previsualizar.
9. Publicar.

Guardar un borrador no genera notificación. Solo los admins ven borradores.

La audiencia inicial es `Admins y coaches`. El admin puede incluir limpieza o mantenimiento cuando el contenido afecte a esos equipos.

### 7.3 Fuente Vigente

El texto dentro de la aplicación es la versión operativa vigente. El archivo adjunto se identifica como `Archivo original o material complementario`.

Esto evita que el texto y el PDF parezcan dos instrucciones igualmente válidas cuando contienen diferencias.

### 7.4 Lectura

La vista de lectura muestra:

1. Tipo.
2. Título.
3. Resumen.
4. Fecha de última actualización.
5. Contenido estructurado y sin tarjeta exterior innecesaria.
6. `Ver archivo adjunto`, si existe.

El contenido utiliza párrafos legibles, títulos jerárquicos y listas reales. No se presenta como un único bloque de texto plano.

### 7.5 Actualizaciones Y Versiones

Al modificar contenido publicado:

1. Se crea una nueva versión.
2. Se pide un resumen breve: `¿Qué ha cambiado?`
3. Se previsualiza la versión final.
4. Al publicar, la versión anterior pasa al historial.
5. Los trabajadores solo ven la versión vigente.
6. Los admins pueden consultar y restaurar versiones anteriores.

Decisión de notificación:

- Como el usuario ha pedido avisar ante cada modificación, toda nueva publicación genera notificación.
- Las correcciones todavía pueden acumularse en borrador para evitar varios avisos consecutivos.

### 7.6 Estados

- Vacío admin: `Crea el primer manual o protocolo.`
- Vacío empleado: `Todavía no hay contenido disponible para tu función.`
- Sin resultados: `No encontramos resultados para “apertura”.`
- Borrador recuperado: `Hemos recuperado los cambios que no habías publicado.`
- Publicado: `Publicado y notificado.`
- Archivado: `Contenido archivado` con `Deshacer`.

### 7.7 Criterios De Aceptación

- Un coach encuentra el protocolo de cierre mediante búsqueda y en menos de tres interacciones.
- El lector distingue claramente versión vigente, resumen y archivo complementario.
- Un borrador nunca se muestra ni notifica a trabajadores.
- Una publicación crea versión y evento de notificación para su audiencia.
- El enlace de la notificación abre directamente el contenido actualizado.

## 8. Políticas

### 8.1 Lista Y Lectura

La estructura es similar a Manuales, pero sin filtro de tipo.

Cada política muestra:

- Título.
- Resumen.
- Versión.
- Fecha de publicación o actualización.

La lectura utiliza contenido dentro de la aplicación y archivo original opcional.

### 8.2 Administración

1. Crear borrador.
2. Añadir título, resumen, contenido y archivo opcional.
3. Elegir audiencia.
4. Previsualizar.
5. Publicar.
6. Crear nueva versión cuando se modifica.
7. Archivar cuando deja de estar vigente.

No existe:

- `Marcar como leído`.
- Porcentaje de lectura.
- Mensajes como `Todo el equipo está informado`.

La aplicación puede afirmar que la política fue publicada y que se generó una notificación, no que fue comprendida.

### 8.3 Criterios De Aceptación

- Publicar o actualizar genera notificación para la audiencia.
- La política vigente se distingue de versiones anteriores.
- Los trabajadores no ven controles administrativos.
- No se registra ni presenta confirmación de lectura.

## 9. Notificaciones

### 9.1 Modelo Común

Una publicación crea un evento con:

- Tipo de evento.
- Elemento de origen.
- Acción: creado o actualizado.
- Título.
- Resumen de cambio.
- Audiencia.
- Autor.
- Fecha.
- Enlace profundo.

Cada destinatario tiene su propio estado `no leído` o `leído`.

### 9.2 Comportamiento

- Resumen muestra únicamente eventos no leídos.
- Pulsar abre el contenido exacto.
- Abrir la pestaña Avisos no marca ningún elemento.
- El evento se marca como leído únicamente al abrir correctamente su detalle o destino.
- Después desaparece de Resumen.
- Permanece en el historial de Avisos.
- El badge de Avisos refleja el total pendiente real.
- El autor no recibe una notificación redundante sobre su propia publicación; los demás admins sí.
- Entrega push, visualización en pantalla y lectura son estados distintos.
- El marcado de lectura es idempotente y se sincroniza al recuperar la conexión.

Ejemplos:

```text
Protocolo actualizado
Ha cambiado el protocolo de apertura y cierre.
```

```text
Nueva política
Ya está disponible la política de uso de instalaciones.
```

Las notificaciones nunca contienen contraseñas, usuarios sensibles ni notas privadas.

### 9.3 Despliegue

Fase 1:

- Eventos internos.
- Estado individual leído/no leído.
- Resumen, badge e historial.
- Enlaces profundos.

Fase 2:

- El mismo evento genera Web Push para dispositivos suscritos.
- Pulsar el push abre el mismo enlace profundo.
- Fallar el push no impide guardar ni publicar contenido.

## 10. Archivo E Historial

- `Archivo` es una entrada secundaria visible solo para admins.
- Está separado por módulo.
- Permite buscar, consultar y restaurar.
- La eliminación definitiva solo aparece dentro de Archivo.
- Eliminar definitivamente exige confirmación reforzada con el nombre del elemento.
- Reuniones se conservan de forma cronológica y normalmente no necesitan archivarse manualmente.
- Versiones anteriores de manuales, protocolos y políticas son inmutables.
- Los contactos archivados conservan sus datos.
- Las credenciales archivadas conservan metadatos, pero no secretos sustituidos.

## 11. Accesibilidad Y Calidad

- Objetivos táctiles mínimos de 44 x 44 px.
- Separación mínima de 8 px entre acciones adyacentes.
- Texto normal con contraste mínimo 4.5:1.
- Etiquetas visibles en formularios; los placeholders no actúan como etiquetas.
- Errores junto al campo y anunciados a lectores de pantalla.
- Iconos con nombre accesible.
- Foco visible y orden de teclado equivalente al visual.
- El contenido admite aumento de texto sin solapamientos.
- La información no depende únicamente del color.
- Las animaciones respetan `prefers-reduced-motion`.
- No se utilizan gestos ocultos como único método para editar, archivar o navegar.
- Volver es predecible y conserva estado.

## 12. Validación Por Rol

### Admin

- Añadir, llamar, editar y archivar un contacto.
- Crear credenciales con las dos audiencias y comprobar su visibilidad.
- Mostrar y copiar tras PIN correcto.
- Probar PIN incorrecto y bloqueo temporal.
- Subir una captura y un PDF de reunión.
- Crear borrador, previsualizar y publicar manual, protocolo y política.
- Publicar una actualización y comprobar versión, audiencia y notificación.
- Archivar, restaurar y eliminar definitivamente.

### Coach

- Consultar todos los contactos y usar llamada/WhatsApp.
- Ver únicamente credenciales compartidas con coaches.
- Confirmar PIN para mostrar y copiar.
- Encontrar un protocolo mediante búsqueda.
- Abrir una notificación y comprobar que desaparece de Resumen.
- Ver únicamente reuniones y políticas dirigidas a coaches.

### Limpieza

- Encontrar `Club` en la navegación.
- Consultar todos los contactos.
- No encontrar Credenciales ni mediante búsqueda o enlace directo.
- Ver únicamente documentos dirigidos a limpieza.
- Abrir una notificación dirigida a limpieza.

### Mantenimiento

- Encontrar `Club` en la navegación.
- Consultar todos los contactos.
- No encontrar Credenciales ni mediante búsqueda o enlace directo.
- Ver únicamente documentos dirigidos a mantenimiento.
- Consultar contenido previamente cargado con mala conexión.

## 13. Pruebas De Estados Límite

- Sin contenido.
- Una lista con más de 50 elementos.
- Búsqueda sin resultados.
- Texto aumentado al 200%.
- Teléfono sin WhatsApp instalado.
- Dispositivo sin aplicación telefónica.
- Pérdida de conexión antes y durante un guardado.
- PDF dañado.
- HEIC no previsualizable por el navegador.
- Archivo superior al límite.
- Doble toque sobre Publicar.
- Dos admins editando la misma versión.
- Sesión segura expirada.
- Aplicación enviada a segundo plano con una contraseña visible.
- Enlace profundo a contenido archivado o sin permiso.
- Notificación ya leída en otro dispositivo.

## 14. Orden De Implementación Posterior

1. Base transversal: módulos fijos, permisos, archivo, adjuntos y notificaciones internas.
2. Identidad autenticada, autorización RLS y almacenamiento privado.
3. Contactos útiles.
4. Reuniones.
5. Manuales y protocolos.
6. Políticas.
7. Accesos y contraseñas, únicamente después de superar la puerta de seguridad.
8. Integración completa con Resumen y Avisos.
9. Validación por rol, accesibilidad, red lenta y móvil real.
10. Web Push para eventos del Club.

Cada bloque deberá pasar sus criterios de aceptación antes de comenzar el siguiente.

## 15. Referencias De Seguridad

- [Supabase: Securing your API](https://supabase.com/docs/guides/api/securing-your-api)
- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase: Private Storage buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- [Supabase: Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [OWASP: Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [OWASP: File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
