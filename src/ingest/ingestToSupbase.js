import "dotenv/config";
import { supabase } from '../config/supabase.js';
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

// 1. Ensure your actual Voyage API Key is here
const VOYAGE_KEY = "pa-uBN-3lfFnDkq7mEicgzonPET-xUkpb59R7eMG1X0dz4"; 

const getVoyageEmbedding = async (text) => {
  const response = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${VOYAGE_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      input: [text],
      model: "voyage-3",
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

// 2. The function now accepts the new metadata parameters
const ingestNewMaterial = async (filePath, subjectId, programType, department, semester) => {
  console.log(`📂 Loading PDF: ${filePath}`);
  console.log(`🏷️ Tags: Program [${programType}], Dept [${department}], Sem [${semester}]`);

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
      
      // 3. Pushing the full metadata matrix to Supabase
      rows.push({
        content: chunks[i].pageContent,
        subject_id: subjectId,
        embedding: vector,
        program_type: programType,
        department: department,
        semester: parseInt(semester, 10), // Ensure it saves as a number
      });

      // The 21-second delay for Voyage Free Tier
      await new Promise(resolve => setTimeout(resolve, 21000));

    } catch (error) {
      console.error(`❌ Failed on chunk ${i + 1}:`, error.message);
      return; 
    }
  }

  const { error } = await supabase.from('syllabus_knowledge').insert(rows);

  if (error) {
    console.error("❌ Supabase Upload Failed:", error.message);
  } else {
    console.log(`✅ Successfully added ${rows.length} rows to ${subjectId}!`);
  }
};

// 4. Capture the new arguments from the terminal
const [,, file, subject, program, dept, sem] = process.argv;

if (file && subject && program && dept && sem) {
    ingestNewMaterial(file, subject, program, dept, sem);
} else {
    console.log("❌ Missing arguments! Usage:");
    console.log("node script.js <file> <subjectId> <programType> <department> <semester>");
}