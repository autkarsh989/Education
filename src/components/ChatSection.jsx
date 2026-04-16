import { useState, useRef, useEffect } from "react";
import { Image, Plus } from "lucide-react";
import { sendToGemini, setSessionId, getSessionId, sendCheckRequest, setSubject } from "../utils/api";
import { useLanguage } from "../hooks/useLanguage";
import { useHistoryStore } from "../hooks/useHistory";
import { useUser } from "../contexts/UserContext";
import SuccessAnimation from "./SuccessAnimation";

export default function ChatSection({
  setIsChatExpanded,
  isChatExpanded,
  loading,
  setLoading,
  loadMessages,
  preloadSessionId = null,
}) {
  const { lang } = useLanguage();
  const { addConversation } = useHistoryStore();
  const { user } = useUser();

  const [selectedSubject, setSelectedSubject] = useState(null);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  // Teacher expression logic based on message content
  const getTeacherExpression = (text) => {
    if (!text) return "neutral";
    const textStr = typeof text === "string" ? text : String(text || "");
    if (!textStr) return "neutral";
    const lowerText = textStr.toLowerCase();
    if (lowerText.includes("correct") || lowerText.includes("great") || lowerText.includes("excellent") || lowerText.includes("perfect")) {
      return "celebrating";
    }
    if (lowerText.includes("?") || lowerText.includes("let me") || lowerText.includes("thinking")) {
      return "thinking";
    }
    if (lowerText.includes("good") || lowerText.includes("nice") || lowerText.includes("well done")) {
      return "happy";
    }
    return "neutral";
  };

  // Check if message contains encouragement
  const isEncouragementMessage = (text) => {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    return lowerText.includes("great") || lowerText.includes("excellent") || 
           lowerText.includes("good job") || lowerText.includes("well done") ||
           lowerText.includes("keep going") || lowerText.includes("you can do it") ||
           lowerText.includes("nice work") || lowerText.includes("awesome");
  };

  // Teacher avatar component
  const TeacherAvatar = ({ expression }) => {
    const expressions = {
      neutral: "🧑‍🏫",
      thinking: "🤔",
      happy: "😊",
      celebrating: "🎉"
    };
    return (
      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-xl border border-masterly-border shadow-sm flex-shrink-0">
        {expressions[expression] || expressions.neutral}
      </div>
    );
  };

  // Student avatar component
  const StudentAvatar = () => {
    return (
      <div className="w-10 h-10 rounded-full bg-masterly-creamDark flex items-center justify-center text-xl border border-masterly-border shadow-sm flex-shrink-0">
        👤
      </div>
    );
  };

  // Typing indicator component
  const TypingIndicator = () => {
    return (
      <div className="flex gap-2 items-end animate-slide-in-left">
        <TeacherAvatar expression="thinking" />
        <div className="bg-white rounded-2xl rounded-bl-sm shadow-sm px-4 py-3 flex gap-1 border border-masterly-border">
          <div className="w-2 h-2 bg-masterly-muted rounded-full animate-bounce-dots"></div>
          <div className="w-2 h-2 bg-masterly-muted rounded-full animate-bounce-dots" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-masterly-muted rounded-full animate-bounce-dots" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    );
  };

  // Confetti component
  const Confetti = () => {
    const confettiColors = ['bg-yellow-400', 'bg-pink-400', 'bg-blue-400', 'bg-green-400', 'bg-purple-400', 'bg-red-400'];
    const confettiPieces = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
    }));

    return (
      <div className="fixed inset-0 pointer-events-none z-50">
        {confettiPieces.map((piece) => (
          <div
            key={piece.id}
            className={`absolute w-2 h-2 ${piece.color} animate-confetti`}
            style={{
              left: `${piece.left}%`,
              top: '-10px',
              animationDelay: `${piece.delay}s`,
            }}
          />
        ))}
      </div>
    );
  };

  const [messages, setMessages] = useState(
    loadMessages || [
      {
        text:
          lang === "hi"
            ? "नमस्ते! कृपया शुरू करने के लिए एक विषय चुनें।"
            : "Hello! Please select a subject to begin.",
        sender: "bot",
      },
    ]
  );
  const [input, setInput] = useState("");
  const [image, setImage] = useState(null);
  const [timeTaken, setTimeTaken] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const timerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Fetch available subjects on mount
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setLoadingSubjects(true);
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/topics/subjects`,
          {
            headers: {
              "Authorization": `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        if (response.ok) {
          const subjects = await response.json();
          setAvailableSubjects(subjects);
        }
      } catch (error) {
        console.error("Failed to fetch subjects:", error);
      } finally {
        setLoadingSubjects(false);
      }
    };

    fetchSubjects();
  }, []);

  useEffect(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  useEffect(() => {
    startTimer();
    return () => clearInterval(timerRef.current);
  }, []);

  // Restore session if provided
  useEffect(() => {
    if (preloadSessionId) {
      try {
        setSessionId(preloadSessionId);
        console.log("🔁 Restored session id:", preloadSessionId);
      } catch (e) {
        console.warn("Could not set preload session id", e);
      }
    }
  }, [preloadSessionId]);

  const startTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeTaken((prev) => prev + 1);
    }, 1000);
  };

  const resetTimer = () => {
    clearInterval(timerRef.current);
    setTimeTaken(0);
    startTimer();
  };

  const handleSelectSubject = (subject) => {
    setSelectedSubject(subject);
    setSubject(subject);
    
    // Add system message about subject selection
    const subjectMessage = {
      text:
        lang === "hi"
          ? `✅ ${subject} के लिए समर्थन सक्रिय है। आप अब प्रश्न पूछ सकते हैं।`
          : `✅ Support for ${subject} is now active. You can start asking questions.`,
      sender: "bot",
    };
    setMessages((prev) => [...prev, subjectMessage]);
  };

  const handleNewChat = () => {
    setSelectedSubject(null);
    setMessages([
      {
        text:
          lang === "hi"
            ? "नमस्ते! कृपया शुरू करने के लिए एक विषय चुनें।"
            : "Hello! Please select a subject to begin.",
        sender: "bot",
      },
    ]);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage({ data: reader.result, mime: file.type });
      setMessages((prev) => [...prev, { image: reader.result, sender: "user" }]);
    };
    reader.readAsDataURL(file);
  };

  const handleCheck = async () => {
    const userMessage = input.trim();
    if (!userMessage || loading || !selectedSubject) return;

    const newUserMsg = { text: userMessage, sender: "user" };
    setMessages((prev) => [...prev, newUserMsg]);
    setInput("");

    try {
      setLoading(true);
      const response = await sendCheckRequest(
        { text: userMessage, image: image || null, time_taken: timeTaken },
        user.username,
        selectedSubject
      );

      const reply = response.bot_message || "No response received.";
      const replyText = typeof reply === "string" ? reply : (reply?.text || String(reply));

      setMessages((prev) => [...prev, { text: replyText, sender: "bot" }]);
      addConversation([...messages, newUserMsg, { text: replyText, sender: "bot" }]);

      resetTimer();
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { text: lang === "hi" ? "त्रुटि हुई।" : "An error occurred.", sender: "bot" },
      ]);
    } finally {
      setLoading(false);
      setImage(null);
    }
  };

  const handleSend = async (forcedMessage = null) => {
    const userMessage = forcedMessage || input.trim();
    
    if ((!userMessage && !image) || loading) return;
    if (!user?.username) {
      console.error("User not logged in");
      return;
    }
    
    // If no subject selected yet, show error
    if (!selectedSubject) {
      const errorMsg = {
        text:
          lang === "hi"
            ? "कृपया पहले एक विषय चुनें।"
            : "Please select a subject first.",
        sender: "bot",
      };
      setMessages((prev) => [...prev, errorMsg]);
      return;
    }

    const newUserMsg = { text: userMessage, sender: "user" };
    setMessages((prev) => [...prev, newUserMsg]);
    setInput("");

    try {
      setLoading(true);
      const response = await sendToGemini(
        { text: userMessage, image: image || null, time_taken: timeTaken },
        user.username,
        selectedSubject
      );

      const reply =
        response.candidates?.[0]?.content?.parts?.[0]?.text ||
        (lang === "hi" ? "कोई उत्तर नहीं मिला।" : "No response received.");

      setMessages((prev) => [...prev, { text: reply, sender: "bot" }]);
      addConversation([...messages, newUserMsg, { text: reply, sender: "bot" }]);

      // Trigger confetti for celebratory messages
      const lowerReply = reply.toLowerCase();
      if (lowerReply.includes("correct") || lowerReply.includes("excellent") || 
          lowerReply.includes("perfect") || lowerReply.includes("great job") ||
          lowerReply.includes("well done")) {
        setShowConfetti(true);
        setShowSuccessAnimation(true);
        setTimeout(() => {
          setShowConfetti(false);
          setShowSuccessAnimation(false);
        }, 3000);
      }

      resetTimer();
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { text: lang === "hi" ? "त्रुटि हुई।" : "An error occurred.", sender: "bot" },
      ]);
    } finally {
      setLoading(false);
      setImage(null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-masterly-panel rounded-2xl p-4 mt-3 border border-masterly-border shadow-sm text-masterly-navy flex flex-col flex-1 min-h-[200px] max-h-[65vh] transition-all duration-300 ease-smooth">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">
          {lang === "hi" ? "अध्यापक सहायक" : "Learning Assistant"}
        </h2>
        {selectedSubject && (
          <div className="flex items-center gap-2">
            <span className="text-xs bg-masterly-creamDark px-2 py-1 rounded-full border border-masterly-border">
              📚 {selectedSubject}
            </span>
            {/* New Chat Button */}
            <button
              onClick={handleNewChat}
              className="p-1 hover:bg-masterly-creamDark rounded-lg transition-all duration-200 text-xs"
              title={lang === "hi" ? "नया चैट" : "New Chat"}
            >
              <Plus size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Subject Selection Panel */}
      {!selectedSubject && (
        <div className="bg-white rounded-xl p-4 mb-3 border border-masterly-border">
          <h3 className="text-sm font-semibold mb-3 text-center">
            {lang === "hi" ? "विषय चुनें:" : "Select a Subject:"}
          </h3>
          {loadingSubjects ? (
            <div className="text-center py-4">
              <div className="inline-block w-4 h-4 border-2 border-masterly-muted border-t-masterly-navy rounded-full animate-spin"></div>
            </div>
          ) : availableSubjects.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {availableSubjects.map((subject) => (
                <button
                  key={subject}
                  onClick={() => handleSelectSubject(subject)}
                  className="px-3 py-2 text-xs rounded-lg border border-masterly-border bg-masterly-creamLight hover:bg-masterly-creamDark transition-all duration-200 active:scale-95"
                >
                  {subject}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center text-xs text-masterly-muted py-4">
              {lang === "hi" ? "कोई विषय उपलब्ध नहीं है।" : "No subjects available."}
            </div>
          )}
        </div>
      )}

      <div 
        className="flex-1 overflow-y-auto space-y-3 text-sm pr-1 scroll-smooth" 
        style={{ WebkitOverflowScrolling: 'touch' }}
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2 items-end ${
              msg.sender === "user" 
                ? "flex-row-reverse animate-slide-in-right" 
                : "flex-row animate-slide-in-left"
            }`}
          >
            {/* Avatar */}
            {msg.sender === "user" ? (
              <StudentAvatar />
            ) : (
              <TeacherAvatar expression={getTeacherExpression(msg.text)} />
            )}
            
            {/* Message Content */}
            <div className={`max-w-[80%] ${msg.sender === "user" ? "text-right" : "text-left"}`}>
              {msg.image ? (
                <img 
                  src={msg.image} 
                  alt="uploaded" 
                  loading="lazy"
                  decoding="async"
                  className="max-w-[300px] rounded-lg shadow-lg" 
                />
              ) : (
                <div className="relative">
                  <div
                    className={`px-4 py-2 break-words ${
                      msg.sender === "user" 
                        ? "bg-masterly-creamDark rounded-2xl rounded-br-sm shadow-sm border border-masterly-border" 
                        : "bg-white rounded-2xl rounded-bl-sm shadow-sm border border-masterly-border"
                    }`}
                  >
                    {msg.text}
                  </div>
                  {/* Animated emoji for encouragement messages */}
                  {msg.sender === "bot" && isEncouragementMessage(msg.text) && (
                    <div className="absolute -top-2 -right-2 text-2xl animate-emoji-bounce">
                      {msg.text.toLowerCase().includes("excellent") || msg.text.toLowerCase().includes("perfect") ? "🌟" : "👍"}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Confetti effect */}
      {showConfetti && <Confetti />}
      
      {/* Success animation */}
      {showSuccessAnimation && <SuccessAnimation onComplete={() => setShowSuccessAnimation(false)} />}

      {/* Input area - only show if subject selected */}
      {selectedSubject && (
        <div className="flex items-center mt-3 bg-masterly-input rounded-2xl px-3 py-2 shrink-0 space-x-2 min-h-[48px] border border-masterly-border">
          <label className="p-2 hover:bg-masterly-creamDark rounded-xl cursor-pointer transition-all duration-200 active:scale-95 min-w-[40px] min-h-[40px] flex items-center justify-center">
            <Image className="text-masterly-muted" size={18} aria-hidden="true" />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              aria-label={lang === "hi" ? "छवि अपलोड करें" : "Upload image"}
            />
          </label>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              lang === "hi" ? "अपना सवाल लिखें..." : "Ask your question..."
            }
            className="flex-1 bg-transparent outline-none text-sm text-masterly-navy placeholder-masterly-muted"
            onFocus={() => setIsChatExpanded(true)}
            aria-label={lang === "hi" ? "अपना सवाल लिखें" : "Ask your question"}
          />
          <button
            onClick={() => handleSend()}
            disabled={loading}
            className="ml-1 bg-masterly-amber disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:brightness-110 active:scale-95 shadow-sm flex items-center justify-center min-w-[40px] min-h-[40px]"
            style={{ backgroundColor: "#FBB33E" }}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span>&gt;</span>
            )}
          </button>

          {/* Check Button */}
          <button
            onClick={() => handleCheck()}
            disabled={loading}
            className="ml-1 bg-masterly-blue disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:brightness-110 active:scale-95 shadow-sm flex items-center justify-center min-w-[40px] min-h-[40px]"
            style={{ backgroundColor: "#07A0FD" }}
          >
            ✔
          </button>
        </div>
      )}
    </div>
  );
}
