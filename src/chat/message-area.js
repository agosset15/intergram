import { h, Fragment } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

const fmtTime = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
const fmtDateTime = (d) => {
    const dt = new Date(d);
    return dt.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: '2-digit' }) + ' ' + fmtTime(dt);
};

const DAY_MS = 60 * 60 * 24 * 1000;

// Matches http(s) URLs; trailing punctuation excluded via character class
const URL_RE = /https?:\/\/[-\w+&@#/%?=~|!:,.;]*[-\w+&@#/%=~|]/g;

function renderText(raw) {
    const lines = String(raw).split('\n');
    return lines.flatMap((line, lineIdx) => {
        const nodes = [];
        let cursor = 0;
        URL_RE.lastIndex = 0;
        let m;
        while ((m = URL_RE.exec(line)) !== null) {
            if (m.index > cursor) nodes.push(line.slice(cursor, m.index));
            nodes.push(
                <a href={m[0]} target="_blank" rel="noopener noreferrer">{m[0]}</a>
            );
            cursor = m.index + m[0].length;
        }
        if (cursor < line.length) nodes.push(line.slice(cursor));
        if (lineIdx < lines.length - 1) nodes.push(<br />);
        return nodes;
    });
}

export default function MessageArea({ messages, conf }) {
    const bottomRef = useRef(null);

    // messages is mutated in place (push), so ref stays the same — track length instead
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'instant' });
    }, [messages.length]);

    const now = new Date();
    return (
        <Fragment>
            <ol class="chat">
                {messages.map(({ name, text, from, time }) => {
                    const isAdmin = from === 'admin';
                    return (
                        <li class={from}>
                            <div class="msg">
                                {isAdmin && name && <div class="msg-sender">{name}</div>}
                                <p>{renderText(text)}</p>
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
        </Fragment>
    );
}
