import React from "react";


import { useEffect, useRef, useState } from "react";

const conversation = [
    { "sender": "student", "text": "Hi! Can you show me my NEET practice progress?" },
    { "sender": "bot", "text": "Absolutely! Looking at your 12 mock tests so far, your average score is 78%, and your trend has steadily improved by 6% over the last month." },
    { "sender": "student", "text": "How did I perform in Physics?" },
    { "sender": "bot", "text": "Physics: 72%. Over the last three mocks, your Mechanics scores improved by 12%, while Thermodynamics dropped by 8% recently." },
    { "sender": "student", "text": "Which topics should I focus on next?" },
    { "sender": "bot", "text": "From a topic-level view, Thermodynamics need attention. At the subtopic level, 'Heat Transfer' is your weakest performers." },
    { "sender": "student", "text": "Can you give me more clarity on those subtopics? Like, what exactly am I getting wrong and how I should have understood them?" },
    { "sender": "bot", "text": "Sure. In 'Heat Transfer', you’re strong at conduction basics but weak in differentiating between radiation vs convection. You understood the concepts but not the nuances of when to apply Stefan–Boltzmann law. You often treat it like a plug-and-play formula instead of checking the boundary conditions." },
    { "sender": "student", "text": "Okay, so how should I re-learn them?" },
    { "sender": "bot", "text": "For Heat Transfer: don’t start with formulas. First, visualize the three mechanisms with real-world examples—sunlight warming your skin (radiation), a spoon heating in hot tea (conduction), and warm air rising (convection). Then, map each problem to one mechanism before applying equations. That prevents formula misuse." },
];


const bubbleStyles = {
    student: "bg-blue-100 text-blue-900 text-right mr-1 md:mr-2",
    bot: "bg-indigo-100 text-indigo-900 text-left ml-1 md:ml-2",
};


// Typing animation for chat bubbles
const TYPING_SPEED = 28; // ms per character
const PAUSE_BETWEEN = 900; // ms pause after each message

const AIChatbotAnimation = () => {
    const [currentMsgIdx, setCurrentMsgIdx] = useState(0);
    const [typedText, setTypedText] = useState("");
    const [showedMsgs, setShowedMsgs] = useState([]);
    const [isTyping, setIsTyping] = useState(true);
    const timeoutRef = useRef();

    useEffect(() => {
        // Reset all on loop
        if (currentMsgIdx === 0 && showedMsgs.length === 0 && typedText === "") {
            setIsTyping(true);
        }
        if (currentMsgIdx < conversation.length) {
            setIsTyping(true);
            const msg = conversation[currentMsgIdx].text;
            if (typedText.length < msg.length) {
                timeoutRef.current = setTimeout(() => {
                    setTypedText(msg.slice(0, typedText.length + 1));
                }, TYPING_SPEED);
            } else {
                // Pause, then show next message
                timeoutRef.current = setTimeout(() => {
                    setShowedMsgs([...showedMsgs, { ...conversation[currentMsgIdx], text: msg }]);
                    setTypedText("");
                    setCurrentMsgIdx(currentMsgIdx + 1);
                }, PAUSE_BETWEEN);
                setIsTyping(false);
            }
        } else {
            // End of conversation, loop after pause
            timeoutRef.current = setTimeout(() => {
                setShowedMsgs([]);
                setTypedText("");
                setCurrentMsgIdx(0);
            }, 2200);
        }
        return () => clearTimeout(timeoutRef.current);
        // eslint-disable-next-line
    }, [typedText, currentMsgIdx]);

    // Show all finished messages, and the currently typing one
    return (
        <div className="relative w-full h-full lg:h-96 flex flex-col items-center justify-end py-4 sm:py-6 px-3 sm:px-4 select-none bg-slate-50">
            {/* Chatbot tagline */}
            <div className="absolute left-1/2 -translate-x-1/2 top-4 flex flex-col items-center z-10 rounded-2xl py-2 px-4 text-center
                bg-black/40 backdrop-blur-xl backdrop-saturate-150 border border-white/10 shadow-2xl">
                {/* Short on mobile, full tagline on sm+ */}
                <span className="text-xs text-white mt-1 font-semibold sm:hidden">InzightEd's Chatbot</span>
                <span className="hidden sm:inline text-xs text-white mt-1 font-semibold">InzightEd's Chatbot to enhance your Exam Preparation</span>
            </div>
            {/* Chat bubbles */}
            <div className="flex flex-col gap-3 w-full mt-20 ">
                {showedMsgs.map((msg, i) => (
                    <div
                        key={i}
                        className={`flex ${msg.sender === "student" ? "justify-end" : "justify-start"}`}
                    >
                        <div
                            className={`rounded-md px-4 py-2 shadow-md max-w-[70%] sm:max-w-[40%] text-xs font-medium ${bubbleStyles[msg.sender]} animate-fade-in`}
                        >
                            {msg.text}
                        </div>
                    </div>
                ))}
                {currentMsgIdx < conversation.length && (
                    <div
                        className={`flex ${conversation[currentMsgIdx].sender === "student" ? "justify-end" : "justify-start"}`}
                    >
                        <div
                            className={`rounded-md px-4 py-2 shadow-md max-w-[70%] sm:max-w-[40%] text-xs font-medium ${bubbleStyles[conversation[currentMsgIdx].sender]} animate-fade-in`}
                        >
                            {typedText}
                            <span className="inline-block w-2 h-4 align-middle bg-gray-400 rounded animate-pulse ml-1" style={{ visibility: isTyping ? 'visible' : 'hidden' }}></span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AIChatbotAnimation;
