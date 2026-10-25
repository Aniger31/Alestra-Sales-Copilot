'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

/**
 * MeetingContext — estado global de la reunión activa.
 * Persiste en localStorage para sobrevivir recargas.
 * No requiere dependencias externas (sin Zustand, sin Redux).
 */

const STORAGE_KEY = 'alestra_meeting_active';
// Historial: cada reunión conserva su propio registro (antes, crear una nueva borraba la anterior)
const HISTORY_KEY = 'alestra_meetings_history';
const MAX_HISTORY = 20;

const defaultMeeting = {
  // Datos de la reunión
  id: null,
  clientName: '',
  company: '',
  industry: '',
  city: '',
  employees: '',
  meetingDate: '',
  meetingType: '',
  notes: '',

  // Transcripción
  transcription: '',
  transcriptionSource: null, // 'audio' | 'manual' | 'demo'

  // Análisis de Gemini
  analysis: null,
  analysisSource: null, // 'gemini' | 'demo'

  // Productos recomendados (del catálogo, no inventados)
  recommendedProducts: [],
  recommendedPackages: [],
  escalationRequired: false,
  escalationReasons: [],
  opportunityType: null, // 'estándar' | 'configurable' | 'a la medida' | 'insuficiente'

  // Minuta
  minutes: null,
  minutesSource: null, // 'gemini' | 'demo'

  // Estado de la sesión
  step: 'meeting', // 'meeting' | 'copilot' | 'diagnosis' | 'minutes' | 'proposal'
  createdAt: null,
  updatedAt: null,
};

const MeetingContext = createContext(null);

export function MeetingProvider({ children }) {
  const [meeting, setMeetingState] = useState(defaultMeeting);
  const [history, setHistory] = useState([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const meetingRef = useRef(meeting);
  meetingRef.current = meeting;
  const historyRef = useRef(history);
  historyRef.current = history;

  // Hidratar desde localStorage después del primer render (solo cliente)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setMeetingState(parsed);
      }
      const hist = localStorage.getItem(HISTORY_KEY);
      if (hist) setHistory(JSON.parse(hist));
    } catch {
      // localStorage no disponible o JSON inválido — usar defaults
    }
    setIsHydrated(true);
  }, []);

  // Persistir en localStorage cuando cambia el estado
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(meeting));
    } catch {
      // localStorage lleno o no disponible — continuar sin persistencia
    }
  }, [meeting, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      // ignore
    }
  }, [history, isHydrated]);

  /** Guarda la reunión activa en el historial (si tiene id) antes de cambiar a otra. */
  const archivarActiva = useCallback(() => {
    const actual = meetingRef.current;
    if (!actual?.id) return;
    setHistory((h) => [actual, ...h.filter((m) => m.id !== actual.id)].slice(0, MAX_HISTORY));
  }, []);

  const setMeeting = useCallback((updates) => {
    setMeetingState((prev) => ({
      ...prev,
      ...updates,
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const startNewMeeting = useCallback((meetingData = {}) => {
    archivarActiva();
    const newMeeting = {
      ...defaultMeeting,
      ...meetingData,
      id: `mtg_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      step: 'meeting',
    };
    setMeetingState(newMeeting);
    return newMeeting.id;
  }, [archivarActiva]);

  /** Reabre una reunión del historial; la activa pasa al historial. */
  const switchMeeting = useCallback((id) => {
    const destino = historyRef.current.find((m) => m.id === id);
    if (!destino) return;
    const actual = meetingRef.current;
    const resto = historyRef.current.filter((m) => m.id !== id);
    setHistory(actual?.id ? [actual, ...resto].slice(0, MAX_HISTORY) : resto);
    setMeetingState(destino);
  }, []);

  const deleteFromHistory = useCallback((id) => {
    setHistory((h) => h.filter((m) => m.id !== id));
  }, []);

  const resetMeeting = useCallback(() => {
    archivarActiva();
    setMeetingState(defaultMeeting);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, [archivarActiva]);

  const value = {
    meeting,
    setMeeting,
    startNewMeeting,
    resetMeeting,
    isHydrated,
    meetingHistory: history,
    switchMeeting,
    deleteFromHistory,
  };

  return (
    <MeetingContext.Provider value={value}>
      {children}
    </MeetingContext.Provider>
  );
}

export function useMeeting() {
  const ctx = useContext(MeetingContext);
  if (!ctx) {
    throw new Error('useMeeting debe usarse dentro de <MeetingProvider>');
  }
  return ctx;
}
