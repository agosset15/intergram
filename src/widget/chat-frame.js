import { h, Component } from 'preact';

export default class ChatFrame extends Component {

    shouldComponentUpdate() {
        return false;
    }

    render({ intergramId, host, iFrameSrc, isMobile, conf, visitorMeta }) {
        const dynamicConf = window.intergramOnOpen || {};
        const encodedConf = encodeURIComponent(JSON.stringify({ ...conf, ...dynamicConf }));
        const encodedMeta = encodeURIComponent(JSON.stringify(visitorMeta || {}));
        return (
            <iframe
                src={iFrameSrc + '?id=' + intergramId + '&host=' + host + '&conf=' + encodedConf + '&meta=' + encodedMeta}
                width="100%"
                height={isMobile ? '94%' : '100%'}
                frameBorder="0"
            />
        );
    }
}
