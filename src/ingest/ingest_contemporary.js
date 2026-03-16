// ingest_contemporary.js
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OllamaEmbeddings } from "@langchain/ollama";
import { Chroma } from "@langchain/community/vectorstores/chroma";

// ⚠️ MAKE SURE THIS FILENAME MATCHES YOUR ACTUAL FILE
// You mentioned "contemprory and education.pdf" in your chat, 
// but the script looks for "contemporary_india.pdf". Update this line if needed:
const FILE_NAME = "./docs/contemporary_india.pdf"; 
const COLLECTION_NAME = "tnteu-sem1-contemporary";

async function main() {
  console.log(`🚀 Starting ingestion for: ${FILE_NAME}`);

  // 1. Load the PDF
  const loader = new PDFLoader(FILE_NAME);
  const docs = await loader.load();
  console.log(`📄 Loaded ${docs.length} pages.`);

  // 2. Split into chunks
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const splitDocs = await splitter.splitDocuments(docs);
  console.log(`🧩 Split into ${splitDocs.length} chunks.`);

  // --- 🔴 THE FIX: CLEAN METADATA ---
  console.log("🧹 Cleaning metadata to satisfy ChromaDB...");
  const sanitizedDocs = splitDocs.map((doc) => {
    const newMetadata = {};
    // Only keep simple values (Strings, Numbers, Booleans)
    for (const [key, value] of Object.entries(doc.metadata)) {
      if (
        value !== null &&
        value !== undefined &&
        (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
      ) {
        newMetadata[key] = value;
      }
    }
    // Assign the clean metadata back to the document
    doc.metadata = newMetadata;
    return doc;
  });
  // ----------------------------------

  // 3. Store in ChromaDB
  console.log("💾 Saving to ChromaDB (Collection: " + COLLECTION_NAME + ")...");
  
  await Chroma.fromDocuments(sanitizedDocs, new OllamaEmbeddings({
    model: "nomic-embed-text",
    baseUrl: "http://localhost:11434",
  }), {
    collectionName: COLLECTION_NAME,
    url: "http://localhost:8000",
  });

  console.log("✅ Success! Contemporary India is ready.");
}

main().catch(console.error);