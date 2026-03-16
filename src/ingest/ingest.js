import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OllamaEmbeddings } from "@langchain/ollama";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const ingestDocs = async () => {
  console.log("🚀 Starting Ingestion Process...");

  const loader = new PDFLoader("./docs/psychology-1.pdf");
  const docs = await loader.load();
  console.log(`📄 PDF Loaded. Found ${docs.length} pages.`);

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const splitDocs = await splitter.splitDocuments(docs);
  console.log(`✂️  Split into ${splitDocs.length} chunks.`);

  // --- 🛠️ THE FIX STARTS HERE 🛠️ ---
  // We loop through every chunk and fix the metadata
  console.log("🧹 Cleaning metadata for ChromaDB...");
  splitDocs.forEach((doc) => {
    // If there is no metadata, create an empty object
    doc.metadata = doc.metadata || {};

    // Check every piece of metadata
    for (const key in doc.metadata) {
      const value = doc.metadata[key];
      
      // If the value is a complex object (like a list or dictionary), turn it into a string
      if (typeof value === "object" && value !== null) {
        doc.metadata[key] = JSON.stringify(value);
      }
      
      // If the value is null or undefined, remove it entirely
      if (value === null || value === undefined) {
         delete doc.metadata[key];
      }
    }
  });
  // --- 🛠️ THE FIX ENDS HERE 🛠️ ---

  const embeddings = new OllamaEmbeddings({
    model: "nomic-embed-text",
    baseUrl: "http://localhost:11434",
  });

  console.log("💾 connecting to ChromaDB...");

  await Chroma.fromDocuments(splitDocs, embeddings, {
    collectionName: "tnteu-sem1-psychology",
    url: "http://localhost:8000",
  });

  console.log("✅ Success! Material ingested. You can now query it.");
};

ingestDocs().catch(console.error);