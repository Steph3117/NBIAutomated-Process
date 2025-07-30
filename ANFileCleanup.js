import Papa from 'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/+esm';

document.getElementById('uploadForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const file = document.getElementById('csvFile').files[0];
  if (!file) return alert("Please upload a file.");

  const csvData = await readCSV(file);
  const cleanedData = [];

  csvData.forEach(row => {
    const originCodes = row["OriginCodeName"]?.split(',').map(code => code.trim()).filter(Boolean);

    if (!originCodes || originCodes.length === 0) return;

    originCodes.forEach(code => {
      const newRow = { ...row, OriginCodeName: code };
      cleanedData.push(newRow);
    });
  });

  downloadCSV(cleanedData, "cleaned_origin_codes.csv");
});

async function readCSV(file) {
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
  const response = document.getElementById('response');
  response.innerHTML = '';
  response.appendChild(link);
}