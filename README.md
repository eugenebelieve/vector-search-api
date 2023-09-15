# Building a NodeJS Microservice with Vector Search

![NodeJS+MongoDB+OpenAI](images/vector_stack.png)

### What Stack are we going to use ?
This is a <b>DEVELOPER</b> Step-by-step Guide in which we will be using MongoDB (Atlas), NodeJS and OpenAI 

### We are going to build the Vector Search Microservice in 4 steps: 
1. Create and <b>Database, Collection</b> and <b>Vector Search index</b> on MongoDB Atlas.
2. Create an <b>API key on OpenAI</b>.
3. Create the <b>NodeJS microservice</b>.
4. <b>Bonus</b> : Create a <b>Trigger on MongoDB Atlas</b> that will automatically generate Vector Embeddings for newly inserted or Updated documents.

---

## 1. Create a Vector Search index on MongoDB Atlas
![MongoDB Stack](images/mongodb_stack.png)

- Go to www.mongodb.com and create an Accounts (if you don't have one) 
- When you create a new Cluster, give it the <b>username</b>: <b>"demo"</b> and <b>password</b> : <b>"demo"</b>

![Alt text](images/user_password.png)

- Create a new Database called <b>"databaseDemo"</b> and a collection called <b>"collectionDemo"</b>.
<br />

- Once the Cluster is created, click on it and go in the <b>"Search"</b> Tab (see below)

![Alt text](images/search_tab.png)

<br />

- Click on <b>"Create Search Index"</b>:
  - Select the <b>"JSON Editor"</b> 
  - Name the index: "vectorIndex"
  - Select the right Database 
  - Insert the following JSON into the Editor:

```JSON
{
  "mappings": {
    "dynamic": true,
    "fields": {
      "embedding": {
        "dimensions": 1536,
        "similarity": "cosine",
        "type": "knnVector"
      }
    }
  }
}
``````
:information_source: OpenAI uses 1,536 dimensions for embeddings in the text-embedding-ada-002 model

It should look like this : 

![Vector Index](images/vector_index.png)

... then click next and create Search Index

- [x] Now we have <b>successfully</b> create a <b>Vector Search Index</b> ! :tada:	

---

## 2. Create the API Key on OpenAI
![OpenAI Stack](images/openai_stack.png)

* Go to https://platform.openai.com/account/api-keys
* Create a API `token` and save it somewhere
---

## 3. Creating the NodeJS Microservice (with Vector Search)
![NodeJS](images/nodejs_stack.png)

#### Create a `index.js` file and install all the packages:
```shell 
npm install axios cors express mongodb openai-api
```

#### Inside index.js import all the packages :
```javascript 
const express = require('express');
const { MongoClient } = require("mongodb");
const axios = require('axios');
const app = express();
```

:information_source: In case your required to import CORS (Optional):
```javascript 
/** In case you require CORS for Browser */
//const cors = require('cors');
//app.use(cors());
```

#### Next, add the embedding function with OpenAI token:
```javascript 
/** OpenAI Embedding Function */
async function openaiEmbedding(query) {

  // OpenAI Embeddings
  const url = 'https://api.openai.com/v1/embeddings';
  const openai_key = "YOUR-API-TOKEN"; // Replace with your OpenAI key.
  
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
```
#### Next, create the GET route:
- Change the URI with the one from Atlas URI:
  - When in your Atlas Console, just press on <b>"Connect"</b> and choose lastest <b>NodeJS</b> Driver:
![Alt text](images/mongodb-connect.png)
<br />
- Copy the route below to your index.js file:

```javascript
app.get("/vectorSearch/:query", async (req,res)=>{  

  try {

    // Transform query into embedding
    const embedding = await openaiEmbedding(req.params.query);

    // Change these constants:
    const URI = "mongodb+srv://username:password@cluster.example.mongodb.net";
    const databaseName = "databaseDemo";
    const collectionName = "collectionDemo"


    const client = new MongoClient(URI);
    await client.connect();
    
    const db = client.db(databaseName); 
    const collection = db.collection(collectionName); 
    
    // Query for similar documents.
    const documents = await collection.aggregate([
        {
          "$search": {
            "index": "vectorIndex", // Name of Vector Search Index
            "knnBeta": {
            "vector": embedding,
            "path": "embedding", // Name of the 'embedding' field
            "k": 5
            }
          }
        }
        ]).toArray();      
      
    res.send(documents);
    
  } catch(err) {
      console.error(err);
  }  

});
```

#### Setup the port and listener:
```javascript
/** PORT */ 
const port = process.env.PORT || 8000;

/** PORT LISTENER **/
app.listen(port, () => {
  console.log(`Listening to port ${port}`);
}); 
```

<b>DONE !</b> Our Microservice is Ready ! We just need to add a Trigger that will generate the embedding inside the documents ! 


## 4. Last Step, let's create that Trigger and start adding new documents

