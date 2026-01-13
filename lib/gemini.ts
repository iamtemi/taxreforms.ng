import { GoogleGenAI } from "@google/genai";

// Lazy initialization to avoid throwing at import time
let aiInstance: GoogleGenAI | null = null;

type FileSearchStore = {
  name: string;
  displayName?: string;
  config?: { displayName?: string };
};

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

function getStoreName(store: unknown): string | undefined {
  if (!isRecord(store)) return undefined;
  return typeof store.name === "string" ? store.name : undefined;
}

export function getAI(): GoogleGenAI | null {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export function isAPIAvailable(): boolean {
  return getAI() !== null;
}

let taxStoreCache: FileSearchStore | null = null;
let taxStorePromise: Promise<FileSearchStore> | null = null;

// Helper to get or create the Tax Knowledge Base store
export const getTaxStore = async () => {
  const ai = getAI();
  if (!ai) {
    throw new Error(
      "GEMINI_API_KEY is not defined. Cannot access file search store."
    );
  }

  if (taxStoreCache?.name) {
    return taxStoreCache;
  }

  if (taxStorePromise) {
    return taxStorePromise;
  }

  const storeName = "Tax Law Knowledge Base";

  taxStorePromise = (async () => {
    // List existing stores to find if it exists
    const stores = await ai.fileSearchStores.list();
    for await (const store of stores) {
      const displayName = getDisplayName(store);
      if (displayName !== storeName) continue;

      const name = getStoreName(store);
      if (name) {
        return { name, displayName };
      }
    }

    // Create if not exists
    console.log("Creating new File Search Store...");
    const created = await ai.fileSearchStores.create({
      config: { displayName: storeName },
    });
    const createdName = getStoreName(created);
    if (!createdName) {
      throw new Error("Created File Search Store is missing a name");
    }
    return { name: createdName, displayName: storeName };
  })();

  try {
    taxStoreCache = await taxStorePromise;
    return taxStoreCache;
  } finally {
    taxStorePromise = null;
  }
};

export const uploadFileToStore = async (
  filePath: string,
  mimeType: string,
  displayName: string
): Promise<{ name?: string; uri?: string } | null> => {
  const ai = getAI();
  if (!ai) {
    throw new Error("GEMINI_API_KEY is not defined. Cannot upload files.");
  }

  try {
    const store = await getTaxStore();

    console.log(`Uploading ${displayName} directly to store ${store.name}...`);

    // Use the single-step method as suggested by documentation
    let operation = await ai.fileSearchStores.uploadToFileSearchStore({
      file: filePath,
      fileSearchStoreName: store.name,
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

    const opAny = operation as unknown as {
      result?: {
        error?: { message?: string };
        response?: unknown;
      };
      response?: unknown;
    };

    // Check for error in operation result
    if (opAny.result?.error) {
      throw new Error(
        `Upload failed: ${opAny.result.error.message ?? "Unknown"}`
      );
    }

    console.log(`Upload & Index complete for ${displayName}`);

    // The response is in operation.result.response
    const response = (opAny.result?.response || opAny.response) as
      | {
          name?: string;
          uri?: string;
        }
      | undefined;

    return response || null;
  } catch (error) {
    console.error("Error uploading/importing file:", error);
    throw error;
  }
};
