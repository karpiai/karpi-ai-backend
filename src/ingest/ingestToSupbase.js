import { supabase } from './src/config/supabase.js';
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { embeddings } from "../config/aiConfig.js"; // Ensure embeddings are initialized
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

const ingestNewMaterial = async (filePath, subjectId) => {
  console.log(`📂 Loading PDF: ${filePath}`);

  // 1. Load and Parse PDF
  const loader = new PDFLoader(filePath);
  const docs = await loader.load();

  // 2. Split into Chunks (standard for B.Ed textbooks)
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const chunks = await splitter.splitDocuments(docs);
  console.log(`✂️ Created ${chunks.length} chunks.`);

  // 3. Prepare for Supabase
  const rows = [];
  for (const chunk of chunks) {
    // Generate the mathematical vector (Embedding)
    const [vector] = await embeddings.embedDocuments([chunk.pageContent]);
    
    rows.push({
      content: chunk.pageContent,
      subject_id: subjectId,
      embedding: vector,
    });
  }

  // 4. Direct Upload to Supabase
  const { error } = await supabase.from('syllabus_knowledge').insert(rows);

  if (error) {
    console.error("❌ Ingestion Failed:", error.message);
  } else {
    console.log(`✅ Successfully added ${rows.length} rows to ${subjectId}!`);
  }
};

// Usage: node ingestToSupabase.js ./my-new-book.pdf tnteu-sem1-psychology
const [,, file, subject] = process.argv;
if (file && subject) ingestNewMaterial(file, subject);