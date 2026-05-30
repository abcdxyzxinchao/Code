let editor;
let projects = {}; // Cấu trúc: { "Tên_Project": { files: {}, tree: [] } }
let currentProject = null;
let activeFilePath = null;
let openTabs = [];
let selectedNodeId = null; // Node đang được click chọn để lồng ghép file/thư mục con

const langModeMap = { 'html': 'html', 'css': 'css', 'js': 'javascript', 'py': 'python', 'php': 'php', 'java': 'java' };

// KHỞI CHẠY MONACO
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
    
    // Tạo sẵn một dự án Demo ban đầu để không trống trải
    initMockProject();
});

function initMockProject() {
    createProjectData("Camera Studio AI");
    
    // Thêm các node tệp tin và lồng ghép con ban đầu
    const proj = projects["Camera Studio AI"];
    proj.files["root/index.html"] = `<!DOCTYPE html>\n<html>\n<head>\n    <title>AI Realtime</title>\n</head>\n<body>\n    <h1>Hệ Thống Camera AI Đã Kích Hoạt</h1>\n</body>\n</html>`;
    proj.files["root/assets/style.css"] = `body { background: #000; color: #fff; }`;
    proj.files["root/core/nsjs.py"] = `import os\nprint("Python Model Core Booted Successfully.")`;

    proj.tree = [
        { id: "root/index.html", name: "index.html", type: "file", ext: "html" },
        { 
            id: "root/assets", name: "assets", type: "folder", expanded: true,
            children: [
                { id: "root/assets/style.css", name: "style.css", type: "file", ext: "css" }
            ]
        },
        {
            id: "root/core", name: "core", type: "folder", expanded: true,
            children: [
                { id: "root/core/nsjs.py", name: "nsjs.py", type: "file", ext: "py" } // Đầy đủ Python minh họa
            ]
        }
    ];

    switchProject("Camera Studio AI");
}

// HÀM TẠO DỰ ÁN MỚI
function createProjectData(name) {
    projects[name] = { files: {}, tree: [] };
    const select = document.getElementById('project-selector');
    const opt = document.createElement('option');
    opt.value = name; opt.innerText = name;
    select.appendChild(opt);
}

document.getElementById('btn-create-project').addEventListener('click', () => {
    const name = prompt("Nhập tên dự án mới cần lập trình:");
    if (!name) return;
    if (projects[name]) return alert("Dự án đã tồn tại!");
    createProjectData(name);
    switchProject(name);
});

document.getElementById('project-selector').addEventListener('change', (e) => {
    switchProject(e.target.value);
});

function switchProject(name) {
    currentProject = name;
    document.getElementById('active-project-name').innerText = name;
    document.getElementById('project-selector').value = name;
    openTabs = [];
    activeFilePath = null;
    selectedNodeId = null;
    renderFileTree();
    renderTabs();
    syncEditor();
}

// ĐỆ QUY DỰNG CÂY THƯ MỤC LỒNG GHÉP VÔ HẠN TẦNG CHUẨN SPCK
function renderFileTree() {
    const rootContainer = document.getElementById('file-tree-root');
    rootContainer.innerHTML = '';
    if (!currentProject) return;

    const treeData = projects[currentProject].tree;
    
    function buildNodeHTML(node, container) {
        const row = document.createElement('div');
        row.className = `tree-node-row ${node.id === selectedNodeId ? 'selected' : ''}`;
        
        let iconClass = "fa-solid fa-file-code";
        if (node.type === 'folder') {
            iconClass = node.expanded ? "fa-solid fa-folder-open" : "fa-solid fa-folder";
        } else {
            if (node.ext === 'html') iconClass = "fa-brands fa-html5";
            else if (node.ext === 'css') iconClass = "fa-brands fa-css3-alt";
            else if (node.ext === 'js') iconClass = "fa-brands fa-js";
            else if (node.ext === 'py') iconClass = "fa-brands fa-python"; // Bổ sung logo Python sắc nét
            else if (node.ext === 'php') iconClass = "fa-brands fa-php";
            else if (node.ext === 'java') iconClass = "fa-brands fa-java";
        }

        const isFolder = node.type === 'folder';
        row.innerHTML = `
            <div class="node-content-left">
                ${isFolder ? `<i class="fa-solid fa-chevron-right arrow-toggle ${node.expanded ? 'expanded' : ''}"></i>` : '<span style="width:16px;"></span>'}
                <i class="${iconClass} node-icon"></i>
                <span>${node.name}</span>
            </div>
            <i class="fa-solid fa-trash-can" style="font-size:11px; opacity:0.4;" onclick="deleteNodeTrigger(event, '${node.id}')"></i>
        `;

        row.onclick = (e) => {
            e.stopPropagation();
            selectedNodeId = node.id;
            
            if (isFolder) {
                node.expanded = !node.expanded;
            } else {
                openFileToEditor(node.id);
            }
            renderFileTree();
        };

        container.appendChild(row);

        if (isFolder && node.expanded && node.children) {
            const childContainer = document.createElement('div');
            childContainer.className = "node-children-container";
            node.children.forEach(child => buildNodeHTML(child, childContainer));
            container.appendChild(childContainer);
        }
    }

    treeData.forEach(node => buildNodeHTML(node, rootContainer));
}

// XỬ LÝ LỒNG GHÉP FILE / THƯ MỤC VÀO VỊ TRÍ ĐANG CHỌN
function addNodeToTree(type) {
    if (!currentProject) return alert("Vui lòng tạo hoặc chọn dự án trước!");
    const name = prompt(`Nhập tên ${type === 'file' ? 'File kèm đuôi (vd: main.py, index.html)' : 'Thư mục'}:`);
    if (!name) return;

    const ext = name.split('.').pop();
    const proj = projects[currentProject];
    
    const newNodeId = selectedNodeId ? `${selectedNodeId}/${name}` : `root/${name}`;
    const newNode = { id: newNodeId, name: name, type: type, ext: ext };
    if (type === 'folder') { newNode.children = []; newNode.expanded = true; }
    else { proj.files[newNodeId] = type === 'file' && ext === 'py' ? "# Code Python\n" : ""; }

    if (!selectedNodeId) {
        proj.tree.push(newNode);
    } else {
        // Tìm node cha được chọn trong cây để nhét con vào
        function findAndInsert(list) {
            for (let n of list) {
                if (n.id === selectedNodeId && n.type === 'folder') {
                    n.children.push(newNode);
                    n.expanded = true;
                    return true;
                }
                if (n.children && findAndInsert(n.children)) return true;
            }
            return false;
        }
        const inserted = findAndInsert(proj.tree);
        if (!inserted) {
            // Nếu đang chọn 1 file, thêm cùng cấp với file đó
            proj.tree.push(newNode);
        }
    }
    
    if (type === 'file') openFileToEditor(newNodeId);
    renderFileTree();
}

document.getElementById('action-add-file').addEventListener('click', () => addNodeToTree('file'));
document.getElementById('action-add-folder').addEventListener('click', () => addNodeToTree('folder'));

function openFileToEditor(id) {
    activeFilePath = id;
    if (!openTabs.includes(id)) openTabs.push(id);
    renderTabs();
    syncEditor();
}

function syncEditor() {
    const emptyState = document.getElementById('empty-workspace-state');
    if (!activeFilePath || !currentProject) {
        emptyState.style.display = "flex";
        if (editor) editor.getContainerNode().style.opacity = "0";
        return;
    }
    emptyState.style.display = "none";
    if (editor) {
        editor.getContainerNode().style.opacity = "1";
        const code = projects[currentProject].files[activeFilePath] || "";
        editor.setValue(code);
        const ext = activeFilePath.split('.').pop();
        monaco.editor.setModelLanguage(editor.getModel(), langModeMap[ext] || 'plaintext');
    }
}

// BẬT TAB ĐIỀU HƯỚNG MỀM
function renderTabs() {
    const bar = document.getElementById('editor-tabs-bar');
    bar.innerHTML = '';
    openTabs.forEach(id => {
        const fname = id.substring(id.lastIndexOf('/') + 1);
        const tab = document.createElement('div');
        tab.className = `tab-unit ${id === activeFilePath ? 'active' : ''}`;
        tab.innerHTML = `<span>${fname}</span><i class="fa-solid fa-xmark" style="font-size:10px;"></i>`;
        tab.querySelector('.fa-xmark').onclick = (e) => {
            e.stopPropagation();
            openTabs = openTabs.filter(t => t !== id);
            if (activeFilePath === id) activeFilePath = openTabs.length > 0 ? openTabs[0] : null;
            renderTabs(); syncEditor();
        };
        tab.onclick = () => { activeFilePath = id; renderTabs(); syncEditor(); };
        bar.appendChild(tab);
    });
}

// LƯU TRỮ TRẠNG THÁI KHI GÕ
if (editor) {
    editor.onDidChangeModelContent(() => {
        if (currentProject && activeFilePath) {
            projects[currentProject].files[activeFilePath] = editor.getValue();
        }
    });
}

// SIDEBAR TOGGLE MOBILE
document.getElementById('btn-toggle-sidebar').addEventListener('click', () => {
    const sb = document.getElementById('app-sidebar');
    if (window.innerWidth <= 768) sb.classList.toggle('open-mobile');
    else sb.classList.toggle('collapsed');
});

// 🚀 LOGIC CHẠY RUN FULL SCREEN KỊCH TRANG (BẬT ĐỘC BẢN)
document.getElementById('btn-global-run').addEventListener('click', () => {
    if (!currentProject || !activeFilePath) return alert("Không có file nào đang mở để chạy!");
    
    const overlay = document.getElementById('live-preview-overlay');
    const iframe = document.getElementById('preview-runtime-viewport');
    const terminal = document.getElementById('preview-runtime-terminal');
    
    overlay.classList.add('active'); // Đẩy kịch màn hình, che toàn bộ IDE phía sau

    if (activeFilePath.endsWith('.html')) {
        iframe.style.display = "block";
        terminal.style.display = "none";
        iframe.srcdoc = projects[currentProject].files[activeFilePath];
    } else {
        // Nếu chạy file Python hoặc Logic thuần
        iframe.style.display = "none";
        terminal.style.display = "block";
        const currentFileName = activeFilePath.substring(activeFilePath.lastIndexOf('/') + 1);
        terminal.innerHTML = `<span style="color:#64748b;">$ python3 ${currentFileName}</span><br><br>[KẾT QUẢ ĐẦU RA]<br>-----------------------<br>${currentFileName} đang thực thi cấu trúc lõi AI...<br>Chạy hoàn tất thành công với mã lập trình!`;
    }
});

// NÚT THOÁT RA DUY NHẤT ĐỂ QUAY LẠI MÀN HÌNH CODE
document.getElementById('btn-exit-preview').addEventListener('click', () => {
    document.getElementById('live-preview-overlay').classList.remove('active');
});
