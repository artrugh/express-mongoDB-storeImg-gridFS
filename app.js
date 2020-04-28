const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto')
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');

const app = express();

// // Middleware
app.use(bodyParser.json());
app.use(methodOverride('_method'))

// // engine
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
            // render index
            res.render('index', { files: files });
        }
    });
});


// // create storage engine
const storage = new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {

        console.log(file);

        return new Promise((resolve, reject) => {

            // is used to generate names
            crypto.randomBytes(16, (err, buf) => {
                if (err) {
                    return reject(err);
                }

                const filename = buf.toString('hex') + path.extname(file.originalname);
                const fileInfo = {
                    filename: filename,
                    bucketName: 'uploads',
                    metadata: req.body.collection,
                };
                resolve(fileInfo);
            });
        });
    }
});

// upload.single('this is the name of the input from the UI')
//  <input type="file" name="file" id="file" class="custom-file-input">
const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        console.log("req upload", req.body.password);
        if (req.body.password !== 'art') {
            return cb(new Error('unauthorized'));
        }
        cb(null, true);
    }
}).single('file');

// // @route POST /upload
// // @desc Uploads file to DB
app.post('/upload',
    (req, res, next) => upload(req, res, (err) => {
        // check if an error was passed in the middleware upload function
        if (err instanceof multer.MulterError) { return res.status(401).json({ err: 'unauthorized' }) }

        else if (err) return res.status(401).json({ err: 'unauthorized' });
        // Everything went fine.
        res.redirect('/')

    })
);

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
        // return res.json(file)
        const readstream = gfs.createReadStream(file.filename);
        return readstream.pipe(res);
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

    const id = req.params.id.split(":")[0]
    const password = req.params.id.split(":")[1]

    if (password === "art") {

        console.log("correct password");

        gfs.remove({ _id: id, root: 'uploads' }, (err, gridStore) => {

            if (err) {
                return res.status(404).json({ err: err });
            }
            res.redirect('/');
        });
    } else {
        console.log("incorrect password");
        res.status(404).json({ err: 'unauthorized' });
    }
})


const port = 4000;

app.listen(port, () => console.log(`Server started on ${port}`))