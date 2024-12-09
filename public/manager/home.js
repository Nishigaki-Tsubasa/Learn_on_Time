// APIのURL
const apiBase = "http://localhost:3000/api/students";

// データ取得
const loadData = async () => {
    const res = await fetch(apiBase);
    const data = await res.json();
    const tbody = document.querySelector("#dataTable tbody");
    tbody.innerHTML = "";
    data.forEach((item) => {
        const row = document.createElement("tr");
        row.innerHTML = `
             <td>${item.学籍番号}</td>
             <td>${item.名前}</td>
             <td>${item.学年}</td>
             <td>${item.クラス}</td>
             <td>${item.出席番号}</td>
             <td>
                 <button onclick="editStudent(${JSON.stringify(item)})">編集</button>
                 <button onclick="deleteStudent('${item.学籍番号}')">削除</button>
             </td>
         `;
        tbody.appendChild(row);
    });
};

// データ削除
const deleteStudent = async (studentId) => {
    await fetch(`${apiBase}/${studentId}`, { method: "DELETE" });
    loadData();
};

loadData();