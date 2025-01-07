const fs = require('fs');
const express = require('express');
const cors = require("cors");
const connectToDatabase = require('./config/db'); // MongoDB接続用
const bodyParser = require('body-parser');
const { google } = require('googleapis');
const { MongoClient } = require('mongodb');
const path = require('path');
const favicon = require('serve-favicon');
const app = express();
const { v4: uuidv4 } = require('uuid');

const port = process.env.PORT || 3000; // 環境変数から取得、なければ3000を使用



// MongoDB接続情報
const mongoUrl = process.env.MONGODB_URI || "mongodb://localhost:27017/student";
const dbName = process.env.MONGO_Name; // データベース名


// Middleware
app.use(cors());
app.use(bodyParser.json());


let dbClient; // MongoClientインスタンスを保持する変数


// Google Sheets APIの認証情報
let auth;

// 静的ファイルの提供
app.use(express.static(path.join(__dirname, 'public')));

// ファビコンのミドルウェアを設定
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

// POSTリクエストのパース設定
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ルートパスへのアクセスに対して、select.htmlを返す
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'select.html'));
    //createSheet();

});

// Google Sheetsの認証情報を読み込み
fs.readFile('credentials.json', (err, content) => {
    if (err) {
        console.error('Error loading client secret file:', err);
        return;
    }
    // 認証プロセスの開始
    authorize(JSON.parse(content), appendData);
});

// 認証プロセスを行う関数
function authorize(credentials) {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // 保存されたトークンを使って認証
    fs.readFile('token.json', (err, token) => {
        if (err) {
            return getNewToken(oAuth2Client);
        }
        oAuth2Client.setCredentials(JSON.parse(token));
        auth = oAuth2Client; // 認証オブジェクトを保持
    });
}

// 新しいトークンを取得する関数
function getNewToken(oAuth2Client) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    console.log('Authorize this app by visiting this url:', authUrl);
}

// 学籍番号と出席情報をGoogle Sheetsに書き込むAPI
app.post('/record-attendance', (req, res) => {
    const { studentId, studentName, datejp: timestamp } = req.body; // リクエストからデータを取得


    //console.log(timestamp);

    addDbData(studentId, timestamp);


    // Google Sheetsにデータを追加
    appendData(studentId, timestamp, studentName)
        .then(() => {
            res.status(200).send('Attendance recorded successfully!');
        })
        .catch((err) => {
            console.error('Error recording attendance:', err);
            res.status(500).send('Failed to record attendance.');
        });
});


async function addDbData(studentId, timestamp) {
    const client = new MongoClient(mongoUrl);

    try {
        // データベースに接続
        await client.connect();
        console.log("Connected to MongoDB");

        // 指定したデータベースとコレクションを取得
        const db = client.db(dbName);
        const collection = db.collection("studentAll");

        console.log(timestamp);
        const result = await collection.updateOne(
            { 学籍番号: studentId },
            {
                $push: {
                    出席: {
                        id: uuidv4(), // UUIDを生成
                        日付: timestamp
                    }
                }
            }
        );

        //console.log("追加");
        //res.status(201).send(result);
        await client.close();

    } catch (error) {
        //res.status(500).send(error);
    }

}




// Google Sheetsにデータを追加する関数
function appendData(studentId, timestamp, studentName) {
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = '1JL30KOR5HgNxvA1X0EXySPCCdnIIactZsgA23-YOegw'; // スプレッドシートID
    const range = 'Sheet1!A1'; // 書き込み範囲

    (async () => {
        //const auth = oAuth2ClientGen({ library: google });
        //const sheets = google.sheets({ version: 'v4', auth });
        const sheets1 = google.sheets({ version: 'v4', auth });


        //const spreadsheetId = 'あなたのスプレッドシートIDをここに記入'; // スプレッドシートIDを指定
        const range = 'Sheet2!D:D'; // データ範囲（A列が学籍番号、他の列に値を入力）
        //const studentId = '123456'; // 検索したい学籍番号
        const inputColumn = 7; // 入力する列番号 (E列なら4)
        const inputValue = '出席'; // 入力する値

        try {
            // 1. データを取得
            const res = await sheets1.spreadsheets.values.get({
                spreadsheetId,
                range,
            });

            const rows = res.data.values;

            if (!rows || rows.length === 0) {
                console.log('No data found.');
                return;
            }

            // 2. 学籍番号を検索
            let targetRow = null;
            for (let i = 0; i < rows.length; i++) {
                if (rows[i][0] === studentId) { // A列の学籍番号を検索
                    targetRow = i + 1; // 行番号（スプレッドシートは1始まり）
                    break;
                }
            }

            if (targetRow === null) {
                console.log('スプレッドシートに学籍番号が見つかりませんでした。');
                return;
            }

            // 3. 同じ行に値を入力
            const updateRange = `Sheet2!${String.fromCharCode(64 + inputColumn)}${targetRow}`;
            await sheets1.spreadsheets.values.update({
                spreadsheetId,
                range: updateRange,
                valueInputOption: 'RAW',
                resource: {
                    values: [[inputValue]],
                },
            });
            const updateRange1 = `Sheet2!${String.fromCharCode(64 + inputColumn - 1)}${targetRow}`;

            await sheets1.spreadsheets.values.update({
                spreadsheetId,
                range: updateRange1,
                valueInputOption: 'RAW',
                resource: {
                    values: [[timestamp]],
                },
            });

            //console.log(`学籍番号 ${studentId} の行に値を入力しました。`);

        } catch (error) {
            console.error('The API returned an error:', error);
        }
    })();



    const values = [
        [studentId, studentName, timestamp]
    ];

    const resource = { values };

    // Google Sheets APIでデータをスプレッドシートに追加
    return sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        resource,
    });
}

// 学籍番号でMongoDBから学生データを検索
app.post('/search', async (req, res) => {
    const { studentId } = req.body; // リクエストから学籍番号を取得

    try {
        const { client, db } = await connectToDatabase(mongoUrl, dbName); // データベースに接続
        dbClient = client; // clientを保持

        // 学籍番号で学生情報を検索
        const student = await db.collection('studentAll').findOne({ 学籍番号: studentId });

        if (student) {
            res.json({ success: true, student });
        } else {
            res.json({ success: false, message: '学生が見つかりませんでした。' });
        }

        // 使用後にMongoDB接続を閉じる
        await client.close();
    } catch (error) {
        console.error('エラーが発生しました:', error);
        res.json({ success: false, message: 'エラーが発生しました。' });
    } finally {

    }
});


// クラス選択
app.post('/submit', async (req, res) => {
    const selectedClass = req.body.classId; // 選択されたクラスを取得
    try {
        const { client, db } = await connectToDatabase(mongoUrl, dbName); // データベースに接続
        dbClient = client; // clientを保持

        const classData = await db.collection('class').findOne({ クラス: selectedClass }); // クラスのデータを取得
        //const classList = await db.collection('student1').findOne({ クラス: selectedClass }); // クラスリストを取得


        if (classData) {
            res.json({ success: true, classData });

        } else {
            res.json({ success: false, message: 'クラスがありません' });
        }
    } catch (error) {
        console.error('Error fetching class data:', error);
        res.status(500).send('エラーが発生しました。もう一度お試しください。');
    }
});



// Create
app.post("/api/students", async (req, res) => {
    const client = new MongoClient(mongoUrl);

    try {
        // データベースに接続
        await client.connect();
        console.log("Connected to MongoDB");

        // 指定したデータベースとコレクションを取得
        const db = client.db(dbName);
        //const collection = db.collection("studentAll");

        const result = await db.collection("studentAll").insertOne(req.body);

        //console.log("追加");
        res.status(201).send(result);
        await client.close();

    } catch (error) {
        res.status(500).send(error);
    }
});

// Read
app.get("/api/students", async (req, res) => {
    const client = new MongoClient(mongoUrl);

    try {
        // データベースに接続
        await client.connect();
        console.log("Connected to MongoDB");

        // 指定したデータベースとコレクションを取得
        const db = client.db(dbName);
        const collection = db.collection("studentAll");

        // コレクションの内容を取得してコンソールに表示
        const students = await collection.find({}).toArray();
        //console.log("Collection contents:");
        //console.table(students);
        //console.log("Read");


        //const students = await db.collection("studentAll").find().toArray();
        res.status(200).send(students);
        await client.close();

    } catch (error) {
        res.status(500).send(error);
    }
});

// Delete
app.delete("/api/students/:studentId", async (req, res) => {
    const client = new MongoClient(mongoUrl);


    try {
        await client.connect();
        console.log("Connected to MongoDB");

        // 指定したデータベースとコレクションを取得
        const db = client.db(dbName);


        const result = await db.collection("studentAll").deleteOne({ 学籍番号: req.params.studentId });
        res.status(200).send(result);
        //console.log("削除");
        await client.close();

    } catch (error) {
        res.status(500).send(error);
    }
});



app.post("/updateURL", async (req, res) => {
    const client = new MongoClient(mongoUrl);


    try {
        // データベースに接続
        await client.connect();
        console.log("Connected to MongoDB");

        // 指定したデータベースとコレクションを取得
        const db = client.db(dbName);
        const collection = db.collection("class");

        const classData = req.body.classData;


        console.log(classData);

        const result = await collection.updateOne(
            { クラス: req.params.classData }, // 更新条件 (_id)
            { $set: req.params.sheets }      // 更新内容
        );

        //console.log("追加");
        res.status(201).send(result);
        await client.close();

    } catch (error) {
        res.status(500).send(error);
    }
});





// サーバーを起動
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

// Graceful Shutdown (MongoDB接続は各リクエスト後に閉じるため、サーバーはすぐに終了できる)
process.on('SIGINT', () => {
    console.log('Server shutting down...');
    process.exit(0);
});



// 現在の日付の出席情報を取得
app.get('/api/attendance/now', async (req, res) => {
    const client = new MongoClient(mongoUrl);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db(dbName);
        const collection = db.collection('studentAll');

        // 現在の日付をフォーマット
        const currentDate = new Date();
        const formattedDate = currentDate.getFullYear() + '年'
            + (currentDate.getMonth() + 1).toString().padStart(2, '0') + '月'
            + currentDate.getDate().toString().padStart(2, '0') + '日';

        // const a = await collection.find({}).toArray();

        // console.log(a);



        // すべての出席情報を取得
        const students = await collection.find({}, { projection: { 名前: 1, 出席: 1, _id: 0 } }).toArray();


        // 日にちごとの出席者リストを作成
        let attendanceByDate = []; // 配列として初期化

        students.forEach(student => {
            if (Array.isArray(student.出席)) {
                student.出席.forEach(record => {
                    if (record.日付.startsWith(formattedDate)) {
                        // 学生の名前と出席時間をオブジェクトとして配列に追加
                        attendanceByDate.push({
                            名前: student.名前,
                            出席時間: record.日付, // 出席時間を保存
                            id: record.id
                        });
                    }
                });
            }
        });



        res.json(attendanceByDate);

    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).send('Internal Server Error');
    } finally {
        await client.close();
    }
});

//日付を選択して出席者を表示
app.get('/api/attendance', async (req, res) => {
    const client = new MongoClient(mongoUrl);

    const formattedDate = req.query.date;
    console.log(formattedDate);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db(dbName);
        const collection = db.collection('studentAll');



        // すべての出席情報を取得
        const students = await collection.find({}, { projection: { 名前: 1, 出席: 1, _id: 0 } }).toArray();

        // 日にちごとの出席者リストを作成
        let attendanceByDate = []; // 配列として初期化

        students.forEach(student => {
            if (Array.isArray(student.出席)) {
                student.出席.forEach(record => {
                    if (record.日付.startsWith(formattedDate)) {
                        // 学生の名前と出席時間をオブジェクトとして配列に追加
                        attendanceByDate.push({
                            名前: student.名前,
                            出席時間: record.日付, // 出席時間を保存
                            id: record.id

                        });
                    }
                });
            }
        });


        res.json(attendanceByDate);

    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).send('Internal Server Error');
    } finally {
        await client.close();
    }
});


// 出席データ削除エンドポイント
app.delete('/api/attendance/:id', async (req, res) => {
    const client = new MongoClient(mongoUrl);

    try {
        await client.connect();
        console.log("Connected to MongoDB");

        // 指定したデータベースとコレクションを取得
        const db = client.db(dbName);



        const result = await db.collection("studentAll").updateOne(
            { "出席.id": req.params.id }, // クエリ: `出席` 配列内の特定の `id` を持つ要素を検索
            { $pull: { "出席": { id: req.params.id } } } // `出席` 配列から該当する要素を削除
        );
        res.status(200).send(result);
        //console.log("削除");
        await client.close();

    } catch (error) {
        res.status(500).send(error);
    }
});



async function createSheet() {
    const client = new MongoClient(mongoUrl);

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = '1JL30KOR5HgNxvA1X0EXySPCCdnIIactZsgA23-YOegw'; // スプレッドシートID
    const range = 'Sheet3!A1'; // 書き込み範囲


    try {
        // データベースに接続
        await client.connect();
        console.log("Connected to MongoDB");

        // 指定したデータベースとコレクションを取得
        const db = client.db(dbName);
        const collection = db.collection("studentAll");

        // コレクションの内容を取得してコンソールに表示
        const students = await collection.find({ クラス: "1組" }).toArray();
        //console.log("Collection contents:");
        console.table(students);
        //console.log("Read");

        // MongoDBデータを2次元配列に変換
        const values = students.map(student => [
            student.学籍番号, // 学籍番号
            student.名前,     // 名前
            student.学年,     // 学年
            student.クラス,   // クラス
        ]);


        const resource = { values };

        console.log(resource);

        // Google Sheets APIでデータをスプレッドシートに追加
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range,
            valueInputOption: 'RAW',
            resource,
        });


        //const students = await db.collection("studentAll").find().toArray();

        await client.close();

    } catch (error) {
        //res.status(500).send(error);
    }



}

//createSheet();