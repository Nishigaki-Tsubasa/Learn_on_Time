const classDataform = document.getElementById("classSelect");//クラス選択formを取得

classDataform.addEventListener("submit", (e) => {


    e.preventDefault(); // デフォルトのフォーム送信を防ぐ

    //クラスを取得
    const classId = document.getElementById('class').value;

    // サーバーにPOSTリクエストを送信して学生を検索
    fetch('/submit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ classId })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const classData = data.classData;

                // sessionStorage.setItem('classData', JSON.stringify(classData));
                // window.location.href = 'main.html';

                localStorage.setItem('classData', JSON.stringify(classData));
                window.location.href = 'main.html';


            } else {
                alert(data.message);
            }
        })
        .catch(error => console.error('エラー:', error));




});