// This script is meant to run fully in the browser (no Node.js backend required)

function parseCSV(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const lines = reader.result.split('\n').filter(Boolean);
      const headers = lines[0].split(',').map(h => h.trim());
      const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const obj = {};
        headers.forEach((h, i) => obj[h] = values[i]);
        return obj;
      });
      resolve(rows);
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

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

async function processFiles(validationFile, contactsFile, fileNames) {
  const validationData = await parseCSV(validationFile);
  const contactsData = await parseCSV(contactsFile);

  const emailToVANID = {};
  contactsData.forEach(row => {
    const email = row.PreferredEmail?.toLowerCase().trim();
    if (email) emailToVANID[email] = row.VANID;
  });

  const finalData = validationData.map(row => {
    const email = row.EMAILS?.toLowerCase().trim();
    const statusDetail = row.STATUS?.split(':').pop().trim();
    const category = statusToCategory[statusDetail];
    const vanid = emailToVANID[email];

    if (vanid && category) {
      return {
        VANID: vanid,
        EMAILS: email,
        STATUS: row.STATUS,
        Category: category
      };
    }
    return null;
  }).filter(Boolean);

  if (finalData.length === 0) {
    return { message: "No matching data found. Check column names and data format.", downloads: [] };
  }

  const categories = ['VALID', 'INVALID', 'RISKY'];
  const downloads = [];

  categories.forEach(cat => {
    const filtered = finalData.filter(row => row.Category === cat).map(({ Category, ...rest }) => rest);
    if (filtered.length) {
      const csvHeader = ['VANID', 'EMAILS', 'STATUS'];
      const csvRows = [csvHeader.join(',')].concat(
        filtered.map(row => csvHeader.map(h => row[h]).join(','))
      );
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const name = fileNames[cat.toLowerCase()] || `${cat.toLowerCase()}_emails.csv`;
      downloads.push({ name, url });
    }
  });

  return {
    message: "Processing complete!",
    downloads
  };
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('uploadForm');
  const responseDiv = document.getElementById('response');
  const loading = document.getElementById('loading');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    responseDiv.innerHTML = '';
    loading.style.display = 'block';

    const validationFile = document.getElementById('validation').files[0];
    const contactsFile = document.getElementById('contacts').files[0];

    const fileNames = {
      valid: document.getElementById('validName').value.trim() || 'valid_emails.csv',
      invalid: document.getElementById('invalidName').value.trim() || 'invalid_emails.csv',
      risky: document.getElementById('riskyName').value.trim() || 'risky_emails.csv'
    };

    try {
      const result = await processFiles(validationFile, contactsFile, fileNames);
      loading.style.display = 'none';
      responseDiv.innerHTML = `<p>${result.message}</p>`;

      result.downloads.forEach(file => {
        const link = document.createElement('a');
        link.href = file.url;
        link.textContent = `Download ${file.name}`;
        link.download = file.name;
        responseDiv.appendChild(document.createElement('br'));
        responseDiv.appendChild(link);
      });
    } catch (error) {
      loading.style.display = 'none';
      responseDiv.innerHTML = `<p style=\"color:red;\">❌ Error: ${error.message}</p>`;
    }
  });
});
