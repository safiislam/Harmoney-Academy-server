const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.STRIPE_KEY);

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
    const bookingCollection = client.db("summary-school").collection("booking");
    const paymentsCollection = client
      .db("summary-school")
      .collection("payments");

    app.post("/jwt", (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.JWT_SECRET_KEY, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // courses api
    // TODO:API DELETE
    app.get("/course", async (req, res) => {
      const query = {};
      const options = {
        sort: { totalEnroll: -1 },
      };
      const result = await coursesCollection.find(query, options).toArray();
      res.send(result);
      // console.log(result)
    });
    app.post("/course", async (req, res) => {
      const data = req.body;
      const result = await coursesCollection.insertOne(data);
      res.send(result);
    });
    app.patch("/course/:id", async (req, res) => {
      const data = req.body;
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        $set: {
          ...data,
        },
      };
      const result = await coursesCollection.updateOne(query, options);
      res.send(result);
    });
    app.get("/courses", async (req, res) => {
      const email = req.query.email;
      // console.log(email)
      const query = { instractorEmail: email };
      const options = {
        sort: { date: -1 },
      };
      const result = await coursesCollection.find(query, options).toArray();
      res.send(result);
    });
    app.get("/isPanding", async (req, res) => {
      const query = { status: "pending" };
      const optons = {
        sort: { date: -1 },
      };
      const result = await coursesCollection.find(query, optons).toArray();
      res.send(result);
    });
    app.patch("/approve/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        $set: {
          status: "approve",
        },
      };
      const result = await coursesCollection.updateOne(query, options);
      res.send(result);
    });
    app.patch("/deny/:id", async (req, res) => {
      const id = req.params.id;
      const { feedback } = req.body;
      const query = { _id: new ObjectId(id) };
      const option = {
        $set: {
          feedback: feedback,
          status: "deny",
        },
      };
      const result = await coursesCollection.updateOne(query, option);
      res.send(result);
    });
    app.get("/allClass", async (req, res) => {
      const query = {
        status: "approve",
      };
      const options = {
        sort: { totalEnroll: -1 },
      };
      const result = await coursesCollection.find(query, options).toArray();
      res.send(result);
    });
    app.post("/classBookings", async (req, res) => {
      const data = req.body;
      console.log(data);
      const result = await bookingCollection.insertOne(data);
      res.send(result);
    });
    app.get("/classBookings", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const options = {
        sort: { date: -1 },
      };
      const result = await bookingCollection.find(query, options).toArray();
      res.send(result);
    });
    app.delete("/classBookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
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

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const option = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(query, option);
    });
    app.patch("/users/instructor/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        $set: {
          role: "instructor",
        },
      };
      const result = await usersCollection.updateOne(query, options);
      res.send(result);
    });

    // stripe banck paypment api
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // payment apis
    app.post("/payment", async (req, res) => {
      const data = req.body;
      const insertResult = await paymentsCollection.insertOne(data);
      const queryDelete = {
        _id: { $in: data.bookingsId.map((id) => new ObjectId(id)) },
      };
      

      const classesId = data.classId.map(id => new ObjectId(id))
      const updateResult = await coursesCollection.updateMany(
        {
          _id:{ $in : classesId },availableSeats:{ $gt: 0 }
        },
        {
          $inc:{availableSeats : -1 ,totalEnroll : 1}
        }
      )

      const deleteResult = await bookingCollection.deleteMany(queryDelete);
      res.send({ insertResult, deleteResult,updateResult });
    });

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
