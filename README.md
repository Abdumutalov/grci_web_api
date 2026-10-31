# grci-web-api (NestJS)

Backend ГРКИ — порт [`grci-web-api`](https://gitlab.mbabm.uz/abm/grci-web-api) (Express 5 / CommonJS) на
**NestJS 11 / TypeScript**. Работает как прямая замена оригинала: те же маршруты, HTTP-методы,
коды ответов, JSON-структуры, cookie и заголовки, те же SQL-запросы, bind-переменные, пулы и логика фиксации.
Фронтенд (`grci-web-ui`, `grci-web-ui-next`) менять не нужно.

## Стек

| | Оригинал | Порт |
|---|---|---|
| Фреймворк | Express 5 | NestJS 11 (платформа Express 5) |
| Язык | JavaScript (CommonJS) | TypeScript (strict null checks) |
| БД | oracledb 6, Thick | oracledb 6, Thick по умолчанию (`ORACLE_THICK_MODE`) |
| Авторизация | `verify.js` middleware | `JwtAuthGuard` |
| Документация API | — | Swagger UI (`/api-docs`) |
| Запуск | `pm2 start server.js -i 0` | `pm2 start ecosystem.config.js` (cluster, те же node-args) |

## Структура

```
src/
  main.ts                       # body-parser 1024mb, cookie-parser, CORS, статика SPA, Swagger, порт
  app.module.ts                 # подключение модулей (/offline /online /user /menu /refer /chart /interaction /report)
  common/
    protocol/                   # файловый протокол (порт public/helpers/log.js)
    filters/all-exceptions.filter.ts  # 500 / SPA-fallback / «сырые» ответы
    response/set-response.ts    # { code, result } (порт setResponse)
    utils/                      # дата-время, JSON, getBody/getParam, deep()
  database/
    oracle.service.ts           # пулы и вызовы Oracle (порт public/db/dbAdapter.js)
  auth/                         # /user (login, checkUser, logout, refresh), JwtAuthGuard, ЭЦП
  modules/
    chart/ interaction/ menu/ offline/ online/ refers/ report/
```

Слои: **controller** (маршрут, guard, параметры, обёртка ответа) → **repository** (SQL как в оригинале)
→ **OracleService** (соединение из пула, execute, протокол ошибок).

## Запуск

```bash
npm install
cp .env.example .env      # заполнить пароли, JWT_SECRET (тот же, что в оригинале!)
npm run build
npm run start:prod        # или: npm start (pm2, cluster)
```

Разработка: `npm run start:dev`. Swagger: `http://localhost:3000/api-docs`
(в Swagger токен вводится в «Authorize» как есть, без `Bearer`).

Для Thick-режима нужен Oracle Instant Client (как и для оригинала) и `tnsnames.ora`
с алиасами `GRCI` / `IABSDB` — путь можно задать через `ORACLE_CLIENT_LIB_DIR` и `ORACLE_TNS_ADMIN`.

### Переменные окружения

Все переменные оригинала сохранены (`JWT_SECRET`, `SERVER_PORT`, `PROTOCOL_*`, `DB_*`, `IABS_*`). Новые:

| Переменная | По умолчанию | Назначение |
|---|---|---|
| `ORACLE_THICK_MODE` | `true` | Thick-режим oracledb (как в оригинале) |
| `ORACLE_CLIENT_LIB_DIR` / `ORACLE_TNS_ADMIN` | — | путь к Instant Client / tnsnames.ora |
| `STATIC_DIR` | `./build` | сборка SPA, отдаётся как статика + fallback на `index.html` |
| `SWAGGER_ENABLED` / `SWAGGER_PATH` | `true` / `api-docs` | Swagger UI |
| `TRUST_PROXY` | `false` | учитывать `X-Forwarded-For` в `req.ip` |
| `CRYPTO_URL` | `http://cripto/tcas/CBRUTcryptAS.asmx?wsdl` | SOAP-сервис проверки ЭЦП |

`NODE_ENV=production` включает флаг `Secure` у cookie `refresh_token`/`csrf` (так же, как в оригинале) —
задавайте его только при работе фронтенда по HTTPS.

## Паритет с оригиналом

Проверено: **146 из 146 маршрутов** оригинала (только смонтированные в `server.js`) присутствуют с тем же
методом и путём, лишних нет. Каждый модуль и фундамент прошли независимую сверку с исходником:
SQL (дословно), bind-переменные, пулы, `autoCommit`, `rowCount` курсоров, обёртки ответов
(`setResponse` / «сырой» JSON / `deep(…,3)`), guard, коды статусов.

Не перенесено (в оригинале не подключено к `server.js`): `controllers/offline2`, `controllers/journal`
(routes), `controllers/test`, `middleware/rateLimiter.js`, `middleware/security.js`, `monitor-memory.js`.

### Исправленные ошибки оригинала

| Где | Было | Стало |
|---|---|---|
| `GET /refer/getCreditOperation` | `ReferenceError: params` → всегда 500 | работает |
| Вход по ЭЦП (`/user/login`, поле `cripto`) | `xml2js` не подключён → всегда «Техническая ошибка системы» | ответ SOAP разбирается |
| Адаптер БД | при ошибке `execute` соединение не возвращалось в пул | соединение закрывается всегда |
| `oracledb.fetchAsString` | менялся глобально после первого CLOB-запроса | задаётся один раз при старте |
| Протокол `e<file>.txt` | битый путь — не писался | пишется |

### Усиление безопасности (ответы для корректных данных не меняются)

- `/offline/observable/reqError/*`: `info_type` больше не подставляется в SQL строкой — bind-переменная.
- `/offline/observable/handling/getSearch`: параметр `ctp` очищается до цифр и запятых перед подстановкой.

### Известные особенности, сохранённые ради совместимости

- `/user/logout` ищет refresh-токен без `user-agent`, поэтому `revokeFamily` фактически не вызывается.
- `USER_WS.AuthUser` вызывается с `pIp = 2`, `pLoc = NULL` (в оригинале — 6 аргументов на 7 параметров).
- Токен передаётся в `Authorization` без префикса `Bearer`.
- Запросы с невалидными параметрами по-прежнему дают невалидный SQL → `{ code: '0', result: [] }`.

### Отличия поведения Nest (статусы совпадают)

- Ошибки 404 (не-GET) / 400 / 500 возвращаются JSON-ом, а не HTML-страницей Express.
- `/api-docs` занят Swagger UI (в оригинале отдавался `index.html`) — отключается `SWAGGER_ENABLED=false`.
- При недоступной БД старт ждёт попытки создания пулов (оригинал создавал пулы в фоне).
