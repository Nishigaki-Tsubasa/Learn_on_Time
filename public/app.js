document.addEventListener("DOMContentLoaded", () => {
    const attendanceForm = document.getElementById("attendanceForm");
    const startScannerButton = document.getElementById("startScanner");

    const classData = JSON.parse(localStorage.getItem('classData'));//選択されたクラスを取得


    // const classData = sessionStorage.getItem('classData'); //選択されたクラスを取得
    const classId = document.getElementById("classId");

    classId.textContent = `${classData.クラス}の${classData.教室}の出席管理`;

    //const scannerContainer = document.getElementById("scanner-container");
    //let attendanceRecords = [];



    // 出席を記録
    attendanceForm.addEventListener("submit", (e) => {

        e.preventDefault(); // デフォルトのフォーム送信を防ぐ

        // 入力された学籍番号を取得
        const studentId = document.getElementById('studentId').value.trim();

        if (!studentId) {
            return;
        }


        fetch('/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ studentId: studentId }) // ここでstudentIdが正しく渡されているか確認
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    const student = data.student;

                    //入力されたクラスと選択されたクラスの比較
                    if (student.クラス == classData.クラス) {
                        document.getElementById("error-message").innerText = "";
                        document.getElementById("error-message").style.display = "none";
                        updateAttendanceList(student);
                    } else {
                        document.getElementById("error-message").innerText = `${classData.クラス}の学生ではありません。`;
                        document.getElementById("error-message").style.display = "block";
                        //alert("違うクラスです");
                    }


                } else {
                    alert(data.message);
                }
            })
            .catch(error => console.error('エラー:', error));


        // 入力フィールドをクリア
        document.getElementById('studentId').value = '';
    });

    // QuaggaJSでバーコードスキャンを開始
    startScannerButton.addEventListener("click", () => {
        const barcodeValueElement = document.getElementById('barcodeValue');


        // const video = document.querySelector('#scanner-container');

        // if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        //     navigator.mediaDevices.getUserMedia({ video: true })
        //         .then(stream => {
        //             video.srcObject = stream;
        //             video.play();
        //         })
        //         .catch(err => {
        //             console.error('カメラへのアクセスに失敗しました:', err);
        //         });
        // } else {
        //     console.error('このブラウザではカメラ機能がサポートされていません。');
        // }



        // Quaggaの初期化
        Quagga.init({
            inputStream: {
                name: "Live",
                type: "LiveStream",
                target: document.querySelector('#scanner-container'), // カメラ映像を表示するコンテナ
                // constraints: {
                //     facingMode: "environment", // スマートフォンなどでは背面カメラを使用
                //     width: { ideal: 1280 },  // 幅の理想的な値
                //     height: { ideal: 720 }   // 高さの理想的な値
                // },
                area: { // スキャンエリアを指定
                    top: "0%",    // 上端
                    right: "0%",  // 右端
                    left: "0%",   // 左端
                    bottom: "0%"  // 下端
                }
            },
            frequency: 1, // スキャン頻度
            decoder: {
                readers: ["code_128_reader", "ean_reader", "upc_reader"] // 対応するバーコードリーダーを指定
            }
        }, function (err) {
            if (err) {
                console.error("Quagga initialization failed: ", err);
                return;
            }
            console.log("Quagga initialization succeeded");



            // Quaggaを開始して、カメラ映像を表示
            Quagga.start();
        });


        let lastDetectedTime = 0; // 最後に検出した時間を保持
        let lastDetectedCode = ''; // 最後に検出されたバーコード

        Quagga.onDetected(function (result) {
            const code = result.codeResult.code;
            const currentTime = Date.now();

            // ここでは3秒 (3000ms) の間隔を設定し、かつ前回と同じバーコードの場合は無視
            if (currentTime - lastDetectedTime > 3000 && code !== lastDetectedCode) {
                lastDetectedTime = currentTime;
                lastDetectedCode = code; // 最後に検出されたコードを更新

                barcodeValueElement.textContent = code; // 読み取ったバーコードを表示
                studentId = code;

                // サーバーにPOSTリクエストを送信して学生を検索
                fetch('/search', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ studentId })
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            const student = data.student;
                            updateAttendanceList(student);
                        } else {
                            alert(data.message);

                            document.getElementById("error-message").innerText = `${classData.クラス}の学生ではありません。`;
                            document.getElementById("error-message").style.display = "block";
                        }
                    })
                    .catch(error => console.error('エラー:', error));
            }
        });


    });

    //10より小さいときに先頭に0をつける関数
    function twoFormat(data) {
        return data < 10 ? "0" + data : data;
    }


    // 出席リストをページ上に表示する関数
    function updateAttendanceList(student) {
        let date = new Date(); // 日付取得
        const listItem = document.createElement('li');
        const datejp = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${twoFormat(date.getHours())}時${twoFormat(date.getMinutes())}分`;
        listItem.innerHTML = `学籍番号：${student.学籍番号} - 名前：${student.名前}<br>${datejp}出席`;



        const studentId = student.学籍番号;
        const studentName = student.名前;

        //alert(`学生情報: 学籍番号: ${student.学籍番号}, 名前: ${student.名前}`);


        const attendanceList = document.getElementById('attendanceList'); // 出席リスト要素を取得

        // 一番上に挿入する
        if (attendanceList.firstChild) {
            attendanceList.insertBefore(listItem, attendanceList.firstChild);
        } else {
            attendanceList.appendChild(listItem); // リストが空の場合
        }


        // サーバーにPOSTリクエストを送信
        fetch('http://localhost:3000/record-attendance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ studentId, datejp, studentName }) // 学籍番号を送信
        })
            .then(response => response.text())
            .then(data => {
                //alert(data); // サーバーからの応答メッセージを表示
                document.getElementById('studentId').value = ''; // フォームの入力フィールドをクリア
            })
            .catch(error => console.error('Error:', error));
    }






});
