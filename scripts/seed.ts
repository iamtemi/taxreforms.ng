import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load environment variables from .env.local FIRST
dotenv.config({ path: ".env.local" });

// Output directory for documents
const DOCUMENTS_DIR = path.join(process.cwd(), "data", "documents");

function formatDisplayName(filename: string): string {
  // Remove extension
  const name = path.parse(filename).name;
  // Replace hyphens/underscores with spaces
  const spaced = name.replace(/[-_]/g, " ");
  // Capitalize words
  return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
}

async function seed() {
  // Dynamic import to ensure env vars are loaded
  const { uploadFileToStore } = await import("../lib/gemini");
  const { addDocument, getDocuments } = await import("../lib/db");

  console.log("Starting seed process from data/documents...");

  if (!fs.existsSync(DOCUMENTS_DIR)) {
    console.error("Directory data/documents does not exist.");
    return;
  }

  const files = fs
    .readdirSync(DOCUMENTS_DIR)
    .filter((f) => f.toLowerCase().endsWith(".pdf"));

  if (files.length === 0) {
    console.log("No PDF files found in data/documents.");
    return;
  }

  const existingDocs = getDocuments();
  const existingNames = new Set(existingDocs.map((d) => d.displayName));

  for (const fileName of files) {
    const displayName = formatDisplayName(fileName);

    if (existingNames.has(displayName)) {
      console.log(`Skipping ${displayName} (already in DB)`);
      continue;
    }

    console.log(`Uploading ${fileName} as "${displayName}"...`);
    const filePath = path.join(DOCUMENTS_DIR, fileName);

    try {
      // New function handles upload directly to store
      const geminiFile = await uploadFileToStore(
        filePath,
        "application/pdf",
        displayName
      );

      if (!geminiFile) {
        console.error("No response from upload");
        continue;
      }

      addDocument({
        id: geminiFile.name || "",
        displayName: displayName,
        uri: geminiFile.uri || "", // Note: file search upload might not return URI in same way?
        mimeType: "application/pdf",
        uploadDate: new Date().toISOString(),
      });

      console.log(`✓ Uploaded & Indexed ${displayName}`);
    } catch (error) {
      console.error(`x Failed to upload ${fileName}:`, error);
    }
  }

  console.log("Seed complete!");
}

seed();
