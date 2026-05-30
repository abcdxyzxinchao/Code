let editor;
let filesData = {}; 
let openedTabs = [];
let activeFile = null;
let selectedFolder = null; 
let foldersList = []; 

// Danh sách file mặc định khởi tạo dựa trên cấu trúc dự án Camera AI Studio của bạn
filesData["camera AI/index.html"] = `<!DOCTYPE html>\n<html lang="vi">\n<head>\n  <meta charset="UTF-8">\n  <title>Camera AI Studio</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <div class="app-container">\n    <h1 style="color: #0A84FF; text-align:center; margin-top:40px;">Camera AI Studio</h1>\n    <p style="text-align:center; color:#666;">Hệ thống đang chạy trực tiếp trên Workspace Pro của bạn.</p>\n  </div>\n</body>\n</html>`;
filesData["camera AI/style.css"] = `/* Giao diện ứng dụng Camera AI */\nbody {\n  background-color: #000000;\n  color: #ffffff;\n  font-family: sans-serif;\n}`;
filesData["camera AI/gemini.js"] = `// Kết nối API Gemini AI Studio\nconsole.log("Gemini AI Core initialized.");`;
foldersList.push("camera AI");
activeFile = "camera AI/index.html";
openedTabs.push("camera AI/index.html");

const langMapping = { 'html': 'html', 'css': 'css', 'js': 'javascript', 'json': 'json', 'swift': 'swift', 'php': 'php', 'java': 'java', 'cpp': 'cpp', 'c': 'cpp' };

// CẤU HÌNH & KHỞI CHẠY MONACO EDITOR TOÀN DIỆN
require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.39.0/min/vs' }});
require(['vs/editor/editor.main'], function() {
    editor = monaco.editor.create(document.getElementById('editor-container'), {
        value: filesData[activeFile],
        language: 'html',
        theme: 'vs-dark',
        automaticLayout: true,
        fontSize: 14,
        fontFamily: "Menlo, Monaco, 'Courier New', monospace",
        minimap: { enabled: false },
        
        // --- ĐÂY LÀ ĐOẠN BẬT ĐƯỜNG KẺ LOGIC ĐỊNH DẠNG (INDENTATION GUIDES) ---
        renderIndentGuides: true,
        highlightActiveIndentGuide: true,
        guides: {
            indentation: true,
            bracketPairs: true
        },
        // --------------------------------------------------------------------
        
        scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
        lineNumbers: "on",
        wordWrap: "on"
    });

    updateEditorVisibility();
    renderTabs();
    renderFileTree();
});

// QUẢN LÝ SIDEBAR & OVERLAY CHẶN CHẠM NGOÀI
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
    setTimeout(() => { if(editor) editor.layout(); }, 250);
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

// TẠO THƯ MỤC MỚI
document.getElementById('new-folder-trigger').addEventListener('click', function() {
    const folderName = prompt("Nhập tên thư mục mới:");
    if(!folderName) return;
    if(!foldersList.includes(folderName)) {
        foldersList.push(folderName);
        renderFileTree();
    }
});

// TẠO FILE MỚI LỒNG NẰM TRONG THƯ MỤC ĐANG CHỌN TỪNG CẤP
document.getElementById('new-file-trigger').addEventListener('click', function() {
    const fileName = prompt("Nhập tên file kèm đuôi mở rộng (Ví dụ: main.js, style.css):");
    if(!fileName) return;

    let fullPath = fileName;
    if(selectedFolder) {
        fullPath = selectedFolder + "/" + fileName;
    } else {
        fullPath = "camera AI/" + fileName; // Mặc định ném vào thư mục root chính nếu không chọn gì
    }

    if(filesData[fullPath] !== undefined) return alert("File này đã tồn tại trên phân vùng!");

    if(fileName.endsWith('.html')) {
        filesData[fullPath] = `<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8">\n</head>\n<body>\n\n</body>\n</html>`;
    } else if(fileName.endsWith('.css')) {
        filesData[fullPath] = `/* Giao diện style cho ${fileName} */\nbody {\n  margin: 0;\n}`;
    } else {
        filesData[fullPath] = `// Code khởi tạo cho cấu trúc ${fileName}\n`;
    }
    
    renderFileTree();
    openFile(fullPath);
});

// DỰNG CÂY THƯ MỤC ĐA TẦNG VÀ ĐỒNG BỘ LOGO TỪNG FILE CHUẨN ẢNH
function renderFileTree() {
    const container = document.getElementById('file-tree-container');
    container.innerHTML = '';

    foldersList.forEach(folder => {
        const isSelected = selectedFolder === folder ? 'selected-folder' : '';
        const divFolder = document.createElement('div');
        divFolder.className = `tree-item ${isSelected}`;
        divFolder.innerHTML = `
            <div class="tree-item-left" style="padding-left: 4px;">
                <i class="fa-solid fa-folder-open item-icon"></i>
                <span style="font-weight: 500;">${folder}</span>
            </div>
            <i class="fa-solid fa-ellipsis-vertical" onclick="triggerFileOptions(event, '${folder}', true)"></i>
        `;
        divFolder.onclick = (e) => {
            e.stopPropagation();
            selectedFolder = (selectedFolder === folder) ? null : folder;
            renderFileTree();
        };
        container.appendChild(divFolder);

        // Quét và đưa toàn bộ file con nằm bên trong thư mục này lùi lề vào một nấc
        Object.keys(filesData).forEach(filePath => {
            if(filePath.startsWith(folder + "/")) {
                const displayFileName = filePath.replace(folder + "/", "");
                if(!displayFileName.includes("/")) { 
                    const divFile = createFileRow(filePath, displayFileName, true);
                    container.appendChild(divFile);
                }
            }
        });
    });
    updateEditorVisibility();
}

function createFileRow(filePath, displayName, isSubFile) {
    const ext = displayName.split('.').pop().toLowerCase();
    let iconClass = "fa-solid fa-file-code";
    
    if(ext === 'html') iconClass = "fa-brands fa-html5";
    else if(ext === 'css') iconClass = "fa-brands fa-css3-alt";
    else if(ext === 'js') iconClass = "fa-brands fa-js";
    else if(ext === 'php') iconClass = "fa-brands fa-php";
    else if(ext === 'java') iconClass = "fa-brands fa-java";
    else if(ext === 'swift') iconClass = "fa-brands fa-swift";
    else if(ext === 'json') iconClass = "fa-solid fa-cube";
    else if(ext === 'cpp' || ext === 'c++') iconClass = "fa-solid fa-c";

    const isActive = filePath === activeFile ? 'active' : '';
    const div = document.createElement('div');
    div.className = `tree-item ${isActive}`;
    if(isSubFile) div.style.paddingLeft = "28px"; // Đẩy lùi lề tạo cấu trúc cây thư mục con

    div.innerHTML = `
        <div class="tree-item-left">
            <i class="${iconClass} item-icon"></i>
            <span>${displayName}</span>
        </div>
        <i class="fa-solid fa-ellipsis-vertical" onclick="triggerFileOptions(event, '${filePath}', false)"></i>
    `;
    div.onclick = (e) => {
        e.stopPropagation();
        openFile(filePath);
        toggleSidebar(false); // Chạm mở file tự động thu gọn sidebar
    };
    return div;
}

// CONTEXT MENU THAO TÁC XÓA SỬA NHANH
function triggerFileOptions(e, path, isFolder) {
    e.stopPropagation();
    const action = confirm(`Bạn muốn xóa ${isFolder ? 'thư mục' : 'file'}: [ ${path} ] cùng toàn bộ dữ liệu liên quan?`);
    if(!action) return;

    if(isFolder) {
        Object.keys(filesData).forEach(fp => {
            if(fp.startsWith(path + "/")) delete filesData[fp];
        });
        foldersList = foldersList.filter(f => f !== path);
        if(selectedFolder === path) selectedFolder = null;
    } else {
        delete filesData[path];
    }
    
    openedTabs = openedTabs.filter(t => t !== path);
    if(activeFile === path) activeFile = openedTabs.length > 0 ? openedTabs[0] : null;
    
    if(activeFile) openFile(activeFile);
    else { renderFileTree(); renderTabs(); }
}

// ĐỒNG BỘ ĐÓNG MỞ TABS PHÍA TRÊN ĐẦU EDITOR
function openFile(filePath) {
    if(activeFile && editor) {
        filesData[activeFile] = editor.getValue(); 
    }

    activeFile = filePath;
    if(!openedTabs.includes(filePath)) openedTabs.push(filePath);

    const ext = filePath.split('.').pop().toLowerCase();
    if(editor) {
        editor.setValue(filesData[filePath]);
        monaco.editor.setModelLanguage(editor.getModel(), langMapping[ext] || 'plaintext');
    }

    renderTabs();
    renderFileTree();
}

function renderTabs() {
    const container = document.getElementById('tabs-container');
    container.innerHTML = '';

    openedTabs.forEach(filePath => {
        const displayName = filePath.substring(filePath.lastIndexOf('/') + 1);
        const tab = document.createElement('div');
        tab.className = `tab-item ${filePath === activeFile ? 'active' : ''}`;
        tab.innerHTML = `
            <span>${displayName}</span>
            <i class="fa-solid fa-xmark tab-close" onclick="closeTab(event, '${filePath}')"></i>
        `;
        tab.onclick = () => openFile(filePath);
        container.appendChild(tab);
    });
}

function closeTab(e, path) {
    e.stopPropagation();
    openedTabs = openedTabs.filter(t => t !== path);
    if(activeFile === path) activeFile = openedTabs.length > 0 ? openedTabs[0] : null;
    if(activeFile) openFile(activeFile);
    else { renderFileTree(); renderTabs(); }
}

// BỘ TRÌNH BIÊN DỊCH LIÊN KẾT FILE CHÉO CHẠY THẲNG RA LOCALHOST SẠCH SẼ
document.getElementById('btn-run-code').addEventListener('click', async function() {
    if(!activeFile) return alert("Không có dữ liệu file đang mở để biên dịch!");

    if(editor) filesData[activeFile] = editor.getValue();

    const panel = document.getElementById('output-screen');
    const iframe = document.getElementById('preview-iframe');
    const terminal = document.getElementById('terminal-box');
    const typeText = document.getElementById('output-type');

    panel.classList.add('open');

    // NẾU LÀ FILE HTML -> TỰ ĐỘNG KHỞI CHẠY GIAO DIỆN APP ĐẸP (NHƯ MÀN HÌNH LOGIN CAMERA AI)
    if(activeFile.endsWith('.html')) {
        typeText.innerText = "localhost:3000";
        iframe.style.display = "block";
        terminal.style.display = "none";
        
        iframe.src = "about:blank";

        let mainHTML = filesData[activeFile];
        let compiledStyles = "";
        let compiledScripts = "";

        // Tìm và tự động gom toàn bộ file .css và .js trong toàn dự án nhúng nén thẳng vào khung chạy ảo
        Object.keys(filesData).forEach(path => {
            if(path.endsWith('.css')) {
                compiledStyles += `\n/* ${path} */\n${filesData[path]}\n`;
            } else if(path.endsWith('.js') && path !== 'script.js') {
                compiledScripts += `\n// ${path}\n${filesData[path]}\n`;
            }
        });

        if(compiledStyles) mainHTML = mainHTML.replace('</head>', `<style>${compiledStyles}</style></head>`);
        if(compiledScripts) mainHTML = mainHTML.replace('</body>', `<script>${compiledScripts}<\/script></body>`);

        setTimeout(() => {
            iframe.srcdoc = mainHTML;
        }, 50);
    } 
    // NẾU LÀ FILE NGÔN NGỮ KHÁC (C++, JAVA, PHP) -> CHẠY TERMINAL CONSOLE ĐÁM MÂY
    else {
        typeText.innerText = "Cloud Terminal Compiler";
        iframe.style.display = "none";
        terminal.style.display = "block";
        terminal.innerText = ">>> Conecting to cloud server compiling engine...\n";

        let ext = activeFile.split('.').pop().toLowerCase();
        let apiLang = "py"; let apiVer = "3.10.0";
        if(ext === 'js') { apiLang = "js"; apiVer = "18.15.0"; }
        if(ext === 'java') { apiLang = "java"; apiVer = "15.0.2"; }
        if(ext === 'php') { apiLang = "php"; apiVer = "8.2.3"; }
        if(ext === 'cpp') { apiLang = "cpp"; apiVer = "10.2.0"; }

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
                terminal.innerText = data.run.stderr ? `[COMPILER ERROR]:\n${data.run.stderr}` : data.run.stdout;
            }
        } catch(e) {
            terminal.innerText = "Error link compiler backend.";
        }
    }
});

document.getElementById('btn-close-output').addEventListener('click', function() {
    document.getElementById('output-screen').classList.remove('open');
});
