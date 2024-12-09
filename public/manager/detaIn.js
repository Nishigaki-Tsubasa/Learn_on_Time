const apiBase = "http://localhost:3000/api/students";

// Create (データ追加)
document.getElementById("studentForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const student = {
        学籍番号: document.getElementById("studentId").value,
        名前: document.getElementById("lastName").value + " " + document.getElementById("firstName").value,
        学年: Number(document.getElementById("grade").value),
        クラス: document.getElementById("class").value + "組",
        出席番号: Number(document.getElementById("attendanceNo").value),
    };

    try {
        const response = await fetch(apiBase, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(student),
        });

        if (response.ok) {
            //alert("学生情報が送信されました！");
            document.getElementById("studentForm").reset();
        } else {
            throw new Error("データ送信中にエラーが発生しました");
        }
    } catch (error) {
        console.error("送信エラー:", error);
        alert("データ送信に失敗しました");
    }
});