import {Server} from 'socket.io';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import mysql, {RowDataPacket, ResultSetHeader} from 'mysql2/promise';

async function main() {
    const db = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'C11R01CsC&MARIADB',
        database: 'chat_app',
        port: 3308
    });

    await db.execute(`
    CREATE TABLE IF NOT EXISTS user (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE
    )
`);

    await db.execute(`
    CREATE TABLE IF NOT EXISTS conversation (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL UNIQUE
    )
`);

    await db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        content TEXT,
        conversation_id INT,
        user_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES user(id),
        FOREIGN KEY (conversation_id) REFERENCES conversation(id)
    )
`);

    const io = new Server({
        cors: {
            origin: '*',
        }
    });

    const app = express();
    const PORT = 8000;

    // Middleware pour analyser les requêtes JSON
    app.use(bodyParser.json());

    // Middleware pour gérer les requêtes CORS
    app.use(cors());

    // Route pour créer un utilisateur
    app.post('/create-user', async (req, res) => {
        const {username} = req.body;
        try {
            const [result] = await db.execute<ResultSetHeader>('INSERT INTO user (username) VALUES (?)', [username]);
            res.status(201).json({id: result.insertId, username});
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                res.status(400).json({error: 'Username already exists'});
            } else {
                res.status(500).json({error: 'Database error'});
            }
        }
    });

    // Route pour récupérer les conversations
    app.get('/conversations', async (req, res) => {
        try {
            const [rows] = await db.execute<RowDataPacket[]>('SELECT id, name FROM conversation');
            res.json(rows);
        } catch (error) {
            res.status(500).json({error: 'Database error'});
        }
    });

    // Route pour récupérer les utilisateurs
    app.get('/users', async (req, res) => {
        try {
            const [rows] = await db.execute<RowDataPacket[]>('SELECT id, username FROM user');
            res.json(rows);
        } catch (error) {
            res.status(500).json({error: 'Database error'});
        }
    });

    // envoi d'un message (inutilisé)
    app.post('/send-message', async (req, res) => {
        const { user_id, content, conversation_id } = req.body;
        console.log('Received message via HTTP POST:', req.body);

        const [result] = await db.execute<ResultSetHeader>('INSERT INTO messages (content, conversation_id, user_id) VALUES (?, ?, ?)', [content, conversation_id, user_id]);
        const messageId = result.insertId;

        const [userRows] = await db.execute<RowDataPacket[]>('SELECT username FROM user WHERE id = ?', [user_id]);
        const author = userRows[0].username;

        const message = { id: messageId, author, content, conversation_id, created_at: new Date() };
        io.emit('message', message);
        res.status(200).json(message);
    });

    // Route pour créer une conversation
    app.post('/create-conversation', async (req, res) => {
        const {title} = req.body;
        try {
            const [result] = await db.execute<ResultSetHeader>('INSERT INTO conversation (name) VALUES (?)', [title]);
            res.status(201).json({id: result.insertId, title});
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                res.status(400).json({error: 'Conversation title already exists'});
            } else {
                res.status(500).json({error: 'Database error'});
            }
        }
    });

    app.get('/messages', async (req, res) => {
        const { conversation_id } = req.query;
        if (!conversation_id) {
            return res.status(400).send('Conversation_id parameter is required');
        }
        const [rows] = await db.execute<RowDataPacket[]>(`
        SELECT messages.id, messages.content, messages.conversation_id, messages.timestamp, user.username as author 
        FROM messages 
        JOIN user ON messages.user_id = user.id 
        WHERE conversation_id = ?
        ORDER BY messages.timestamp ASC
    `, [conversation_id]);
        res.json(rows);
    });

    // Démarre le serveur HTTP
    app.listen(PORT, () => {
        console.log(`HTTP server listening on port ${PORT}`);
    });

    io.on('connection', (socket) => {
        console.log('New connection: ', socket.id);

        socket.on('message', async (message) => {
            console.log('Received message: ', message);

            // Save the message in the database and get the generated ID
            const [result] = await db.execute<ResultSetHeader>('INSERT INTO messages (content, conversation_id, user_id) VALUES (?, ?, ?)', [message.content, message.conversation_id, message.user_id]);
            const messageId = result.insertId;

            // Get the user to get the author's name
            const [userRows] = await db.execute<RowDataPacket[]>('SELECT username FROM user WHERE id = ?', [message.user_id]);
            const author = userRows[0].username;

            // Emit the message to all connected clients with the generated ID
            io.emit('message', { id: messageId, author, content: message.content, conversation_id: message.conversation_id, created_at: new Date() });
        });
    });


    // recuperation du dernier message d'une conversation
    app.get('/last-message', async (req, res) => {
        const {conversation_id} = req.query;
        if (!conversation_id) {
            return res.status(400).send('Conversation_id parameter is required');
        }
        const [rows] = await db.execute<RowDataPacket[]>(`
        SELECT messages.content, messages.timestamp, user.username as author 
        FROM messages 
        JOIN user ON messages.user_id = user.id 
        WHERE conversation_id = ?
        ORDER BY messages.id DESC
        LIMIT 1
    `, [conversation_id]);
        res.json(rows[0]);
    });

    io.listen(3000);
    console.log('Socket.IO server started on port 3000');
}

main().catch(err => console.error(err));
