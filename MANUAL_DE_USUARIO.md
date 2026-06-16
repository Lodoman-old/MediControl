# Manual de Usuario — MediControl

**Sistema de Gestión Clínica Multi-Tenant**

Versión 1.0
Junio 2026

---

## Índice

1. [Introducción](#1-introducción)
2. [Acceso al Sistema](#2-acceso-al-sistema)
3. [Panel Principal (Dashboard)](#3-panel-principal-dashboard)
4. [Agenda de Citas](#4-agenda-de-citas)
5. [Horarios del Médico](#5-horarios-del-médico)
6. [Registro de Pacientes](#6-registro-de-pacientes)
7. [Expediente Clínico](#7-expediente-clínico)
8. [Triage (Enfermería)](#8-triage-enfermería)
9. [Consultorio (Médico)](#9-consultorio-médico)
10. [Farmacia](#10-farmacia)
11. [Administración](#11-administración)
12. [Reportes](#12-reportes)
13. [Solución de Problemas](#13-solución-de-problemas)

---

## 1. Introducción

### 1.1 ¿Qué es MediControl?

MediControl es un sistema integral de gestión clínica diseñado para consultorios médicos, clínicas privadas y centros de salud. Permite administrar citas, expedientes clínicos, recetas médicas y farmacia, todo desde una plataforma web moderna y segura.

### 1.2 Roles del Sistema

| Rol | Descripción |
|-----|-------------|
| **SUPERADMIN** | Control total del sistema multi-tenant |
| **ADMIN** | Administración de usuarios, roles, servicios y ubicaciones |
| **DOCTOR** | Gestión de consultas, expedientes, recetas y estudios |
| **NURSE** | Captura de signos vitales (triage) |
| **RECEPTION** | Registro de pacientes, agendado de citas, registro de entrada |
| **CAJERO** | Gestión de farmacia, dispensación y ventas |
| **PATIENT** | Autoregistro y consulta de historial |

### 1.3 Requisitos Técnicos

- Navegador web moderno (Chrome 90+, Firefox 90+, Edge 90+, Safari 14+)
- Conexión a internet de al menos 2 Mbps
- Resolución de pantalla recomendada: 1280×720 o superior

---

## 2. Acceso al Sistema

### 2.1 URL de Acceso

```
https://medicontrol-web.onrender.com
```

> **Nota:** En el plan gratuito, la primera carga puede tardar hasta 30 segundos mientras el servidor se activa.

### 2.2 Inicio de Sesión

![Pantalla de Login](docs/imagenes/login.png)

1. Ingrese su **correo electrónico** registrado
2. Ingrese su **contraseña**
3. Haga clic en **"Iniciar sesión"**

**Credenciales de prueba:**

| Rol | Correo | Contraseña |
|-----|--------|------------|
| Administrador | admin@medicontrol.mx | Admin123!Demo |
| Médico | dr.garcia@medicontrol.mx | Doctor123!Demo |
| Enfermera | enfermera@medicontrol.mx | Enfermera123!Demo |
| Cajero | cajero@medicontrol.mx | Cajero123!Demo |

### 2.3 Cambio de Contraseña

Si es su primer inicio de sesión, el sistema le solicitará cambiar su contraseña:

1. Ingrese su **contraseña actual**
2. Escriba su **nueva contraseña** (mínimo 8 caracteres, mayúsculas, minúsculas, números y carácter especial)
3. Confirme la nueva contraseña
4. Haga clic en **"Cambiar contraseña"**

### 2.4 Recuperación de Contraseña

1. En la pantalla de login, haga clic en **"¿Olvidó su contraseña?"**
2. Ingrese su correo electrónico registrado
3. Recibirá un enlace para restablecerla
4. Siga las instrucciones del correo

---

## 3. Panel Principal (Dashboard)

![Dashboard](docs/imagenes/dashboard.png)

Al iniciar sesión, verá el panel principal con un resumen de la actividad del día:

### Indicadores Principales

- **Citas del día** — Total de citas programadas para hoy
- **Pacientes en consulta** — Citas actualmente en consulta
- **Completadas** — Citas finalizadas el día de hoy
- **Ingresos del día** — Monto total recaudado

### Gráficos

- **Citas por hora** — Distribución de citas a lo largo del día
- **Ingresos por servicio** — Desglose de ingresos por tipo de servicio
- **Pacientes nuevos vs. recurrentes** — Proporción semanal

---

## 4. Agenda de Citas

### 4.1 Vista de Agenda

![Agenda](docs/imagenes/agenda.png)

La agenda muestra las citas del día en formato de lista, accesible desde el menú **"Agenda"** o **"Agenda → Mis citas"** (para médicos).

**Columnas de la agenda:**

- **Hora** — Horario programado de la cita
- **Paciente** — Nombre completo del paciente
- **Servicio** — Tipo de consulta o servicio
- **Médico** — Doctor asignado
- **Estado** — Estatus actual de la cita
- **Acciones** — Botones para gestionar la cita

### 4.2 Estados de Cita

| Estado | Descripción | Color |
|--------|-------------|-------|
| Pendiente confirmación | Esperando que el médico confirme | Amarillo |
| Programada | Cita confirmada | Azul |
| Registró entrada | Paciente llegó a la clínica | Verde |
| En triage | Enfermera capturando signos | Turquesa |
| En consulta | Paciente con el médico | Índigo |
| Completada | Consulta finalizada | Gris |
| Inasistencia | Paciente no se presentó | Rojo |

### 4.3 Crear una Cita (Recepción)

1. Desde el menú, seleccione **"Agenda → Nueva cita"**
2. Complete los campos:

   | Campo | Descripción |
   |-------|-------------|
   | **Paciente** | Busque y seleccione un paciente registrado |
   | **Servicio** | Seleccione el tipo de consulta |
   | **Médico** | Seleccione el doctor disponible |
   | **Fecha** | Elija la fecha deseada |
   | **Hora** | El horario disponible |
   | **Motivo** | Razón de la consulta (opcional) |

3. Haga clic en **"Guardar"**

### 4.4 Registrar Entrada (Recepción)

1. En la agenda, ubique la cita del paciente
2. Haga clic en **"Registrar entrada"**
3. La cita cambiará al estado "Registró entrada"

### 4.5 Detalle de Cita

![Detalle de Cita](docs/imagenes/detalle-cita.png)

Haga clic en una cita para ver su detalle completo:

- Información del paciente y médico
- Servicio, ubicación y horario
- Acciones disponibles según el estado actual
- Acceso rápido al expediente clínico
- Recetas y estudios asociados

---

## 5. Horarios del Médico

### 5.1 Gestión de Horarios

Acceda desde **"Horarios"** en el menú.

Esta pantalla permite a los administradores y médicos gestionar los bloques horarios de atención.

### 5.2 Agregar Bloque Horario

1. Seleccione el **médico** (solo administradores — para médicos se auto-selecciona)
2. Seleccione el **día de la semana**
3. Defina la **hora de inicio** y **hora de fin**
4. Opcional: **Máximo de pacientes por día**
5. Marque **"Activo"** para habilitar el bloque
6. Haga clic en **"Guardar"**

### 5.3 Editar / Eliminar Bloque

- Haga clic en el bloque existente para editarlo
- Use el botón **"Eliminar"** para removerlo

### Validaciones

- No se permiten bloques con horarios superpuestos
- La hora de fin debe ser posterior a la de inicio
- Un médico puede tener múltiples bloques por día

---

## 6. Registro de Pacientes

### 6.1 Registrar Nuevo Paciente

1. Desde el menú **"Pacientes → Registrar paciente"**
2. Complete los datos:

   | Campo | Obligatorio |
   |-------|-------------|
   | Nombre(s) | Sí |
   | Apellido paterno | Sí |
   | Apellido materno | No |
   | Correo electrónico | No |
   | Teléfono | No |

3. Haga clic en **"Guardar"**
4. El sistema generará automáticamente un número de expediente (MRN)

### 6.2 Lista de Pacientes

Acceda desde **"Pacientes → Lista de pacientes"** para buscar y seleccionar pacientes registrados. Puede buscar por nombre o número de expediente.

### 6.3 Búsqueda Rápida

En los formularios de agendado de citas, use el campo de búsqueda con autocompletado para localizar pacientes rápidamente.

---

## 7. Expediente Clínico

### 7.1 Acceso al Expediente

Desde el detalle de cita, haga clic en **"Ver expediente"** o busque al paciente en **"Pacientes"**.

### 7.2 Pestañas del Expediente

![Expediente](docs/imagenes/expediente.png)

| Pestaña | Descripción |
|---------|-------------|
| **Notas de evolución** | Notas SOAP de cada consulta |
| **Diagnósticos** | Diagnósticos activos y resueltos |
| **Tratamientos** | Planes de tratamiento |
| **Consentimientos** | Consentimientos informados firmados |
| **Estudios** | Solicitudes de laboratorio e imagen |
| **Recetas** | Prescripciones médicas emitidas |

### 7.3 Historia Médica

En la parte superior del expediente, haga clic en **"Editar historia"** para registrar:

- Antecedentes heredofamiliares
- Antecedentes personales patológicos
- Antecedentes no patológicos
- Padecimiento actual

### 7.4 Nota SOAP

1. Desde el detalle de cita o expediente, haga clic en **"Agregar nota SOAP"**
2. Complete las secciones:

   | Sección | Descripción |
   |---------|-------------|
   | **S (Subjetivo)** | Síntomas que refiere el paciente |
   | **O (Objetivo)** | Hallazgos de la exploración física |
   | **A (Evaluación)** | Impresión diagnóstica |
   | **P (Plan)** | Plan de tratamiento y seguimiento |

3. Haga clic en **"Guardar"**

### 7.5 Diagnósticos

1. Haga clic en **"Agregar diagnóstico"**
2. Complete:

   | Campo | Descripción |
   |-------|-------------|
   | **Diagnóstico** | Nombre del diagnóstico |
   | **Tipo** | Principal, Secundario, Diferencial |
   | **Código CIE-10** | Código de clasificación (opcional) |
   | **Descripción** | Detalles adicionales |
   | **Estado** | Activo, Resuelto, Sospechado |

3. Haga clic en **"Guardar"**

### 7.6 Tratamientos

1. Haga clic en **"Agregar tratamiento"**
2. Complete:

   | Campo | Descripción |
   |-------|-------------|
   | **Tratamiento** | Nombre del tratamiento |
   | **Tipo** | Farmacológico, No farmacológico, Quirúrgico |
   | **Dosis / Indicación** | Instrucciones detalladas |
   | **Estado** | Activo, Completado, Cancelado, En espera |

3. Haga clic en **"Guardar"**

### 7.7 Consentimientos Informados

1. Haga clic en **"Agregar consentimiento"**
2. Seleccione el **tipo**: General, Cirugía, Anestesia, Transfusión, Investigación, Otros
3. Ingrese el **contenido** del consentimiento
4. Haga clic en **"Guardar"**

### 7.8 Solicitud de Estudios

1. Haga clic en **"Solicitar estudio"**
2. Complete:

   | Campo | Descripción |
   |-------|-------------|
   | **Tipo de estudio** | Laboratorio, Imagen, Patología, Otro |
   | **Nombre del estudio** | Ej: Biometría hemática, Radiografía de tórax |
   | **Indicación clínica** | Motivo del estudio (opcional) |

3. Haga clic en **"Guardar"**
4. Puede **descargar en PDF** la solicitud desde el expediente

### 7.9 Recetas Médicas

#### 7.9.1 Crear Receta

1. Haga clic en **"Receta / Prescripción"**
2. Complete los campos:

   | Campo | Obligatorio | Descripción |
   |-------|-------------|-------------|
   | **Medicamento** | Sí | Nombre del fármaco |
   | **Dosis / Presentación** | Sí | Concentración y forma farmacéutica |
   | **Frecuencia** | Sí | Cada cuánto tomarlo |
   | **Duración** | No | Por cuántos días |
   | **Vía de administración** | No | Oral, IV, IM, Tópica, etc. |
   | **Cantidad** | No | Unidades a dispensar |
   | **Refrendos** | No | Número de refills (max 10) |
   | **Indicaciones** | No | Instrucciones para el paciente |
   | **Notas** | No | Notas internas |

3. Haga clic en **"Guardar"**

#### 7.9.2 Descargar Receta en PDF

Desde el expediente o detalle de cita, haga clic en el botón **"PDF"** junto a la receta.

El PDF incluye:
- Nombre y cédula profesional del médico
- Nombre del paciente
- Fecha de expedición
- Medicamento, dosis, frecuencia, duración
- Indicaciones
- Línea para **firma autógrafa** o **firma digital** si se firmó electrónicamente
- Folio único de la receta

#### 7.9.3 Firma Digital de Receta

(Disponible próximamente — permite firmar electrónicamente la receta usando la cédula de identificación profesional)

#### 7.9.4 Surtir Receta en Farmacia

1. Desde el expediente, ubique la receta activa
2. Haga clic en **"Surtir"**
3. Será redirigido al módulo de farmacia (POS) con la receta precargada

---

## 8. Triage (Enfermería)

### 8.1 Acceso

Disponible para usuarios con rol **Enfermera** — menú **"Triage"**.

### 8.2 Pacientes en Espera

La pantalla muestra los pacientes con cita en estado "Registró entrada" listos para triage.

### 8.3 Captura de Signos Vitales

1. Seleccione al paciente de la lista
2. Capture los signos vitales:

   | Signo | Rango normal |
   |-------|--------------|
   | **Presión arterial sistólica** | 90-120 mmHg |
   | **Presión arterial diastólica** | 60-80 mmHg |
   | **Frecuencia cardíaca** | 60-100 lpm |
   | **Frecuencia respiratoria** | 12-20 rpm |
   | **Temperatura** | 36.5-37.5 °C |
   | **Saturación de O₂** | 95-100% |
   | **Peso** | kg |
   | **Talla** | cm |
   | **Glucosa** | 70-100 mg/dL |

3. Haga clic en **"Guardar signos"**
4. La cita pasa a estado "En triage" y queda lista para el médico

---

## 9. Consultorio (Médico)

### 9.1 Iniciar Consulta

Desde la agenda o el detalle de cita, cuando el paciente está en estado "En triage" o "Registró entrada", haga clic en **"Iniciar consulta"**.

### 9.2 Durante la Consulta

El médico puede:

1. **Ver signos vitales** capturados por enfermería
2. **Agregar nota SOAP** con sus hallazgos
3. **Registrar diagnósticos** usando CIE-10
4. **Prescribir tratamientos** farmacológicos y no farmacológicos
5. **Crear recetas** con descargables en PDF
6. **Solicitar estudios** de laboratorio o imagen
7. **Generar consentimientos informados**

### 9.3 Finalizar Consulta

1. Haga clic en **"Finalizar consulta"**
2. La cita pasa a estado "Completada"
3. El expediente queda actualizado con toda la información de la consulta

### 9.4 Marcar Inasistencia

Si el paciente no se presentó, haga clic en **"Marcar inasistencia"**. La cita se marcará como "Inasistencia".

---

## 10. Farmacia

### 10.1 Acceso

Disponible para usuarios con rol **Cajero**.

### 10.2 Catálogo de Medicamentos

Desde **"Farmacia → Medicamentos"** puede:

- **Listar** todos los medicamentos registrados
- **Agregar** nuevos medicamentos al catálogo
- **Editar** información existente
- **Activar/Desactivar** medicamentos

### 10.3 Inventario y Lotes

Desde **"Farmacia → Inventario"**:

- **Agregar lote** — Registre nuevas entradas con número de lote, fecha de caducidad y cantidad
- **Ajustar stock** — Realice ajustes manuales (entradas, salidas, correcciones)
- **Ver movimientos** — Historial completo de cambios de inventario

### 10.4 Punto de Venta (POS)

![POS](docs/imagenes/pos.png)

Desde **"Farmacia → POS"**:

1. Seleccione los productos que el cliente desea
2. Si es una receta, use el botón **"Surtir receta"** o abra desde el expediente
3. Revise el total
4. Seleccione el método de pago
5. Confirme la venta

**Métodos de pago soportados:**
- Efectivo
- Tarjeta (MercadoPago)
- Transferencia SPEI
- POS (lector de tarjetas)

### 10.5 Corte de Caja

Desde **"Farmacia → Corte de caja"**:

- Abra la caja registradora al iniciar su turno
- Durante el día, todas las ventas quedan registradas
- Al cerrar turno, realice el corte para cuadrar el efectivo

### 10.6 Historial de Ventas

Desde **"Farmacia → Ventas"** puede consultar el historial completo, filtrar por fecha y descargar reportes.

---

## 11. Administración

### 11.1 Gestión de Usuarios

**Rol requerido:** SUPERADMIN / ADMIN

Desde **"Admin → Usuarios"**:

1. **Crear usuario** — Registre nuevos usuarios con nombre, correo, rol y contraseña temporal
2. **Editar** — Modifique datos de usuarios existentes
3. **Activar/Desactivar** — Controle el acceso al sistema
4. **Forzar cambio de contraseña** — Marque para que el usuario deba cambiar su contraseña al ingresar

### 11.2 Roles y Permisos

Desde **"Admin → Roles"**:

- **Crear rol** — Defina nuevos roles con permisos específicos
- **Editar rol** — Modifique los permisos asignados
- **Asignar a usuarios** — Cada usuario tiene un único rol

**Permisos disponibles:**

| Permiso | Descripción |
|---------|-------------|
| `users:read/write` | Gestión de usuarios |
| `patients:read/write` | Gestión de pacientes |
| `appointments:read/write/update` | Gestión de citas |
| `clinical:read/write` | Expediente clínico |
| `clinical:vitals:write` | Captura de signos vitales |
| `pharmacy:read/write/sell` | Gestión de farmacia |
| `inventory:read/write` | Control de inventario |
| `reports:read` | Reportes |
| `schedule:read/write` | Horarios |
| `services:read/write` | Servicios |
| `locations:read/write` | Ubicaciones |
| `roles:read/write` | Roles y permisos |
| `payments:read/write` | Pagos y facturación |

### 11.3 Servicios

Desde **"Admin → Servicios"**:

- **Agregar servicio** — Defina los tipos de consulta ofrecidos
- **Configurar duración** — Tiempo estimado de cada servicio
- **Establecer precio** — Costo del servicio por moneda
- **Activar/Desactivar** — Controle la disponibilidad

### 11.4 Ubicaciones

Desde **"Admin → Ubicaciones"**:

- **Agregar ubicación** — Consultorios, salas, laboratorios
- **Asignar a sucursal** — Vincule ubicaciones a sucursales
- **Gestionar disponibilidad** — Active o desactive ubicaciones

### 11.5 Configuración de Sucursal

- Datos fiscales de la clínica
- Moneda predeterminada
- Zona horaria
- Configuración de notificaciones

---

## 12. Reportes

### 12.1 Reportes Disponibles

Acceda desde **"Reportes"** en el menú:

| Reporte | Descripción |
|---------|-------------|
| **Ingresos** | Ingresos por período, filtrado por doctor o servicio |
| **Citas** | Estadísticas de citas por estado y período |
| **Pacientes** | Totales de pacientes, activos, visitas |
| **Médicos** | Productividad por doctor |

### 12.2 Exportación

- Los reportes pueden visualizarse en pantalla
- Descargables en **PDF** desde la misma pantalla
- (Próximamente) Exportación a Excel y CSV

---

## 13. Solución de Problemas

### 13.1 La página no carga

1. Verifique su conexión a internet
2. Espere 30 segundos (Render activa el servidor)
3. Refresque la página (F5)
4. Si persiste, intente en otro navegador

### 13.2 Error de tiempo de espera

- Es normal en la primera carga del día (~30s)
- Si ocurre durante el uso normal, refresque la página

### 13.3 No puedo iniciar sesión

1. Verifique que su correo y contraseña sean correctos
2. Si es su primer acceso, debe cambiar la contraseña
3. Solicite a su administrador que restablezca su acceso

### 13.4 No veo las opciones del menú

- Cada rol tiene acceso a funciones específicas
- Contacte a su administrador si necesita permisos adicionales

### 13.5 Error al guardar una cita

1. Verifique que el médico tenga horarios configurados para ese día
2. Confirme que el horario seleccionado esté disponible
3. Revise que el paciente esté correctamente registrado

### 13.6 Error de red (Network Error)

- La API puede estar en proceso de activación (espere 30s)
- Verifique que la URL del servicio sea correcta
- Si el problema persiste, el servicio puede estar en mantenimiento

---

## Contacto para Soporte

Para soporte técnico o dudas sobre el funcionamiento del sistema, contacte a su administrador local.

---

*Documento generado el 16 de junio de 2026*
*MediControl — Sistema de Gestión Clínica*
