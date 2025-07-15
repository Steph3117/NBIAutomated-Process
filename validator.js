// validator.js
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { parse } = require('json2csv');

// Status mapping
const statusToCategory = {
  "Valid": "VALID",
  "Address Invalid": "INVALID",
  "Domain Invalid": "INVALID",
  "Account Invalid": "INVALID",
  "Mailbox Full": "INVALID",
  "Accept-All": "INVALID",
  "Role Address": "RISKY",
  "Disposable": "INVALID",
  "Unknown": "RISKY"
};

// Helper to read a CSV file and return its rows
function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
}

// Main validation and file-splitting function
async function validateAndSplitFromBase(validationPath, contactsPath, outputFolder) {
  const validationData = await readCSV(validationPath);
  const contactsData = await readCSV(contactsPath);

  if (!validationData.length || !contactsData.length) {
    return {
      message: "One or both CSV files are empty.",
      downloads: []
    };
  }

  // Build email → VANID map (lowercased & trimmed)
  const emailToVANID = {};
  contactsData.forEach(row => {
    const email = row.PreferredEmail?.toString().trim().toLowerCase();
    if (email) {
      emailToVANID[email] = row.VANID;
    }
  });

  // Process and filter data
  const finalData = validationData.map(row => {
    const email = row.EMAILS?.toString().trim().toLowerCase();
    const statusDetail = row.STATUS?.toString().split(':').pop().trim();
    const tempCategory = statusToCategory[statusDetail] || null;
    const vanid = emailToVANID[email];

    if (vanid && tempCategory) {
      return {
        VANID: vanid,
        EMAILS: email,
        STATUS: row.STATUS,
        TempCategory: tempCategory
      };
    }
    return null;
  }).filter(Boolean);

  if (!finalData.length) {
    return {
      message: "No matching data found. Please check your CSV column names and content.",
      downloads: []
    };
  }

  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }

  const mappedPath = path.join(outputFolder, 'mapped_emails.csv');
  fs.writeFileSync(mappedPath, parse(finalData, { fields: ['VANID', 'EMAILS', 'STATUS', 'TempCategory'] }));

  const downloads = [{ name: 'mapped_emails.csv', url: '/downloads/mapped_emails.csv' }];
  const categories = ['VALID', 'INVALID', 'RISKY'];

  for (const category of categories) {
    const filtered = finalData
      .filter(row => row.TempCategory === category)
      .map(({ TempCategory, ...rest }) => rest);

    if (filtered.length > 0) {
      const fileName = `${category.toLowerCase()}_emailsrdl.csv`;
      const filePath = path.join(outputFolder, fileName);
      fs.writeFileSync(filePath, parse(filtered, { fields: ['VANID', 'EMAILS', 'STATUS'] }));
      downloads.push({ name: fileName, url: `/downloads/${fileName}` });
    }
  }

  return {
    message: "Processing complete!",
    downloads
  };
}

module.exports = { validateAndSplitFromBase };
