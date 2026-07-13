# fridge-mcp

MCP-сервер, который знает, что у тебя в холодильнике.

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

Данные хранятся в `data/fridge.json` (путь можно переопределить через `FRIDGE_DATA_PATH`).

## Установка

```bash
npm install
npm run build
```

## Подключение в Cursor

В настройках MCP добавь сервер:

```json
{
  "mcpServers": {
    "fridge": {
      "command": "node",
      "args": ["/Users/ippolit/Programs/fridge-mcp/dist/index.js"]
    }
  }
}
```

Для разработки без сборки:

```json
{
  "mcpServers": {
    "fridge": {
      "command": "npx",
      "args": ["tsx", "/Users/ippolit/Programs/fridge-mcp/src/index.ts"]
    }
  }
}
```

После этого можно спросить в чате: «что у меня в холодильнике?»
