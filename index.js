var express = require('express');
var app = express();

const cors = require('cors')

const admin = require('firebase-admin')
const serviceAccount = require("./config/lettoreaudiolibri-bff72-firebase-adminsdk-olslj-22741c22e8.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://lettoreaudiolibri-bff72.firebaseio.com"
});
let lt = require('./functions.js')(admin)
var bodyParser = require('body-parser')
//app.use( bodyParser.json() );       // to support JSON-encoded bodies
/*app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); */
app.use(express.json())
app.use(cors())
//lt.addBook(null, 25720, 'c606aa3c11f9a57c8f80090f20613ae0e97922c7')
//lt.getReadData('qRmLbzNPJbXvh2ViYVSCTriX8lX2')

// set the port of our application
// process.env.PORT lets the port be set by Heroku
var port = 3005//process.env.PORT || 8080;

// set the view engine to ejs
app.set('view engine', 'ejs');

function checkAuth(req, res, next) {
    if (req.headers.authtoken) {
      admin.auth().verifyIdToken(req.headers.authtoken)
        .then((decodedToken) => {
            res.locals.decodedToken = decodedToken
            //console.log(decodedToken)
          next()
        }).catch((err) => {
            console.log(err)
          res.status(403).send('Unauthorized')
        });
    } else {
      res.status(403).send('Unauthorized')
    }
  }
  
app.post('/', checkAuth)

// set the home page route
app.get('/', (req, res) => {
    res.json({
      message: 'Hello World!'
    })
})

app.post('/', function (req, res, next) {
    console.log(res.locals.decodedToken.uid)
    lt.getAuthData(res.locals.decodedToken.uid).then(auth => {
        res.locals.auth = auth
        next()
    }).catch(err => {
        console.log(res)
        res.status(403).send('Unauthorized')
    })    
})

app.post('/', (req, res) => {
    console.log(req.body)
    if (req.body.action) {
        switch (req.body.action) {
            case 'currentBook':
                console.log('0')
                lt.getCurrentBook(res.locals.decodedToken.uid, res.locals.auth).then(result => {
                    res.send(result)
                }).catch(err => {
                    console.log(err)
                })
                break;
            case 'nextBooks':
                lt.getNextBooks(res.locals.decodedToken.uid).then(result => {
                    res.send(result)
                }).catch(err => {
                    console.log(err)
                })
                break;
            case 'readingCompleted':
                lt.readingCompleted(res.locals.decodedToken.uid)
                res.json({message: "updated"})
                break;
            case 'dashboardData':
                lt.getDashboardData(res.locals.decodedToken.uid).then(result => {
                    res.send(result)
                }).catch(err => {
                    console.log(err)
                })
                break;
            case 'addBook':
                if (req.body.bookId) {
                    lt.addBook(res.locals.decodedToken.uid, req.body.bookId, res.locals.auth).then(result => {
                        res.send({message: 'success', newBook: result})
                    }).catch(err => {
                        if (err === 404) {
                            res.send({message: "invalid id"})
                        } else {                            
                            res.send({message: "error"})
                        }
                        console.log(err)
                    })
                } else {
                    res.json({error: "missing bookId parameter"})
                }
                break;
            case 'removeBook':
                if (req.body.book) {
                    lt.removeBook(res.locals.decodedToken.uid, req.body.book).then(() => {
                        res.send({message: 'success'})
                    }).catch(err => {
                        console.log(err)
                        res.send({message: "error"})
                    })
                } else {
                    res.json({error: "missing book parameter"})
                }                
                break;
            case 'removeCurrentBook':
                lt.removeCurrentBook(res.locals.decodedToken.uid).then(() => {
                    res.send({message: 'success'})
                }).catch(err => {
                    console.log(err)
                    res.send({message: "error"})
                })               
                break;
            case 'setNextBook':
                lt.setNextBook(res.locals.decodedToken.uid, res.locals.auth).then(()=> {
                    console.log('all set')
                }).catch(err=> {
                    console.log(err)
                })               
                break;
            default:
                break;
        }
    } else {
        res.json({error: "Action parameter is required"})
    }
    
})

app.listen(port, function() {
    console.log('The app is running on http://localhost:' + port);
});