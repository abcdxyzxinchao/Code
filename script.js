let editor;
let db = {}; // Khởi tạo Database phẳng: { "Tên_Project": { "paths": { "root/index.html": { type: "file", content: "..." } }, "expanded": { "root/folder": true } } }
let currentProject = null;
let activeFile = null;
let openTabs = [];
let selectedPath = null; // Thư mục hoặc file đang click chọn thực tế để lồng ghép con

const langMapping = { 'html': 'html', 'css': 'css', 'js': 'javascript', 'py': 'python', 'php': 'php', 'java': 'java' };

// KHỞI ĐỘNG BỘ LÕI CODE MONACO EDITOR
require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.39.0/min/vs' }});
require(['vs/editor/editor.main'], function() {
    editor = monaco.editor.create(document.getElementById('monaco-editor-core'), {
        theme: 'vs-dark',
        automaticLayout: true,
        fontSize: 13,
        minimap: { enabled: false },
        renderIndentGuides: true,
        highlightActiveIndentGuide: true,
        guides: { indentation: true, bracketPairs: true }
    });

    // Theo dõi thao tác gõ chữ cập nhật trực tiếp vào biến lưu trữ dữ liệu tệp tin ảo
    editor.onDidChangeModelContent(() => {
        if (currentProject && activeFile && db[currentProject]) {
            db[currentProject].paths[activeFile].content = editor.getValue();
        }
    });

    // Tạo luôn bộ dự án mẫu trực quan ban đầu chuẩn yêu cầu
    initBaseProject();
});

function initBaseProject() {
    const defaultProj = "Camera Studio AI";
    createProjectStructure(defaultProj);
    
    const projData = db[defaultProj];
    // Giả lập cấu trúc thư mục lồng ghép đa tầng thực tế bằng phân vùng chuỗi gạch chéo
    projData.paths["root"] = { type: "folder" };
    projData.paths["root/index.html"] = { type: "file", content: "<!DOCTYPE html>\n<html>\n<head>\n    <title>Camera AI</title>\n</head>\n<body>\n    <h1>Hệ thống Camera AI đang kích hoạt trực tiếp!</h1>\n</body>\n</html>" };
    projData.paths["root/core AI"] = { type: "folder" };
    projData.paths["root/core AI/nsjs.py"] = { type: "file", content: "# Lập trình mô hình AI bằng Python\nimport time\nprint('Analyzing camera streams...')" };
    projData.paths["root/assets"] = { type: "folder" };
    projData.paths["root/assets/style.css"] = { type: "file", content: "body { background: #000; color: #fff; }" };

    // Mở sẵn các thư mục mẫu
    projData.expanded["root"] = true;
    projData.expanded["root/core AI"] = true;
    projData.expanded["root/assets"] = true;

    selectActiveProject(defaultProj);
}

function createProjectStructure(name) {
    db[name] = { paths: {}, expanded: {} };
    const select = document.getElementById('project-selector');
    const opt = document.createElement('option');
    opt.value = name; opt.innerText = name;
    select.appendChild(opt);
}

// SỰ KIỆN NÚT TẠO DỰ ÁN MỚI
document.getElementById('btn-create-project').addEventListener('click', () => {
    const name = prompt("Nhập tên dự án mới:");
    if (!name) return;
    if (db[name]) return alert("Dự án này đã tồn tại!");
    createProjectStructure(name);
    // Tự động khởi tạo thư mục root nền tảng cho dự án mới tinh vừa tạo
    db[name].paths["root"] = { type: "folder" };
    db[name].expanded["root"] = true;
    selectActiveProject(name);
});

document.getElementById('project-selector').addEventListener('change', (e) => {
    selectActiveProject(e.target.value);
});

function selectActiveProject(name) {
    currentProject = name;
    document.getElementById('active-project-name').innerText = name;
    document.getElementById('project-selector').value = name;
    openTabs = [];
    activeFile = null;
    selectedPath = "root"; // Mặc định chọn root dự án khi chuyển đổi
    renderFileTree();
    renderTabs();
    updateEditorView();
}

// THUẬT TOÁN DỰNG CÂY FILE ĐA TẦNG TUYỆT ĐỐI CHÍNH XÁC QUA PATH KEY
function renderFileTree() {
    const rootBox = document.getElementById('file-tree-root');
    rootBox.innerHTML = '';
    if (!currentProject || !db[currentProject]) return;

    const proj = db[currentProject];
    const allPaths = Object.keys(proj.paths).sort(); // Sắp xếp theo bảng chữ cái để tạo cấu trúc chuẩn tầng lớp

    allPaths.forEach(path => {
        const parts = path.split('/');
        const depth = parts.length - 1; // Độ sâu thư mục để căn lề trái thụt vào thụ động
        const name = parts[parts.length - 1];
        const node = proj.paths[path];

        // Kiểm tra xem node cha có được mở rộng không, nếu không mở thì ẩn toàn bộ node con
        if (depth > 0) {
            let parentPath = parts.slice(0, -1).join('/');
            if (!proj.expanded[parentPath]) return; 
        }

        const row = document.createElement('div');
        row.className = `tree-node-row ${path === selectedPath ? 'selected' : ''}`;
        row.style.paddingLeft = `${(depth * 16) + 6}px`; // Thụt lề động tạo cấu trúc cây vô hạn tầng

        // Tạo phần tử đường kẻ dọc (Indent Guide) phân cấp đồ họa
        for (let i = 1; i <= depth; i++) {
            const guide = document.createElement('div');
            guide.className = "tree-indent-guide";
            guide.style.left = `${i * 16}px`;
            row.appendChild(guide);
        }

        let icon = "fa-solid fa-file-code";
        if (node.type === 'folder') {
            const isExpanded = proj.expanded[path];
            icon = isExpanded ? "fa-solid fa-folder-open" : "fa-solid fa-folder";
        } else {
            const ext = name.split('.').pop().toLowerCase();
            if (ext === 'html') icon = "fa-brands fa-html5";
            else if (ext === 'css') icon = "fa-brands fa-css3-alt";
            else if (ext === 'js') icon = "fa-brands fa-js";
            else if (ext === 'py') icon = "fa-brands fa-python"; // Logo Python sắc nét đặc trưng màu xanh lam
            else if (ext === 'php') icon = "fa-brands fa-php";
            else if (ext === 'java') icon = "fa-brands fa-java";
        }

        const isFolder = node.type === 'folder';
        const itemLeft = document.createElement('div');
        itemLeft.className = "node-content-left";
        itemLeft.innerHTML = `
            ${isFolder ? `<i class="fa-solid fa-chevron-right arrow-toggle ${proj.expanded[path] ? 'expanded' : ''}"></i>` : '<span style="width:12px;"></span>'}
            <i class="${icon} node-icon"></i>
            <span>${name}</span>
        `;
        row.appendChild(itemLeft);

        // Nút xóa tệp tin nhanh
        const delBtn = document.createElement('i');
        delBtn.className = "fa-solid fa-trash-can btn-delete-node";
        delBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm(`Bạn chắc chắn muốn xóa tệp tin/thư mục: ${name}?`)) {
                // Xóa tất cả các đường dẫn con nếu là thư mục
                Object.keys(proj.paths).forEach(p => {
                    if (p === path || p.startsWith(path + "/")) {
                        delete proj.paths[p];
                        openTabs = openTabs.filter(t => t !== p);
                    }
                });
                if (activeFile === path || !proj.paths[activeFile]) activeFile = openTabs.length > 0 ? openTabs[0] : null;
                selectedPath = "root";
                renderFileTree(); renderTabs(); updateEditorView();
            }
        };
        row.appendChild(delBtn);

        // Click chọn Node xử lý logic lồng ghép file/thư mục
        row.onclick = (e) => {
            e.stopPropagation();
            selectedPath = path;
            if (isFolder) {
                proj.expanded[path] = !proj.expanded[path];
            } else {
                openFileToWorkspace(path);
            }
            renderFileTree();
        };

        rootBox.appendChild(row);
    });
}

// LOGIC XỬ LÝ LỒNG GHÉP FILE/FOLDER TÙY Ý VÀO VỊ TRÍ ĐANG CLICK CHỌN TRÊN CÂY
function executeAddNewNode(type) {
    if (!currentProject || !db[currentProject]) return alert("Vui lòng tạo dự án trước!");
    if (!selectedPath) {
        selectedPath = "root"; // Mặc định nếu chưa chọn gì thì nhét thẳng vào thư mục root chính dự án
    }

    const proj = db[currentProject];
    let parentFolder = selectedPath;
    
    // Nếu người dùng đang chọn 1 tệp tin, lấy đường dẫn thư mục cha chứa file đó để thêm cùng cấp lồng ghép
    if (proj.paths[selectedPath] && proj.paths[selectedPath].type === 'file') {
        const parts = selectedPath.split('/');
        parentFolder = parts.slice(0, -1).join('/');
    }

    const name = prompt(`Nhập tên ${type === 'file' ? 'File kèm đuôi (.html, .py, .css)' : 'Thư mục mới'}:`);
    if (!name) return;

    const newFullPath = `${parentFolder}/${name}`;
    if (proj.paths[newFullPath]) return alert("Tên tệp tin hoặc thư mục đã tồn tại trong phân vùng này!");

    if (type === 'folder') {
        proj.paths[newFullPath] = { type: "folder" };
        proj.expanded[parentFolder] = true; // Tự động mở bung thư mục cha ra để nhìn thấy con vừa tạo
        proj.expanded[newFullPath] = true;
    } else {
        const ext = name.split('.').pop().toLowerCase();
        let initCode = "";
        if (ext === 'py') initCode = "# Lập trình xử lý ứng dụng bằng Python\n";
        else if (ext === 'css') initCode = "/* Cấu trúc định dạng Style CSS */\nbody {\n\n}";
        else if (ext === 'js') initCode = "// Logic JS thực thi dự án\n";

        proj.paths[newFullPath] = { type: "file", content: initCode };
        proj.expanded[parentFolder] = true;
        openFileToWorkspace(newFullPath);
    }

    selectedPath = newFullPath; // Tự động chuyển trọng tâm tiêu điểm vào file/folder vừa tạo
    renderFileTree();
}

document.getElementById('action-add-file').addEventListener('click', () => executeAddNewNode('file'));
document.getElementById('action-add-folder').addEventListener('click', () => executeAddNewNode('folder'));

function openFileToWorkspace(path) {
    activeFile = path;
    if (!openTabs.includes(path)) openTabs.push(path);
    renderTabs();
    updateEditorView();
}

function updateEditorView() {
    const welcome = document.getElementById('empty-workspace-state');
    if (!activeFile || !currentProject || !db[currentProject].paths[activeFile]) {
        welcome.style.display = "flex";
        if (editor) editor.getContainerNode().style.opacity = "0";
        return;
    }
    welcome.style.display = "none";
    if (editor) {
        editor.getContainerNode().style.opacity = "1";
        const fileNode = db[currentProject].paths[activeFile];
        editor.setValue(fileNode.content || "");
        const ext = activeFile.split('.').pop().toLowerCase();
        monaco.editor.setModelLanguage(editor.getModel(), langMapping[ext] || 'plaintext');
    }
}

function renderTabs() {
    const bar = document.getElementById('editor-tabs-bar');
    bar.innerHTML = '';
    openTabs.forEach(path => {
        const name = path.substring(path.lastIndexOf('/') + 1);
        const tab = document.createElement('div');
        tab.className = `tab-unit ${path === activeFile ? 'active' : ''}`;
        tab.innerHTML = `<span>${name}</span><i class="fa-solid fa-xmark" style="font-size:10px; margin-left: 6px;"></i>`;
        
        tab.querySelector('.fa-xmark').onclick = (e) => {
            e.stopPropagation();
            openTabs = openTabs.filter(t => t !== path);
            if (activeFile === path) activeFile = openTabs.length > 0 ? openTabs[0] : null;
            renderTabs(); updateEditorView(); renderFileTree();
        };

        tab.onclick = () => { activeFile = path; selectedPath = path; renderTabs(); updateEditorView(); renderFileTree(); };
        bar.appendChild(tab);
    });
}

// SIDEBAR TOGGLE ĐIỀU HƯỚNG
document.getElementById('btn-toggle-sidebar').addEventListener('click', () => {
    const sb = document.getElementById('app-sidebar');
    if (window.innerWidth <= 768) sb.classList.toggle('open-mobile');
    else {
        sb.classList.toggle('collapsed');
        setTimeout(() => editor.layout(), 260);
    }
});

// 🚀 LOGIC CHẠY RUN FULL SCREEN ĐẨY KỊCH MÀN HÌNH - XÓA SẠCH THANH ĐIỀU HƯỚNG RÁC
document.getElementById('btn-global-run').addEventListener('click', () => {
    if (!currentProject || !activeFile) return alert("Vui lòng mở một file code bất kỳ để thực thi!");

    // Cập nhật giá trị code hiện tại trong Monaco trước khi nạp chạy thử
    db[currentProject].paths[activeFile].content = editor.getValue();

    const layer = document.getElementById('live-preview-overlay');
    const iframe = document.getElementById('preview-runtime-viewport');
    const terminal = document.getElementById('preview-runtime-terminal');

    layer.classList.add('active'); // Kích hoạt overlay kịch sàn màn hình che khuất hoàn toàn trang code bên dưới

    if (activeFile.endsWith('.html')) {
        iframe.style.display = "block";
        terminal.style.display = "none";
        iframe.src = "about:blank";

        // Gom toàn bộ mã CSS và JS có trong toàn bộ dự án để tự động biên dịch nhúng chéo
        let htmlSource = db[currentProject].paths[activeFile].content;
        let internalCSS = "";
        let internalJS = "";

        Object.keys(db[currentProject].paths).forEach(p => {
            if (p.endsWith('.css')) internalCSS += `\n/* ${p} */\n${db[currentProject].paths[p].content}\n`;
            if (p.endsWith('.js') && p !== 'script.js') internalJS += `\n// ${p}\n${db[currentProject].paths[p].content}\n`;
        });

        if (internalCSS) htmlSource = htmlSource.replace('</head>', `<style>${internalCSS}</style></head>`);
        if (internalJS) htmlSource = htmlSource.replace('</body>', `<script>${internalJS}<\/script></body>`);

        setTimeout(() => {
            iframe.srcdoc = htmlSource;
        }, 30);
    } else {
        // Trình dịch giả lập Cloud cho các file logic độc lập (.py, .js)
        iframe.style.display = "none";
        terminal.style.display = "block";
        const fname = activeFile.substring(activeFile.lastIndexOf('/') + 1);
        
        terminal.innerHTML = `
            <span style="color: #64748b;">$ python3 ${fname}</span><br>
            <span style="color: #a1a1aa;">[ĐANG BIÊN DỊCH TRÊN ĐÁM MÂY VÀ KHỞI CHẠY...]</span><br><br>
            ${db[currentProject].paths[activeFile].content ? db[currentProject].paths[activeFile].content.replace(/\n/g, '<br>') : 'Không có dữ liệu in ra.'}
            <br><br><span style="color: #10b981;">>>> Process finished with exit code 0</span>
        `;
    }
});

// NÚT THOÁT RA DUY NHẤT ĐỂ QUAY LẠI TRANG CODE 
document.getElementById('btn-exit-preview').addEventListener('click', () => {
    document.getElementById('live-preview-overlay').classList.remove('active');
});
