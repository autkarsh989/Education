import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Header from "../components/Header";
import ProgressBar from "../components/ProgressBar";
import ChatSection from "../components/ChatSection";
import BottomNav from "../components/BottomNav";
import MotivationalQuote from "../components/MotivationalQuote";

export default function Home() {
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  const location = useLocation();
  const preloadMessages = location.state?.messages || null;
  const preloadSessionId = location.state?.session_id || null;

  useEffect(() => {
    const hasShownQuote = sessionStorage.getItem('hasShownQuote');
    console.log('hasShownQuote:', hasShownQuote);
    console.log('showQuote:', showQuote, 'isFirstLoad:', isFirstLoad);

    if (hasShownQuote) {
      setShowQuote(false);
      setIsFirstLoad(false);
    }

    sessionStorage.removeItem('hasShownQuote');
  }, []);

  const handleQuoteComplete = () => {
    console.log('Quote completed, hiding quote');
    setShowQuote(false);
    setIsFirstLoad(false);
    sessionStorage.setItem('hasShownQuote', 'true');
  };

  return (
    <>
      {showQuote && isFirstLoad && (
        <MotivationalQuote onComplete={handleQuoteComplete} />
      )}

      <div
        className="min-h-screen w-screen bg-masterly-cream p-3 flex justify-center items-center"
        onClick={() => setIsChatExpanded(false)}
      >
        <div
          className="w-full max-w-[440px] h-[calc(100vh-24px)] max-h-[860px]
                     bg-masterly-cream rounded-[28px] border border-masterly-border shadow-xl 
                     p-4 flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <Header />
          <ProgressBar loading={loading} />

          <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
            <ChatSection
              setIsChatExpanded={setIsChatExpanded}
              isChatExpanded={isChatExpanded}
              setLoading={setLoading}
              loading={loading}
              loadMessages={preloadMessages}
              preloadSessionId={preloadSessionId}
            />
          </div>

          <BottomNav setIsChatExpanded={setIsChatExpanded} />
        </div>
      </div>
    </>
  );
}
