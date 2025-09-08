# Guía para contribuir

## Flujo de trabajo

1. Crear rama desde `develop`.
2. Commits descriptivos (ej: `feat(auth): agrega login`).
3. Push y abrir PR hacia `develop`.
4. Completar plantilla de PR.
5. Esperar que el CI pase y haya al menos 1 review.

## Convención de commits

Formato: `tipo(scope): descripción breve`

Tipos: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `build`, `ci`.

## Checklist antes de abrir PR

- [ ] Build sin errores
- [ ] Tests (si existen) pasan
- [ ] Sin secretos en el código
- [ ] Cambios documentados en PR
