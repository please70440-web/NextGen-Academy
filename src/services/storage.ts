import localforage from 'localforage';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface Session {
  id: string;
  topic: string;
  grade: string;
  timestamp: number;
  history: ChatMessage[];
  vizCode?: string;
  vizType?: 'mermaid' | 'svg';
}

const sessionsStore = localforage.createInstance({
  name: 'nextgen-academy',
  storeName: 'sessions'
});

export const saveSession = async (session: Session) => {
  await sessionsStore.setItem(session.id, session);
};

export const getSessions = async (): Promise<Session[]> => {
  const sessions: Session[] = [];
  await sessionsStore.iterate((value: Session) => {
    sessions.push(value);
  });
  return sessions.sort((a, b) => b.timestamp - a.timestamp);
};

export const deleteSession = async (id: string) => {
  await sessionsStore.removeItem(id);
};
