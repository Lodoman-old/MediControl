# Configuracion de integraciones y entorno

## Correo SMTP

Se configura desde la aplicacion web:

**Configuracion → Integraciones → Correo SMTP**

Campos:

- `host`: servidor SMTP
- `port`: puerto, normalmente `587` o `465`
- `secure`: `true` para SSL directo, `false` para STARTTLS
- `user`: usuario SMTP
- `pass`: contrasena o clave de aplicacion
- `from`: remitente que vera el paciente

La configuracion se guarda cifrada por organizacion y se usa sin reiniciar el API.

Variables de entorno equivalentes, usadas solo si no hay configuracion guardada:

```env
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

Prueba recomendada: generar una invitacion al portal con tu propio correo.

## Notificaciones push (Firebase Cloud Messaging)

La APK universal obtiene la configuracion de Firebase desde el API. No es necesario
colocar `google-services.json` ni recompilar la APK para cada cliente.

### 1. Crear el proyecto Firebase del cliente

En Firebase Console:

1. Crear un proyecto.
2. Agregar una app Android con el paquete:
   `com.medicontrol.app`
3. Obtener de la app Android:
   - `App ID` (`mobilesdk_app_id`)
   - `API key`
4. Obtener el `Project ID` y el `Project number` del proyecto.
5. En **Cuentas de servicio**, generar una llave privada nueva.

### 2. Configurar en MediControl

**Configuracion → Integraciones → Firebase Cloud Messaging**

Campos:

- `projectId`
- `appId`
- `apiKey`
- `messagingSenderId` (Project number)
- `clientEmail` (cuenta de servicio)
- `privateKey` (llave privada de la cuenta de servicio)

Activa la integracion y guarda. Las credenciales quedan cifradas.

El API entrega a la APK solo la configuracion publica (`projectId`, `appId`, `apiKey`,
`messagingSenderId`). La llave privada nunca sale del servidor.

### 3. Funcionamiento en la APK

Al iniciar sesion, la APK:

1. Consulta `/notifications/push-config`.
2. Inicializa Firebase en tiempo de ejecucion.
3. Solicita permiso de notificaciones.
4. Registra el token del dispositivo.

Si cambias de proyecto Firebase desde el panel, la APK toma la nueva configuracion
la siguiente vez que se abra. Los tokens del proyecto anterior dejan de servir y se
renuevan automaticamente.

El push solo aplica a la APK Android. La version web del navegador no registra tokens push.

### 4. Prueba

1. Instalar la APK 1.0.7 o superior.
2. Iniciar sesion y aceptar el permiso de notificaciones.
3. Verificar que el token quede registrado.
4. Crear una cita pendiente de confirmacion para un medico.
5. El medico debe recibir la notificacion push.

## Cuentas demo y panel de debug

En desarrollo se muestran siempre. En builds de produccion se ocultan por defecto.

Para mostrarlos en un entorno de pruebas:

```env
VITE_SHOW_DEMO_ACCOUNTS=true
VITE_SHOW_DEBUG_PANEL=true
```

Para produccion: dejar ambas variables sin definir o en `false`.

Importante: ocultar la caja de cuentas demo no elimina los usuarios de la base de datos.
En produccion se debe usar una base nueva sin seed demo, o desactivar/cambiar la
contrasena de las cuentas demo existentes.
