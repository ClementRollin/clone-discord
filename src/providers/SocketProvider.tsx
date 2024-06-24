import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

export type Message = {
    id: number;
    type: string;
    content: string;
    conversation_id: number;
    author: string;
    user_id: number;
};

interface AppSocketContext {
    socket: Socket | null;
    onMessage: (callback: (message: Message) => void) => void;
    send: (message: Message) => void;
}

const SocketContext = createContext<AppSocketContext | null>(null);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        const newSocket = io('http://localhost:3000');
        setSocket(newSocket);
        console.log('Socket connected')
        return () => {
            newSocket.close();
        };
    }, []);

    const onMessage = (callback: (message: Message) => void) => {
        if (!socket) return;
        socket.on('message', callback);
        console.log('Socket message received')
    };

    const send = (message: Message) => {
        if (!socket) return;
        socket.emit('message', message);
        console.log('Socket message sent', message)
    };

    return (
        <SocketContext.Provider value={{ socket, onMessage, send }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};