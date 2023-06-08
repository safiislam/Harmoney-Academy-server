const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.yrhbvyy.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    const coursesCollection = client.db("summary-school").collection("courses");
    const usersCollection = client.db("summary-school").collection("users");

    app.post("/jwt", (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.JWT_SECRET_KEY, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // courses api
    app.get("/course", async (req, res) => {
      const query = {};
      const options = {
        sort: { "totalEnroll" : -1 },
      };
      const result = await coursesCollection.find(query, options).toArray();
      res.send(result);
      // console.log(result)
    });

    // user api
    app.post("/users", async (req, res) => {
      const user = req.body;

      const query = { email: user.email };
      const isExist = await usersCollection.findOne(query);
      if (isExist) {
        return res.send({ error: "already exist" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.patch('/users/admin/:id', async(req,res)=>{
      const id = req.params.id;
      const  query = {_id: new ObjectId(id)}
      const option = {
        $set:{
          role:'admin'
        }
      } 
      const result = await usersCollection.updateOne(query,option)

    })
    app.patch('/users/instructor/:id',async (req,res)=>{
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      const options ={
        $set:{
          role:'instructor'
        }
      }
      const result = await usersCollection.updateOne(query,options)
      res.send(result)
    })


    // await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("hello music school");
});

app.listen(port);
