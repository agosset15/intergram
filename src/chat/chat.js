import * as store from './local-store'
import io from 'socket.io-client'

import { h, Component } from 'preact';
import MessageArea from './message-area';

export default class Chat extends Component {

    autoResponseState = 'pristine'; // pristine, set or canceled
    autoResponseTimer = 0;

    constructor(props) {
        super(props);
        // preact 10: this.state is not pre-initialized — assign the whole object
        let messages = [];
        if (store.enabled) {
            this.messagesKey = 'messages' + '.' + props.conversationId + '.' + props.host;
            messages = store.get(this.messagesKey) || store.set(this.messagesKey, []);
        }
        this.state = { messages };
    }

    componentDidMount() {
        const basePath = window.location.pathname.replace(/\/[^/]*$/, '');
        this.socket = io({ path: (basePath || '') + '/socket.io' });
        this.socket.on('connect', () => {
            // visitorMeta is sent once, at session init only (not per message).
            this.socket.emit('register', {
                conversationId: this.props.conversationId,
                visitorName: this.props.conf.visitorName,
                visitorMeta: this.props.visitorMeta
            });
        });
        this.socket.on('chat-message', this.incomingMessage);

        if (!this.state.messages.length) {
            this.writeToMessages({text: this.props.conf.introMessage, from: 'admin'});
        }
    }

    render({},state) {
        return (
            <div>
                <MessageArea messages={state.messages} conf={this.props.conf}/>

                <input class="textarea" type="text" placeholder={this.props.conf.placeholderText}
                       ref={(input) => { this.input = input }}
                       onKeyPress={this.handleKeyPress}/>
            </div>
        );
    }

    handleKeyPress = (e) => {
        if (e.key === 'Enter' && this.input.value) {
            let text = this.input.value;
            this.socket.emit('visitor-message', {text});
            this.input.value = '';

            if (this.autoResponseState === 'pristine') {

                setTimeout(() => {
                    this.writeToMessages({
                        text: this.props.conf.autoResponse,
                        from: 'admin'});
                }, 500);

                this.autoResponseTimer = setTimeout(() => {
                    this.writeToMessages({
                        text: this.props.conf.autoNoResponse,
                        from: 'admin'});
                    this.autoResponseState = 'canceled';
                }, 20 * 60 * 1000);
                this.autoResponseState = 'set';
            }
        }
    };

    incomingMessage = (msg) => {
        this.writeToMessages(msg);
        if (msg.from === 'admin') {
            document.getElementById('messageSound').play();

            if (this.autoResponseState === 'pristine') {
                this.autoResponseState = 'canceled';
            } else if (this.autoResponseState === 'set') {
                this.autoResponseState = 'canceled';
                clearTimeout(this.autoResponseTimer);
            }
        }
    };

    writeToMessages = (msg) => {
        msg.time = new Date();
        this.setState({
            message: this.state.messages.push(msg)
        });

        if (store.enabled) {
            try {
                store.transact(this.messagesKey, function (messages) {
                    messages.push(msg);
                });
            } catch (e) {
                console.log('failed to add new message to local storage', e);
                store.set(this.messagesKey, [])
            }
        }
    }
}
