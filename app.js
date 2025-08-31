class DuplicateFinderWeb {
    constructor() {
        this.files = [];
        this.duplicateFinder = null;
        this.initializeElements();
        this.setupEventListeners();
        this.initializeWebAssembly();
    }

    initializeElements() {
        this.fileInput = document.getElementById('fileInput');
        this.uploadArea = document.getElementById('uploadArea');
        this.selectFilesBtn = document.getElementById('selectFiles');
        this.selectFolderBtn = document.getElementById('selectFolder');
        this.scanButton = document.getElementById('scanButton');
        this.extensionFilter = document.getElementById('extensionFilter');
        
        // Progress elements
        this.progressSection = document.getElementById('progressSection');
        this.progressFill = document.getElementById('progressFill');
        this.progressPercentage = document.getElementById('progressPercentage');
        this.statusBadge = document.getElementById('statusBadge');
        this.currentFileName = document.getElementById('currentFileName');
        this.currentFilePath = document.getElementById('currentFilePath');
        this.processedCount = document.getElementById('processedCount');
        this.totalCount = document.getElementById('totalCount');
        this.processingSpeed = document.getElementById('processingSpeed');
        this.estimatedTime = document.getElementById('estimatedTime');
        this.logContent = document.getElementById('logContent');
        this.clearLogBtn = document.getElementById('clearLogBtn');
        
        this.statsSection = document.getElementById('statsSection');
        this.directorySummarySection = document.getElementById('directorySummarySection');
        this.directoryList = document.getElementById('directoryList');
        this.sortByNameBtn = document.getElementById('sortByNameBtn');
        this.sortByCountBtn = document.getElementById('sortByCountBtn');
        this.sortBySizeBtn = document.getElementById('sortBySizeBtn');
        this.resultsSection = document.getElementById('resultsSection');
        this.resultsContainer = document.getElementById('resultsContainer');
        
        this.exportBtn = document.getElementById('exportBtn');
        this.selectAllBtn = document.getElementById('selectAllBtn');
        
        this.toastContainer = document.getElementById('toastContainer');
        
        // Progress tracking variables
        this.startTime = null;
        this.processedFiles = 0;
        this.totalFiles = 0;
        
        // Directory data for sorting
        this.directoryData = [];
    }

    setupEventListeners() {
        // File selection
        this.selectFilesBtn.addEventListener('click', () => {
            this.fileInput.removeAttribute('webkitdirectory');
            this.fileInput.click();
        });

        this.selectFolderBtn.addEventListener('click', () => {
            this.fileInput.setAttribute('webkitdirectory', '');
            this.fileInput.click();
        });

        this.fileInput.addEventListener('change', (e) => {
            this.handleFileSelection(e.target.files);
        });

        // Drag and drop
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.classList.add('dragover');
        });

        this.uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('dragover');
        });

        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('dragover');
            this.handleFileSelection(e.dataTransfer.files);
        });

        // Scan button
        this.scanButton.addEventListener('click', () => {
            this.scanForDuplicates();
        });

        // Export button
        this.exportBtn.addEventListener('click', () => {
            this.exportResults();
        });

        // Select all button
        this.selectAllBtn.addEventListener('click', () => {
            this.toggleSelectAll();
        });

        // Clear log button
        this.clearLogBtn.addEventListener('click', () => {
            this.clearLog();
        });

        // Sort buttons
        this.sortByNameBtn.addEventListener('click', () => {
            this.sortDirectories('name');
        });

        this.sortByCountBtn.addEventListener('click', () => {
            this.sortDirectories('count');
        });

        this.sortBySizeBtn.addEventListener('click', () => {
            this.sortDirectories('size');
        });
    }

    async initializeWebAssembly() {
        // For now, we'll use a JavaScript implementation
        // In a real scenario, you would load the WebAssembly module here
        this.showToast('Aplicación lista para usar', 'success');
    }

    handleFileSelection(files) {
        this.files = Array.from(files).filter(file => file.type !== '');
        
        if (this.files.length > 0) {
            this.scanButton.disabled = false;
            this.showToast(`${this.files.length} archivos seleccionados`, 'success');
        } else {
            this.scanButton.disabled = true;
            this.showToast('No se seleccionaron archivos válidos', 'warning');
        }
    }

    async scanForDuplicates() {
        if (this.files.length === 0) return;

        this.showProgress();
        const extensions = this.getExtensionFilter();
        const filteredFiles = this.filterFilesByExtension(this.files, extensions);
        
        if (filteredFiles.length === 0) {
            this.hideProgress();
            this.showToast('Ningún archivo coincide con los filtros', 'warning');
            return;
        }

        const duplicateFinder = new JavaScriptDuplicateFinder();
        this.startTime = Date.now();
        this.processedFiles = 0;
        this.totalFiles = filteredFiles.length;
        
        this.totalCount.textContent = this.totalFiles;
        this.addLogEntry('Iniciando escaneo de duplicados...', 'info');

        for (const file of filteredFiles) {
            try {
                // Update current file display
                this.updateCurrentFile(file);
                this.addLogEntry(`Procesando: ${file.name}`, 'processing');
                
                const content = await this.readFileContent(file);
                duplicateFinder.addFile(file.name, file.webkitRelativePath || file.name, content);
                
                this.processedFiles++;
                this.updateProgress();
                
                // Small delay to allow UI updates and show processing
                await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 25));
            } catch (error) {
                console.error('Error reading file:', file.name, error);
                this.addLogEntry(`Error procesando: ${file.name}`, 'error');
            }
        }

        this.addLogEntry('Analizando duplicados...', 'info');
        this.updateStatus('Analizando resultados...', 'processing');
        
        // Simulate analysis time
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const results = duplicateFinder.findDuplicates();
        this.addLogEntry(`Escaneo completado. ${results.groups.length} grupos encontrados.`, 'completed');
        this.hideProgress();
        this.displayResults(results);
    }

    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    getExtensionFilter() {
        const filterText = this.extensionFilter.value.trim();
        if (!filterText) return [];
        
        return filterText.split(',')
            .map(ext => ext.trim().toLowerCase())
            .filter(ext => ext)
            .map(ext => ext.startsWith('.') ? ext : '.' + ext);
    }

    filterFilesByExtension(files, extensions) {
        if (extensions.length === 0) return files;
        
        return files.filter(file => {
            const fileExt = '.' + file.name.split('.').pop().toLowerCase();
            return extensions.includes(fileExt);
        });
    }

    showProgress() {
        this.progressSection.style.display = 'block';
        this.statsSection.style.display = 'none';
        this.resultsSection.style.display = 'none';
        this.clearLog();
        this.updateStatus('Preparando...', 'preparing');
        this.updateProgress();
    }

    updateProgress() {
        const percentage = this.totalFiles > 0 ? (this.processedFiles / this.totalFiles) * 100 : 0;
        
        this.progressFill.style.width = percentage + '%';
        this.progressPercentage.textContent = Math.round(percentage) + '%';
        this.processedCount.textContent = this.processedFiles;
        
        // Update processing speed
        if (this.startTime && this.processedFiles > 0) {
            const elapsed = (Date.now() - this.startTime) / 1000;
            const speed = this.processedFiles / elapsed;
            this.processingSpeed.textContent = speed.toFixed(1) + ' archivos/seg';
            
            // Update estimated time
            const remaining = this.totalFiles - this.processedFiles;
            if (remaining > 0 && speed > 0) {
                const estimatedSeconds = remaining / speed;
                this.estimatedTime.textContent = this.formatTime(estimatedSeconds);
            } else {
                this.estimatedTime.textContent = 'Finalizando...';
            }
        }
        
        // Update status
        if (this.processedFiles === this.totalFiles) {
            this.updateStatus('Completado', 'completed');
        } else if (this.processedFiles > 0) {
            this.updateStatus('Procesando', 'processing');
        }
    }

    updateCurrentFile(file) {
        this.currentFileName.textContent = file.name;
        this.currentFilePath.textContent = file.webkitRelativePath || file.name;
    }

    updateStatus(text, type) {
        this.statusBadge.textContent = text;
        this.statusBadge.className = `status-badge ${type}`;
    }

    addLogEntry(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.innerHTML = `
            <span class="log-timestamp">${timestamp}</span>
            <span class="log-message">${message}</span>
        `;
        
        this.logContent.appendChild(entry);
        this.logContent.scrollTop = this.logContent.scrollHeight;
        
        // Keep only last 100 entries
        while (this.logContent.children.length > 100) {
            this.logContent.removeChild(this.logContent.firstChild);
        }
    }

    clearLog() {
        this.logContent.innerHTML = '';
    }

    formatTime(seconds) {
        if (seconds < 60) {
            return Math.round(seconds) + 's';
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            const secs = Math.round(seconds % 60);
            return `${minutes}m ${secs}s`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${hours}h ${minutes}m`;
        }
    }

    hideProgress() {
        this.progressSection.style.display = 'none';
    }

    displayResults(results) {
        this.displayStats(results.stats);
        
        if (results.groups.length === 0) {
            this.showToast('No se encontraron archivos duplicados', 'success');
            return;
        }

        this.displayDirectorySummary(results.groups);
        this.displayDuplicateGroups(results.groups);
        this.directorySummarySection.style.display = 'block';
        this.resultsSection.style.display = 'block';
        this.showToast(`Se encontraron ${results.groups.length} grupos de duplicados`, 'success');
    }

    displayStats(stats) {
        document.getElementById('totalFiles').textContent = stats.totalFiles;
        document.getElementById('duplicateGroups').textContent = stats.duplicateGroups;
        document.getElementById('totalSize').textContent = stats.totalSize;
        document.getElementById('wastedSpace').textContent = stats.wastedSpace;
        
        this.statsSection.style.display = 'block';
    }

    displayDirectorySummary(groups) {
        const directoryMap = new Map();
        
        // Analizar todos los archivos por directorio
        groups.forEach(group => {
            group.files.forEach(file => {
                const dirPath = this.getDirectoryPath(file.path);
                if (!directoryMap.has(dirPath)) {
                    directoryMap.set(dirPath, {
                        path: dirPath,
                        duplicateFiles: [],
                        duplicateGroups: new Set(),
                        totalWastedSpace: 0
                    });
                }
                
                const dirData = directoryMap.get(dirPath);
                dirData.duplicateFiles.push(file);
                dirData.duplicateGroups.add(group.id);
                dirData.totalWastedSpace += file.size;
            });
        });

        this.directoryData = Array.from(directoryMap.values());
        this.sortDirectories('count'); // Ordenar por cantidad por defecto
    }

    getDirectoryPath(filePath) {
        const parts = filePath.split(/[\/\\]/);
        return parts.length > 1 ? parts.slice(0, -1).join('/') : '/';
    }

    sortDirectories(sortBy) {
        // Actualizar botones activos
        document.querySelectorAll('.view-actions .btn').forEach(btn => btn.classList.remove('active'));
        
        switch(sortBy) {
            case 'name':
                this.sortByNameBtn.classList.add('active');
                this.directoryData.sort((a, b) => a.path.localeCompare(b.path));
                break;
            case 'count':
                this.sortByCountBtn.classList.add('active');
                this.directoryData.sort((a, b) => b.duplicateFiles.length - a.duplicateFiles.length);
                break;
            case 'size':
                this.sortBySizeBtn.classList.add('active');
                this.directoryData.sort((a, b) => b.totalWastedSpace - a.totalWastedSpace);
                break;
        }
        
        this.renderDirectoryList();
    }

    renderDirectoryList() {
        this.directoryList.innerHTML = '';
        
        this.directoryData.forEach(dir => {
            const row = this.createDirectoryRow(dir);
            this.directoryList.appendChild(row);
        });
    }

    createDirectoryRow(dir) {
        const row = document.createElement('div');
        row.className = 'directory-row';
        row.setAttribute('data-directory', dir.path);
        
        const displayPath = dir.path === '/' ? 'Raíz' : dir.path;
        const folderName = dir.path === '/' ? 'Raíz' : dir.path.split('/').pop() || dir.path;
        const percentage = Math.round((dir.duplicateFiles.length / this.totalFiles) * 100);
        
        row.innerHTML = `
            <div class="dir-icon">
                <i class="fas fa-folder"></i>
            </div>
            <div class="dir-name">
                <div>${folderName}</div>
                <div class="dir-path-full">${displayPath}</div>
            </div>
            <div class="dir-files-count">${dir.duplicateFiles.length}</div>
            <div class="dir-groups-count">${dir.duplicateGroups.size}</div>
            <div class="dir-size">${this.formatBytes(dir.totalWastedSpace)}</div>
            <div class="dir-percentage">
                ${percentage}%
                <div class="dir-percentage-bar">
                    <div class="dir-percentage-fill" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
        
        row.addEventListener('click', () => {
            this.highlightDirectoryFiles(dir.path);
        });
        
        return row;
    }


    highlightDirectoryFiles(dirPath) {
        // Resaltar fila de directorio seleccionada
        document.querySelectorAll('.directory-row').forEach(row => {
            row.classList.remove('selected');
        });
        document.querySelector(`[data-directory="${dirPath}"]`)?.classList.add('selected');
        
        // Scrollar a la sección de resultados y resaltar archivos de ese directorio
        this.resultsSection.scrollIntoView({ behavior: 'smooth' });
        
        setTimeout(() => {
            document.querySelectorAll('.file-item').forEach(fileItem => {
                const filePath = fileItem.querySelector('.file-path').textContent;
                const fileDir = this.getDirectoryPath(filePath);
                
                if (fileDir === dirPath) {
                    fileItem.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
                    fileItem.style.borderLeft = '4px solid var(--primary)';
                } else {
                    fileItem.style.backgroundColor = '';
                    fileItem.style.borderLeft = '';
                }
            });
        }, 500);
    }

    displayDuplicateGroups(groups) {
        this.resultsContainer.innerHTML = '';
        
        groups.forEach(group => {
            const groupElement = this.createGroupElement(group);
            this.resultsContainer.appendChild(groupElement);
        });
    }

    createGroupElement(group) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'duplicate-group';
        
        groupDiv.innerHTML = `
            <div class="group-header">
                <div class="group-info">
                    <span class="group-badge">Grupo ${group.id}</span>
                    <div class="group-stats">
                        <span><i class="fas fa-copy"></i> ${group.fileCount} archivos</span>
                        <span><i class="fas fa-weight-hanging"></i> ${group.fileSize} cada uno</span>
                        <span><i class="fas fa-trash"></i> ${group.wastedSpace} desperdiciados</span>
                    </div>
                </div>
                <div class="group-actions">
                    <button class="btn btn-outline btn-sm" onclick="app.selectGroupFiles(${group.id})">
                        <i class="fas fa-check"></i> Seleccionar
                    </button>
                </div>
            </div>
            <div class="file-list">
                ${group.files.map(file => this.createFileElement(file, group.id)).join('')}
            </div>
        `;
        
        return groupDiv;
    }

    createFileElement(file, groupId) {
        return `
            <div class="file-item">
                <input type="checkbox" class="file-checkbox" data-group="${groupId}" data-file="${file.name}">
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-path">${file.path}</div>
                </div>
                <div class="file-size">${this.formatBytes(file.size)}</div>
            </div>
        `;
    }

    selectGroupFiles(groupId) {
        const checkboxes = document.querySelectorAll(`input[data-group="${groupId}"]`);
        const firstCheckbox = checkboxes[0];
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        
        // If all are checked, uncheck all. Otherwise, check all except first
        checkboxes.forEach((checkbox, index) => {
            if (allChecked) {
                checkbox.checked = false;
            } else {
                checkbox.checked = index > 0; // Keep first file unchecked
            }
        });
    }

    toggleSelectAll() {
        const checkboxes = document.querySelectorAll('.file-checkbox');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = !allChecked;
        });
        
        this.selectAllBtn.innerHTML = allChecked ? 
            '<i class="fas fa-check-square"></i> Seleccionar Todo' :
            '<i class="fas fa-square"></i> Deseleccionar Todo';
    }

    exportResults() {
        const groups = this.getResultsAsText();
        const blob = new Blob([groups], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `duplicate_files_report_${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('Reporte exportado exitosamente', 'success');
    }

    getResultsAsText() {
        const stats = {
            totalFiles: document.getElementById('totalFiles').textContent,
            duplicateGroups: document.getElementById('duplicateGroups').textContent,
            totalSize: document.getElementById('totalSize').textContent,
            wastedSpace: document.getElementById('wastedSpace').textContent
        };
        
        let text = `=== REPORTE DE ARCHIVOS DUPLICADOS ===\n`;
        text += `Fecha: ${new Date().toLocaleString()}\n\n`;
        text += `=== ESTADÍSTICAS ===\n`;
        text += `Archivos totales: ${stats.totalFiles}\n`;
        text += `Grupos de duplicados: ${stats.duplicateGroups}\n`;
        text += `Tamaño total: ${stats.totalSize}\n`;
        text += `Espacio desperdiciado: ${stats.wastedSpace}\n\n`;
        
        const groups = document.querySelectorAll('.duplicate-group');
        groups.forEach((group, index) => {
            text += `=== GRUPO ${index + 1} ===\n`;
            const files = group.querySelectorAll('.file-item');
            files.forEach(file => {
                const name = file.querySelector('.file-name').textContent;
                const path = file.querySelector('.file-path').textContent;
                const size = file.querySelector('.file-size').textContent;
                text += `${name} (${size}) - ${path}\n`;
            });
            text += `\n`;
        });
        
        return text;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${this.getToastIcon(type)}"></i>
            <span>${message}</span>
        `;
        
        this.toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
}

// JavaScript implementation of the duplicate finder (fallback)
class JavaScriptDuplicateFinder {
    constructor() {
        this.hashGroups = new Map();
        this.totalFiles = 0;
        this.totalSize = 0;
    }

    addFile(name, path, content) {
        const hash = this.calculateHash(content);
        const size = content.byteLength || content.length;
        
        const file = { name, path, size };
        
        if (!this.hashGroups.has(hash)) {
            this.hashGroups.set(hash, []);
        }
        
        this.hashGroups.get(hash).push(file);
        this.totalFiles++;
        this.totalSize += size;
    }

    calculateHash(content) {
        // Simple hash implementation for JavaScript
        let hash1 = 0x811c9dc5;
        let hash2 = 0x1000193;
        const data = new Uint8Array(content);
        
        for (let i = 0; i < data.length; i++) {
            hash1 ^= data[i];
            hash1 = Math.imul(hash1, 0x1000193);
            hash2 = ((hash2 << 5) + hash2) + data[i];
        }
        
        return (hash1 >>> 0).toString(16) + (hash2 >>> 0).toString(16);
    }

    findDuplicates() {
        const groups = [];
        let duplicateSize = 0;
        let groupId = 1;

        for (const [hash, files] of this.hashGroups) {
            if (files.length > 1) {
                const fileSize = files[0].size;
                const wastedSpace = fileSize * (files.length - 1);
                duplicateSize += wastedSpace;

                groups.push({
                    id: groupId++,
                    hash,
                    fileCount: files.length,
                    fileSize: this.formatBytes(fileSize),
                    wastedSpace: this.formatBytes(wastedSpace),
                    files: files
                });
            }
        }

        return {
            groups,
            stats: {
                totalFiles: this.totalFiles,
                duplicateGroups: groups.length,
                totalSize: this.formatBytes(this.totalSize),
                wastedSpace: this.formatBytes(duplicateSize)
            }
        };
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize the application
const app = new DuplicateFinderWeb();