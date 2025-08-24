# Workflows de GitHub Actions

## CI (Build & Test)
Archivo: `.github/workflows/ci.yml`  
Se ejecuta en cada push y PR hacia `develop` y `main`.

### Qué hace
- Si **no hay** package.json → termina OK.
- Si **hay** package.json → instala dependencias, corre `npm test`, corre `npm run build`.

## Preview por PR
Pendiente de agregar (Vercel/Netlify).  
Objetivo: desplegar automáticamente un entorno efímero por cada PR.

## Deploy a Producción
Pendiente de agregar.  
Objetivo: al pushear a `main`, build + test + deploy + notificación.

