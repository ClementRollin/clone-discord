import {Message} from "./Message";

export type Conversation = {
    id: number;
    title: string;
    lastMessage: Message;
};
