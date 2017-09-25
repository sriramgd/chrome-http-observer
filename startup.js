/*
* Http observer v1.3.0
* http://www.sgdevs.com
*
* Copyright (c) 2017 sgdevs
* Licensed under the MIT license
*/

chrome.browserAction.onClicked.addListener(function(tab) {
  chrome.debugger.attach({tabId:tab.id}, version,
    onAttach.bind(null, tab.id));
});

var version = "1.0";

function onAttach(tabId) {
  if (chrome.runtime.lastError) {
    alert(chrome.runtime.lastError.message);
    return;
  }

  var transitionEvents = [];
  var transitionData = [];

  chrome.webNavigation.onCompleted.addListener(function(data) {
    transitionEvents.push("onCompleted");
    transitionData.push(data);
    if (data && data.frameId === 0 && data.url && !(data.url.startsWith("chrome-"))) {
      var port = chrome.runtime.connect({name: "command"});
      port.postMessage({command: "onCompleted", data: data});
    }
  });

  /* 
   * TODO
  chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      if (request.command == "getNavigation") {
        sendResponse({events: transitionEvents, data: transitionData});
     }
    });
  *  ~TODO
  */

  chrome.windows.create({
    url: "httpobserver.html?" + tabId, type: "popup", width: 800, height: 600
  });
}


