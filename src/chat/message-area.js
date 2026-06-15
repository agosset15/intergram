import { h, Component } from 'preact';

const fmtTime = (d) => new Date(d).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', hour12: false});
const fmtDateTime = (d) => {
    const dt = new Date(d);
    return dt.toLocaleDateString([], {month: 'numeric', day: 'numeric', year: '2-digit'}) +
           ' ' + fmtTime(dt);
};

const dayInMillis = 60 * 60 * 24 * 1000;

export default class MessageArea extends Component {

    componentDidMount() {
        window.scrollTo(0, document.body.scrollHeight);
    }

    componentDidUpdate() {
        window.scrollTo(0, document.body.scrollHeight);
    }

    render(props,{}) {
        const currentTime = new Date();
        return (
            <ol class="chat">
                {props.messages.map(({name, text, from, time}) => {
                    if (from === 'visitor') {
                        name = props.conf.visitorPronoun;
                    }
                    return (
                        <li class={from}>
                            <div class="msg">
                                <p>{name ? name + ': ' + text : text}</p>
                                { (props.conf.displayMessageTime) ?
                                    <div class="time">
                                        {
                                            currentTime - new Date(time) < dayInMillis ?
                                                fmtTime(time) :
                                                fmtDateTime(time)
                                        }
                                    </div> 
                                    :
                                    ''
                                }
                            </div>
                        </li>
                    );
                })}
            </ol>
        );
    }

}
