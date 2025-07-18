import Papa from 'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/+esm';

async function hashString(text) {
  const msgBuffer = new TextEncoder().encode(text.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

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
  link.textContent = `⬇ Download ${filename}`;
  document.getElementById('response').appendChild(link);
  document.getElementById('response').appendChild(document.createElement('br'));
}

document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  document.getElementById("loading").style.display = "block";
  document.getElementById("response").innerHTML = '';

  const file = document.getElementById('csvFile').files[0];
  const outputName = document.getElementById('hashName').value || 'hashed_emails.csv';

  if (!file) {
    alert('⚠️ Please upload a CSV file.');
    document.getElementById("loading").style.display = "none";
    return;
  }

  const data = await readCSVFile(file);

  const possibleKeys = ['Email', 'PreferredEmail', 'EMAILS', 'email'];
  const emailKey = Object.keys(data[0] || {}).find(k => possibleKeys.includes(k));

  if (!emailKey) {
    alert("❌ Could not find a valid email column. Expected one of: " + possibleKeys.join(', '));
    document.getElementById("loading").style.display = "none";
    return;
  }

  for (let row of data) {
    const email = row[emailKey] || '';
    row.HashedEmail = await hashString(email);
  }

  downloadCSV(data, outputName);
  document.getElementById("loading").style.display = "none";
  alert("✅ Hashing complete! File ready to download.");
});
