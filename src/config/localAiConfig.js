// src/config/localAiConfig.js
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OllamaEmbeddings } from "@langchain/ollama";

const embeddings = new OllamaEmbeddings({
  model: "nomic-embed-text", 
  baseUrl: "http://localhost:11434",
});

export const getLocalChromaStore = (collectionName) => {
  return new Chroma(embeddings, {
    collectionName: collectionName,
    url: "http://localhost:8000", // Your local Chroma URL
  });
};