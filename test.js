const admin = require('firebase-admin')
const serviceAccount = require("./config/lettoreaudiolibri-bff72-firebase-adminsdk-olslj-22741c22e8.json");
const firebase = require("firebase");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://lettoreaudiolibri-bff72.firebaseio.com"
});
var db = admin.firestore()

db.collection('users').doc('test').collection('read').doc('data').set({
	"nextBooks": admin.firestore.FieldValue.arrayUnion('ok')
}, {merge: true})