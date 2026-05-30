let editor;
let filesData = {}; 
let openedTabs = [];
let activeFile = null;
let selectedFolder = null; 
let foldersList = []; 

const langMapping = { 'html': 'html', 'css': 'css', 'js': 'javascript', 'java': 'java', 'php': 'php' };

// KHỞI ĐỘNG MONACO EDITOR
require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.39.0/min/vs' }});
require(['vs/editor/editor.main'], function() {
    editor = monaco.editor.create(document.getElementById('editor-container'), {
        value: '',
        language: 'plaintext',
        theme: 'vs-dark',
        automaticLayout: true,
        fontSize: 15,
        minimap: { enabled: false }
    });

    updateEditorVisibility();
    
    setTimeout(() => {
        triggerInitialFileCreation();
    }, 400);
});

function triggerInitialFileCreation() {
    const name = prompt("Chào mừng! Hãy nhập tên file mẹ để khởi tạo Workspace (Ví dụ: index.html):");
    if(name) {
        filesData[name] = `<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <title>Spck App</title>\n</head>\n<body>\n  <h1>Ứng dụng chạy mượt mà tại chỗ!</h1>\n</body>\n</html>`;
        openFile(name);
        toggleSidebar(false);
    }
}

// ĐÓNG / MỞ SIDEBAR CHẶN CODE VÀ ẤN VÙNG TRỐNG TỰ THU GỌN
const sidebar = document.getElementById('sidebar-menu');
const overlay = document.getElementById('editor-block-overlay');

function toggleSidebar(open) {
    if(open) {
        sidebar.classList.remove('collapsed');
        overlay.style.display = 'block'; 
    } else {
        sidebar.classList.add('collapsed');
        overlay.style.display = 'none'; 
    }
    setTimeout(() => { if(editor) editor.layout(); }, 220);
}

document.getElementById('btn-toggle-menu').addEventListener('click', function(e) {
    e.stopPropagation();
    const isCollapsed = sidebar.classList.contains('collapsed');
    toggleSidebar(isCollapsed);
});

overlay.addEventListener('click', function() {
    toggleSidebar(false);
});

function updateEditorVisibility() {
    const msg = document.getElementById('empty-msg');
    if(!activeFile) {
        msg.style.display = 'block';
        if(editor) editor.getContainerNode().style.opacity = '0';
    } else {
        msg.style.display = 'none';
        if(editor) editor.getContainerNode().style.opacity = '1';
    }
}

// TẠO THƯ MỤC
document.getElementById('new-folder-trigger').addEventListener('click', function() {
    const folderName = prompt("Nhập tên thư mục mới:");
    if(!folderName) return;
    if(!foldersList.includes(folderName)) {
        foldersList.push(folderName);
        renderFileTree();
    }
});

// TẠO FILE (TỰ ĐỘNG LỒNG NẾU ĐANG CHỌN THƯ MỤC)
document.getElementById('new-file-trigger').addEventListener('click', function() {
    const fileName = prompt("Nhập tên file (Ví dụ: style.css, main.js):");
    if(!fileName) return;

    let fullPath = fileName;
    if(selectedFolder) {
        fullPath = selectedFolder + "/" + fileName;
    }

    if(filesData[fullPath] !== undefined) return alert("Tệp tin này đã tồn tại!");

    if(fileName.endsWith('.html')) {
        filesData[fullPath] = `\n<h1>File con mới tạo</h1>`;
    } else if(fileName.endsWith('.css')) {
        filesData[fullPath] = `/* CSS */\nbody { background: white; color: black; }`;
    } else {
        filesData[fullPath] = `// Code cho file ${fileName}\n`;
    }
    
    renderFileTree();
    openFile(fullPath);
});

// DỰNG CÂY THƯ MỤC
function renderFileTree() {
    const container = document.getElementById('file-tree-container');
    container.innerHTML = '';

    foldersList.forEach(folder => {
        const isSelected = selectedFolder === folder ? 'selected-folder' : '';
        const div = document.createElement('div');
        div.className = `tree-item ${isSelected}`;
        div.innerHTML = `
            <div class="tree-item-left">
                <i class="fa-solid fa-folder item-icon"></i>
                <strong>${folder}</strong>
            </div>
            <i class="fa-solid fa-trash" onclick="deleteFolder(event, '${folder}')"></i>
        `;
        div.onclick = (e) => {
            e.stopPropagation();
            selectedFolder = (selectedFolder === folder) ? null : folder;
            renderFileTree();
        };
        container.appendChild(div);

        Object.keys(filesData).forEach(filePath => {
            if(filePath.startsWith(folder + "/")) {
                const displayFileName = filePath.replace(folder + "/", "");
                const divFile = createBlobFileRow(filePath, displayFileName, true);
                container.appendChild(divFile);
            }
        });
    });

    Object.keys(filesData).forEach(filePath => {
        if(!filePath.includes("/")) {
            const divFile = createBlobFileRow(filePath, filePath, false);
            container.appendChild(divFile);
        }
    });

    updateEditorVisibility();
}

function createBlobFileRow(filePath, displayName, isSubFile) {
    const ext = displayName.split('.').pop().toLowerCase();
    let iconClass = "fa-solid fa-file";
    if(ext === 'html') iconClass = "fa-brands fa-html5";
    else if(ext === 'js') iconClass = "fa-brands fa-js";
    else if(ext === 'css') iconClass = "fa-brands fa-css3-alt";
    if(ext === 'java') iconClass = "fa-brands fa-java";
    if(ext === 'php') iconClass = "fa-brands fa-php";

    const isActive = filePath === activeFile ? 'active' : '';
    const div = document.createElement('div');
    div.className = `tree-item ${isActive}`;
    if(isSubFile) div.style.paddingLeft = "32px";

    div.innerHTML = `
        <div class="tree-item-left">
            <i class="${iconClass} item-icon"></i>
            <span>${displayName}</span>
        </div>
        <i class="fa-solid fa-trash" onclick="deleteFile(event, '${filePath}')"></i>
    `;
    div.onclick = (e) => {
        e.stopPropagation();
        openFile(filePath);
    };
    return div;
}

function openFile(filePath) {
    if(activeFile && editor) {
        filesData[activeFile] = editor.getValue(); 
    }

    activeFile = filePath;
    if(!openedTabs.includes(filePath)) openedTabs.push(filePath);

    const ext = filePath.split('.').pop().toLowerCase();
    editor.setValue(filesData[filePath]);
    monaco.editor.setModelLanguage(editor.getModel(), langMapping[ext] || 'plaintext');

    renderTabs();
    renderFileTree();
}

function renderTabs() {
    const container = document.getElementById('tabs-container');
    container.innerHTML = '';

    openedTabs.forEach(filePath => {
        const parts = filePath.split('/');
        const displayName = parts[parts.length - 1];

        const tab = document.createElement('div');
        tab.className = `tab-item ${filePath === activeFile ? 'active' : ''}`;
        tab.innerHTML = `<span>${displayName}</span>`;
        tab.onclick = () => openFile(filePath);
        container.appendChild(tab);
    });
}

function deleteFile(e, filePath) {
    e.stopPropagation();
    if(!confirm("Xóa file này?")) return;
    delete filesData[filePath];
    openedTabs = openedTabs.filter(t => t !== filePath);
    if(activeFile === filePath) activeFile = openedTabs.length > 0 ? openedTabs[0] : null;
    if(activeFile) openFile(activeFile);
    else { renderFileTree(); renderTabs(); }
}

function deleteFolder(e, folderName) {
    e.stopPropagation();
    if(!confirm(`Xóa thư mục '${folderName}' và các file bên trong?`)) return;
    
    Object.keys(filesData).forEach(filePath => {
        if(filePath.startsWith(folderName + "/")) {
            delete filesData[filePath];
            openedTabs = openedTabs.filter(t => t !== filePath);
        }
    });

    foldersList = foldersList.filter(f => f !== folderName);
    if(selectedFolder === folderName) selectedFolder = null;
    
    if(activeFile && filesData[activeFile] === undefined) {
        activeFile = openedTabs.length > 0 ? openedTabs[0] : null;
    }
    if(activeFile) openFile(activeFile);
    else { renderFileTree(); renderTabs(); }
}

// LOGIC RUN KẾT HỢP LIÊN KẾT CHÉO FILE TRẮNG TINH
document.getElementById('btn-run-code').addEventListener('click', async function() {
    if(!activeFile) return alert("Vui lòng mở file để chạy!");

    if(editor) filesData[activeFile] = editor.getValue();

    const panel = document.getElementById('output-screen');
    const iframe = document.getElementById('preview-iframe');
    const terminal = document.getElementById('terminal-box');
    const typeText = document.getElementById('output-type');

    panel.classList.add('open');

    if(activeFile.endsWith('.html')) {
        typeText.innerText = "Browser Preview (HTML)";
        iframe.style.display = "block";
        terminal.style.display = "none";
        
        iframe.src = "about:blank";

        // TỰ ĐỘNG KIỂM TRA VÀ GOM TẤT CẢ FILE CSS/JS TRONG WORKSPACE NHÚNG VÀO HTML KHI RUN
        let rawHTML = filesData[activeFile];
        let injectedStyles = "";
        let injectedScripts = "";

        Object.keys(filesData).forEach(path => {
            if(path.endsWith('.css')) {
                injectedStyles += `\n/* From ${path} */\n${filesData[path]}\n`;
            } else if(path.endsWith('.js') && path !== 'script.js') {
                injectedScripts += `\n// From ${path}\n${filesData[path]}\n`;
            }
        });

        // Bơm mã CSS & JS ảo vào cấu trúc trang trắng
        if(injectedStyles) rawHTML = rawHTML.replace('</head>', `<style>${injectedStyles}</style></head>`);
        if(injectedScripts) rawHTML = rawHTML.replace('</body>', `<script>${injectedScripts}<\/script></body>`);

        setTimeout(() => {
            iframe.srcdoc = rawHTML;
        }, 20);
    } else {
        typeText.innerText = "Console Terminal Output";
        iframe.style.display = "none";
        terminal.style.display = "block";
        terminal.innerText = ">>> Đang thực thi biên dịch đám mây...\n";

        let ext = activeFile.split('.').pop().toLowerCase();
        let apiLang = "py"; let apiVer = "3.10.0";
        if(ext === 'js') { apiLang = "js"; apiVer = "18.15.0"; }
        if(ext === 'java') { apiLang = "java"; apiVer = "15.0.2"; }
        if(ext === 'php') { apiLang = "php"; apiVer = "8.2.3"; }

        try {
            const res = await fetch('https://emkc.org/api/v2/piston/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    language: apiLang, version: apiVer,
                    files: [{ content: filesData[activeFile] }]
                })
            });
            const data = await res.json();
            if(data.run) {
                terminal.innerText = data.run.stderr ? `[Lỗi]:\n${data.run.stderr}` : data.run.stdout;
            }
        } catch(e) {
            terminal.innerText = "Lỗi kết nối máy chủ biên dịch.";
        }
    }
});

document.getElementById('btn-close-output').addEventListener('click', function() {
    document.getElementById('output-screen').classList.remove('open');
});
