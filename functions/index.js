const functions = require('firebase-functions');
const admin = require('firebase-admin')
const cors = require('cors')({origin: true})
const webpush = require('web-push');
const formidable = require('formidable')
const fs = require('fs')
const UUID = require('uuid-v4')


// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
var serviceAccount = require("./instaPWA.json");

var gcConfig = {
    projectId: 'instapwa',
    keyFilename: 'instaPWA.json'
}
var gcs = require('@google-cloud/storage')(gcConfig)

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://instapwa.firebaseio.com'
})

exports.storePostData = functions.https.onRequest((request, response) => {
 cors(request, response, () => {
     var uuid = UUID()
     var formData = new formidable.IncomingForm();
     formData.parse(request, (err, fields, files) => {
        fs.rename(files.file.path, '/tmp/' + files.file.name);
        var bucket = gcs.bucket('instapwa.appspot.com')

        bucket.upload('/tmp/' + files.file.name, {
            uploadType: 'media',
            metadata: {
                metadata: {
                    contentType: files.file.type,
                    firebaseStorageDownloadTokens: uuid
                }
            }
        }, (err, file) => {
            if(!err) {
                admin.database().ref('posts').push({
                    id: fields.id,
                    title: fields.title,
                    location: fields.location,
                    rawLocation: {
                        lat : fields.rawLocation.lat,
                        long: fields.rawLocation.long
                    },
                    image: 'https://firebasestorage.googleapis.com/v0/b/' + bucket.name + '/o/' + encodeURIComponent(file.name) + '?alt=media&token=' + uuid
                }).then(() => {
                    webpush.setVapidDetails('mailto: mephistopheles989@gmail.com', 'BLl7xIPAyJNzsMi5vo_aG-4RdXdyZ4Q4ZFpTgnm902qN79MIiSORBk9N-rfFEGiKNPuJu5SJmUX35Wwce9nuH94','M8E6hw7jCmu7qNQJ88FV5o02OAiLefEFJK8jyJimk7g')
           
                   return admin.database().ref('subscriptions').once('value');
                }).then(subscriptions => {
                    subscriptions.forEach(sub => {
                        var pushConfig = {
                            endpoint: sub.val().endpoint,
                            keys: {
                                auth: sub.val().keys.auth,
                                p256dh: sub.val().keys.p256dh
                            }
                        }
                        webpush.sendNotification(pushConfig, JSON.stringify({
                            title: 'New Post',
                            content: 'New post added',
                            openUrl: '/help'
                        })).catch(err => {
                            console.log(err)
                        })
                    })
                   response.status(201).json({message: 'Data stored', id: fields.id})
                }).catch( err => {
                    response.status(500).json({error: err})
                })
            } else {
                console.log(err)
            }
        })
     })
 })
});
