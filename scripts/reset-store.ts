import dotenv from "dotenv";

// Load environment variables from .env.local FIRST
dotenv.config({ path: ".env.local" });

const STORE_DISPLAY_NAME = "Tax Law Knowledge Base";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getDisplayName(store: unknown): string | undefined {
  if (!isRecord(store)) return undefined;
  const direct = store.displayName;
  if (typeof direct === "string") return direct;
  const config = store.config;
  if (isRecord(config) && typeof config.displayName === "string") {
    return config.displayName;
  }
  return undefined;
}

async function findTaxStore() {
  const { getAI } = await import("../lib/gemini");
  const ai = getAI();
  if (!ai) {
    throw new Error("GEMINI_API_KEY is not defined in environment variables");
  }
  const stores = await ai.fileSearchStores.list();
  for await (const store of stores) {
    if (getDisplayName(store) === STORE_DISPLAY_NAME) {
      return store;
    }
  }
  return null;
}

async function resetStore() {
  const { getAI } = await import("../lib/gemini");
  const ai = getAI();
  if (!ai) {
    throw new Error("GEMINI_API_KEY is not defined in environment variables");
  }

  console.log(`Looking for File Search Store: ${STORE_DISPLAY_NAME}`);

  const store = await findTaxStore();
  if (!store?.name) {
    console.log("No matching File Search Store found. Nothing to delete.");
    return;
  }

  console.log(`Deleting File Search Store ${store.name} (force=true)...`);
  await ai.fileSearchStores.delete({
    name: store.name,
    config: { force: true },
  });

  console.log(
    "Store deleted. You can re-seed with: pnpm exec tsx scripts/seed.ts"
  );
}

resetStore().catch((error) => {
  console.error("Failed to delete File Search Store:", error);
  process.exit(1);
});
