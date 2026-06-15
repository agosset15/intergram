import { h } from 'preact';
import { useEffect } from 'preact/hooks';

const fmtTime = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
const fmtDateTime = (d) => {
    const dt = new Date(d);
    return dt.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: '2-digit' }) + ' ' + fmtTime(dt);
};

const DAY_MS = 60 * 60 * 24 * 1000;

export default function MessageArea({ messages, conf }) {
    useEffect(() => {
        window.scrollTo(0, document.body.scrollHeight);
    }, [messages]);

    const now = new Date();
    return (
        <ol class="chat">
            {messages.map(({ name, text, from, time }) => {
                const displayName = from === 'visitor' ? conf.visitorPronoun : name;
                return (
                    <li class={from}>
                        <div class="msg">
                            <p>{displayName ? displayName + ': ' + text : text}</p>
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
    );
}
