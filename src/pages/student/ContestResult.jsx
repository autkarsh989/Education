import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, RefreshCcw, Trophy } from "lucide-react";
import { getContestResult } from "../../utils/contestApi";

function formatClassLevel(value) {
  if (!value) return "-";
  return String(value).replace("class_", "Class ");
}

export default function ContestResult() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const stats = useMemo(() => {
    if (!result) {
      return {
        score: 0,
        correctText: "0/0",
        rankText: "-",
      };
    }

    return {
      score: result.score ?? 0,
      correctText: `${result.correct_count}/${result.total_questions}`,
      rankText: result.rank ? `#${result.rank}` : "-",
    };
  }, [result]);

  const loadResult = async ({ silent = false } = {}) => {
    if (!attemptId) {
      setError("Invalid contest attempt id");
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);
    setError("");

    try {
      const data = await getContestResult(attemptId);
      setResult(data);
    } catch (err) {
      setError(err.message || "Unable to load contest result");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadResult();
  }, [attemptId]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-masterly-navy p-6">
        <div className="text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full border-4 border-masterly-orange border-t-transparent animate-spin" />
          <p className="font-medium">Loading contest result...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-3 pb-4 pt-2 text-masterly-navy">
      <div className="space-y-4 animate-page-fade-in">
        <div className="bg-masterly-cardSoft rounded-[28px] border border-masterly-border p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <button
              onClick={() => navigate("/contest")}
              className="inline-flex items-center gap-2 text-sm font-semibold text-masterly-muted hover:text-masterly-navy transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Contest
            </button>
            <button
              onClick={() => {
                setRefreshing(true);
                loadResult({ silent: true });
              }}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-full border border-masterly-border bg-white px-3 py-2 text-xs font-semibold text-masterly-navy hover:bg-[#FFF8F2] disabled:opacity-60 transition-colors"
            >
              <RefreshCcw size={14} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-white border border-masterly-border p-3 shadow-sm">
              <p className="text-xs text-masterly-muted">Score</p>
              <p className="text-2xl font-bold text-masterly-navy">{stats.score}%</p>
            </div>
            <div className="rounded-2xl bg-white border border-masterly-border p-3 shadow-sm">
              <p className="text-xs text-masterly-muted">Correct</p>
              <p className="text-2xl font-bold text-masterly-navy">{stats.correctText}</p>
            </div>
            <div className="rounded-2xl bg-white border border-masterly-border p-3 shadow-sm">
              <p className="text-xs text-masterly-muted">Rank</p>
              <p className="text-2xl font-bold text-masterly-navy">{stats.rankText}</p>
            </div>
            <div className="rounded-2xl bg-white border border-masterly-border p-3 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FEE6DA] flex items-center justify-center text-masterly-orange">
                <Trophy size={18} />
              </div>
              <div>
                <p className="text-xs text-masterly-muted">Class</p>
                <p className="text-lg font-bold text-masterly-navy">{formatClassLevel(result?.class_level)}</p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {result && (
          <>
            <div className="space-y-3">
              {result.question_results?.map((question) => (
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

            <div className="bg-masterly-cardSoft rounded-[28px] border border-masterly-border p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-masterly-navy">Leaderboard Snapshot</h3>
                  <p className="text-xs text-masterly-muted">Ranking at the time of this attempt</p>
                </div>
              </div>

              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {(result.leaderboard || []).length > 0 ? (
                  result.leaderboard.map((entry) => (
                    <div
                      key={entry.username}
                      className={`rounded-2xl border px-4 py-3 flex items-center justify-between gap-3 ${
                        entry.username === result.username ? "border-masterly-orange bg-[#FFF2E8]" : "border-masterly-border bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold bg-[#FEE6DA] text-masterly-orange">
                          {entry.rank}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-masterly-navy truncate">
                            {entry.name || entry.username}
                            {entry.username === result.username ? " (You)" : ""}
                          </p>
                          <p className="text-xs text-masterly-muted truncate">{entry.class_level}</p>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-masterly-navy">{entry.best_score}%</p>
                        <p className="text-xs text-masterly-muted">{entry.best_correct_count}/{result.total_questions} correct</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-masterly-border bg-white p-5 text-center text-sm text-masterly-muted">
                    No leaderboard data available for this attempt.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-masterly-cardSoft rounded-[28px] border border-masterly-border p-4 shadow-sm">
              <Link
                to="/contest"
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all"
              >
                Start New Contest
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}