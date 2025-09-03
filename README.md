
# 🌐 Desarrollo Aplicaciones Front

[![CI](https://github.com/calde1104/desarrollo_aplicaciones_front/actions/workflows/ci.yml/badge.svg)](https://github.com/calde1104/desarrollo_aplicaciones_front/actions/workflows/ci.yml)
[![Preview](https://github.com/calde1104/desarrollo_aplicaciones_front/actions/workflows/preview.yml/badge.svg)](https://github.com/calde1104/desarrollo_aplicaciones_front/actions/workflows/preview.yml)
[![Prod Deploy](https://github.com/calde1104/desarrollo_aplicaciones_front/actions/workflows/prod-main.yml/badge.svg)](https://github.com/calde1104/desarrollo_aplicaciones_front/actions/workflows/prod-main.yml)

---

## 📌 Estado del proyecto
Repo base para el frontend del proyecto.  
Actualmente ya cuenta con **infraestructura DevOps** (CI/CD, docs, flujos de ramas).  

Los **workflows de GitHub Actions** ya están configurados:
- ✅ **CI**: build & test en cada PR/push a `develop` o `main`.  
- 🚀 **Preview**: despliegue automático en Vercel por PR.  
- 🌐 **Producción**: deploy desde `main` a Vercel.  

---

## 🔀 Estrategia de ramas
- `main` → Producción  
- `develop` → Staging  
- `feature/*` → trabajo diario de devs 
📖 Detalle completo en [`docs/BRANCHING.md`](./docs/BRANCHING.md).  

---

## 🛠 Cómo contribuir
1. Crear rama desde `develop`:  
   ```bash
   git checkout develop && git pull
   git checkout -b feature/<nombre>
2.Hacer commits descriptivos.
3.Push de la rama y abrir PR → develop.
4.Completar la plantilla de PR
5.Esperar CI verde + al menos 1 review.

Más info en CONTRIBUTING.md

## 📂 Documentación
- [docs/BRANCHING.md](./docs/BRANCHING.md) → estrategia de ramas  
- [docs/WORKFLOWS.md](./docs/WORKFLOWS.md) → explicación de CI/CD  
- [CONTRIBUTING.md](./CONTRIBUTING.md) → guía para contribuir  

📸 Previews

Cuando el front esté subido y los secrets configurados, cada PR tendrá una URL de preview en Vercel comentada automáticamente.

🌐 Producción

El deploy a producción se hará en cada push a main.
La URL final se documentará aquí cuando esté disponible.

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

