import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

const fmtTime = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
const fmtDateTime = (d) => {
    const dt = new Date(d);
    return dt.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: '2-digit' }) + ' ' + fmtTime(dt);
};

const DAY_MS = 60 * 60 * 24 * 1000;

export default function MessageArea({ messages, conf }) {
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'instant' });
    }, [messages]);

    const now = new Date();
    return (
        <div>
            <ol class="chat">
                {messages.map(({ name, text, from, time }) => {
                    const isAdmin = from === 'admin';
                    const displayName = isAdmin ? name : null;
                    return (
                        <li class={from}>
                            <div class="msg">
                                {displayName && <div class="msg-sender">{displayName}</div>}
                                <p>{text}</p>
                                {conf.displayMessageTime && (
                                    <div class="time">
                                        {now - new Date(time) < DAY_MS ? fmtTime(time) : fmtDateTime(time)}
                                    </div>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ol>
            <div ref={bottomRef} />
        </div>
    );
}
