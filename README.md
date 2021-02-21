# node-red-contrib-ui-egg-timer
An 'egg timer' type ui 'slider' style switch for node-red-dashboard. Switch it on and it switches off after a specified time. Thanks to Mario Fellinger for the inspiration.
    <p>This is a timer switch. It will remain on for only a specified period.</p>
    <h3>Outputs</h3>
        <dl class="message-properties">
        <dt>payload
            <span class="property-type">string | bool</span>
        </dt>
        <dt>topic
            <span class="property-type">string</span>
        </dt>
    <h3>Details</h3>
    <p>This node is designed to work with node-red-dashboard, and has a requirement that this be available. It leans heavily on work done by Mario Fellinger on his 'countdown-timer' and I hope he is no unhappy with this.</p>
    <br>
    <p>This node fulfills the requirement of a switch which once turned on, stays on for a specified time and then automatically turns off. 
        As ever, overrides are provided allowing better control within automated systems, but the UI is basically a switch as per normal dashboard.</p>
    <br>
    <p> The node-red editor provides configuration as per normal rules. The key points for this node are:</p>
    <p> <code>Label</code>: The label for the switch appearing on the web front end</p>
    <p> <code>Seconds</code>: The number of seconds for the switch to remain on.</p>
    <p> <code>On/Off Payload</code>: What should be sent for the appropriate condition.</p>
    <p> <code>Topic</code>: The <code>msg.topic</code> to be used.</p>
    <br>
    <p> the default settings can be overwritten by passing parameters through the <code>msg</code> object as follows: </p>
    <p> <code>msg.timervalue</code> overrides the configured timer - this is whole seconds as a number.</p>
    <p> <code>msg.topic</code> overrides the configured topic.</p>
    <br>
    <p> There is currently NO requirement of the <code>msg.payload</code> setting to trigger the node except <code>false</code> see below. The timer is rest if another on message is sent.</p>
    <p> The switch can be ovewritten by sending <code>msg.payload</code> to <code>false</code> OR sending <code>msg.timervalue</code> as <code>0</code></p>
    <br>
