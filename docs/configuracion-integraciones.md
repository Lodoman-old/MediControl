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

### 1. Configuracion en MediControl

**Configuracion → Integraciones → Firebase Cloud Messaging**

Campos:

- `projectId`
- `clientEmail`
- `privateKey` (llave privada de la cuenta de servicio)

Activa la integracion y guarda. Las credenciales quedan cifradas y el API las lee por organizacion.

Tambien se pueden usar variables de entorno como respaldo:

```env
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

### 2. Configuracion obligatoria en la APK

Crear el proyecto en Firebase Console y registrar la app Android con paquete:

```text
com.medicontrol.app
```

Descargar `google-services.json` y colocarlo en:

```text
apps/web/android/app/google-services.json
```

Despues recompilar:

```bash
pnpm --filter @medicontrol/web build:capacitor
cd apps/web
npx cap sync android
cd android
./gradlew assembleDebug
```

El push solo aplica a la APK Android. La version web del navegador no registra tokens push.

### 3. Prueba

1. Instalar la APK en un telefono fisico.
2. Iniciar sesion y aceptar el permiso de notificaciones.
3. Verificar que el token quede registrado.
4. Crear una cita que quede pendiente de confirmacion para un medico.
5. El medico debe recibir la notificacion push.

## Cuentas demo y panel de debug

En desarrollo se muestran siempre. En builds de produccion se ocultan por defecto.

Para mostrarlos en un entorno de pruebas:

```env
VITE_SHOW_DEMO_ACCOUNTS=true
VITE_SHOW_DEBUG_PANEL=true
```

Para produccion: dejar ambas variables sin definir o en `false`.

Importante: ocultar la caja de cuentas demo no elimina los usuarios de la base de datos. En produccion se debe usar una base nueva sin seed demo, o desactivar/cambiar la contrasena de las cuentas demo existentes.
