import "dotenv/config";
import { supabase } from '../config/supabase.js';
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

// SECURITY FIX: Pulling from .env so your key isn't exposed in the codebase
const VOYAGE_KEY = process.env.VOYAGEAI_API_KEY; 

const getVoyageEmbedding = async (text) => {
  const response = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${VOYAGE_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      input: [text],
      // UPGRADE: Switched to multilingual model to support both English and Tamil PDFs natively
      model: "voyage-multilingual-2", 
      input_type: "document"
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Voyage API Error: ${err.detail || response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
};

// 2. We ONLY need the file path and the UUID of the subject now!
const ingestNewMaterial = async (filePath, subjectId) => {
  console.log(`📂 Loading PDF: ${filePath}`);
  console.log(`🏷️ Subject UUID: [${subjectId}]`);

  const loader = new PDFLoader(filePath);
  const docs = await loader.load();

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const chunks = await splitter.splitDocuments(docs);
  console.log(`✂️ Created ${chunks.length} chunks. Uploading...`);

  const rows = [];
  for (let i = 0; i < chunks.length; i++) {
    try {
      console.log(`Processing chunk ${i + 1}/${chunks.length}...`);
      const vector = await getVoyageEmbedding(chunks[i].pageContent);
      
      // 3. Mapping strictly to the new syllabus_knowledge schema
      rows.push({
        chunk_text: chunks[i].pageContent, // Updated column name
        subject_id: subjectId,             // The UUID from the subjects table
        embedding: vector
      });

      // The 21-second delay for Voyage Free Tier
      await new Promise(resolve => setTimeout(resolve, 21000));

    } catch (error) {
      console.error(`❌ Failed on chunk ${i + 1}:`, error.message);
      return; 
    }
  }

  // Bulk insert into the newly structured table
  const { error } = await supabase.from('syllabus_knowledge').insert(rows);

  if (error) {
    console.error("❌ Supabase Upload Failed:", error.message);
  } else {
    console.log(`✅ Successfully added ${rows.length} rows to Subject UUID: ${subjectId}!`);
  }
};

// 4. Capture the simplified arguments from the terminal
const [,, file, subject] = process.argv;

if (file && subject) {
    ingestNewMaterial(file, subject);
} else {
    console.log("❌ Missing arguments! Usage:");
    console.log("node ingestToSupabase.js <filePath> <subjectId_UUID>");
}