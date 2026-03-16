// ingest_pedagogy_cs.js
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OllamaEmbeddings } from "@langchain/ollama";
import { Chroma } from "@langchain/community/vectorstores/chroma";

// ⚠️ Ensure your PDF is named exactly this:
const FILE_NAME = "docs/pedagogy_cs.pdf"; 

// ⚠️ This MUST match the 'id' in your App.tsx SUBJECTS list
const COLLECTION_NAME = "tnteu-sem1-pedagogy-cs"; 

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

  // 3. Clean Metadata (Fixes the "metadata value" error)
  console.log("🧹 Cleaning metadata...");
  const sanitizedDocs = splitDocs.map((doc) => {
    const newMetadata = {};
    for (const [key, value] of Object.entries(doc.metadata)) {
      if (
        value !== null &&
        value !== undefined &&
        (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
      ) {
        newMetadata[key] = value;
      }
    }
    doc.metadata = newMetadata;
    return doc;
  });

  // 4. Store in ChromaDB
  console.log(`💾 Saving to ChromaDB (Collection: ${COLLECTION_NAME})...`);
  
  await Chroma.fromDocuments(sanitizedDocs, new OllamaEmbeddings({
    model: "nomic-embed-text",
    baseUrl: "http://localhost:11434",
  }), {
    collectionName: COLLECTION_NAME,
    url: "http://localhost:8000",
  });

  console.log("✅ Success! Computer Science Pedagogy is ready.");
}

main().catch(console.error);