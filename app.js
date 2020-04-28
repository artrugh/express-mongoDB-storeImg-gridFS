
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto')
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');


// const methodOverride = (key) => {
//     // key = key || "_method";


//     return function methodOverride(req, res, next) {
//         console.log(req.body);
//         var method;
//         req.originalMethod = req.originalMethod || req.method;

//         // req.body
//         if (req.body && typeof req.body === 'object' && key in req.body) {
//             method = req.body[key].toLowerCase();
//             delete req.body[key];
//         }

//         // check X-HTTP-Method-Override
//         if (req.headers['x-http-method-override']) {
//             method = req.headers['x-http-method-override'].toLowerCase();
//         }

//         // replace
//         if (supports(method)) req.method = method.toUpperCase();

//         next();
//     };
// };

const app = express();

// // Middleware
app.use(bodyParser.json());

// app.use(fileUpload());
app.use(methodOverride('_method'))

app.set('view engine', 'ejs');

// // Mongo URI 
const mongoURI = 'mongodb://localhost:27017/mongouploads';

// // Create mongo connection
// const conn = mongoose.createConnection(mongoURI);

//alternatively
const connectDB = () => {
    try {
        return mongoose.createConnection(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true,
            useFindAndModify: false
        })

    } catch (err) {
        console.error("error message", err.message);
        process.exit(1);
    }
};

const conn = connectDB();

// // Init gfs
let gfs;
conn.once('open', () => {
    // Init stream
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('uploads');
});

// @route GET /
// @desc Loads form
app.get('/', (req, res) => {
    gfs.files.find().toArray((err, files) => {
        // Check if files
        if (!files || files.length === 0) {
            res.render('index', { files: false });
        } else {
            files.map(file => {
                if (
                    file.contentType === 'image/jpeg' ||
                    file.contentType === 'image/png'
                ) {
                    file.isImage = true;
                } else {
                    file.isImage = false;
                }
            });
            res.render('index', { files: files });
        }
    });
});


// // create storage engine
const storage = new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {

        // console.log("req", req.body);


        return new Promise((resolve, reject) => {

            // is used to generate names
            crypto.randomBytes(16, (err, buf) => {
                if (err) {
                    return reject(err);
                }
                // console.log("file", file);

                // console.log("original", file.originalname);


                const filename = buf.toString('hex') + path.extname(file.originalname);
                const fileInfo = {
                    filename: filename,
                    bucketName: 'uploads'
                };
                resolve(fileInfo);
            });
        });
    }
});
const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        // console.log("reqqqqq", req.body);
        // console.log(file.mimetype !== 'image/png');

        if (file.mimetype === 'image/png') {
            // console.log("heyyyy", req.body.password);
            const hey = cb(new Error('I don\'t have a clue!'));
            // console.log(hey);

            return hey
            // return res.status(404).json({g
            //     err: 'No files exist'
            // });
        }
        cb(null, true);
    }
}).single('file');

// const auth = (req, res, next) => {

//     console.log("body", req.body.password);
//     console.log("files", req.files);


// (req, res, next) => {
//     // add a password to uploadFiles
//     console.log(req.file);
//     if (req.body.password !== "arturo") {
//         // res.redirect('/');
//         return res.status(401).json({
//             err: 'unauthorized'
//         });
//     }
//     next()
// }

//     try {
//         const password = req.body.password;
//         if (password !== "arturo") {
//             // res.redirect('/');
//             return res.status(401).json({
//                 err: 'unauthorized'
//             });
//         }

//         next();
//     } catch (e) {
//         next(e);
//     }
// };

// // @route POST /upload
// // @desc Uploads file to DB
// upload.single('this is the name of the input from the UI')
//  <input type="file" name="file" id="file" class="custom-file-input">
app.post('/upload',
    // upload.none(),
    // auth,
    (req, res, next) => upload(req, res, (err) => {

        // console.log("req here", req.files);
        // console.log("res", res.cb);
        // console.log(multer.MulterError);

        if (err instanceof multer.MulterError) {
            // console.log("err", err);

            // A Multer error occurred when uploading.
        } else if (err) {

            // console.log("ee", err);
            console.log("resssssss", err.storageErrors);

            return res.status(401).json({
                err: 'unauthorized'
            });

            // console.log("res", res);


            // return err

            // An unknown error occurred when uploading.
        }

        // if (req.body.password !== "arturo") {
        //     // res.redirect('/');
        //     // return res.status(401).json({
        //     //     err: 'unauthorized'
        //     // });
        // }

        // if (err instanceof multer.MulterError) {
        //     // A Multer error occurred when uploading.
        // } else if (err) {
        //     // An unknown error occurred when uploading.
        // }
        res.redirect('/')
        // Everything went fine.
    })

    // (req, res) => {
    //     // console.log("req.body", req);
    //     // console.log("res", req);




    //     // res.json({ file: req.file });

    // }

);
// (req, res, next) => { console.log(req); return next() },
// (req, res) => {

//     upload.single('file')

//     console.log("inside", req.body.password);
//     return upload(req, res, (err) => {
//         console.log("out", req.body.password);
//         console.log(req.file);

//         if (req.body.password === "ar") res.redirect('/');
//         // res.json({ file: req.file });
//         else return res.status(404).json({
//             err: 'No files exist'
//         });
//     })
// }
//);


// @route GET /files
// @desc  Display all files in JSON
app.get('/files', (req, res) => {
    gfs.files.find().toArray((err, files) => {
        // Check if files
        if (!files || files.length === 0) {
            return res.status(404).json({
                err: 'No files exist'
            });
        }
        // Files exist
        return res.json(files);
    });
});

// @route GET /files/:filename
// @desc  Display single file object
app.get('/files/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
        // Check if file
        if (!file || file.length === 0) {
            return res.status(404).json({
                err: 'No file exists'
            });
        }
        // File exists
        return res.json(file)
        // const readstream = gfs.createReadStream(file.filename);
        // return readstream.pipe(res);
    });
});


// @route GET /image/:filename
// @desc Display Image
app.get('/image/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
        // Check if file
        if (!file || file.length === 0) {
            return res.status(404).json({
                err: 'No file exists'
            });
        }

        // Check if image
        if (file.contentType === 'image/jpeg' || file.contentType === 'image/png' || file.contentType === 'video/mp4') {
            // Read output to browser
            const readstream = gfs.createReadStream(file.filename);
            readstream.pipe(res);
        } else {
            res.status(404).json({
                err: 'Not an image'
            });
        }
    });
});

// @route DELETE /files/:id
// @desc  Delete file
app.delete('/files/:id', (req, res) => {

    gfs.remove({ _id: req.params.id, root: 'uploads' }, (err, gridStore) => {
        if (err) {
            return res.status(404).json({ err: err });
        }

        res.redirect('/');
    });
});



const port = 5000;

app.listen(port, () => console.log(`Server started on ${port}`))