import { h, render } from 'preact';
import Widget from './widget';
import {defaultConfiguration} from './default-configuration';

if (window.attachEvent) {
    window.attachEvent('onload', injectChat);
} else {
    window.addEventListener('load', injectChat, false);
}

function injectChat() {
    // intergramId is kept for backward compat but no longer required when self-hosting
    // with TELEGRAM_CHAT_ID set as a server env var.
    if (!window.intergramId && !window.intergramServer) {
        console.error('Please set window.intergramServer (and optionally window.intergramId) — see github.com/idoco/intergram');
        return;
    }
    {
        let root = document.createElement('div');
        root.id = 'intergramRoot';
        document.getElementsByTagName('body')[0].appendChild(root);
        const server = window.intergramServer || 'https://www.intergram.xyz';
        const iFrameSrc = server + '/chat.html';
        const host = window.location.host || 'unknown-host';
        const conf = { ...defaultConfiguration, ...window.intergramCustomizations };
        const visitorMeta = collectVisitorMeta(conf);

        render(
            <Widget intergramId={window.intergramId}
                    host={host}
                    isMobile={window.screen.width < 500}
                    iFrameSrc={iFrameSrc}
                    conf={conf}
                    visitorMeta={visitorMeta}
            />,
            root
        );

        try {
            const request = new XMLHttpRequest();
            request.open('POST', server + '/usage-start?host=' + host);
            request.send();
        } catch (e) { /* Fail silently */ }

    }

}

// Read whitelisted GET params from the embedding page into a visitorMeta object.
// Keys not in conf.metaParams are ignored; missing params are simply skipped.
function collectVisitorMeta(conf) {
    const meta = {};
    const allowed = Array.isArray(conf.metaParams) ? conf.metaParams : [];
    if (!allowed.length || typeof URLSearchParams === 'undefined') return meta;
    const maxLen = conf.maxMetaValueLength || 200;
    const maxParams = conf.maxMetaParams || 10;
    const params = new URLSearchParams(window.location.search);
    let count = 0;
    for (let i = 0; i < allowed.length && count < maxParams; i++) {
        const key = allowed[i];
        if (!params.has(key)) continue;
        const value = (params.get(key) || '').slice(0, maxLen);
        if (!value) continue;
        meta[key] = value;
        count++;
    }
    return meta;
}
