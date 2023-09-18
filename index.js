const express = require('express');
const { MongoClient } = require("mongodb");
const axios = require('axios');
const app = express();

/** In case you require CORS */
//const cors = require('cors');
//app.use(cors());

/** OpenAI Embedding Function */
async function openaiEmbedding(query) {

  // OpenAI Embeddings
  const url = 'https://api.openai.com/v1/embeddings';
  const openai_key = "<YOUR-OPENAI-KEY-HERE>"; // Replace with your OpenAI key.
  
  // OpenAI embeddings APIs
  let response = await axios.post(url, {
      input: query,
      model: "text-embedding-ada-002"
  }, {
      headers: {
          'Authorization': `Bearer ${openai_key}`,
          'Content-Type': 'application/json'
      }
  });
  
  if(response.status === 200) {
      console.log(response.data.data[0].embedding)
      return response.data.data[0].embedding;
  } else {
      throw new Error(`Failed to get embedding with code: ${response.status}`);
  }
}

/** GET ROUTE with "query" param */
app.get("/vectorSearch/:query", async (req,res)=>{  

  try {
    const embedding = await openaiEmbedding(req.params.query);

    const client = new MongoClient("<mongodb+srv://user:pass@cluster.example.mongodb.net>");
    await client.connect();
    
    const db = client.db("databaseDemo"); 
    const collection = db.collection("collectionDemo"); 
    
    // Query for similar documents.
    const documents = await collection.aggregate([
        {
          "$search": {
            "index": "vectorIndex", // Vector Search Index Name
            "knnBeta": {
            "vector": embedding,
            "path": "embedding", // You can change the embedding field
            "k": 5
            }
          }
        },
        { $unset: "embedding" } // This will hide the embedding field from the result
        ]).toArray();      
      
    res.send(documents);
    
  } catch(err) {
      console.error(err);
  }  

});

/** PORT */ 
const port = process.env.PORT || 8000;

/** PORT LISTENER **/
app.listen(port, () => {
  console.log(`Listening to port ${port}`);
});
