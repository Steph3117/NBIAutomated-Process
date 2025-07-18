import Papa from 'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/+esm';

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

async function readCSVFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: results => resolve(results.data),
      error: reject
    });
  });
}

function downloadCSV(data, filename) {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.textContent = `Download ${filename}`;
  document.getElementById('response').appendChild(link);
  document.getElementById('response').appendChild(document.createElement('br'));
}

document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  document.getElementById("loading").style.display = "block";
  document.getElementById("response").innerHTML = '';

  const valFile = document.getElementById('validation').files[0];
  const conFile = document.getElementById('contacts').files[0];
  const validName = document.getElementById('validName').value || 'valid_emails.csv';
  const invalidName = document.getElementById('invalidName').value || 'invalid_emails.csv';
  const riskyName = document.getElementById('riskyName').value || 'risky_emails.csv';

  if (!valFile || !conFile) {
    alert('Please upload both files.');
    document.getElementById("loading").style.display = "none";
    return;
  }

  const validationData = await readCSVFile(valFile);
  const contactsData = await readCSVFile(conFile);

  const emailToVANID = {};
  contactsData.forEach(row => {
    const email = (row.PreferredEmail || '').trim().toLowerCase();
    emailToVANID[email] = row.VANID;
  });

  const finalData = [];
  validationData.forEach(row => {
    const email = (row.EMAILS || '').trim().toLowerCase();
    const statusDetail = (row.STATUS || '').split(': ').pop().trim();
    const category = statusToCategory[statusDetail];
    const vanid = emailToVANID[email];

    if (vanid && category) {
      finalData.push({
        VANID: vanid,
        EMAILS: email,
        STATUS: row.STATUS,
        TempCategory: category
      });
    }
  });

  const grouped = {
    VALID: [],
    INVALID: [],
    RISKY: []
  };

  finalData.forEach(row => {
    const { TempCategory, ...outputRow } = row;
    grouped[TempCategory]?.push(outputRow);
  });

  if (grouped.VALID.length) downloadCSV(grouped.VALID, validName);
  if (grouped.INVALID.length) downloadCSV(grouped.INVALID, invalidName);
  if (grouped.RISKY.length) downloadCSV(grouped.RISKY, riskyName);

  document.getElementById("loading").style.display = "none";
  alert("✅ Processing complete. Your files are ready for download.");
});
