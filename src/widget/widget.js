import { h, Component } from 'preact';
import ChatFrame from './chat-frame';
import ChatFloatingButton from './chat-floating-button';
import ChatTitleMsg from './chat-title-msg';
import ArrowIcon from './arrow-icon';
import {
    desktopTitleStyle, 
    desktopWrapperStyle,
    mobileOpenWrapperStyle, 
    mobileClosedWrapperStyle,
    desktopClosedWrapperStyleChat
} from './style';

export default class Widget extends Component {

    constructor(props) {
        super(props);
        // preact 10: this.state is not pre-initialized — assign the whole object
        const hideCloser = !!(props.conf && props.conf.hideCloser);
        this.state = {
            isChatOpen: hideCloser,   // webview mode: start open
            pristine: !hideCloser,    // and render the iframe immediately
            wasChatOpened: this.wasChatOpened()
        };
    }

    render({conf, isMobile}, {isChatOpen, pristine}) {

        // Webview mode: fullscreen chat only, no close/toggle button.
        if (conf.hideCloser) {
            return (
                <div style={mobileOpenWrapperStyle}>
                    <div style={{ height: '100%' }}>
                        <ChatFrame {...this.props} />
                    </div>
                </div>
            );
        }

        const wrapperWidth = {width: conf.desktopWidth};
        const desktopHeight = (window.innerHeight - 100 < conf.desktopHeight) ? window.innerHeight - 90 : conf.desktopHeight;

        let wrapperStyle;
        if (!isChatOpen && (isMobile || conf.alwaysUseFloatingButton)) {
            wrapperStyle = { ...mobileClosedWrapperStyle}; // closed mobile floating button
        } else if (!isMobile){
            wrapperStyle = (conf.closedStyle === 'chat' || isChatOpen || this.wasChatOpened()) ?
                (isChatOpen) ? 
                    { ...desktopWrapperStyle, ...wrapperWidth} // desktop mode, button style
                    :
                    { ...desktopWrapperStyle}
                :
                { ...desktopClosedWrapperStyleChat}; // desktop mode, chat style
        } else {
            wrapperStyle = mobileOpenWrapperStyle; // open mobile wrapper should have no border
        }

        return (
            <div style={wrapperStyle}>

                {/* Open/close button */}
                { (isMobile || conf.alwaysUseFloatingButton) && !isChatOpen ?

                    <ChatFloatingButton color={conf.mainColor} onClick={this.onClick}/>

                    :

                    (conf.closedStyle === 'chat' || isChatOpen || this.wasChatOpened()) ?
                        <div style={{background: conf.mainColor, ...desktopTitleStyle}} onClick={this.onClick}>
                            <div style={{display: 'flex', alignItems: 'center', padding: '0px 30px 0px 0px'}}>
                                {isChatOpen ? conf.titleOpen : conf.titleClosed}
                            </div>
                            <ArrowIcon isOpened={isChatOpen}/>
                        </div>
                        :
                        <ChatTitleMsg onClick={this.onClick} conf={conf}/>
                }

                {/*Chat IFrame*/}
                <div style={{
                    display: isChatOpen ? 'block' : 'none',
                    height: isMobile ? '100%' : desktopHeight
                }}>
                    {pristine ? null : <ChatFrame {...this.props} /> }
                </div>

            </div>
        );
    }

    onClick = () => {
        let stateData = {
            pristine: false,
            isChatOpen: !this.state.isChatOpen,
        }
        if(!this.state.isChatOpen && !this.wasChatOpened()){
            this.setCookie();
            stateData.wasChatOpened = true;
        }
        this.setState(stateData);
    }

    setCookie = () => {
        let date = new Date();
        let expirationTime = parseInt(this.props.conf.cookieExpiration);
        date.setTime(date.getTime()+(expirationTime*24*60*60*1000));
        let expires = '; expires='+date.toGMTString();
        document.cookie = 'chatwasopened=1'+expires+'; path=/';
    }

    getCookie = () => {
        const nameEQ = 'chatwasopened=';
        for (let c of document.cookie.split(';')) {
            c = c.trimStart();
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length);
        }
        return false;
    }

    wasChatOpened = () => this.getCookie() !== false

}
