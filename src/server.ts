import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  addItem,
  expiringSoon,
  findItem,
  formatFridge,
  formatItem,
  loadFridge,
  removeItem,
  saveFridge,
} from "./fridge.js";

export function createFridgeServer(): McpServer {
  const server = new McpServer({
    name: "fridge-mcp",
    version: "1.0.0",
  });

  server.registerTool(
    "list_fridge",
    {
      title: "Что в холодильнике",
      description:
        "Показывает всё содержимое холодильника: продукты, количество, место и срок годности.",
    },
    async () => {
      const state = loadFridge();
      return {
        content: [{ type: "text", text: formatFridge(state) }],
      };
    },
  );

  server.registerTool(
    "add_to_fridge",
    {
      title: "Положить в холодильник",
      description:
        "Добавляет продукт в холодильник. Если такой уже есть — увеличивает количество.",
      inputSchema: {
        name: z.string().min(1).describe("Название продукта, например «молоко»"),
        quantity: z.number().positive().describe("Сколько положить"),
        unit: z
          .string()
          .optional()
          .describe("Единица измерения: шт, г, мл, л, пачка… (по умолчанию шт)"),
        expiresAt: z
          .string()
          .optional()
          .describe("Срок годности в формате YYYY-MM-DD"),
        location: z
          .string()
          .optional()
          .describe("Где лежит: полка, дверца, ящик…"),
      },
    },
    async ({ name, quantity, unit, expiresAt, location }) => {
      const state = loadFridge();
      const item = addItem(state, { name, quantity, unit, expiresAt, location });
      saveFridge(state);
      return {
        content: [
          {
            type: "text",
            text: `Добавлено. Сейчас: ${formatItem(item)}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    "remove_from_fridge",
    {
      title: "Взять из холодильника",
      description:
        "Убирает продукт из холодильника (съели / выкинули). Без quantity убирает всё.",
      inputSchema: {
        name: z.string().min(1).describe("Название продукта"),
        quantity: z
          .number()
          .positive()
          .optional()
          .describe("Сколько убрать; если не указать — убрать всё"),
      },
    },
    async ({ name, quantity }) => {
      const state = loadFridge();
      const result = removeItem(state, name, quantity);
      if (!result.ok) {
        return {
          content: [{ type: "text", text: result.error }],
          isError: true,
        };
      }
      saveFridge(state);
      if (result.item) {
        return {
          content: [
            {
              type: "text",
              text: `Убрано ${result.removed}. Осталось: ${formatItem(result.item)}`,
            },
          ],
        };
      }
      return {
        content: [
          {
            type: "text",
            text: `Убрано ${result.removed}. «${name}» в холодильнике больше нет.`,
          },
        ],
      };
    },
  );

  server.registerTool(
    "check_fridge_item",
    {
      title: "Проверить продукт",
      description: "Проверяет, есть ли конкретный продукт в холодильнике.",
      inputSchema: {
        name: z.string().min(1).describe("Название продукта"),
      },
    },
    async ({ name }) => {
      const state = loadFridge();
      const item = findItem(state, name);
      if (!item) {
        return {
          content: [{ type: "text", text: `«${name}» в холодильнике нет.` }],
        };
      }
      return {
        content: [{ type: "text", text: `Есть: ${formatItem(item)}` }],
      };
    },
  );

  server.registerTool(
    "expiring_soon",
    {
      title: "Скоро испортится",
      description:
        "Список продуктов, у которых скоро закончится срок годности (включая уже просроченные).",
      inputSchema: {
        withinDays: z
          .number()
          .int()
          .min(0)
          .max(30)
          .optional()
          .describe("За сколько дней смотреть вперёд (по умолчанию 3)"),
      },
    },
    async ({ withinDays }) => {
      const days = withinDays ?? 3;
      const state = loadFridge();
      const items = expiringSoon(state, days);
      if (items.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `За ближайшие ${days} дн. ничего критичного нет.`,
            },
          ],
        };
      }
      const today = new Date().toISOString().slice(0, 10);
      const lines = items.map((item) => {
        const tag =
          item.expiresAt && item.expiresAt < today ? "просрочено" : "скоро";
        return `- [${tag}] ${formatItem(item)}`;
      });
      return {
        content: [
          {
            type: "text",
            text: `Срок в ближайшие ${days} дн. (${items.length}):\n${lines.join("\n")}`,
          },
        ],
      };
    },
  );

  server.registerResource(
    "fridge-contents",
    "fridge://contents",
    {
      title: "Содержимое холодильника",
      description: "Текущий список продуктов в холодильнике",
      mimeType: "application/json",
    },
    async (uri) => {
      const state = loadFridge();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(state, null, 2),
          },
        ],
      };
    },
  );

  server.registerPrompt(
    "whats_for_dinner",
    {
      title: "Что приготовить",
      description: "Подсказывает блюдо из того, что есть в холодильнике",
      argsSchema: {
        cuisine: z
          .string()
          .optional()
          .describe("Предпочтительная кухня, например «итальянская»"),
      },
    },
    ({ cuisine }) => {
      const state = loadFridge();
      const inventory = formatFridge(state);
      const preference = cuisine
        ? `Предпочтение: ${cuisine} кухня.`
        : "Кухню можно выбрать любую.";
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: [
                "Предложи 1–3 простых блюда из того, что есть в холодильнике.",
                preference,
                "Учитывай сроки годности: сначала используй то, что скоро испортится.",
                "",
                inventory,
              ].join("\n"),
            },
          },
        ],
      };
    },
  );

  return server;
}
