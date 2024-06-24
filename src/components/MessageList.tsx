import React, { useEffect, useState } from 'react';
import { useSocket } from '../providers/SocketProvider';
import '../components/styles/messageList.css';

interface MessageListProps {
    currentConversationId: number; // Changed from currentRoom: string
}

export type Message = {
    id: number;
    type: string;
    content: string;
    conversation_id: number; // Add this line
    author: string;
    user_id: number;
    created_at: string; // Add this line
};

export function MessageList({ currentConversationId }: MessageListProps) {
    const [messages, setMessages] = useState<Message[]>([]);

    const { socket, onMessage } = useSocket();

    useEffect(() => {
        // Fetch messages from the database
        const fetchMessages = async () => {
            console.log(currentConversationId); // Add this line to debug
            try {
                const response = await fetch(`http://localhost:8000/messages?conversation_id=${currentConversationId}`);
                const data = await response.json();
                setMessages(data);
            } catch (error) {
                console.error('Error fetching messages:', error);
            }
        };

        fetchMessages();
    }, [socket, currentConversationId, onMessage]);

    useEffect(() => {
        const handleMessage = (message: Message) => {
            if (message.conversation_id === currentConversationId) {
                setMessages((prevMessages) => [
                    ...prevMessages,
                    { ...message, id: prevMessages.length + 1 } // Ensure the ID is unique
                ]);
            }
        };

        onMessage(handleMessage);

        return () => {
            if (socket) {
                socket.off('message', handleMessage);
            }
        };
    }, [socket, currentConversationId, onMessage]);

    return (
        <div>
            {messages.map((message) => ( // Changed from message.room === currentRoom
                <p key={message.id}>
                    <strong>{message.author}: </strong>{message.content}
                </p>
            ))}
        </div>
    );
}
