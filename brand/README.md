# MediControl — Brand Assets

Esta carpeta contiene los assets oficiales de la marca. Es la **fuente unica de verdad**: cualquier copia en `apps/*/assets` o `apps/*/public` debe generarse desde aqui.

## Archivos

| Archivo | Uso recomendado |
|---|---|
| `isopo.png` (300x300, fondo transparente) | App icon iOS/Android, favicon, avatar, loaders, splash, marca compacta en headers angostos |
| `logo-horizontal.png` (lockup completo) | Header del portal web, pantalla de login, documentos PDF (recetas, comprobantes), correos transaccionales |

## Paleta de marca

| Token | Hex | Uso |
|---|---|---|
| `brand.primary.500` | `#22A45D` | Verde primario (estetoscopio). CTAs, links, estados de exito |
| `brand.primary.600` | `#1B8A4C` | Hover de CTAs |
| `brand.primary.50`  | `#E8F7EE` | Fondos suaves, badges |
| `brand.ink.900`     | `#1F2937` | Texto principal, "Medi" del wordmark |
| `brand.ink.700`     | `#374151` | Texto secundario |
| `brand.ink.500`     | `#6B7280` | Texto deshabilitado, placeholders |
| `brand.surface`     | `#FFFFFF` | Fondo principal |
| `brand.surface-alt` | `#F8FAFC` | Fondos de paneles |
| `brand.danger.500`  | `#DC2626` | Alergias destacadas, errores |
| `brand.warning.500` | `#F59E0B` | Pendiente de validacion de pago |
| `brand.info.500`    | `#2563EB` | Informacion neutral |

Los mismos tokens estan exportados como TypeScript en `packages/brand/src/tokens.ts` para que web y movil los consuman sin duplicar valores.

## Reglas de uso

1. **No alterar proporciones, colores ni espaciados** del logo. Si necesitas otra variante (monocromo, negativo), generala y subela aqui con sufijo descriptivo (`isopo-white.png`, `logo-horizontal-mono.png`).
2. **Area de proteccion**: dejar como minimo un espacio en blanco equivalente a la altura de la "M" del isopo alrededor del lockup.
3. **Tamano minimo**: 24x24 px para el isopo en pantalla, 120 px de ancho para el lockup horizontal.
4. **Fondos oscuros**: pendiente generar variante negativa.

## Pendiente (mejoras recomendadas)

- [ ] Exportar `isopo.svg` y `logo-horizontal.svg` para escalabilidad sin perdida.
- [ ] Generar `icon-1024.png` (Apple App Store), `playstore-icon-512.png` (Google Play).
- [ ] Generar set de favicons PWA (`favicon-16.png`, `favicon-32.png`, `favicon-192.png`, `favicon-512.png`, `apple-touch-icon.png`, `maskable-icon.png`).
- [ ] Variante monocromatica para impresion en una sola tinta.
