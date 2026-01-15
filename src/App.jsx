import { useState, useRef, useEffect } from "react";
import "./index.css";
import ReactMarkdown from "react-markdown";

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
    '/backgrounds/bg1.png',
    '/backgrounds/bg2.jpg',
    '/backgrounds/bg3.jpg',
    '/backgrounds/bg4.jpg'
  ];
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const [showWave, setShowWave] = useState(false);

  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // --- LOGO TYPING ANIMATION ---
  useEffect(() => {
    const fullText = "folocater";
    let currentIndex = 0;

    const typeNextChar = () => {
      if (currentIndex < fullText.length) {
        setLogoText(fullText.substring(0, currentIndex + 1));
        currentIndex++;
        setTimeout(typeNextChar, 80); // Fast typing: 80ms per character
      } else {
        // Hide cursor after typing is complete
        setTimeout(() => setShowLogoCursor(false), 500);
      }
    };

    typeNextChar();
  }, []);

  // --- INITIALIZATION ---
  useEffect(() => {
    const savedName = localStorage.getItem("folocater_user");
    if (savedName) {
      setUsername(savedName);
      setShowPopup(false);
      setLines([`Hello ${savedName}! 😊 How can I assist you today?`]);
    }
  }, []);

  // --- AUTO-FOCUS LOGIC ---
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // 1. Don't auto-focus if the login popup is open
      if (showPopup) return;

      // 2. Don't interfere if the user is using shortcuts (Ctrl/Alt/Meta)
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      // 3. If input is not focused, focus it!
      if (document.activeElement !== inputRef.current) {
        inputRef.current.focus();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [showPopup]);

  // --- CURSOR LOGIC ---
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
  const confirmUsername = () => {
    if (tempName.trim()) {
      setIsClosing(true);
      setTimeout(() => {
        localStorage.setItem("folocater_user", tempName);
        setUsername(tempName);
        setShowPopup(false);
        setIsClosing(false);
        setIsChangingIdentity(false);
        setLines([`Hello ${tempName}! 😊 How can I assist you today?`]);
      }, 500);
    }
  };

  const resetIdentity = () => {
    setIsChangingIdentity(true);
    setTempName(username); // Pre-fill with current username
    setShowPopup(true);
    setLines(["Waiting for login..."]);
  };

  const handleLogoClick = () => {
    // Trigger wave animation
    setShowWave(true);

    // Change background after a short delay (when wave starts expanding)
    setTimeout(() => {
      setCurrentBgIndex((prev) => (prev + 1) % backgrounds.length);
    }, 300);

    // Remove wave animation after it completes
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

  async function sendMessage() {
    if (!input.trim()) return;
    const userText = input.trim();
    setInput("");

    setGhost(`>>> ${userText}`);
    await new Promise((res) => setTimeout(res, 250));
    setGhost(null);

    setLines((l) => ["Thinking", `>>> ${userText}`, ...l]);

    try {
      const res = await fetch("http://127.0.0.1:8000/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value);
        setLines((l) => [buffer, ...l.slice(1)]);
      }
      setLines((l) => ["", ...l]);
    } catch (e) {
      setLines((l) => ["Error: Could not connect to local LLM.", ...l.slice(1)]);
    }
  }

  // --- RENDER ---
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
          <div className="credits">made by google</div>
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