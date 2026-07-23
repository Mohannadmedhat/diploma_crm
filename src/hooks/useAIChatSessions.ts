import { useState, useEffect, useCallback } from 'react';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  messages: ChatMessage[];
}

export function createWelcomeMessage(): ChatMessage {
  return {
    role: 'assistant',
    content: 'مرحباً بك! أنا مساعدك الذكي المرتبط بنظام الدبلومات. يمكنني مساعدتك في صياغة الرسائل، كتابة الإعلانات، تلخيص المهام، أو تحليل بيانات المنصة. كيف يمكنني مساعدتك اليوم؟',
    timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
  };
}

export function useAIChatSessions(currentUser: string | null) {
  const [sessionsList, setSessionsList] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false);

  const getSessionsStorageKey = useCallback(() => {
    return currentUser ? `crm_ai_chat_sessions_${currentUser}` : 'crm_ai_chat_sessions';
  }, [currentUser]);

  const startNewSession = useCallback(() => {
    const newId = 'session_' + Date.now();
    const newSession: ChatSession = {
      id: newId,
      title: 'محادثة جديدة',
      createdAt: new Date().toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      messages: [createWelcomeMessage()]
    };
    setCurrentSessionId(newId);
    setMessages(newSession.messages);
    setShowHistoryDrawer(false);
  }, []);

  // Load sessions from localstorage on mount/user change & start clean new chat
  useEffect(() => {
    const storageKey = getSessionsStorageKey();
    const saved = localStorage.getItem(storageKey);
    let loadedSessions: ChatSession[] = [];

    if (saved) {
      try {
        loadedSessions = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse chat sessions', e);
      }
    } else {
      // Migrate old single history format if present
      const oldKey = currentUser ? `crm_ai_chat_history_${currentUser}` : 'crm_ai_chat_history';
      const oldSaved = localStorage.getItem(oldKey);
      if (oldSaved) {
        try {
          const oldMsgs: ChatMessage[] = JSON.parse(oldSaved);
          if (oldMsgs.length > 1) {
            const firstUser = oldMsgs.find(m => m.role === 'user');
            const title = firstUser ? (firstUser.content.slice(0, 30) + '...') : 'المحادثة السابقة';
            loadedSessions = [{
              id: 'session_migrated_' + Date.now(),
              title,
              createdAt: 'سابقاً',
              messages: oldMsgs
            }];
            localStorage.setItem(storageKey, JSON.stringify(loadedSessions));
          }
        } catch (e) {}
      }
    }

    setSessionsList(loadedSessions);
    startNewSession();
  }, [currentUser, getSessionsStorageKey, startNewSession]);

  // Save active conversation to sessions list and localStorage
  const saveChatHistory = useCallback((msgs: ChatMessage[]) => {
    if (!currentSessionId) return;

    const firstUserMsg = msgs.find(m => m.role === 'user');
    if (!firstUserMsg) return;

    const autoTitle = firstUserMsg.content.trim().slice(0, 35) + (firstUserMsg.content.length > 35 ? '...' : '');

    setSessionsList(prevSessions => {
      const existingIdx = prevSessions.findIndex(s => s.id === currentSessionId);
      const updatedSession: ChatSession = {
        id: currentSessionId,
        title: existingIdx >= 0 && prevSessions[existingIdx].title !== 'محادثة جديدة' ? prevSessions[existingIdx].title : autoTitle,
        createdAt: existingIdx >= 0 ? prevSessions[existingIdx].createdAt : new Date().toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
        messages: msgs
      };

      let newSessions: ChatSession[];
      if (existingIdx >= 0) {
        newSessions = [...prevSessions];
        newSessions[existingIdx] = updatedSession;
      } else {
        newSessions = [updatedSession, ...prevSessions];
      }

      localStorage.setItem(getSessionsStorageKey(), JSON.stringify(newSessions));
      return newSessions;
    });
  }, [currentSessionId, getSessionsStorageKey]);

  const selectSession = useCallback((session: ChatSession) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    setShowHistoryDrawer(false);
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    setSessionsList(prev => {
      const updated = prev.filter(s => s.id !== sessionId);
      localStorage.setItem(getSessionsStorageKey(), JSON.stringify(updated));
      return updated;
    });
    if (currentSessionId === sessionId) {
      startNewSession();
    }
  }, [currentSessionId, getSessionsStorageKey, startNewSession]);

  const clearAllSessions = useCallback(() => {
    if (window.confirm('هل تريد مسح جميع المحادثات المخزنة في السجل؟')) {
      setSessionsList([]);
      localStorage.removeItem(getSessionsStorageKey());
      startNewSession();
    }
  }, [getSessionsStorageKey, startNewSession]);

  const clearCurrentChat = useCallback(() => {
    if (window.confirm('هل تريد مسح المحادثة الحالية؟')) {
      if (currentSessionId) {
        deleteSession(currentSessionId);
      } else {
        startNewSession();
      }
    }
  }, [currentSessionId, deleteSession, startNewSession]);

  return {
    sessionsList,
    currentSessionId,
    messages,
    setMessages,
    showHistoryDrawer,
    setShowHistoryDrawer,
    startNewSession,
    saveChatHistory,
    selectSession,
    deleteSession,
    clearAllSessions,
    clearCurrentChat
  };
}
