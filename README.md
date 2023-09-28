# Building a <b>Vector Search</b> Microservice on NodeJS<br />[A Developer's Guide :fire:]
![NodeJS+MongoDB+OpenAI](images/vector_search_stack.png)

### What's the Stack ?
This is a <b>Developer</b> Step-by-step Guide in which we will be using MongoDB Atlas, NodeJS and OpenAI 

### We are going to build the Vector Search Microservice in 4 steps: 
1. Create and <b>Database, Collection</b> and <b>Vector Search index</b> on MongoDB Atlas.
2. Create an <b>API key on OpenAI</b>.
3. Create the <b>NodeJS microservice</b>.
4. <b>Bonus</b> : Create a <b>Trigger on MongoDB Atlas</b> that will automatically generate Vector Embeddings for newly inserted or Updated documents.

---

## 1. Create the Vector Search index on MongoDB Atlas
![MongoDB Stack](images/mongodb_stack.png)

- Go to www.mongodb.com and create an Account (if you don't have one) 
- When you create a new <b>Cluster</b>, give it the <b>username</b>: <b>"demo"</b> and <b>password</b> : <b>"demo"</b>

![Alt text](images/user_password.png)

- Create a new Database called <b>"databaseDemo"</b> and a collection called <b>"collectionDemo"</b>.
<br />

- Once the Cluster is created, click on it and go in the <b>"Search"</b> Tab (see below)

![Alt text](images/search_tab.png)

- Click on <b>"Create Search Index"</b>:
  - Select the <b>"JSON Editor"</b> 
  - Name the index: <b>"vectorIndex"</b> 
  - Select the <b>"databaseDemo"</b> and <b>"collectionDemo"</b>
  - and <b>Insert</b> the following in the <b>JSON Editor</b>:

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
- It should look like this : 

![Vector Index](images/vector_index.png)

... then click next and create Search Index

- :tada: We have <b>successfully</b> create a <b>Vector Search Index</b> ! :tada:	

:information_source: <b>FYI :</b> OpenAI uses 1,536 dimensions for embeddings when using the `"text-embedding-ada-002"` model

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

:information_source: In case your browser requires you to import CORS <b>(Optional)</b>:
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

- Copy the <b>`GET`</b> route below into your <b>`index.js`</b> file:

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

<b>DONE !</b> The Microservice is Ready ! We just need to add a Trigger that will generate the embedding inside each new document ! 

---
## 4. Last Step ! Create the Atlas Trigger 
#### This trigger will add automatically the vector embedding field to newly inserted documents

### Create & Configure the Trigger :

- Inside the MongoDB Atlas, create a trigger:

![Alt text](images/triggers.png)

- It is pretty straight forward configuring your Triggers: 
  - Name : demoTrigger
  - Link Data Source(s) : `databaseDemo` and press <b>`Link`</b>
  - Cluster Name : `<YOUR-CLUSTER-NAME>`
  - Database Name : `databaseDemo`
  - Collection Name : `collectionDemo`
  - Full Document : `on`
  ![Alt text](images/full_document.png)


### Insde the `function` Add the code to the Trigger :  
- Replace with your own OpenAI key
- The trigger will use the `description` field in your document and transform it into a vector embedding. If you wish, you can change the name of the field that will be converted into embedding.
```javascript
exports = async function(changeEvent) {

    // Gets the full document that was changed
    const changedDocument = changeEvent.fullDocument;
    const url = 'https://api.openai.com/v1/embeddings';
    
    // OpenAI API to change
    const openai_key = "<YOUR-OPENAI-KEY>";

    try {
        // HTTP call to OpenAI API
        let response = await context.http.post({
            url: url,
             headers: {
                'Authorization': [`Bearer ${openai_key}`],
                'Content-Type': ['application/json']
            },
            body: JSON.stringify({
                input: changedDocument.description, //You can change the 'description' field to another one that you wish to convert into vector embedding
                model: "text-embedding-ada-002"
            })
        });

        // Parse the JSON response
        let responseData = EJSON.parse(response.body.text());

        if(response.statusCode === 200) {
            console.log("Successfully received embedding.");

            const responseEmbedding = responseData.data[0].embedding;

            // MongoDB Atlas Cluster / Database / Collection
            const collection = context.services.get("<CLUSTER_NAME>").db("databaseDemo").collection("collectionDemo");

            // Update the document in MongoDB.
            const result = await collection.updateOne(
                { _id: changedDocument._id },
                // Adds the embedding field
                { $set: { embedding: responseEmbedding }}
            );

            if(result.modifiedCount === 1) {
                console.log("Document successfully Updated.");
            } else {
                console.log("Failed to modify document.");
            }
        } else {
            console.log(`Failed embedding with code: ${response.statusCode}`);
        }

    } catch(err) {
        console.error(err);
    }
};

```
### We are all set ! We can now insert 5 documents in MongoDB Atlas or using MongoDB Compass :

```JSON
 [
  {
    "name": "UltraFast Smartphone",
    "description": "Experience lightning-fast browsing and high-quality photography with the UltraFast Smartphone, equipped with the latest processor and a state-of-the-art camera system."
  },
  {
    "name": "EcoFriendly Electric Scooter",
    "description": "Travel green with the EcoFriendly Electric Scooter, offering efficient battery life and a compact design for easy portability."
  },
  {
    "name": "Intelli Clean Vacuum Cleaner",
    "description": "Maintain a spotless home with the IntelliClean Vacuum Cleaner, boasting intelligent navigation and powerful suction capabilities."
  },
  {
    "name": "Ultimate Comfort Mattress",
    "description": "Enjoy restful nights with the UltimateComfort Mattress, featuring adaptive foam technology and a breathable fabric cover."
  },
  {
    "name": "SoundBlast Wireless Headphones",
    "description": "Immerse yourself in rich sound quality with the SoundBlast Wireless Headphones, offering noise-cancellation and a comfortable fit."
  },
  {
    "name": "AquaPure Water Filter",
    "description": "Ensure safe and clean drinking water with the AquaPure Water Filter, incorporating advanced filtration technology for pure and fresh water."
  }
]
```


### Then we are going to make a GET call to our microservice and replace the `<QUERY>` at the end, with our query

#### `localhost:8000/vectorSearch/<QUERY>`

![Alt text](images/navigateur.png)
 It should look like what you see above

## Thank you ! :)