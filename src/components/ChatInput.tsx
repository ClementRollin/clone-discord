import React, { useState, useEffect } from 'react';
import { useSocket, Message } from '../providers/SocketProvider';
import '../components/styles/chatInput.css';

interface User {
    id: number;
    username: string;
}

interface ChatInputProps {
    currentConversationId: number; // Changed from currentRoom: string
    onSend: (message: Message) => void;
}

export function ChatInput({ currentConversationId, onSend }: ChatInputProps) {
    const [message, setMessage] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<number | null>(null);
    const socket = useSocket();

    useEffect(() => {
        // Récupérer les utilisateurs depuis la base de données
        const fetchUsers = async () => {
            try {
                const response = await fetch('http://localhost:8000/users');
                const data = await response.json();
                setUsers(data);
            } catch (error) {
                console.error('Error fetching users:', error);
            }
        };

        fetchUsers();
    }, []);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (selectedUser === null) {
            console.error('No user selected');
            return;
        }
        const user = users.find(u => u.id === selectedUser);
        if (!user) {
            console.error('User not found');
            return;
        }

        // Envoyer le message via une requête HTTP POST
        const response = await fetch('http://localhost:8000/send-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: selectedUser, content: message, conversation_id: currentConversationId })
        });

        if (response.ok) {
            const messageContent: Message = await response.json();
            setMessage('');
            onSend(messageContent);
        } else {
            console.error('Error sending message');
        }
    };

    return (
        <form className="chat-input" onSubmit={handleSubmit}>
            <select
                value={selectedUser ?? ''}
                onChange={(event) => setSelectedUser(Number(event.target.value))}
                required
            >
                <option value="" disabled>Select user</option>
                {users.map(user => (
                    <option key={user.id} value={user.id}>
                        {user.username}
                    </option>
                ))}
            </select>
            <input
                value={message}
                onChange={(event) => setMessage(event.currentTarget.value)}
                placeholder="Your message"
                required
            />
            <button type="submit">Send</button>
        </form>
    );
}
