import { useSocket } from '../providers/SocketProvider';
import { useEffect, useState } from "react";
import { Conversation } from "../type/Conversation";
import { MessageList } from "../components/MessageList";
import { ChatInput } from "../components/ChatInput";
import './styles/chatScreen.css';

export function ChatScreen() {
    const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const { socket, onMessage } = useSocket();
    const [newConversationTitle, setNewConversationTitle] = useState('');

    const createConversation = async () => {
        try {
            const response = await fetch('http://localhost:8000/create-conversation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title: newConversationTitle }),
            });

            const newConversation = await response.json();

            setConversations((prevConversations) => [...prevConversations, newConversation]);
            setNewConversationTitle('');
        } catch (error) {
            console.error('Error creating new conversation:', error);
        }
    };
    useEffect(() => {
        // Fetch conversations from your API
        const fetchConversations = async () => {
            try {
                const response = await fetch('http://localhost:8000/conversations');
                const data: Conversation[] = await response.json();
                const conversationsWithLastMessage = await Promise.all(data.map(async (conversation: Conversation) => {
                    const lastMessageResponse = await fetch(`http://localhost:8000/last-message?conversation_id=${conversation.id}`);
                    const lastMessage = await lastMessageResponse.json();
                    return { ...conversation, lastMessage };
                }));
                setConversations(conversationsWithLastMessage);
                setCurrentConversationId(data[0]?.id); // Set the first conversation as the current one
            } catch (error) {
                console.error('Error fetching conversations:', error);
            }
        };

        fetchConversations();
    }, []);

    useEffect(() => {
        if (!socket) return;
        onMessage((message) => {
            setConversations((prevConversations) => {
                return prevConversations.map((conversation) => {
                    if (conversation.id === message.conversation_id) {
                        return { ...conversation, lastMessage: message };
                    } else {
                        return conversation;
                    }
                });
            });
        });
    }, [socket, onMessage]);

    return (
        <div className="chat-container">
            <div className="room-selector">
                {conversations.map((conversation) => (
                    <div
                        key={conversation.id}
                        onClick={() => setCurrentConversationId(conversation.id)}
                        className={conversation.id === currentConversationId ? 'active' : ''}
                    >
                        <h3>{conversation.title}</h3>
                        <p>{conversation.lastMessage?.content}</p>
                    </div>
                ))}
                <div className={"create-conversation"}>
                    <input
                        type="text"
                        placeholder="Create a new conversation"
                        value={newConversationTitle}
                        onChange={(e) => setNewConversationTitle(e.target.value)}
                    />
                    <button onClick={createConversation}>Create</button>
                </div>
            </div>
            <div className="conversations-list">
                {currentConversationId && (
                    <>
                        <MessageList currentConversationId={currentConversationId}/>
                        <ChatInput
                            currentConversationId={currentConversationId}
                            onSend={(message) => console.log(message)}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
