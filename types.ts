
export interface TriviaQuestion {
  id: number;
  nivel: Difficulty;
  categoría: string;
  subcategoría: string;
  pregunta: string;
  opciones: string[];
  respuesta_correcta: string;
  explicación: string;
  tipo: string;
  puntuacion: number;
}

export enum GameState {
  Start,
  ChoosingDifficulty,
  Answering,
  Answered,
  GameOver,
}

export type Difficulty = 'Fácil' | 'Medio' | 'Difícil' | 'Experto';

export interface Feedback {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
}
