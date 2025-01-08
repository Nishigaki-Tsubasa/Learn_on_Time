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
                 <button onclick="editStudent(${item.学籍番号})">詳細</button>
                 <button onclick="deleteStudent('${item.学籍番号}')">削除</button>
             </td>
         `;
        tbody.appendChild(row);
    });
};

function editStudent(studentId) {
    //location.href = `edit.html?studentId=${studentId}`;
    fetch(`/api/attendance/${studentId}`, {
        method: 'GET',
    })
        .then(response => response.json())
        .then(attendanceByDate => {
            // let ans = document.getElementById("ans");
            // ans.innerHTML = '';

            console.log(attendanceByDate);
            // let attendanceByDate = []; // 配列として初期化


            // result.出席.forEach(record => {

            //     // 学生の名前と出席時間をオブジェクトとして配列に追加
            //     attendanceByDate.push({

            //         出席時間: record.日付, // 出席時間を保存
            //         id: record.id

            //     });

            // });

            console.log(attendanceByDate);

            // localStorage.setItem('result', JSON.stringify(result));

            // console.log(result);

            localStorage.setItem('attendanceByDate', JSON.stringify(attendanceByDate));
            window.location.href = 'show.html';


            // attendanceByDate.forEach(record => {
            //     // const tbody = document.querySelector("#dataTable tbody");

            //     // const row = document.createElement("tr");

            //     // console.log(record);

            //     // 日付が存在するか確認
            //     //     if (record.出席時間) {
            //     //         let dateString = record.出席時間;
            //     //         let timeMatch = dateString.match(/\d{1,2}時\d{1,2}分/);
            //     //         const logId = record.id;

            //     //         let listItem = document.createElement("p");


            //     //         // matchが成功した場合のみ表示
            //     //         if (timeMatch) {

            //     //             row.innerHTML = `
            //     //      <td>${record.名前}</td>
            //     //      <td>${timeMatch[0]}</td>

            //     //      <td>
            //     //     <button onclick="deleteAttendance('${logId}')">削除</button>
            //     //     </td>
            //     // `;
            //     //             tbody.appendChild(row);

            //     //         } else {
            //     //             listItem.textContent = `${record.名前} - 時間が不明`;
            //     //         }
            //     //     } else {
            //     //         listItem.textContent = `${record.名前} - 日付情報なし`;
            //     //     }

            //     //     // attendanceListDiv.appendChild(listItem);
            // });
        })
        .catch(error => {
            console.error('Error fetching attendance data:', error);
        });

}
// データ削除
const deleteStudent = async (studentId) => {
    await fetch(`${apiBase}/${studentId}`, { method: "DELETE" });
    loadData();
};

loadData();

