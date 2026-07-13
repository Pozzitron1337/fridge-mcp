# fridge-mcp

MCP-сервер: что лежит в холодильнике.

## Возможности

| Тип | Имя | Описание |
| --- | --- | --- |
| tool | `list_fridge` | Показать всё содержимое |
| tool | `add_to_fridge` | Положить продукт |
| tool | `remove_from_fridge` | Взять / съесть / выкинуть |
| tool | `check_fridge_item` | Проверить конкретный продукт |
| tool | `expiring_soon` | Что скоро испортится |
| resource | `fridge://contents` | JSON всего холодильника |
| prompt | `whats_for_dinner` | Идея ужина из того, что есть |

Данные: `data/fridge.json` (или `FRIDGE_DATA_PATH`).

## Локально

```bash
npm install
npm run build
```

### Stdio (Cursor / Claude Desktop)

```json
{
  "mcpServers": {
    "fridge": {
      "command": "node",
      "args": ["/absolute/path/to/fridge-mcp/dist/index.js", "--stdio"]
    }
  }
}
```

### HTTP (локально)

```bash
npm run start:http
```

- Health: `GET http://localhost:3000/`
- MCP: `POST http://localhost:3000/mcp`

## Render

В Web Service:

| Поле | Значение |
| --- | --- |
| Build Command | `npm install && npm run build` |
| Start Command | `node ./dist/index.js` |
| Instance | Free ок |

`PORT` Render выставит сам — сервер поднимет HTTP автоматически.

После деплоя отдай разработчику:

```
https://<твой-сервис>.onrender.com/mcp
```

Клиент должен говорить по **Streamable HTTP MCP**, не по обычному REST.

На Free инстанс засыпает без трафика; диск не персистентный — правки холодильника могут сброситься после рестарта.
