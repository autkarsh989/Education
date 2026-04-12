import { useLanguage } from "../hooks/useLanguage";
import { Home, Compass, User, MessageSquare, Trophy } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { resetSession } from "../utils/api"; // <-- import here
import { useState, useEffect } from "react";
import { useUser } from "../contexts/UserContext";
import { getContestLeaderboard } from "../utils/contestApi";

export default function BottomNav({ setIsChatExpanded }) {
  const { lang } = useLanguage();
  const { user, loading: userLoading } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [clickedIndex, setClickedIndex] = useState(null);
  const [showExploreHint, setShowExploreHint] = useState(false);
  const [contestRank, setContestRank] = useState(null);

  // Show hint pulse for Explore feature (new feature hint)
  useEffect(() => {
    const hasSeenExplore = localStorage.getItem('hasSeenExplore');
    if (!hasSeenExplore) {
      setShowExploreHint(true);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadContestRank = async () => {
      if (userLoading) return;
      if (!user) {
        if (isMounted) setContestRank(null);
        return;
      }

      try {
        const data = await getContestLeaderboard();
        if (isMounted) {
          setContestRank(
            typeof data?.student_rank === "number" ? data.student_rank : null
          );
        }
      } catch (error) {
        if (isMounted) setContestRank(null);
      }
    };

    loadContestRank();

    return () => {
      isMounted = false;
    };
  }, [user, userLoading]);

  const handleExploreClick = (index) => {
    // Mark as seen and remove hint
    localStorage.setItem('hasSeenExplore', 'true');
    setShowExploreHint(false);
    handleNavigate("/math", true, index);
  };

  const handleNavigate = (path, collapseChat = true, index) => {
    // Trigger bounce animation
    setClickedIndex(index);
    setTimeout(() => setClickedIndex(null), 300);

    // 🧹 Reset chat session before going anywhere
    resetSession();

    if (collapseChat) setIsChatExpanded(false);
    navigate(path);
  };

  const navItems = [
    {
      icon: <Home size={24} />,
      label: lang === "hi" ? "होम" : "Home",
      path: "/",
      activePaths: ["/"],
      action: (index) => { 
        window.history.replaceState({}, document.title, "/"); 
        window.location.reload(); 
        handleNavigate("/", true, index);
      }
    },
    {
      icon: <MessageSquare size={24} />,
      label: lang === "hi" ? "चैट हिस्ट्री" : "Chat History",
      path: "/history",
      activePaths: ["/history"],
      action: (index) => handleNavigate("/history", false, index),
    },
    {
      icon: <Compass size={24} />,
      label: lang === "hi" ? "खोजें" : "Explore",
      path: "/math",
      activePaths: ["/math"],
      action: (index) => handleExploreClick(index),
      showHint: showExploreHint,
    },
    {
      icon: <Trophy size={24} />,
      label: lang === "hi" ? "टेस्ट" : "Test",
      path: "/contest",
      activePaths: ["/contest", "/contest/result"],
      action: (index) => handleNavigate("/contest", true, index),
      showRank: true,
    },
    {
      icon: <User size={24} />,
      label: lang === "hi" ? "प्रोफ़ाइल" : "Profile",
      path: "/profile",
      activePaths: ["/profile"],
      action: (index) => handleNavigate("/profile", true, index),
    },
  ];

  return (
    <nav className="flex justify-around items-center masterly-surface-dark rounded-[20px] py-2 px-1 mt-3 text-white shadow-lg border border-white/10">
      {navItems.map((n, i) => {
        const isActive = (n.activePaths || [n.path]).some((path) => {
          if (path === "/") return location.pathname === "/";
          return location.pathname === path || location.pathname.startsWith(`${path}/`);
        });
        const ariaLabel =
          n.showRank && contestRank !== null
            ? `${n.label} rank ${contestRank}`
            : n.label;
        
        return (
          <button
            key={i}
            onClick={() => n.action(i)}
            className={`
              relative flex flex-col items-center gap-1 
              min-w-[40px] min-h-[44px] px-2 py-2
              transition-all duration-200
              ${isActive ? 'scale-100' : 'scale-100 hover:scale-105'}
              active:scale-90
              ${clickedIndex === i ? 'animate-bounce' : ''}
            `}
            aria-label={ariaLabel}
            aria-current={isActive ? 'page' : undefined}
          >
            {n.showHint && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-masterly-orange rounded-full" />
            )}

            {/* Icon */}
            <div className={`
              relative transition-all duration-200 rounded-full p-1.5
              ${isActive 
                ? 'text-masterly-orange bg-white/15 shadow-inner shadow-white/10' 
                : 'text-white/70 hover:text-white'
              }
            `}>
              {n.icon}
              {n.showRank && contestRank !== null && (
                <span className="absolute -top-1 -right-2 rounded-full bg-masterly-orange text-white text-[9px] font-bold px-1.5 py-0.5 shadow">
                  #{contestRank}
                </span>
              )}
            </div>
            
            {/* Label with fade transition */}
            <span className={`
              text-[10px] transition-all duration-200
              ${isActive 
                ? 'opacity-100 font-semibold text-masterly-orange' 
                : 'opacity-70 hover:opacity-100 text-white/70'
              }
            `}>
              {n.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
