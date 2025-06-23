let uploadedFiles = [];

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileListContainer = document.getElementById('fileListContainer');
const processBtn = document.getElementById('processBtn');

// --- Event Listeners for File Upload ---
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, e => {
        e.preventDefault();
        e.stopPropagation();
    }, false);
});
['dragenter', 'dragover'].forEach(eventName => {
    uploadArea.addEventListener(eventName, () => uploadArea.classList.add('dragover'), false);
});
['dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, () => uploadArea.classList.remove('dragover'), false);
});

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files));
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
processBtn.addEventListener('click', processFiles);

/**
 * Handles the selected files, updates the UI file list, and enables the process button.
 * @param {FileList} files - The files selected by the user.
 */
function handleFiles(files) {
    uploadedFiles = Array.from(files).filter(file => file.name.endsWith('.xyz'));
    fileListContainer.innerHTML = '';
    if (uploadedFiles.length > 0) {
        const list = document.createElement('div');
        uploadedFiles.forEach(file => {
            // Use Tailwind classes directly for the file item
            list.innerHTML += `
                <div class="bg-gray-100 p-3 rounded-lg flex justify-between items-center mb-2 text-sm">
                    <span class="font-medium text-gray-700 truncate">${file.name}</span>
                </div>
            `;
        });
        fileListContainer.appendChild(list);
        processBtn.disabled = false;
    } else {
        processBtn.disabled = true;
    }
}

/**
 * Sends the uploaded files to the backend API for PCA processing.
 */
async function processFiles() {
    if (uploadedFiles.length === 0) return;

    // ★★★ STEP 2: あなたのRender API URLに置き換えてください ★★★
    // const apiUrl = "https://your-service-name.onrender.com/process_pca";
    const apiUrl = "https://render-pd-homcloud-api.onrender.com/process_pca";
    // ★★★ ========================================== ★★★

    if (apiUrl.includes("your-service-name")) {
        alert("スクリプト内の `apiUrl` をあなたのRenderサービスのURLに置き換えてください。");
        return;
    }

    document.getElementById('loading').style.display = 'block';
    document.getElementById('results').style.display = 'none';
    processBtn.disabled = true;

    const formData = new FormData();
    uploadedFiles.forEach(file => {
        formData.append('xyz_files', file);
    });

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'API request failed');
        }
        
        displayResults(data);

    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred: ' + error.message);
    } finally {
        document.getElementById('loading').style.display = 'none';
        processBtn.disabled = false;
    }
}

/**
 * Displays the PCA results from the API.
 * @param {object} data - The result data from the API.
 */
function displayResults(data) {
    document.getElementById('results').style.display = 'block';
    
    displayStats(data);
    plotPCA(data);
    plotContributions(data);
    plotCumulative(data);
}

/**
 * Displays key statistics in summary cards.
 * @param {object} data - The result data from the API.
 */
function displayStats(data) {
    const statsGrid = document.getElementById('statsGrid');
    const expVar = data.explained_variance_ratio_all;
    statsGrid.innerHTML = `
        <div class="bg-white p-4 rounded-lg shadow text-center">
            <h3 class="text-2xl font-bold text-blue-600">${data.points.length}</h3>
            <p>Data Points</p>
        </div>
        <div class="bg-white p-4 rounded-lg shadow text-center">
            <h3 class="text-2xl font-bold text-blue-600">${(expVar[0] * 100).toFixed(1)}%</h3>
            <p>PC1 Variance</p>
        </div>
        <div class="bg-white p-4 rounded-lg shadow text-center">
            <h3 class="text-2xl font-bold text-blue-600">${(expVar.length > 1 ? expVar[1] * 100 : 0).toFixed(1)}%</h3>
            <p>PC2 Variance</p>
        </div>
        <div class="bg-white p-4 rounded-lg shadow text-center">
            <h3 class="text-2xl font-bold text-blue-600">${(data.cumulative_variance_ratio_all[1] * 100).toFixed(1)}%</h3>
            <p>PC1+PC2 Cum. Var.</p>
        </div>
    `;
}

/**
 * Renders the 2D PCA scatter plot using Plotly.
 * @param {object} data - The result data from the API.
 */
function plotPCA(data) {
    const colorValues = data.points.map((_, index) => index);
    const trace = {
        x: data.points.map(p => p.x),
        y: data.points.map(p => p.y),
        mode: 'markers',
        type: 'scatter',
        text: data.points.map(p => p.label),
        marker: {
            size: 12,
            color: colorValues,
            colorscale: 'Viridis',
            showscale: true,
            colorbar: { title: 'Timestep Index' }
        },
        hovertemplate: '<b>%{text}</b><br>PC1: %{x:.3f}<br>PC2: %{y:.3f}<extra></extra>'
    };
    const layout = {
        xaxis: { title: `PC1 (${(data.explained_variance_ratio_all[0] * 100).toFixed(2)}%)` },
        yaxis: { title: `PC2 (${(data.explained_variance_ratio_all[1] * 100).toFixed(2)}%)` },
        hovermode: 'closest',
        margin: { l: 60, r: 30, b: 50, t: 30 },
    };
    Plotly.newPlot('pcaPlot', [trace], layout, {responsive: true});
}

/**
 * Renders the principal component contribution bar chart.
 * @param {object} data - The result data from the API.
 */
function plotContributions(data) {
    const components = data.explained_variance_ratio_all.map((_, i) => `PC${i+1}`);
    const trace = {
        x: components,
        y: data.explained_variance_ratio_all,
        type: 'bar',
        marker: { color: '#3b82f6' }
    };
    const layout = {
        xaxis: { title: 'Principal Component' },
        yaxis: { title: 'Explained Variance Ratio' },
        margin: { l: 60, r: 30, b: 50, t: 30 },
    };
    Plotly.newPlot('contributionPlot', [trace], layout, {responsive: true});
}

/**
 * Renders the cumulative variance line chart.
 * @param {object} data - The result data from the API.
 */
function plotCumulative(data) {
    const components = data.cumulative_variance_ratio_all.map((_, i) => `PC${i+1}`);
    const trace = {
        x: components,
        y: data.cumulative_variance_ratio_all,
        type: 'scatter',
        mode: 'lines+markers',
        marker: { color: '#16a34a', size: 8 },
        line: { color: '#16a34a', width: 3 }
    };
    const layout = {
        xaxis: { title: 'Principal Component' },
        yaxis: { title: 'Cumulative Variance Ratio', range: [0, 1.1] },
        margin: { l: 60, r: 30, b: 50, t: 30 },
    };
    Plotly.newPlot('cumulativePlot', [trace], layout, {responsive: true});
}
