const rp = require('request-promise');
const firebase = require("firebase");
// Required for side-effects
require("firebase/firestore");

const mediaServerUri = "https://www.libroparlato.org/media-server/v1/"
const ajaxUri = "https://www.libroparlato.org/wp-admin/admin-ajax.php"
const loginUri = "https://www.libroparlato.org/wp-login.php"

module.exports = (admin) => {
    var module = {}
    var db = admin.firestore()
    module.getCurrentBook = async (uid, auth) => {
        return new Promise(async function (resolve, reject) {
            console.log('1')
        db.collection('users').doc(uid).collection('read').doc('data').get().then(doc => {
            console.log('2')
            if (doc.exists) {
                var currentBook = null
                if (doc.data().currentBook) {
                    currentBook = doc.data().currentBook
                } else {
                    console.log('no book')
                    setNextBook(uid, auth)
                        .then(res => {currentBook = res})
                        .catch(err => reject(err))
                }

                if (auth.isExpired) {
                    rp({
                        uri: `${mediaServerUri}books/${currentBook.id}/chapters`,
                        headers: {Authorization: `Bearer ${auth.bearer}`}
                    }).then(res => {
                        res = JSON.parse(res)
                        db.collection('users').doc(uid).collection('read').doc('data').set({
                            "currentBook": {
                                "chapterList": res
                            }
                        },
                        {merge: true}
                        ).then(() => {
                            currentBook.chapterList = res
                            resolve(currentBook)
                        }).catch(err => {
                            reject(err)
                        })
                    })
                } else {
                    resolve(currentBook)
                }
                
            } else {
                reject('doc does not exist')
            }
        }).catch(err => {
            reject(err)
        })
        });
    }

    const setNextBook = async (uid, auth) => {
        return new Promise(async function (resolve, reject) {
            db.collection('users').doc(uid).collection('read').doc('data').get().then(doc => {
                if (doc.exists) {
                    console.log(doc.data())
                    if (doc.data().nextBooks) {
                        if (doc.data().nextBooks.length) {
                            axios.get(`${mediaServerUri}books/${nextBooks[0].id}/chapters`, {
                                headers: {Authorization: `Bearer ${auth.bearer}`}
                            }).then(res => {
                                res = JSON.parse(res)
                                var batch = db.batch()
                                var userDataRef = db.collection('users').doc(uid).collection('read').doc('data')
                                let currentBook = {...nextBooks[0], chapter: 1, chapterList: res}
                                batch.update(userDataRef, {"currentBook": currentBook})
                                batch.update(userDataRef, {"nextBooks": firebase.firestore.FieldValue.arrayRemove({...nextBooks[0]})})
                                batch.commit()
                                resolve(currentBook)
                            }).catch(err => {
                                reject(err)
                            })
                        }
                    }            
                } else {
                    reject('doc does not exist')
                }
            }).catch(err => {
                reject(err)
            })
        })
    }
    /*
    module.getNextBooks = async (uid, auth) => {
        return new Promise(async function (resolve, reject) {
            db.collection('users').doc(uid).collection('read').doc('data').get().then(doc => {
                if (doc.exists) {
                    console.log(doc.data())
                    let nextBooks = doc.data().nextBooks
                    if (nextBooks) {
                        if (nextBooks.length) {
                            axios.get(`${mediaServerUri}books/${nextBooks[0].id}/chapters`, {
                                headers: {Authorization: `Bearer ${auth.bearer}`}
                            }).then(res => {
                                res = JSON.parse(res)
                                var batch = db.batch()
                                var userDataRef = db.collection('users').doc(uid).collection('read').doc('data')
                                batch.update(userDataRef, {"currentBook": {...nextBooks[0], chapter: 1, chapterList: res}})
                                batch.update(userDataRef, {"nextBooks": firebase.firestore.FieldValue.arrayRemove({...nextBooks[0]})})
                                batch.commit()
                            }).catch(err => {
                                reject(err)
                            })
                        }
                        resolve(doc.data().nextBooks)
                    }            
                } else {
                    reject('doc does not exist')
                }
            }).catch(err => {
                reject(err)
            })
        });
    }*/
    
    module.readingCompleted = async uid => {
        exports.getCurrentBook(uid).then(currentBook => {
            console.log(currentBook.totalChapters, currentBook.chapter)
            if (currentBook.totalChapters < currentBook.chapter) {
                db.collection('users').doc(uid).collection('read').doc('data').update({
                    "currentBook.chapter": firebase.firestore.FieldValue.increment(1)
                });
            } else {
                exports.removeCurrentBook(uid)
            }
        })
    }
    
    module.getDashboardData = async uid => {
        return new Promise(async function (resolve, reject) {
            db.collection('users').doc(uid).collection('read').doc('data').get().then(doc => {
                if (doc.exists) {
                    if (doc.data().currentBook) {
                        resolve(doc.data())
                    } else {                        
                        setNextBook(uid, auth)
                        .then(currentBook => {
                            let data = doc.data()
                            data.currentBook = currentBook
                            resolve(data)
                        })
                        .catch(err => reject(err))
                    }
                } else {
                    reject('doc does not exist')
                }
            }).catch(err => {
                reject(err)
            })
        })
    }
    
    module.addBook = async (uid, bookId, auth) => {
        return new Promise(async function (resolve, reject) {
            console.log(bookId)
            rp({
                uri: "https://6b1db6debf0b3665ab1b0fe05295021c.m.pipedream.net",
                method: "POST",
                headers: {Cookie: auth.Cookie},
                form: {
                    action: "assign_opera_to_user",
                    user_id: auth.userId,
                    opera_id: bookId
                  }
            }).then(res => {
                if (res === "ok") {
                    rp({
                        uri: `${mediaServerUri}books/${bookId}`,
                        headers: {Authorization: `Bearer ${auth.bearer}`}
                    }).then(res => {
                        res = JSON.parse(res)
                        let author = res.autore.toLowerCase().trim().split(', ')
                        let book = {
                            id: bookId,
                            name: res.titolo,
                            copertina: res.copertina,
                            author: author[1].charAt(0).toUpperCase() + author[1].slice(1) 
                            + ' ' + author[0].charAt(0).toUpperCase() + author[0].slice(1),
                            description: res.descrizione,
                            cover: res.copertina
                        }

                        rp({
                            uri: `${mediaServerUri}books/${bookId}/chapters`,
                            headers: {Authorization: `Bearer ${auth.bearer}`}
                        }).then(res => {
                            res = JSON.parse(res)
                            book.chapterList = res
                            book.totalChapters = res.length
                            db.collection('users').doc(uid).collection('read').doc('data').set({
                                "nextBooks": admin.firestore.FieldValue.arrayUnion({
                                    id: book.id,
                                    name: book.name,
                                    author: book.author,
                                    totalChapters: book.totalChapters,
                                    chapterList: book.chapterList,
                                    description: book.description,
                                    cover: book.cover
                                })
                            }, {merge: true}).then(() => {
                                resolve(book)
                            }).catch(err => {
                                reject(err)
                            })
                        })
                    }).catch(err => {
                        reject(err)
                    })
                } else if (res === "limit_reached") {
                reject('limite_raggiunto')
                } else {
                reject('error_on_assign_api')
                }
            }).catch(err=> {
                console.log(err)
            })        
        })
    }
    module.removeBook = async (uid, book) => {
        return new Promise(async function (resolve, reject) {
            db.collection('users').doc(uid).collection('read').doc('data').update({
                "nextBooks": firebase.firestore.FieldValue.arrayRemove(book)
            })
                .then(()=> {resolve()})
                .catch((err) => {reject(err)})
        })
    }
    
    module.removeCurrentBook = async (uid) => {
        return new Promise(async function (resolve, reject) {
            db.collection('users').doc(uid).collection('read').doc('data').update({
                "currentBook": firebase.firestore.FieldValue.delete()
            })
                .then(()=> {resolve()})
                .catch((err) => {reject(err)})
        })
    }

    module.getAuthData = async (uid) => {
        return new Promise(async function (resolve, reject) {
            db.collection('users').doc(uid).get().then(doc => {
                let data = doc.data()
                if (data.auth.expirationDate.toDate() > new Date()) {
                    console.log('Got cached auth')
                    resolve({...data.auth, isExpired: false})
                    //console.log(data.auth)
                } else {
                    console.log('Cache is expired')
                    rp({
                        method: 'POST',
                        uri: loginUri,
                        //followAllRedirects: true,
                        form: {
                            log: data.auth.usr,
                            pwd: data.auth.pwd,
                            "wp-submit": "Login"
                        },
                        resolveWithFullResponse: true
            
                    }).then(res => {
                        console.log(res)
                        reject('error_getting_cookies_1')
                    }).catch(res => {    
                        if (res.response.statusCode === 302) {
                            let rawCookie = res.response.headers['set-cookie']
                            if (rawCookie.length) {
                                console.log(rawCookie)
                                let Cookie = rawCookie.map(e => {let x = e.match(/wordpress_\S+;/); if (x) return x[0]}).join(' ')
                                let expirationDate = null
                                rawCookie.some(e => {let x = e.match(/(?:%7C)(\d{10})(?:%7C)/); if (x) { expirationDate = new Date(x[1]*1000); return true}})
                                rp({
                                    uri: 'https://www.libroparlato.org/audiolibro/la-ragazza-con-la-macchina-da-scrivere/',
                                    headers: {Cookie}            
                                }).then(res => {
                                    if (res) {
                                        let bearer = res.match(/(?:"token":")(\S+)(?:")/)[1]
                                        if (bearer) {
                                            db.collection('users').doc(uid).set({
                                                auth: {Cookie, bearer, expirationDate}
                                            }, {merge: true})
                                            //console.log({Cookie, bearer, usr: data.auth.usr, pwd: data.auth.pwd, userId: data.auth.userId})
                                            resolve({Cookie, bearer, usr: data.auth.usr, pwd: data.auth.pwd, userId: data.auth.userId, isExpired: true})
                                        } else {
                                            reject('empty_bearer')
                                        }
                                    } else {
                                        reject('error_getting_bearer')
                                    }
                                }).catch(err => {
                                    reject(err)
                                })
                            } else {
                                reject(Cookie)
                            }
                            //console.log(Cookie)
                        } else {
                            reject('error_getting_cookies_2')
                        }
                    })
                }
    
            })
            
        })
    }

    module.getReadData = async(uid, auth) => {
    }
    return module;
}
/*
const getAuthData = async (usr, pwd) => {
    return new Promise(async function (resolve, reject) {
        rp({
            method: 'POST',
            uri: "http://localhost:8888/wordpress/wp-login.php",
            //followAllRedirects: true,
            form: {
                log: "piervito",
                pwd: "piervito",
                "wp-submit": "Login"
            },
            resolveWithFullResponse: true

        }).then(res => {
            reject('error_getting_cookies')
        }).catch(res => {    
            if (res.response.statusCode === 302) {
                let cookies = res.response.headers['set-cookie']
                if (cookies.length) {
                    let obj = {}
                    cookies.forEach(e => {let x = e.match(/(wordpress_\S+=)(\S+;)/); obj[x[0]] = x[1]})
                    resolve(cookies)
                } else {
                    reject(cookies)
                }
                console.log(cookies)
            } else {
                reject('error_getting_cookies')
            }
        })
    })
}



const getBearer = async (usr, pwd) => {
    return new Promise(async function (resolve, reject) {
        getCookieAuth(usr, pwd).then(cookies => {
            rp({
                uri: 'https://www.libroparlato.org/audiolibro/la-ragazza-con-la-macchina-da-scrivere/',
                headers: {...cookies}            
            }).then(res => {
                if (res) {
                    let bearer = res.match(/(?:"token":")(\S+)(?:")/)[1]
                    if (bearer) {
                        resolve(bearer)
                        console.log(bearer, 'bearer')
                    } else {
                        reject('empty_bearer')
                    }
                } else {
                    reject('error_getting_bearer')
                }
            })
        })
    })
}
*/
