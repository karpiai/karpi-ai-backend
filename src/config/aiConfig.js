import { supabase } from './supabase.js'; // Use your existing supabase client
import { ChatGroq } from "@langchain/groq";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
/* import { OllamaEmbeddings } from "@langchain/ollama"; */
import { VoyageEmbeddings } from "@langchain/community/embeddings/voyage";

// For now, keep Ollama for generating embeddings locally during migration
// Once we are in the cloud, we will switch this to OpenAI or Voyage AI
/* export const embeddings = new OllamaEmbeddings({
    model: "nomic-embed-text",
    baseUrl: "http://localhost:11434",
}); */

// 2. Replace the embeddings export
export const embeddings = new VoyageEmbeddings({
    apiKey: "pa-uBN-3lfFnDkq7mEicgzonPET-xUkpb59R7eMG1X0dz4", // Replace with your actual API key
    modelName: "voyage-3", // Industry-leading model for document retrieval
});

export const llm = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: "llama-3.3-70b-versatile",
});

export const getVectorStore = (subjectId) => {
    return new SupabaseVectorStore(embeddings, {
        client: supabase,
        tableName: "syllabus_knowledge",
        queryName: "match_syllabus_knowledge", // Must match the SQL function name
        filter: { subject_id: subjectId }
    });
};