import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../contexts/UserContext";
import {
  getContestLeaderboard,
  getContestQuestions,
  submitContestAnswers,
} from "../../utils/contestApi";
import Confetti from "../../components/Confetti";
import SuccessAnimation from "../../components/SuccessAnimation";
import { ArrowLeft, Clock3, RefreshCcw, Send, Sparkles, Trophy, Flame, Zap, Target, Star, Medal } from "lucide-react";

const QUESTION_COUNT = 5;

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const remainingSeconds = total % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export default function ContestArena() {
  const { user, loading: userLoading } = useUser();
  const navigate = useNavigate();
  const [contest, setContest] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isContestStarted, setIsContestStarted] = useState(false);
  const timerRef = useRef(null);

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = () => {
    clearTimer();
    const startedAt = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
  };

  // Load only leaderboard on initial mount
  const loadLeaderboard = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const leaderboardData = await getContestLeaderboard();
      setLeaderboard(leaderboardData);
      setContest(null);
      setAnswers({});
      setResult(null);
      setElapsedSeconds(0);
      setIsContestStarted(false);
      clearTimer();
    } catch (err) {
      setError(err.message || "Failed to load leaderboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load questions and start contest
  const startContest = async () => {
    setLoading(true);
    setError("");
    try {
      const questionsData = await getContestQuestions(QUESTION_COUNT);
      setContest(questionsData);
      setAnswers({});
      setResult(null);
      setElapsedSeconds(0);
      setIsContestStarted(true);
      startTimer();
    } catch (err) {
      setError(err.message || "Failed to load contest questions");
      setIsContestStarted(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    loadLeaderboard();

    return () => clearTimer();
  }, [user, userLoading]);

  useEffect(() => () => clearTimer(), []);

  const handleSubmit = async () => {
    if (!contest) return;

    setSubmitting(true);
    setError("");

    try {
      const submission = await submitContestAnswers({
        contest_id: contest.contest_id,
        answers,
        time_taken: elapsedSeconds,
      });

      setResult(submission);
      setLeaderboard({
        class_level: submission.class_level,
        total_students: submission.leaderboard?.length || 0,
        student_username: submission.username,
        student_rank: submission.rank,
        top_score: submission.leaderboard?.[0]?.best_score || submission.score || 0,
        entries: submission.leaderboard || [],
      });
      clearTimer();
      setIsContestStarted(false);

      if (submission.passed) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2200);
      }
    } catch (err) {
      setError(err.message || "Failed to submit contest");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = async () => {
    setRefreshing(true);
    await startContest();
    setRefreshing(false);
  };

  const handleLeaderboardRefresh = async () => {
    setRefreshing(true);
    try {
      const leaderboardData = await getContestLeaderboard();
      setLeaderboard(leaderboardData);
    } catch (err) {
      setError(err.message || "Failed to refresh leaderboard");
    } finally {
      setRefreshing(false);
    }
  };

  const handleSelect = (questionId, option) => {
    setAnswers((prev) => ({
      ...prev,
      [String(questionId)]: option,
    }));
  };

  if (userLoading || loading) {
    return (
      <div className="h-full flex items-center justify-center text-masterly-navy p-6">
        <div className="text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full border-4 border-masterly-orange border-t-transparent animate-spin" />
          <p className="font-medium">Loading test portal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-masterly-cardSoft rounded-[28px] border border-masterly-border shadow-sm p-6 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#FEE6DA] flex items-center justify-center text-masterly-orange">
            <Trophy size={30} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-masterly-navy">Test Portal</h1>
            <p className="text-sm text-masterly-muted mt-2">
              Sign in to get your class quiz, submit answers, and see the leaderboard.
            </p>
          </div>
          <button
            onClick={() => navigate("/profile")}
            className="w-full py-3 rounded-full font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg hover:scale-[1.01] active:scale-95 transition-all"
          >
            Go to Profile
          </button>
        </div>
      </div>
    );
  }

  const questions = contest?.questions || [];
  const score = result?.score ?? 0;
  const rankValue = typeof leaderboard?.student_rank === "number" ? leaderboard.student_rank : null;
  const rankLabel = rankValue ? `#${rankValue}` : "Unranked";
  const totalStudents = leaderboard?.total_students ?? 0;
  const topScore = leaderboard?.top_score ?? 0;

  return (
    <div className="relative h-full px-3 pb-4 pt-2 text-masterly-navy overflow-y-auto smooth-scroll">
      {showSuccess && <SuccessAnimation onComplete={() => setShowSuccess(false)} />}
      {result?.passed && <Confetti />}

      <div className="space-y-4 animate-page-fade-in">
        <div className="relative overflow-hidden rounded-[28px] border border-[#F6C79B] p-4 shadow-sm bg-[radial-gradient(circle_at_10%_10%,#fff5e8_0%,#ffe8d0_35%,#ffd7b2_100%)]">
          <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/35 blur-md" />
          <div className="pointer-events-none absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-orange-300/30 blur-md" />

          <div className="flex items-start justify-between gap-3">
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#8C4A1D] hover:text-masterly-navy transition-colors"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-masterly-orange border border-[#F8D0B2] shadow-sm">
              <Sparkles size={14} />
              Class {contest?.class_level?.replace("class_", "") || user.class_level || user.level}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-[#A04B00]">
            <div className="w-9 h-9 rounded-full bg-white/80 border border-[#F8D0B2] flex items-center justify-center">
              <Trophy size={18} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-[#7F3100]">Test Portal</h1>
              <p className="text-xs font-medium text-[#A65A24]">Class test with live leaderboard updates</p>
            </div>
          </div>

          {isContestStarted && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/90 border border-[#F7D7BB] p-3 shadow-sm">
                <p className="text-xs text-masterly-muted">Questions</p>
                <p className="text-2xl font-bold text-masterly-navy">{contest?.questions?.length || 0}</p>
              </div>
              <div className="rounded-2xl bg-white/90 border border-[#F7D7BB] p-3 shadow-sm">
                <p className="text-xs text-masterly-muted">Answered</p>
                <p className="text-2xl font-bold text-masterly-navy">{answeredCount}/{contest?.questions?.length || 0}</p>
              </div>
              <div className="rounded-2xl bg-white/90 border border-[#F7D7BB] p-3 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FFE8D8] flex items-center justify-center text-masterly-orange">
                  <Clock3 size={18} />
                </div>
                <div>
                  <p className="text-xs text-masterly-muted">Elapsed</p>
                  <p className="text-lg font-bold text-masterly-navy">{formatTime(elapsedSeconds)}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#F8D0B2] bg-white/70 px-3 py-1 text-xs text-[#9C4B1B]">
            <Flame size={14} />
            Keep momentum: answer quickly for better focus and confidence.
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!isContestStarted && !result ? (
          <div className="space-y-4">
            <div className="rounded-[28px] border border-masterly-border bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#FFE8D8] flex items-center justify-center text-masterly-orange">
                  <Medal size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-masterly-navy">My Rank</h3>
                  <p className="text-xs text-masterly-muted">Latest class ranking snapshot</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-masterly-border bg-[#FFF8F2] p-3">
                  <p className="text-xs text-masterly-muted">Current Rank</p>
                  <p className="text-2xl font-bold text-masterly-navy">{rankLabel}</p>
                </div>
                <div className="rounded-2xl border border-masterly-border bg-[#FFF8F2] p-3">
                  <p className="text-xs text-masterly-muted">Class Size</p>
                  <p className="text-2xl font-bold text-masterly-navy">{totalStudents}</p>
                </div>
                <div className="rounded-2xl border border-masterly-border bg-[#FFF8F2] p-3">
                  <p className="text-xs text-masterly-muted">Top Score</p>
                  <p className="text-2xl font-bold text-masterly-navy">{topScore}%</p>
                </div>
              </div>
            </div>

            {/* LEADERBOARD SECTION - NOW AT TOP */}
            <div className="rounded-[28px] border border-masterly-border overflow-hidden shadow-sm">
              <div className="bg-gradient-to-r from-masterly-orange/10 to-orange-300/10 border-b border-masterly-border px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-masterly-orange flex items-center justify-center">
                      <Trophy size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-masterly-navy">Leaderboard</h3>
                      <p className="text-xs text-masterly-muted">Top performers in your class</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLeaderboardRefresh}
                    disabled={refreshing}
                    className="inline-flex items-center gap-2 rounded-full border border-masterly-border bg-white px-3 py-2 text-xs font-semibold text-masterly-navy hover:bg-[#FFF8F2] disabled:opacity-60 transition-colors"
                  >
                    <RefreshCcw size={14} className={refreshing ? "animate-spin" : ""} />
                    Refresh
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-3 bg-white max-h-[450px] overflow-y-auto">
                {(leaderboard?.entries || []).length > 0 ? (
                  <>
                    {/* TOP 3 HIGHLIGHTED */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                      {leaderboard.entries.slice(0, 3).map((entry) => {
                        const medals = {
                          1: { bg: "from-yellow-200 to-yellow-100", icon: "🥇", label: "1st" },
                          2: { bg: "from-gray-200 to-gray-100", icon: "🥈", label: "2nd" },
                          3: { bg: "from-orange-100 to-orange-50", icon: "🥉", label: "3rd" },
                        };
                        const medal = medals[entry.rank];
                        const isCurrent = entry.username === user.username;

                        return (
                          <div
                            key={entry.rank}
                            className={`rounded-2xl border-2 bg-gradient-to-b p-4 text-center ${medal.bg} border-orange-300/30 shadow-sm relative overflow-hidden`}
                          >
                            <div className="absolute -top-2 -right-2 text-3xl opacity-50">{medal.icon}</div>
                            <div className="relative z-10">
                              <p className="text-xs font-bold text-masterly-orange uppercase tracking-wider mb-1">
                                {medal.label}
                              </p>
                              <p className={`text-sm font-bold truncate ${isCurrent ? "text-masterly-orange" : "text-masterly-navy"}`}>
                                {entry.name || entry.username}
                                {isCurrent ? " ✨" : ""}
                              </p>
                              <div className="mt-2 flex items-center justify-center gap-1">
                                <span className="text-lg font-black text-masterly-navy">{entry.best_score}%</span>
                              </div>
                              <p className="text-xs text-masterly-muted mt-1">
                                {entry.best_correct_count}/{QUESTION_COUNT} correct
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* REMAINING LEADERBOARD */}
                    {leaderboard.entries.length > 3 && (
                      <div className="border-t border-masterly-border pt-3 space-y-2">
                        {leaderboard.entries.slice(3).map((entry) => {
                          const isCurrent = entry.username === user.username;
                          return (
                            <div
                              key={entry.username}
                              className={`rounded-xl border px-3 py-2 flex items-center justify-between text-sm ${
                                isCurrent ? "border-masterly-orange bg-[#FFF2E8]" : "border-masterly-border bg-white"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-bold text-masterly-orange text-xs">{entry.rank}</span>
                                <p className="font-semibold text-masterly-navy truncate">
                                  {entry.name || entry.username}
                                  {isCurrent ? " 👤" : ""}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="font-bold text-masterly-navy text-sm">{entry.best_score}%</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="rounded-2xl border border-dashed border-masterly-border bg-white p-8 text-center">
                    <Trophy size={32} className="mx-auto text-masterly-orange/30 mb-2" />
                    <p className="text-sm font-medium text-masterly-muted">
                      No leaderboard entries yet. Be the first to compete!
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* CHALLENGE PREVIEW SECTION */}
            <div className="bg-gradient-to-br from-[#FFF5E8] via-[#FFF0E0] to-[#FFE8D0] rounded-[28px] border-2 border-[#F8D0B2] p-6 shadow-sm overflow-hidden relative">
              <div className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-white/25 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-orange-300/20 blur-2xl" />

              <div className="relative z-10">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-2xl font-extrabold text-[#7F3100] leading-tight">
                      Ready to Challenge?
                    </h2>
                    <p className="text-sm text-[#A65A24] font-medium mt-2">
                      Test your knowledge in {QUESTION_COUNT} quick questions
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-full bg-white/80 border-2 border-[#F8D0B2] flex items-center justify-center flex-shrink-0">
                    <Zap size={28} className="text-[#FF7F2A]" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="rounded-xl bg-white/70 border border-[#F8D0B2] p-3 text-center">
                    <Target size={20} className="mx-auto text-masterly-orange mb-1" />
                    <p className="text-xs font-bold text-masterly-navy">{QUESTION_COUNT}</p>
                    <p className="text-xs text-masterly-muted">Questions</p>
                  </div>
                  <div className="rounded-xl bg-white/70 border border-[#F8D0B2] p-3 text-center">
                    <Clock3 size={20} className="mx-auto text-masterly-orange mb-1" />
                    <p className="text-xs font-bold text-masterly-navy">⏱️</p>
                    <p className="text-xs text-masterly-muted">Timed</p>
                  </div>
                  <div className="rounded-xl bg-white/70 border border-[#F8D0B2] p-3 text-center">
                    <Star size={20} className="mx-auto text-masterly-orange mb-1" />
                    <p className="text-xs font-bold text-masterly-navy">Rank</p>
                    <p className="text-xs text-masterly-muted">Update</p>
                  </div>
                </div>

                <div className="flex gap-2 mb-4 p-3 rounded-xl bg-white/50 border border-[#F8D0B2]">
                  <Sparkles size={16} className="text-[#FF7F2A] flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-[#8C4A1D] font-medium">
                    Your ranking updates instantly after you submit your answers.
                  </p>
                </div>

                <button
                  onClick={startContest}
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff7f2a] to-[#ef5f00] px-6 py-4 text-base font-bold text-white shadow-lg shadow-orange-300/40 disabled:opacity-60 hover:shadow-orange-400/50 active:scale-[0.98] transition-all duration-200"
                >
                  <Sparkles size={20} />
                  {loading ? "Starting..." : "Start Test"}
                </button>
              </div>
            </div>
          </div>
        ) : !result ? (
          <div className="space-y-3">
            {(contest?.questions || []).map((question, index) => {
              const selected = answers[String(question.id)];

              return (
                <div key={question.id} className="bg-masterly-cardSoft rounded-[24px] border border-masterly-border p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-masterly-muted">Question {index + 1}</p>
                      <h2 className="mt-1 text-base sm:text-lg font-semibold text-masterly-navy leading-snug">
                        {question.question}
                      </h2>
                    </div>
                    <span className="rounded-full bg-[#FEF4EC] px-3 py-1 text-xs font-semibold text-masterly-orange border border-[#F8D0B2]">
                      {question.subject || "General"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {question.options.map((option) => {
                      const active = selected === option;

                      return (
                        <button
                          key={option}
                          onClick={() => handleSelect(question.id, option)}
                          className={`text-left rounded-2xl border px-4 py-3 transition-all duration-200 ${
                            active
                              ? "border-masterly-orange bg-[#FFF2E8] shadow-sm"
                              : "border-masterly-border bg-white hover:bg-[#FFF8F2]"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${active ? "bg-masterly-orange text-white" : "bg-[#FEE6DA] text-masterly-orange"}`}>
                              {String.fromCharCode(65 + question.options.indexOf(option))}
                            </div>
                            <span className="text-sm sm:text-[15px] font-medium text-masterly-navy">{option}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-masterly-cardSoft rounded-[28px] border border-masterly-border p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-masterly-muted">Your Result</p>
                  <h2 className="text-3xl font-bold text-masterly-navy mt-1">
                    {score}%
                  </h2>
                  <p className="text-sm text-masterly-muted mt-1">
                    {result.correct_count}/{result.total_questions} correct • Rank #{result.rank}
                  </p>
                </div>
                <div className={`rounded-2xl px-4 py-3 border ${result.passed ? "bg-[#ECFDF3] border-[#B7EFC4]" : "bg-[#FFF4F4] border-[#F6C7C7]"}`}>
                  <p className={`text-sm font-semibold ${result.passed ? "text-green-700" : "text-red-600"}`}>
                    {result.passed ? "Passed" : "Try again"}
                  </p>
                  <p className="text-xs text-masterly-muted mt-1">Score is based on correct answers only.</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {result.question_results.map((question) => (
                <div key={question.id} className="bg-white rounded-[22px] border border-masterly-border p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-masterly-muted">Question {question.id}</p>
                      <h3 className="mt-1 font-semibold text-masterly-navy">{question.question}</h3>
                    </div>
                    <span className={`text-xs font-semibold rounded-full px-3 py-1 ${question.is_correct ? "bg-[#ECFDF3] text-green-700" : "bg-[#FFF4F4] text-red-600"}`}>
                      {question.is_correct ? "Correct" : "Wrong"}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 text-sm">
                    <div className="rounded-xl bg-[#FDF8F4] px-3 py-2 border border-masterly-border">
                      <span className="text-masterly-muted">Your answer: </span>
                      <span className="font-medium text-masterly-navy">{question.selected_answer || "Not answered"}</span>
                    </div>
                    <div className="rounded-xl bg-[#FDF8F4] px-3 py-2 border border-masterly-border">
                      <span className="text-masterly-muted">Correct answer: </span>
                      <span className="font-medium text-masterly-navy">{question.correct_answer}</span>
                    </div>
                    {question.explanation && (
                      <div className="rounded-xl bg-[#FFF9F1] px-3 py-2 border border-[#F6E1C7] text-masterly-muted">
                        {question.explanation}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(isContestStarted || result) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="bg-masterly-cardSoft rounded-[28px] border border-masterly-border p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-masterly-navy">Leaderboard</h3>
                <p className="text-xs text-masterly-muted">Class-wide rankings for your current class</p>
              </div>
              <button
                onClick={handleLeaderboardRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-full border border-masterly-border bg-white px-3 py-2 text-xs font-semibold text-masterly-navy hover:bg-[#FFF8F2] disabled:opacity-60 transition-colors"
              >
                <RefreshCcw size={14} className={refreshing ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>

            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {(leaderboard?.entries || []).length > 0 ? (
                leaderboard.entries.map((entry) => {
                  const isCurrent = entry.username === user.username;

                  return (
                    <div
                      key={entry.username}
                      className={`rounded-2xl border px-4 py-3 flex items-center justify-between gap-3 ${
                        isCurrent ? "border-masterly-orange bg-[#FFF2E8]" : "border-masterly-border bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold ${entry.rank === 1 ? "bg-[#FDE68A] text-[#7C4A00]" : entry.rank === 2 ? "bg-[#E5E7EB] text-[#4B5563]" : entry.rank === 3 ? "bg-[#F7C59F] text-[#7C3A00]" : "bg-[#FEE6DA] text-masterly-orange"}`}>
                          {entry.rank}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-masterly-navy truncate">
                            {entry.name || entry.username}
                            {isCurrent ? " (You)" : ""}
                          </p>
                          <p className="text-xs text-masterly-muted truncate">{entry.class_level}</p>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-masterly-navy">{entry.best_score}%</p>
                        <p className="text-xs text-masterly-muted">{entry.best_correct_count}/{QUESTION_COUNT} correct</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-masterly-border bg-white p-5 text-center text-sm text-masterly-muted">
                  No leaderboard entries yet. Be the first student to submit a contest.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-masterly-cardSoft rounded-[28px] border border-masterly-border p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-masterly-navy mb-3">Test Tips</h3>
              <div className="space-y-3 text-sm text-masterly-muted">
                <div className="rounded-2xl bg-white border border-masterly-border px-4 py-3">
                  Answer every question before submitting for the best score.
                </div>
                <div className="rounded-2xl bg-white border border-masterly-border px-4 py-3">
                  Your leaderboard rank updates after each submission in the same class.
                </div>
                <div className="rounded-2xl bg-white border border-masterly-border px-4 py-3">
                  Use the retry button to load a fresh contest set.
                </div>
              </div>
            </div>

            <div className="bg-masterly-cardSoft rounded-[28px] border border-masterly-border p-4 shadow-sm flex gap-3 flex-wrap">
              {!result ? (
                <>
                  <button
                    onClick={handleRetry}
                    disabled={refreshing || submitting}
                    className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 rounded-full border border-masterly-border bg-white px-4 py-3 text-sm font-semibold text-masterly-navy hover:bg-[#FFF8F2] disabled:opacity-60 transition-colors"
                  >
                    <RefreshCcw size={16} className={refreshing ? "animate-spin" : ""} />
                    New Test
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || answeredCount === 0}
                    className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff7f2a] to-[#ef5f00] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-300/40 disabled:opacity-60 active:scale-[0.99] transition-all"
                  >
                    <Send size={16} />
                    {submitting ? "Submitting..." : "Submit Answers"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate(`/contest/result/${result.attempt_id}`)}
                    className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 rounded-full border border-masterly-border bg-white px-4 py-3 text-sm font-semibold text-masterly-navy hover:bg-[#FFF8F2] transition-colors"
                  >
                    View Attempt Details
                  </button>
                  <button
                    onClick={handleRetry}
                    disabled={refreshing}
                    className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-60 transition-all"
                  >
                    <RefreshCcw size={16} className={refreshing ? "animate-spin" : ""} />
                    Try a New Test
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
