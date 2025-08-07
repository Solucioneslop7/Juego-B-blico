import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GameState, TriviaQuestion, Difficulty, Feedback } from './types';
import { loadAndCleanQuestions } from './services/gameService';
import { DIFFICULTIES } from './constants';
import StartScreen from './components/StartScreen';
import DifficultySelector from './components/DifficultySelector';
import QuestionCard from './components/QuestionCard';
import ResultScreen from './components/ResultScreen';

const QUESTIONS_PER_DIFFICULTY = 10;

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.Start);
  const [allQuestions, setAllQuestions] = useState<TriviaQuestion[]>([]);
  // New state for the current game's questions
  const [sessionQuestions, setSessionQuestions] = useState<TriviaQuestion[]>([]);
  const [usedQuestionIds, setUsedQuestionIds] = useState<Set<number>>(new Set());
  const [currentQuestion, setCurrentQuestion] = useState<TriviaQuestion | null>(null);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const questions = await loadAndCleanQuestions();
        setAllQuestions(questions);
      } catch (error) {
        console.error("Failed to load questions:", error);
      }
    };
    fetchQuestions();
  }, []);

  // Helper to select a random subset of questions for a new game session
  const selectSessionQuestions = useCallback(() => {
    if (allQuestions.length === 0) return [];
    
    const newSessionQuestions: TriviaQuestion[] = [];
    DIFFICULTIES.forEach(difficulty => {
        const questionsOfDifficulty = allQuestions.filter(q => q.nivel === difficulty);
        // Shuffle the array to get random questions
        const shuffled = [...questionsOfDifficulty].sort(() => 0.5 - Math.random());
        // Get the first 10 questions
        const selected = shuffled.slice(0, QUESTIONS_PER_DIFFICULTY);
        newSessionQuestions.push(...selected);
    });
    return newSessionQuestions;
  }, [allQuestions]);

  // Starts a new game, resetting state and selecting new questions.
  const handleStartGame = useCallback(() => {
    setScore(0);
    setUsedQuestionIds(new Set());
    setCurrentQuestion(null);
    setSelectedAnswer(null);
    setFeedback(null);
    setSessionQuestions(selectSessionQuestions());
    setGameState(GameState.ChoosingDifficulty);
  }, [selectSessionQuestions]);

  // Memoized calculation for available questions, now based on sessionQuestions
  const availableQuestionsByDifficulty = useMemo(() => {
    const available = new Map<Difficulty, TriviaQuestion[]>();
    DIFFICULTIES.forEach(diff => {
      const filtered = sessionQuestions.filter(q => q.nivel === diff && !usedQuestionIds.has(q.id));
      available.set(diff, filtered);
    });
    return available;
  }, [sessionQuestions, usedQuestionIds]);

  const availableCounts = useMemo(() => {
    const counts = {} as Record<Difficulty, number>;
    availableQuestionsByDifficulty.forEach((questions, diff) => {
        counts[diff] = questions.length;
    });
    return counts;
  }, [availableQuestionsByDifficulty]);

  // Game is finished when all questions in the current session are used
  const isGameFinished = useMemo(() => {
    if (sessionQuestions.length === 0) return false;
    return usedQuestionIds.size >= sessionQuestions.length;
  }, [usedQuestionIds.size, sessionQuestions.length]);

  const handleSelectDifficulty = (difficulty: Difficulty) => {
    const availableQuestions = availableQuestionsByDifficulty.get(difficulty);
    if (availableQuestions && availableQuestions.length > 0) {
      const questionIndex = Math.floor(Math.random() * availableQuestions.length);
      const question = availableQuestions[questionIndex];
      
      setCurrentQuestion(question);
      setUsedQuestionIds(prev => new Set(prev).add(question.id));
      setGameState(GameState.Answering);
      setSelectedAnswer(null);
      setFeedback(null);
    }
  };

  const handleAnswer = (answer: string) => {
    if (!currentQuestion) return;

    setSelectedAnswer(answer);
    const isCorrect = answer === currentQuestion.respuesta_correcta;
    
    if (isCorrect) {
      setScore(prevScore => prevScore + currentQuestion.puntuacion);
    }
    
    setFeedback({
      isCorrect,
      correctAnswer: currentQuestion.respuesta_correcta,
      explanation: currentQuestion.explicación,
    });
    
    setGameState(GameState.Answered);
  };
  
  const handleContinue = () => {
    if(isGameFinished) {
      setGameState(GameState.GameOver);
      return;
    }
    setGameState(GameState.ChoosingDifficulty);
  };
  
  const handleEndGame = () => {
    setGameState(GameState.GameOver);
  };
  
  const renderContent = () => {
    switch (gameState) {
      case GameState.Start:
        return <StartScreen onStart={handleStartGame} />;
      case GameState.ChoosingDifficulty:
        return <DifficultySelector onSelect={handleSelectDifficulty} availableCounts={availableCounts} onEndGame={handleEndGame} />;
      case GameState.Answering:
      case GameState.Answered:
        return (
          <div className="flex flex-col gap-6">
            {currentQuestion && (
              <QuestionCard 
                question={currentQuestion}
                onAnswer={handleAnswer}
                selectedAnswer={selectedAnswer}
                feedback={feedback}
              />
            )}
            {gameState === GameState.Answered && (
                <ResultScreen 
                  feedback={feedback}
                  score={score}
                  onContinue={handleContinue}
                  onEndGame={handleEndGame}
                  isGameOver={false}
                  onPlayAgain={handleStartGame}
                />
            )}
          </div>
        );
      case GameState.GameOver:
        return <ResultScreen 
                feedback={null}
                score={score}
                onContinue={handleContinue}
                onEndGame={handleEndGame}
                isGameOver={true}
                onPlayAgain={handleStartGame}
              />;
      default:
        return <StartScreen onStart={handleStartGame} />;
    }
  };


  return (
    <div className="bg-slate-900 text-white min-h-screen font-sans bg-grid-slate-800/[0.2] relative">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-transparent to-slate-900/30 pointer-events-none"></div>
      <main className="container mx-auto px-4 py-8 sm:py-16 relative z-10 flex flex-col items-center justify-center min-h-screen">
        <div className="w-full max-w-4xl">
            {gameState !== GameState.Start && (
                <div className="absolute top-4 right-4 bg-amber-300/80 text-slate-900 font-bold font-cinzel text-xl px-4 py-2 rounded-lg shadow-lg border border-amber-400">
                  Puntaje: {score}
                </div>
            )}
            {renderContent()}
        </div>
      </main>
      <footer className="text-center py-4 text-slate-500 text-sm relative z-10">
        <p>Hecho con ❤️ para estudiantes de la Biblia. Usando React & Tailwind CSS.</p>
        <p className="font-cinzel">&copy; 2024 Trividencial Bíblica</p>
      </footer>
    </div>
  );
};

export default App;