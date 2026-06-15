import { h, render } from 'preact';
import Chat from './chat';
import * as store from './local-store'

let conf = {};
const confString = getUrlParameter('conf');
if (confString) {
    try {
        conf = JSON.parse(confString);
    } catch (e) {
        console.log('Failed to parse conf', confString, e);
    }
}

let visitorMeta = {};
const metaString = getUrlParameter('meta');
if (metaString) {
    try {
        visitorMeta = JSON.parse(metaString);
    } catch (e) {
        console.log('Failed to parse meta', metaString, e);
    }
}

render(
    <Chat
        conversationId={getConversationId()}
        visitorMeta={visitorMeta}
        host={getUrlParameter('host')}
        conf={conf}
    />,
    document.getElementById('intergramChat')
);

function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    let regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    let results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Persisted in localStorage so the conversation survives reloads / browser restarts.
// Migrates from the old 'userId' key so existing visitors keep their session.
function getConversationId () {
    if (store.enabled) {
        const existing = store.get('conversationId') || store.get('userId');
        if (existing) {
            store.set('conversationId', existing);
            return existing;
        }
        return store.set('conversationId', generateRandomId());
    } else {
        return generateRandomId();
    }
}

function generateRandomId() {
    let id = Math.random().toString(36).substr(2, 6);
    // Optional human-readable id (e.g. Guest-ab12cd). Stays colon-free for routing.
    return conf.humanReadableId ? 'Guest-' + id : id;
}