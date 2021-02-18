/*
MIT License

Copyright (c) 2021 Ron Holmes

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

module.exports = function(RED) {
	'use strict';

	function HTML(config) {
		const uniqueId = config.id.replace(".", "");
		// define a name for the primary div which is unique to allow for more than one switch
		const divPrimary = "ui-cts-" + uniqueId;
		// and these are the associated buttons
		const styles = String.raw`
		<style>
			#${divPrimary} {
				height:150px;
				padding: 0 2px 0 6px;
				overflow-x: hidden;
			}
			#${divPrimary} md-select md-select-value {
				color: var(--nr-dashboard-widgetTextColor);
				border-color: var(--nr-dashboard-pageTitlebarBackgroundColor);
			}
			#${divPrimary} .md-button {
				margin: 0 5px 0 0;
				width: 100%;
				min-width: 36px;
				height: 36px;
			}
		</style>`
		;
		//
		const timerBody = String.raw`
		<div id="${divPrimary}" ng-init='init(${JSON.stringify(config)})'>
		<md-content layout="row" layout-align="start center">
			<label>${config.label}</label>
			<md-switch aria-label="switch" layout-align="end center" ng-change="switchChanged(switchState)" ng-model="switchState"> </md-switch>
		</md-content>
		</div>
		`;

		const html = String.raw`
		${styles}
		${timerBody}`
		return html;
	}

	function checkConfig(config, node) {
		if (!config) {
		  node.error(RED._("egg-timer : No Configuration"));
		  return false;
		}
		if (!config.hasOwnProperty("group")) {
		  node.error(RED._("egg-timer : No Group"));
		  return false;
		}
		return true;
	}

    function EggTimerNode(config) {
		try {
			let ui = undefined;
			if(ui === undefined) {
				ui = RED.require("node-red-dashboard")(RED);
			}
			// OK Create the node 
			RED.nodes.createNode(this,config);

			var node = this;
			let timeout = null;			// ensure we start clean
			let currentState = {started : null, ends: null, switchState: false};
			// this next bit picks up the current state as a callback function from http node
			this.getStateCallback = function getStateCallback(req, res) {
				res.send(currentState);
			}
			// and this will set the timeout running as appropriate
			this.setTimoutCallback = function setTimoutCallback(req, res) {
				activateTimer(Number(req.params.value));
				res.end();
			}
			// set the timer to the current specified value
			function activateTimer(millis) {
				if (isNaN(millis) || millis < 1 || millis > 2147483647) return;
				node.send(prepareMessage(true));
				currentState.ends = currentState.started + millis;

				timeout = setTimeout(function() {
					node.send(prepareMessage(false));
				}, currentState.ends - new Date().getTime());
			}
			// this gives the node feedback which is also a carrier for the timeout value
			function prepareMessage(value) {
				if (timeout) clearTimeout(timeout);

				if (value) {
					currentState.started = new Date().getTime();
					currentState.ends = null;
					currentState.switchState = value;
					node.status({fill: "green", shape: "dot", text: "on" });
				} else {
					currentState.started = null;
					currentState.ends = null;
					currentState.switchState = value;
					node.status({fill: "red", shape: "ring", text: "off" });
				}
				// set up the correct values to pass
				const payload = value ? config.onvalue : config.offvalue;
				const payloadType = value ? config.onvalueType : config.offvalueType;
				
				if (payloadType === "date") value = Date.now();
				else value = RED.util.evaluateNodeProperty(payload,payloadType,node);

				const nmsg = {
					payload: value
				};
				nmsg.topic = config.topic;					
				return nmsg; 
			}

			if (checkConfig(config, node)) {
				const done = ui.addWidget({
					node: node,
					format: HTML(config),
					templateScope: "local",
					group: config.group,
					order: config.order,
					emitOnlyNewValues: false,
					forwardInputMessages: false,
					storeFrontEndInputAsState: true,
					persistantFrontEndValue : true,

					beforeEmit: function (msg, value) {
						// TODO make sure incoming msg object is handled properly
						// if we have received a timer value as part of the inbound message
						if (msg.hasOwnProperty("timervalue") && Number.isInteger(msg.timervalue)) {
							if (msg.timervalue === 0) {
								node.send(prepareMessage(false));
							} else {
								activateTimer(msg.timervalue*1000);
							}
						} else {
							if (value === RED.util.evaluateNodeProperty(config.onvalue,config.onvalueType,node)) {
								activateTimer(config.timervalue*1000);
							} else if (value === RED.util.evaluateNodeProperty(config.offvalue,config.offvalueType,node)) {
								// prepareMessage(false);
								node.send(prepareMessage(false));
							}
						}
						return {msg: msg};
					},
					beforeSend: function (msg, orig) {
						if (orig && orig.msg) {
							if (orig.msg.payload === "updateUis") {
								delete orig.msg.payload;
								return [null];
							}
							orig.msg = prepareMessage(orig.msg.payload);
							return orig.msg;
						}
					},
					initController: function ($scope) {
						// set up the controller portion
						$scope.init = function (config) {
							$scope.nodeId = config.id;
							$scope.timervalue = config.timervalue;
						}

						// watch for an input message
						$scope.$watch('msg', function() {
							$scope.getState();
						});

						$scope.switchChanged = function(switchState) {
							// the switch has changed
							// if it is on - start the timer - otherwise just stop
							if (switchState) {
								$scope.setServerTimeout($scope.timervalue*1000);
							} else {
								$scope.send({payload: switchState});
							}
						};
						// this uses AJAX to communicate to and from to front end (client side)
						$scope.getState = function() {
							$.ajax({
								url: "ui-egg-timer/getNode/" + $scope.nodeId,
								dataType: 'json',
								async: true,
								success: function(json) {
									$scope.setState(json);
								},
								complete: function() {
									$scope.$digest();
								}
							});
						}
						// current state is reflected at the front end
						$scope.setState = function(json) {
							$scope.started = json.started;
							$scope.ends = json.ends;
							$scope.switchState = json.switchState;
							
							if ($scope.started) {
							}
							if ($scope.ends) {
								clearTimeout($scope.localTimeout);
								$scope.localTimeout = setTimeout($scope.getState, $scope.ends - new Date().getTime());
							}
						}
						// but it is the server controlling the timing function
						$scope.setServerTimeout = function(millis) {
							$.ajax({
								url: "ui-egg-timer/getNode/" + $scope.nodeId + "/" + millis,
								dataType: 'json',
								async: true,
								complete: function() {
									$scope.send({payload: "updateUis"});
								}
							});
						}
						// DOM manipulation
						// $scope.getElement = function(elementId) {
						// 	return document.querySelector("#" + elementId + "-" + $scope.nodeId.replace(".", ""));
						// }
					}					
				});

				node.on("close", function() {
					if (done) {
						clearTimeout(timeout);
						done();
					}
				});
			}
		} catch(error) {
			console.log("EggTimerNode:", error);
		}
	};

	RED.nodes.registerType("ui_egg_timer", EggTimerNode);

	const uiPath = ((RED.settings.ui || {}).path) || 'ui';
	let nodePath = '/' + uiPath + '/ui-egg-timer/getNode/:nodeId';
	nodePath = nodePath.replace(/\/+/g, '/');
	// these routines ensure a flow of info between server and client
	RED.httpNode.get(nodePath, function(req, res) {
		const nodeId = req.params.nodeId;
		const node = RED.nodes.getNode(nodeId);
		node ? node.getStateCallback(req, res) : res.send(404).end();
	});

	RED.httpNode.get(nodePath + "/:value", function(req, res) {
		const nodeId = req.params.nodeId;
		const node = RED.nodes.getNode(nodeId);
		node ? node.setTimoutCallback(req, res) : res.send(404).end();
	});
}