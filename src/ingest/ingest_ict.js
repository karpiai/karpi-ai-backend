import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OllamaEmbeddings } from "@langchain/ollama";
import { Chroma } from "@langchain/community/vectorstores/chroma";

const FILE_NAME = "docs/ict_syllabus.pdf"; 
const COLLECTION_NAME = "tnteu-sem1-ict"; // New Collection

async function main() {
  console.log(`🚀 Starting ingestion for: ${FILE_NAME}`);
  const loader = new PDFLoader(FILE_NAME);
  const docs = await loader.load();
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
  const splitDocs = await splitter.splitDocuments(docs);

  console.log("🧹 Cleaning metadata...");
  const sanitizedDocs = splitDocs.map((doc) => {
    const newMetadata = {};
    for (const [key, value] of Object.entries(doc.metadata)) {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        newMetadata[key] = value;
      }
    }
    doc.metadata = newMetadata;
    return doc;
  });

  console.log(`💾 Saving to ChromaDB (${COLLECTION_NAME})...`);
  await Chroma.fromDocuments(sanitizedDocs, new OllamaEmbeddings({
    model: "nomic-embed-text",
    baseUrl: "http://localhost:11434",
  }), {
    collectionName: COLLECTION_NAME,
    url: "http://localhost:8000",
  });
  console.log("✅ ICT Syllabus Ready!");
}
main().catch(console.error);