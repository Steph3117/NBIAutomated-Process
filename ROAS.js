let updatedNBIData = [];
let summaryData = [];

document.getElementById('uploadForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const creationDate = document.getElementById('creationDate').value;
  const actblueFile = document.getElementById('actblueFile').files[0];
  const nbiFile = document.getElementById('nbiFile').files[0];

  if (!creationDate || !actblueFile || !nbiFile) {
    alert("Please complete all fields.");
    return;
  }

  const actblueData = await parseCSV(actblueFile);
  const nbiData = await parseCSV(nbiFile);

updatedNBIData = nbiData.map(row => {
  const email = row["PreferredEmail"]?.trim().toLowerCase();

  // SUMIFS-like logic: sum all matching rows by email
  const totalAmount = actblueData.reduce((sum, abRow) => {
    const abEmail = abRow["Donor Email"]?.trim().toLowerCase();
    const amount = parseFloat(abRow["Amount"]);
    return (abEmail === email && !isNaN(amount)) ? sum + amount : sum;
  }, 0);

  return {
    ...row,
    "Creation Date": creationDate,
    "Amount": totalAmount.toFixed(2)
  };
});

  let originField = "OriginCodeName";

// Check for presence of OriginCodeName field
if (!updatedNBIData[0]?.hasOwnProperty(originField)) {
  originField = prompt(
    `"OriginCodeName" field not found in the uploaded NBI file. Please enter the correct field name to group donations by (e.g., "Source", "List Name", etc.):`
  );

  if (!originField || !updatedNBIData[0]?.hasOwnProperty(originField)) {
    alert(`Field "${originField}" not found in the file. Cannot generate summary.`);
    return;
  }
}

summaryData = getSummaryIncludingZeros(updatedNBIData, originField);
  renderSummary(summaryData);
  document.getElementById('downloadButtons').style.display = 'block';
});

function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: results => resolve(results.data),
      error: err => reject(err)
    });
  });
}

function getSummaryIncludingZeros(data) {
  const summary = {};

  // Initialize and count all individuals per OriginCodeName
  data.forEach(row => {
    const origin = row["OriginCodeName"] || "Unknown";
    if (!summary[origin]) {
      summary[origin] = { total: 0, count: 0, totalIndividuals: 0 };
    }
    summary[origin].totalIndividuals += 1;
  });

  // Count only those who donated
  data.forEach(row => {
    const origin = row["OriginCodeName"] || "Unknown";
    const amount = parseFloat(row["Amount"]);
    if (!isNaN(amount) && amount > 0) {
      summary[origin].total += amount;
      summary[origin].count += 1;
    }
  });

  const summaryRows = Object.entries(summary).map(([origin, stats]) => ({
    OriginCodeName: origin,
    "Total Donated": `$${stats.total.toFixed(2)}`,
    "Average Donated": stats.count > 0 ? `$${(stats.total / stats.count).toFixed(2)}` : `$0.00`,
    "Number of Donors": stats.count,
    "Total Individuals in Source": stats.totalIndividuals
  }));

  // Totals row
  const totalAmount = summaryRows.reduce((sum, row) => sum + parseFloat(row["Total Donated"].replace('$', '')), 0);
  const totalDonors = summaryRows.reduce((sum, row) => sum + row["Number of Donors"], 0);
  const totalIndividuals = summaryRows.reduce((sum, row) => sum + row["Total Individuals in Source"], 0);
  const avgDonation = totalDonors > 0 ? totalAmount / totalDonors : 0;

  summaryRows.push({
    OriginCodeName: "TOTAL",
    "Total Donated": `$${totalAmount.toFixed(2)}`,
    "Average Donated": `$${avgDonation.toFixed(2)}`,
    "Number of Donors": totalDonors,
    "Total Individuals in Source": totalIndividuals
  });

  return summaryRows;
}

function renderSummary(summaryRows) {
  const container = document.getElementById('results');
  container.innerHTML = '<h2>Summary by OriginCodeName</h2>';

  const table = document.createElement('table');
  table.id = 'summaryTable';
  table.innerHTML = `
    <tr>
      <th>Select</th>
      <th>OriginCodeName</th>
      <th>Total Donated</th>
      <th>Average Donated</th>
      <th>Number of Donors</th>
      <th>Total Individuals in Source</th>
    </tr>
  `;

  summaryRows.forEach((row) => {
    const isTotal = row["OriginCodeName"] === "TOTAL";

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${!isTotal ? `<input type="checkbox" class="origin-checkbox" data-origin="${row["OriginCodeName"]}" checked>` : ''}</td>
      <td><strong>${row["OriginCodeName"]}</strong></td>
      <td>${row["Total Donated"]}</td>
      <td>${row["Average Donated"]}</td>
      <td>${row["Number of Donors"]}</td>
      <td>${row["Total Individuals in Source"]}</td>
    `;

    if (isTotal) {
      tr.id = "totalRow";
      tr.style.fontWeight = "bold";
      tr.style.borderTop = "2px solid #000";
    }

    table.appendChild(tr);
  });

  // Add recalculate button
  const buttonRow = document.createElement('tr');
  buttonRow.innerHTML = `
    <td colspan="6" style="text-align: right; padding-top: 10px;">
      <button id="recalculateTotals">🔁 Recalculate Totals</button>
    </td>
  `;
  table.appendChild(buttonRow);

  container.appendChild(table);

  // Add event listener for recalculate
  document.getElementById('recalculateTotals').addEventListener('click', updateTotalRow);
}

function updateTotalRow() {
  const rows = Array.from(document.querySelectorAll('#summaryTable tr')).slice(1, -2); // exclude header + TOTAL + button
  let totalAmount = 0;
  let totalDonors = 0;
  let totalIndividuals = 0;

  rows.forEach(row => {
    const checkbox = row.querySelector('input.origin-checkbox');
    if (checkbox && checkbox.checked) {
      const amount = parseFloat(row.cells[2].textContent.replace('$', '')) || 0;
      const donors = parseInt(row.cells[4].textContent) || 0;
      const individuals = parseInt(row.cells[5].textContent) || 0;
      totalAmount += amount;
      totalDonors += donors;
      totalIndividuals += individuals;
    }
  });

  const avgDonation = totalDonors > 0 ? (totalAmount / totalDonors).toFixed(2) : "0.00";
  const totalRow = document.getElementById("totalRow");
  totalRow.innerHTML = `
    <td></td>
    <td><strong>TOTAL</strong></td>
    <td>$${totalAmount.toFixed(2)}</td>
    <td>$${avgDonation}</td>
    <td>${totalDonors}</td>
    <td>${totalIndividuals}</td>
  `;
}
 

// Download event listeners
document.getElementById('downloadNBI').addEventListener('click', () => {
  const csv = Papa.unparse(updatedNBIData);
  triggerDownload(csv, "Updated_NBI.csv");
});

document.getElementById('downloadSummary').addEventListener('click', () => {
  const csv = Papa.unparse(summaryData);
  triggerDownload(csv, "Summary_By_OriginCodeName.csv");
});

function triggerDownload(csvString, filename) {
  const blob = new Blob([csvString], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
