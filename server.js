const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { validateAndSplitFromBase } = require('./validator');

const app = express();
const PORT = 3000;

// Serve frontend
app.use(express.static('public'));
app.use('/downloads', express.static('rdl'));

// Multer for file uploads
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv') cb(null, true);
    else cb(new Error('Only CSV files allowed.'));
  }
});

// Upload & process files
app.post('/run-script', upload.fields([
  { name: 'validation_file', maxCount: 1 },
  { name: 'contacts_file', maxCount: 1 }
]), async (req, res) => {
  try {
    const valPath = req.files['validation_file'][0].path;
    const conPath = req.files['contacts_file'][0].path;
    const output = path.join(__dirname, 'rdl');

    const result = await validateAndSplitFromBase(valPath, conPath, output);

    fs.unlinkSync(valPath);
    fs.unlinkSync(conPath);

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Processing failed.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server at http://localhost:${PORT}`);
});
