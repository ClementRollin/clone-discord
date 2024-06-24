export type Message = {
    id: number;
    type: string;
    content: string;
    conversation_id: number;
    author: string;
    user_id: number;
};