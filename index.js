require('dotenv').config()
const express = require('express')
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('mongodb');
const port = process.env.PORT || 5000 ;
const app = express()
const cors = require('cors')


const corsOptions ={
    origin:'*', 
    credentials:true,
    optionSuccessStatus:200,
  }
  
  app.use(cors(corsOptions))
  app.use(express.json())

  
  const verifyJWT = (req,res,next)=>{
    const authorization = req.headers.authorization;
    if(!authorization){
      return res.status(401).send({error: true, message: 'unauthorized access'});
    }
    // bearer token
    const token = authorization.split(' ')[1]
  
    jwt.verify(token,process.env.ACCESS_TOKEN_SECRET, function(err,decoded){
      if(err){
        return res.status(403).send({error: true, message: 'unauthorized access'})
      }
      req.decoded = decoded;
      next();
    })
  }

  const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rf90d55.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    // Database connection ( Using CUET Mail)
    const database = client.db("PrinterInfo");
    const users = database.collection("users");
    const printCollection = database.collection("printInfo");
    const paymentCollection = database.collection("paymentInfo")
    //JWT Implement
    app.post('/jwt',(req,res)=>{
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '24h'})
        res.send({token}) 
      })

    //Get & Save User Info into DB 
    app.get('/user/:email',async(req,res)=>{
        const email = req.params.email
        const result = await users.findOne({email:email})
        res.send(result)
    })

    app.post('/user',async(req,res)=>{
        const user = req.body;
        const query1 = {email:user.email}
        const query2 = {cuetId:user.cuetId}
        const existingUser = await users.findOne(query1)
        const existingId = await users.findOne(query2)
        if(existingUser){
            return res.send({message: 'User Already Exist'})
        }else if(existingId){
            return res.send({message: 'CUET Id Already Exist'})
        }
        else{
            const result=await users.insertOne(user);
            res.send(result)
        }
        
    })

    // Admin get & save Print information
    app.get('/adminprintinfo',verifyJWT,async(req,res)=>{
      const search = req.query.search
      const option = {
        sort: {
          date: 1
        }
      }
        const result = await printCollection.find({
        cuetId: {$regex: search, $options: "i"} },option).toArray();
        return res.send(result)
    })
    app.post('/adminprintinfo',async(req,res)=>{
      const printInfo = req.body;
      const query = {
        cuetId: printInfo.cuetId
      }
      const paymentUser = await paymentCollection.findOne(query)
      if(!paymentUser){
        const paymentDoc = {name:printInfo.name,cuetId : printInfo.cuetId,total: printInfo.total, due: printInfo.total , paid : 0,date: new Date()}
        const insertResult = await paymentCollection.insertOne(paymentDoc)
      }
      if(paymentUser){
        let newTotal = parseInt(paymentUser.total)+parseInt(printInfo.total)
        let newDue = parseInt(paymentUser.due)+parseInt(printInfo.total)
        const updatedDoc = {
            $set:{
              total : newTotal,
              due : newDue,
              date : printInfo.date
            }
        }
        let updateResult = await paymentCollection.updateOne(query,updatedDoc)
      }
      const result = await printCollection.insertOne(printInfo)
      res.send(result)
    })


    // Admin Get All Payment Information
    app.get('/adminpaymentinfo',verifyJWT,async(req,res)=>{
      const search = req.query.search
      const option = {
        sort: {
          date: 1
        }
      }
        const result = await paymentCollection.find({
        cuetId: {$regex: search, $options: "i"} },option).toArray();
        return res.send(result)
    })



    // USER

    // user get print information
    app.get('/userprintinfo',verifyJWT,async(req,res)=>{
      const cuetId = req.query.cuetId
      const query = {
        cuetId : cuetId
      }
      const option = {
        sort: {
          date: 1
        }
      }
        const result = await printCollection.find(query,option).toArray();
        return res.send(result)
    })

  } finally{
    // await client.close()
  }
}

run()
app.get('/',(req,res)=>{
    res.send('Printer Info Server Running')
})
app.listen(port)