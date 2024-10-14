const fs = require('fs');
const express = require('express');
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');
const { google } = require('googleapis');
const path = require('path');
const app = express();
const port = 80;


// MongoDB接続情報
const url = 'mongodb://localhost:27017';
const dbName = 'student'; // データベース名
const collectionName = 'student1'; // コレクション名

// Google Sheets APIの認証
let auth;


// 静的ファイルを提供する設定
app.use(express.static(path.join(__dirname, 'public')));

// POSTリクエストのパース設定
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ルートへのリクエストに対して、`index.html` を返す
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});



fs.readFile('credentials.json', (err, content) => {
    if (err) return console.error('Error loading client secret file:', err);
    authorize(JSON.parse(content), appendData);
});

function authorize(credentials) {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // 保存されたトークンを使用して認証
    fs.readFile('token.json', (err, token) => {
        if (err) return getNewToken(oAuth2Client);
        oAuth2Client.setCredentials(JSON.parse(token));
        auth = oAuth2Client;
    });
}

function getNewToken(oAuth2Client) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    console.log('Authorize this app by visiting this url:', authUrl);
}


// POSTリクエストで受け取ったデータをGoogle Sheetsに書き込む
app.post('/record-attendance', (req, res) => {
    const studentId = req.body.studentId;//学籍番号の取得
    const timestamp = req.body.datejp;  // タイムスタンプを生成
    const studentName = req.body.studentName;//名前の取得




    // const timestamp = new Date().toISOString();  // タイムスタンプを生成

    appendData(studentId, timestamp, studentName)
        .then(() => {
            res.status(200).send('Attendance recorded successfully!');
        })
        .catch((err) => {
            console.error('Error recording attendance:', err);
            //res.status(500).send('Failed to record attendance.');
        });
});



// Google Sheetsにデータを追加
function appendData(studentId, timestamp, studentName) {
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = '1JL30KOR5HgNxvA1X0EXySPCCdnIIactZsgA23-YOegw';  // Google SheetsのIDを指定
    const range = 'Sheet1!A1';  // 書き込む範囲

    const values = [
        [studentId, studentName, timestamp]
    ];

    const resource = {
        values
    };

    return sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        resource,
    });
}


// 学籍番号を使ってMongoDBからデータを検索
app.post('/search', async (req, res) => {
    const studentId = req.body.studentId; // フォームから送信された学籍番号

    const client = new MongoClient(url);

    try {
        await client.connect(); // MongoDBに接続
        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        // 学籍番号で学生を検索
        const student = await collection.findOne({ 学籍番号: studentId });

        if (student) {
            res.json({
                success: true,
                student: student
            });
        } else {
            res.json({
                success: false,
                message: '学生が見つかりませんでした。'
            });
        }
    } catch (error) {
        console.error('エラーが発生しました:', error);
        res.json({ success: false, message: 'エラーが発生しました。' });
    } finally {
        await client.close(); // 接続を閉じる
    }
});

// サーバーを起動
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
