const express = require('express');
const app = express()
const cors = require('cors');
const jwt = require('jsonwebtoken')
require('dotenv').config()
const port = process.env.PORT || 5000


// middleware
app.use(cors())
app.use(express.json())



// mongoDb Connection 


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hoyasjp.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const menuCollections = client.db('bistroDb').collection('menu')
        const reviewCollections = client.db('bistroDb').collection('reviews')
        const cartCollections = client.db('bistroDb').collection('carts')
        const usersCollections = client.db('bistroDb').collection('users')


        // jwt access token created 
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token })
        })

        // all menu collection getting from db 

        app.get('/menu', async (req, res) => {
            const result = await menuCollections.find().toArray()
            res.send(result)
        })

        // reviews getting  from db

        app.get('/reviews', async (req, res) => {
            const result = await reviewCollections.find().toArray()
            res.send(result)
        })
        // ----------------- //   cart section /-----------

        // carts get from db 
        app.get('/carts', async (req, res) => {
            const email =req.query.email;
            const query = {email: email}
            const result = await cartCollections.find(query).toArray()
            res.send(result)
        })
        // cart insert on db 

        app.post('/carts', async (req, res) => {
            const cartItem = req.body
            const result = await cartCollections.insertOne(cartItem)
            res.send(result)
        })
        // cart delete from my cart 
        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await cartCollections.deleteOne(query)
            res.send(result)
        })
        //    -----------------//   MiddleWear  //------------
        const verifyToken =(req,res,next)=>{
            // console.log('inside of token',req.headers.authorization);
            if(!req.headers.authorization){
                return res.status(401).send({message:"unauthorized access"})
            }
            const token =req.headers.authorization.split(' ')[1]
            jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
                if(err){
                    return res.status(401).send({message:'unauthorized access'})
                }
                req.decoded=decoded;
                next()
            })
            
        }

        // user verify admin after verify token 
        const verifyAdmin = async(req,res,next)=>{
            const email =req.decoded.email 
            const query ={email:email}
            const user =await usersCollections.findOne(query)
            const isAdmin = user?.role === 'admin'
            if(!isAdmin){
                return res.status(403).send({message:'forbidden access'})
            }
            next()
        }

        //    -----------------//   users   //------------
        // users get from db 
        app.get('/users',verifyToken,verifyAdmin, async (req, res) => {
          
            const result = await usersCollections.find().toArray()
            res.send(result);
        })

        // admin from user 
        app.get('/users/admin/:email',verifyToken,async(req,res)=>{
            const adminEmail = req.params.email
            if(adminEmail !==req.decoded.email){
                return res.status(403).send({message:'forbidden access'})
            }
            const query = {email:adminEmail};
            const user = await usersCollections.findOne(query)
            let admin = false
            if (user){
                admin =user?.role ==='admin';
            }
            res.send({admin})
        })

        // user post on db 
        app.post('/users', async (req, res) => {
            const users = req.body;
            // inserted users in bd who are log in with google (using checking process)
            const query = { email: users.email }
            const existingEmail = await usersCollections.findOne(query)
            if (existingEmail) {
                return res.send({ message: 'User Already Exist', insertedId: null })
            }
            const result = await usersCollections.insertOne(users)
            res.send(result)
        })
        // users delete 
        app.delete('/users/:id',verifyToken,verifyAdmin, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await usersCollections.deleteOne(query)
            res.send(result)
        })

        // make a user to admin 

        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const update = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollections.updateOne(filter, update)
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




// last part 
app.get('/', (req, res) => {
    res.send('Bistro boss.............')
})

app.listen(port, () => {
    console.log(`Bistro Boss running on Port ${port}`);
})