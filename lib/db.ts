import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "db.json");

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

// Initialize DB if not exists
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify({ documents: [] }, null, 2));
}

export type StoredDocument = {
  id: string; // Gemini Name (e.g. files/xyz)
  displayName: string;
  uri: string;
  mimeType: string;
  uploadDate: string;
};

export const getDocuments = (): StoredDocument[] => {
  try {
    const data = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(data).documents;
  } catch (error) {
    return [];
  }
};

export const addDocument = (doc: StoredDocument) => {
  const docs = getDocuments();
  docs.push(doc);
  fs.writeFileSync(DB_PATH, JSON.stringify({ documents: docs }, null, 2));
};

export const removeDocument = (id: string) => {
  const docs = getDocuments();
  const newDocs = docs.filter((d) => d.id !== id);
  fs.writeFileSync(DB_PATH, JSON.stringify({ documents: newDocs }, null, 2));
};
