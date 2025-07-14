document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('uploadForm');
  const responseDiv = document.getElementById('response');
  const loading = document.getElementById('loading');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    responseDiv.innerHTML = '';
    loading.style.display = 'block';

    try {
      const formData = new FormData(form);

      const response = await fetch('/run-script', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      loading.style.display = 'none';

      responseDiv.innerHTML = `<p>${result.message}</p>`;

      if (Array.isArray(result.downloads)) {
        result.downloads.forEach(file => {
          const link = document.createElement('a');
          link.href = file.url;
          link.textContent = `Download ${file.name}`;
          link.download = file.name;
          responseDiv.appendChild(document.createElement('br'));
          responseDiv.appendChild(link);
        });
      }
    } catch (error) {
      loading.style.display = 'none';
      responseDiv.innerHTML = `<p style="color:red;">❌ Error: ${error.message}</p>`;
    }
  });
});