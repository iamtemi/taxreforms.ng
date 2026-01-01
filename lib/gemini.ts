import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not defined in environment variables");
}

export const ai = new GoogleGenAI({ key: apiKey });

// Helper to get or create the Tax Knowledge Base store
export const getTaxStore = async () => {
  const storeName = "Tax Law Knowledge Base";

  // List existing stores to find if it exists
  const stores = await ai.fileSearchStores.list();
  for await (const store of stores) {
    // Note: The SDK might return stores with a specific structure.
    // We check if the display name matches.
    if (
      // @ts-ignore - SDK types might vary
      store.displayName === storeName ||
      (store as any).displayName === storeName ||
      (store as any).config?.displayName === storeName
    ) {
      return store;
    }
  }

  // Create if not exists
  console.log("Creating new File Search Store...");
  const newStore = await ai.fileSearchStores.create({
    config: { displayName: storeName },
  });
  return newStore;
};

export const uploadFileToStore = async (
  filePath: string,
  mimeType: string,
  displayName: string
) => {
  try {
    const store = await getTaxStore();

    console.log(`Uploading ${displayName} directly to store ${store.name}...`);

    // Use the single-step method as suggested by documentation
    let operation = await ai.fileSearchStores.uploadToFileSearchStore({
      file: filePath,
      fileSearchStoreName: store.name!,
      config: {
        displayName: displayName,
        mimeType: mimeType,
      },
    });

    // Wait for completion
    while (!operation.done) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      operation = await ai.operations.get({ operation: operation });
    }

    // Cast to any to access result/response without strict typed error
    const opAny = operation as any;

    // Check for error in operation result
    if (opAny.result?.error) {
      throw new Error(`Upload failed: ${opAny.result.error.message}`);
    }

    console.log(`Upload & Index complete for ${displayName}`);

    // The response is in operation.result.response
    return opAny.result?.response || opAny.response;
  } catch (error) {
    console.error("Error uploading/importing file:", error);
    throw error;
  }
};
