const express = require('express')
const bodyParser = require('body-parser');
const cors = require('cors');
const admin = require('firebase-admin');
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
require('dotenv').config()


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kw1ff.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
const port = 5000;

const app = express()
app.use(cors());
app.use(bodyParser.json());


var serviceAccount = require("./configs/volunteer-network-project-firebase-adminsdk-kv7t9-a61edf7366.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIRE_DB
});

app.get('/', (req, res) => {
  res.send('Hello World!')
})



const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(err => {
    const eventsCollection = client.db("volunteerNetwork").collection("events");
    const registrationsCollection = client.db("volunteerNetwork").collection("registrations");
    console.log('database connected')

    app.post('/addEvent', (req, res) => {
        const event = req.body; 
        console.log(event)   
        eventsCollection.insertOne(event)
        .then(result => {
          res.send(result.insertedCount > 0);
        })
    })

    app.get('/events', (req, res) => {
        eventsCollection.find({})
        .toArray ( (err, documents) => {
          res.send(documents);
        })
    })
    app.get('/admin', (req, res) => {
        registrationsCollection.find({})
        .toArray ( (err, documents) => {
          res.send(documents);
        })
    })

    app.post('/addRegistration', (req, res) => {
        const newRegistration = req.body;
        registrationsCollection.insertOne(newRegistration)
          .then(result => {
            res.send(result.insertedCount > 0);
          }) 
    })

    app.get('/registrations', (req, res) => {
        const bearer = req.headers.authorization;
        if (bearer && bearer.startsWith('Bearer ')) {
              const idToken = bearer.split(' ')[1];
              admin.auth().verifyIdToken(idToken)
                .then(function (decodedToken) {
                  const tokenEmail = decodedToken.email;
                  const queryEmail = req.query.email;
                  console.log(tokenEmail, queryEmail);
                  if (tokenEmail == queryEmail) {
                    registrationsCollection.find({ email: queryEmail })
                      .toArray((err, documents) => {
                        res.status(200).send(documents);
                      })
                  }
                }).catch(function (error) {
                  res.status(401).send('Un authorized access')
                });
        }    
        else{
          res.status(401).send('Un authorized access')
        }
    })
    app.delete('/delete/:id', (req, res) => {
        registrationsCollection.deleteOne({_id: ObjectId(req.params.id)})
        .then( result => {
            res.send(result.deletedCount > 0);         
        })
    })
});

app.listen(process.env.PORT || port)