import { supabase } from './src/config/supabase.js';
import { getLocalChromaStore } from './src/config/localAiConfig.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * MIGRATION SCRIPT: ChromaDB (Local) -> Supabase (Cloud)
 * This script will fetch all documents from your local collections
 * and insert them into the 'syllabus_knowledge' table.
 */

const SUBJECTS_TO_MIGRATE = [
    'tnteu-sem1-psychology',
    'tnteu-sem1-contemporary',
    'tnteu-sem1-pedagogy-cs',
    'tnteu-sem1-ict'
];

async function migrate() {
    console.log("🚀 Starting Migration to Supabase...");

    for (const subjectId of SUBJECTS_TO_MIGRATE) {
        try {
            console.log(`\n-----------------------------------------`);
            console.log(`📦 Processing Subject: ${subjectId}`);

            // 1. Initialize local Chroma store for this subject
            const localStore = getLocalChromaStore(subjectId);
            
            // 2. Fetch all documents and their embeddings from local Chroma
            // Chroma logic: We use the internal collection to get all data
            const collection = await localStore.ensureCollection();
            const allData = await collection.get({
                include: ['metadatas', 'documents', 'embeddings']
            });

            if (!allData.ids || allData.ids.length === 0) {
                console.log(`⚠️ No data found in local Chroma for ${subjectId}. Skipping...`);
                continue;
            }

            console.log(`🔍 Found ${allData.ids.length} chunks in local storage.`);

            // 3. Prepare data for Supabase
            const rowsToInsert = allData.ids.map((id, index) => ({
                content: allData.documents[index],
                subject_id: subjectId,
                embedding: allData.embeddings[index], // Vector(768)
            }));

            // 4. Batch Insert into Supabase (Chunks of 50 to avoid payload limits)
            const chunkSize = 50;
            for (let i = 0; i < rowsToInsert.length; i += chunkSize) {
                const batch = rowsToInsert.slice(i, i + chunkSize);
                
                const { error } = await supabase
                    .from('syllabus_knowledge')
                    .insert(batch);

                if (error) {
                    console.error(`❌ Error inserting batch for ${subjectId}:`, error.message);
                } else {
                    console.log(`✅ Uploaded batch ${Math.floor(i/chunkSize) + 1} (${batch.length} rows)`);
                }
            }

            console.log(`🎉 Migration for ${subjectId} complete!`);

        } catch (err) {
            console.error(`🚨 Fatal error during migration of ${subjectId}:`, err);
        }
    }

    console.log(`\n=========================================`);
    console.log("🏁 FULL MIGRATION FINISHED!");
    process.exit(0);
}

migrate();