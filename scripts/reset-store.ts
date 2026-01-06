import dotenv from "dotenv";

// Load environment variables from .env.local FIRST
dotenv.config({ path: ".env.local" });

const STORE_DISPLAY_NAME = "Tax Law Knowledge Base";

async function findTaxStore() {
  const { ai } = await import("../lib/gemini");
  const stores = await ai.fileSearchStores.list();
  for await (const store of stores) {
    if (
      // @ts-ignore - SDK types might vary
      store.displayName === STORE_DISPLAY_NAME ||
      (store as any).displayName === STORE_DISPLAY_NAME ||
      (store as any).config?.displayName === STORE_DISPLAY_NAME
    ) {
      return store;
    }
  }
  return null;
}

async function resetStore() {
  const { ai } = await import("../lib/gemini");

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
