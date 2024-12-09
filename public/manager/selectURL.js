const apiBase = "http://localhost:3000/api/students";


const classData = JSON.parse(localStorage.getItem('classData'));//選択されたクラスを取得

document.getElementById("selectURL").addEventListener("submit", async (e) => {
    e.preventDefault();

    const spreadsheetUrl = document.getElementById("spreadsheetUrl").value

    const regex = /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
    const match = spreadsheetUrl.match(regex);

    if (match != null) {
        console.log("スプレッドシートID:", match[1]);
        document.getElementById("error-message").innerText = "";
        document.getElementById("error-message").style.display = "none";
    } else {
        document.getElementById("error-message").innerText = `スプレッドシートURLが正しくありません`;
        document.getElementById("error-message").style.display = "block";
        //process.exit(0);
        //console.error("スプレッドシートURLが正しくありません");
    }




    const sheets = {
        スプレッドURL: spreadsheetUrl,
        スプレッドID: match[1]

    };


    try {
        const response = await fetch('/updateURL', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(classData)
        });

        if (response.ok) {
            document.getElementById("selectURL").reset();
            window.location.href = 'home.html';
        } else {
            throw new Error("データ送信中にエラーが発生しました");
        }
    } catch (error) {
        console.error("送信エラー:", error);
        alert("データ送信に失敗しました");
    }
});
