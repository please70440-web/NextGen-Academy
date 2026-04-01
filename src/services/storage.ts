import localforage from 'localforage';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface Session {
  id: string;
  topic: string;
  grade: number;
  timestamp: number;
  chat: ChatMessage[];
  viz: {
    type: 'mermaid' | 'svg';
    code: string;
  };
}

export interface NextGenDB {
  userId: string;
  history: Session[];
  savedNotes: { topic: string; jsonData: any }[];
}

const db = localforage.createInstance({
  name: 'NextGenDB'
});

export const initDB = async (userId: string) => {
  const existing = await db.getItem<NextGenDB>(userId);
  if (!existing) {
    await db.setItem(userId, {
      userId,
      history: [],
      savedNotes: []
    });
  }
};

export const saveSessionToLocal = async (userId: string, session: Session) => {
  const data = await db.getItem<NextGenDB>(userId);
  if (data) {
    data.history.push(session);
    await db.setItem(userId, data);
  }
};

export const getHistory = async (userId: string): Promise<Session[]> => {
  const data = await db.getItem<NextGenDB>(userId);
  return data?.history || [];
};

export const exportToDrive = async (accessToken: string, userId: string) => {
  const data = await db.getItem<NextGenDB>(userId);
  if (!data) return;

  const fileContent = JSON.stringify(data, null, 2);
  const metadata = {
    name: 'NextGen_History.json',
    mimeType: 'application/json',
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([fileContent], { type: 'application/json' }));

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });

  if (!response.ok) {
    throw new Error('Failed to export to Google Drive');
  }

  return await response.json();
};
