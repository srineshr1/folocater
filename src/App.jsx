import { useState, useRef, useEffect } from "react";
import "./index.css";
import ReactMarkdown from "react-markdown";

// --- CONFIGURATION ---
// Replace this with your actual Render/Railway URL
const BACKEND_URL = "https://gemini-mongodb-backend.onrender.com";

export default function App() {
  // --- STATE MANAGEMENT ---
  const [username, setUsername] = useState("");
  const [lines, setLines] = useState(["Waiting for login..."]);
  const [input, setInput] = useState("");

  // Popup States
  const [showPopup, setShowPopup] = useState(!localStorage.getItem("folocater_user"));
  const [isClosing, setIsClosing] = useState(false);
  const [tempName, setTempName] = useState("");
  const [isChangingIdentity, setIsChangingIdentity] = useState(false);

  // Cursor & Ghost Text States
  const [ghost, setGhost] = useState(null);
  const [cursorOffset, setCursorOffset] = useState(0);
  const [isTyping, setIsTyping] = useState(false);

  // Logo Typing Animation
  const [logoText, setLogoText] = useState("");
  const [showLogoCursor, setShowLogoCursor] = useState(true);

  // Background Image Cycling
  const backgrounds = [
    '/backgrounds/bg1.png'
  ];
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const [showWave, setShowWave] = useState(false);

  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // --- SMOOTH STREAMING REFS ---
  const outputBufferRef = useRef("");
  const displayBufferRef = useRef("");
  const isStreamActiveRef = useRef(false);

  // --- LOGO TYPING ANIMATION (UNTOUCHED) ---
  useEffect(() => {
    const fullText = "folocater";
    let currentIndex = 0;
    const typeNextChar = () => {
      if (currentIndex < fullText.length) {
        setLogoText(fullText.substring(0, currentIndex + 1));
        currentIndex++;
        setTimeout(typeNextChar, 80);
      } else {
        setTimeout(() => setShowLogoCursor(false), 500);
      }
    };
    typeNextChar();
  }, []);

  // --- TYPEWRITER TICKER (NATURAL) ---
  useEffect(() => {
    let timeoutId;

    const typeChar = () => {
      if (isStreamActiveRef.current && displayBufferRef.current.length < outputBufferRef.current.length) {
        const nextChar = outputBufferRef.current[displayBufferRef.current.length];
        displayBufferRef.current += nextChar;

        setLines(prev => {
          const newList = [...prev];
          newList[0] = displayBufferRef.current;
          return newList;
        });

        // Calculate delay for natural feel
        let delay = 10; // Base fast speed
        if (nextChar === "." || nextChar === "!" || nextChar === "?") delay = 30; // Pause on sentences
        else if (nextChar === ",") delay = 20; // Pause on commas
        else if (Math.random() > 0.9) delay += 10; // Occasional slight stutter

        timeoutId = setTimeout(typeChar, delay);
      } else {
        timeoutId = setTimeout(typeChar, 20); // Check again soon
      }
    };

    typeChar();

    return () => clearTimeout(timeoutId);
  }, []);

  // --- HELPER: LOAD HISTORY ---
  const loadHistory = async (name) => {
    try {
      const res = await fetch(`${BACKEND_URL}/history/${name}`);
      if (res.ok) {
        const historyData = await res.json();
        const historyLines = historyData.map(m =>
          m.role === "user" ? `>>> ${m.text}` : m.text
        ).reverse();
        // If history exists, show it. Otherwise show welcome.
        setLines(historyLines.length > 0 ? historyLines : [`Hello ${name}! 😊`]);
      } else {
        setLines([`Hello ${name}! (New Session)`]);
      }
    } catch (err) {
      console.error("Failed to load history", err);
      setLines([`Hello ${name}! (Offline Mode)`]);
    }
  };

  // --- INITIALIZATION ---
  useEffect(() => {
    const savedName = localStorage.getItem("folocater_user");
    if (savedName) {
      setUsername(savedName);
      setShowPopup(false);
      loadHistory(savedName);
    }
  }, []);

  // --- AUTO-FOCUS LOGIC (UNTOUCHED) ---
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (showPopup) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (document.activeElement !== inputRef.current) {
        inputRef.current.focus();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [showPopup]);

  // --- CURSOR LOGIC (UNTOUCHED) ---
  const getTextWidth = (text, font) => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    context.font = font;
    return context.measureText(text).width;
  };

  useEffect(() => {
    if (inputRef.current) {
      const styles = window.getComputedStyle(inputRef.current);
      const font = `${styles.fontSize} ${styles.fontFamily}`;
      const width = getTextWidth(input, font);
      setCursorOffset(width);
      setIsTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 500);
    }
  }, [input]);

  // --- ACTIONS ---
  const confirmUsername = async () => {
    if (tempName.trim()) {
      await loadHistory(tempName);

      localStorage.setItem("folocater_user", tempName);
      setUsername(tempName);
      setShowPopup(false);
    }
  };

  const resetIdentity = () => {
    setIsChangingIdentity(true);
    setTempName(username);
    setShowPopup(true);
    setLines(["Waiting for login..."]);
  };

  const handleLogoClick = () => {
    setShowWave(true);
    setTimeout(() => {
      setCurrentBgIndex((prev) => (prev + 1) % backgrounds.length);
    }, 300);
    setTimeout(() => {
      setShowWave(false);
    }, 1000);
  };

  const cancelIdentityChange = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowPopup(false);
      setIsClosing(false);
      setIsChangingIdentity(false);
      setTempName("");
    }, 500);
  };

  // --- MODIFIED SEND MESSAGE ---
  async function sendMessage() {
    if (!input.trim()) return;
    const userText = input.trim();
    setInput("");

    // Ghost text animation
    setGhost(`>>> ${userText}`);
    await new Promise((res) => setTimeout(res, 250));
    setGhost(null);

    // Initial response line
    setLines((l) => ["Thinking", `>>> ${userText}`, ...l]);

    // Reset buffers for typewriter effect
    outputBufferRef.current = "";
    displayBufferRef.current = "";
    isStreamActiveRef.current = true;

    try {
      // Fetching from your hosted Python backend
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username, // Added username for DB tracking
          message: userText
        }),
      });

      if (!res.ok) throw new Error("Server error");

      const data = await res.json();

      // We set the buffer to the full text, and the typewriter ticker 
      // (the useEffect above) will handle the smooth typing animation.
      outputBufferRef.current = data.response;

      // Wait for the typewriter to finish displaying everything
      while (displayBufferRef.current.length < outputBufferRef.current.length) {
        await new Promise(r => setTimeout(r, 100));
      }

      isStreamActiveRef.current = false;
      setLines((l) => ["", ...l]); // Add spacer
    } catch (e) {
      isStreamActiveRef.current = false;
      setLines((l) => ["Error: Could not connect to backend server.", ...l.slice(1)]);
    }
  }

  // --- RENDER (UNTOUCHED) ---
  return (
    <div className="terminal" style={{ backgroundImage: `url(${backgrounds[currentBgIndex]})` }}>
      {showWave && <div className="wave-animation" />}
      {showPopup && (
        <div className={`modal-overlay ${isClosing ? "closing" : ""}`}>
          <div className="modal-content">
            <h3>System Access</h3>
            <p>Please identify yourself:</p>
            <input
              className="modal-input"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmUsername()}
              placeholder="Username..."
              autoFocus
            />
            <div className="modal-buttons">
              <button className="modal-button" onClick={confirmUsername}>
                Confirm Identity
              </button>
              {isChangingIdentity && (
                <button className="modal-button-cancel" onClick={cancelIdentityChange}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <header className="terminal-header">
        <button className="logo" onClick={handleLogoClick}>
          {logoText}
          {showLogoCursor && <span className="logo-cursor">_</span>}
        </button>
        <div className="header-right">
          {!showPopup && (
            <button className="reset-btn" onClick={resetIdentity}>
              change identity
            </button>
          )}
          <div className="credits">made by srinesh</div>
        </div>
      </header>

      <div className="output">
        {ghost && <div className="ghost">{ghost}</div>}
        {lines.map((line, i) => {
          if (!line && i === 0) return <div key={i} className="line-spacer" />;
          const isUser = typeof line === "string" && line.startsWith(">>> ");
          const isThinking = line === "Thinking";
          const content = isUser ? line.replace(">>> ", "") : line;

          return (
            <div key={i} className="chat-line">
              {isUser && <span className="user-prefix">&gt;&gt;&gt;</span>}
              <div className={isThinking ? "thinking-dots" : "markdown-content"}>
                {isThinking ? "Thinking" : <ReactMarkdown>{content}</ReactMarkdown>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="prompt">
        <span>&gt;&gt;&gt;</span>
        <div className="input-wrapper">
          <input
            ref={inputRef}
            value={input}
            disabled={showPopup}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder={showPopup ? "Login required..." : "Send a message..."}
          />
          {!showPopup && (
            <span
              className={`custom-cursor ${isTyping ? "not-blinking" : ""}`}
              style={{ transform: `translateX(${cursorOffset}px)` }}
            />
          )}
        </div>
      </div>
    </div>
  );
}