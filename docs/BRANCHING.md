# Estrategia de ramas

## Ramas principales
- `main`: código estable → producción.
- `develop`: integración de features → staging.

## Ramas de trabajo
- `feature/<nombre>`: nuevas funcionalidades.
- `fix/<nombre>`: correcciones.
- `chore/<nombre>`: tareas no funcionales (configs, deps).
- `hotfix/<nombre>`: arreglo urgente directo a `main`.

## Flujo
1. Crear rama desde `develop`:
   ```bash
   git checkout develop
   git pull
   git checkout -b feature/<nombre>

2. Commits y push:

    git push -u origin feature/<nombre>

3. PR → base: develop, compare: feature/<nombre>.

4.  Merge a develop cuando pase CI y review.

5.  Release: PR de develop → main (tag y deploy).

