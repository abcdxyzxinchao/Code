let editor;
let filesData = {};
let openedTabs = [];
let activeFile = null;
let currentOpenFolder = "camera AI";

// Cấu hình kho dữ liệu ảo ban đầu bao gồm cả tệp Python của bạn
filesData["camera AI/index.html"] = `<!DOCTYPE html>\n<html lang="vi">\n<head>\n    <meta charset="UTF-8">\n    <title>Camera AI Studio</title>\n</head>\n<body>\n    <div class="app-container">\n        <h1>Camera AI Studio</h1>\n        <p>Hệ thống nạp cấu hình giao diện song song chuyên nghiệp.</p>\n    </div>\n</body>\n</html>`;
filesData["camera AI/nsjs.py"] = `# Khởi chạy module nhận diện AI Python\nimport os\n\ndef main():\n    print("Camera AI Analysis Core Running...")\n\nif __name__ == "__main__":\n    main()`;
filesData["camera AI/style.css"] = `body {\n    margin: 0;\n    background: #000;\n}`;

activeFile = "camera AI/index.html";
openedTabs.push("camera AI/index.html");

const langMapping = { 'html': 'html', 'css': 'css', 'js': 'javascript', 'py': 'python', 'php': 'php', 'java': 'java', 'swift': 'swift', 'json': 'json' };

// CẤU HÌNH MONACO EDITOR - BẬT ĐƯỜNG KẺ ĐỊNH DẠNG (INDENT GUIDES) VÀ CẶP NGOẶC
require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.39.0/min/vs' }});
require(['vs/editor/editor.main'], function() {
    editor = monaco.editor.create(document.getElementById('editor-container'), {
        value: filesData[activeFile],
        language: 'html',
        theme: 'vs-dark',
        automaticLayout: true,
        fontSize: 13,
        minimap: { enabled: false },
        
        // KÍCH HOẠT HỆ THỐNG ĐƯỜNG KẺ LOGIC ĐỊNH DẠNG CHUẨN (ẢNH 2)
        renderIndentGuides: true,
        highlightActiveIndentGuide: true,
        guides: {
            indentation: true,
            bracketPairs: true, // Kẻ đường nối giữa các cặp ngoặc nhọn lồng nhau
            bracketPairsHorizontal: true
        },
        
        wordWrap: "on",
        lineNumbers: "on"
    });

    updateWorkspaceState();
    renderFileTree();
    renderTabs();
});

// QUẢN LÝ SIDEBAR ĐIỀU HƯỚNG
const sidebarMenu = document.getElementById('sidebar-menu');
document.getElementById('btn-toggle-menu').addEventListener('click', () => {
    if (window.innerWidth <= 768) {
        sidebarMenu.classList.toggle('open-mobile');
    } else {
        sidebarMenu.classList.toggle('collapsed');
        setTimeout(() => editor.layout(), 260);
    }
});

function updateWorkspaceState() {
    const msg = document.getElementById('empty-msg');
    if (!activeFile) {
        msg.style.display = 'block';
        if (editor) editor.getContainerNode().style.opacity = '0';
    } else {
        msg.style.display = 'none';
        if (editor) editor.getContainerNode().style.opacity = '1';
    }
}

// DỰNG CÂY THƯ MỤC CÓ ĐƯỜNG KẺ HƯỚNG DẪN LỒNG NHAU VÀ ĐỒNG BỘ LOGO ICON NGÔN NGỮ
function renderFileTree() {
    const container = document.getElementById('file-tree-container');
    container.innerHTML = '';

    // Render Thư mục cha
    const folderDiv = document.createElement('div');
    folderDiv.className = "tree-item";
    folderDiv.innerHTML = `
        <div class="tree-item-left">
            <i class="fa-solid fa-folder-open item-icon"></i>
            <span style="font-weight: 600;">${currentOpenFolder}</span>
        </div>
    `;
    container.appendChild(folderDiv);

    // Duyệt tìm các file con nằm bên trong thư mục
    Object.keys(filesData).forEach(path => {
        if (path.startsWith(currentOpenFolder + "/")) {
            const filename = path.replace(currentOpenFolder + "/", "");
            const ext = filename.split('.').pop().toLowerCase();
            
            // Nhận diện Icon đồng bộ theo hình ảnh thực tế bạn tải lên
            let icon = "fa-solid fa-file-code";
            if (ext === 'html') icon = "fa-brands fa-html5";
            else if (ext === 'css') icon = "fa-brands fa-css3-alt";
            else if (ext === 'js') icon = "fa-brands fa-js";
            else if (ext === 'py') icon = "fa-brands fa-python"; // Thêm biểu tượng Python sắc nét
            else if (ext === 'php') icon = "fa-brands fa-php";
            else if (ext === 'java') icon = "fa-brands fa-java";
            else if (ext === 'swift') icon = "fa-brands fa-swift";
            else if (ext === 'json') icon = "fa-solid fa-cube";

            const fileDiv = document.createElement('div');
            fileDiv.className = `tree-item ${path === activeFile ? 'active' : ''}`;
            fileDiv.style.paddingLeft = "32px"; // Đẩy lùi lề tạo cấu trúc phân cấp lồng ghép

            // Thêm phần tử đường kẻ dọc biểu thị sơ đồ cây lồng nhau
            fileDiv.innerHTML = `
                <div class="tree-indent-line"></div>
                <div class="tree-item-left">
                    <i class="${icon} item-icon"></i>
                    <span>${filename}</span>
                </div>
                <i class="fa-solid fa-ellipsis-vertical" onclick="deleteFile(event, '${path}')"></i>
            `;

            fileDiv.onclick = () => {
                openFile(path);
                if (window.innerWidth <= 768) sidebarMenu.classList.remove('open-mobile');
            };
            container.appendChild(fileDiv);
        }
    });
    updateWorkspaceState();
}

function openFile(path) {
    if (activeFile && editor) filesData[activeFile] = editor.getValue();
    activeFile = path;
    if (!openedTabs.includes(path)) openedTabs.push(path);

    const ext = path.split('.').pop().toLowerCase();
    if (editor) {
        editor.setValue(filesData[path]);
        monaco.editor.setModelLanguage(editor.getModel(), langMapping[ext] || 'plaintext');
    }
    renderFileTree();
    renderTabs();
}

function renderTabs() {
    const container = document.getElementById('tabs-container');
    container.innerHTML = '';
    openedTabs.forEach(path => {
        const name = path.substring(path.lastIndexOf('/') + 1);
        const tab = document.createElement('div');
        tab.className = `tab-item ${path === activeFile ? 'active' : ''}`;
        tab.innerHTML = `
            <span>${name}</span>
            <i class="fa-solid fa-xmark tab-close" onclick="closeTab(event, '${path}')"></i>
        `;
        tab.onclick = () => openFile(path);
        container.appendChild(tab);
    });
}

function closeTab(e, path) {
    e.stopPropagation();
    openedTabs = openedTabs.filter(t => t !== path);
    if (activeFile === path) activeFile = openedTabs.length > 0 ? openedTabs[0] : null;
    if (activeFile) openFile(activeFile);
    else { renderFileTree(); renderTabs(); }
}

function deleteFile(e, path) {
    e.stopPropagation();
    if(confirm("Xóa file này?")) {
        delete filesData[path];
        closeTab(e, path);
    }
}

// TẠO THÊM FILE MỚI CHỮA CÁC ĐUÔI PHÂN CHIA (.py, .js, .html)
document.getElementById('new-file-trigger').addEventListener('click', () => {
    const name = prompt("Nhập tên file (Ví dụ: nsjs.py, main.js):");
    if (!name) return;
    const fullPath = currentOpenFolder + "/" + name;
    filesData[fullPath] = name.endsWith('.py') ? "# Code Python\n" : "";
    openFile(fullPath);
});

// THỰC THI VÀ HIỂN THỊ LIVE PREVIEW SONG SONG CHUẨN ĐA NHIỆM (ẢNH 2)
const outputPanel = document.getElementById('output-screen');
const iframe = document.getElementById('preview-iframe');
const terminal = document.getElementById('terminal-box');

document.getElementById('btn-run-code').addEventListener('click', () => {
    if (!activeFile) return;
    if (editor) filesData[activeFile] = editor.getValue();

    outputPanel.classList.add('open');
    setTimeout(() => editor.layout(), 300);

    if (activeFile.endsWith('.html')) {
        document.getElementById('output-url').innerText = "localhost:5500";
        iframe.style.display = "block";
        terminal.style.display = "none";
        
        let htmlContent = filesData[activeFile];
        // Thuật toán gộp tài nguyên hệ thống
        let styles = ""; Object.keys(filesData).forEach(p => { if(p.endsWith('.css')) styles += filesData[p]; });
        htmlContent = htmlContent.replace('</head>', `<style>${styles}</style></head>`);
        
        iframe.srcdoc = htmlContent;
    } else {
        // Trình biên dịch giả lập Cloud cho file logic như Python, JS
        document.getElementById('output-url').innerText = "Terminal Python Compiler";
        iframe.style.display = "none";
        terminal.style.display = "block";
        terminal.innerText = `[Running] python3 ${activeFile.split('/').pop()}...\n\nCamera AI Analysis Core Running...\nProcess finished with exit code 0`;
    }
});

document.getElementById('btn-close-output').addEventListener('click', () => {
    outputPanel.classList.remove('open');
    setTimeout(() => editor.layout(), 300);
});

document.getElementById('btn-refresh-preview').addEventListener('click', () => {
    if (iframe.style.display === "block") iframe.srcdoc = iframe.srcdoc;
});
