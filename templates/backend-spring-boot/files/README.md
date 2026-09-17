# {{projectNameHuman}}

Scaffolded with `forge` from the `backend-spring-boot` template. Package: `{{mainPackage}}`.

Comes with a worked example (`items/`) so there's real, deletable code to look at:
a controller, an in-memory repository, a validated request DTO, and a
`@RestControllerAdvice` error handler. Delete the `items` package once you've
wired up your actual domain — the pattern is what's worth keeping.

## Run it

```bash
mvn spring-boot:run
```

```bash
curl http://localhost:8080/api/health
curl http://localhost:8080/api/items
curl -X POST http://localhost:8080/api/items -H 'Content-Type: application/json' -d '{"name":"first item"}'
```

## Test

```bash
mvn test
```

## Next steps

- Swap `ItemRepository`'s in-memory `ConcurrentHashMap` for Spring Data (JPA/JDBC) once you've picked a database.
- Add `spring-boot-starter-security` when you need auth.
- `application.yml` has DEBUG logging on for `{{mainPackage}}` — turn it down before anything resembling production.
