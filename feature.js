/*
* Http observer v1.3.0
* http://www.sgdevs.com
*
* Copyright (c) 2017 sriramgd
* Licensed under the MIT license
*/

//var defaultMaxRequests = 10;
var navigateClearState = "r";
var countUptoOneAfterClear = 0;
var showChart = false;
var chartTimer;
//TODO - make this a setting
var chartTimeout = 2000;

document.getElementById("openChart").style.visibility = "hidden";

/* function getMaxRequests() {
  var maxRequests = parseInt(localStorage["maxHttpRequests"]);
  if (maxRequests)  {
    return maxRequests
  }
  else {
    return defaultMaxRequests;
  }
} */

//var maxRequestsBeforeClear = getMaxRequests();

var sortEnum = {
  DEFAULT : 1,
  NUMBER : 2,
  IDFLOAT: 3,
  COOKIESIZE: 4
};

var requests = {};
var responses = {};
var dataLengths = {};
var responseBodies = {};
var errorResponses = {};

var textAreaWithDetails = document.createElement("textarea");
textAreaWithDetails.id = "textAreaWithDetails";
textAreaWithDetails.className = "textarea-Details";
textAreaWithDetails.value = "";

document.body.appendChild(textAreaWithDetails);

var tabId = parseInt(window.location.search.substring(1));

chrome.runtime.onConnect.addListener(function(port) {
  port.onMessage.addListener(function(msg) {
     if (msg.command === "onCompleted") {
      navigateClearState = "r";
    }
  });
});

chrome.webRequest.onBeforeRequest.addListener(function(data) {
    navigateClearState = "c";
}, 
  {
    urls: ["<all_urls>"],
    types: ["main_frame"]  
  }, 
  ["blocking"]
);


chrome.tabs.onRemoved.addListener(function(closedTabId, removed) {
  if (tabId === closedTabId) {
    window.close();
  }
});

function resize() {
  var groups = document.getElementsByClassName("request-groupings");
  var cookieContainer = document.getElementsByClassName("cookie-container");
  var requestDetails = document.getElementsByClassName("request-details");
  var responseDetails = document.getElementsByClassName("response-details");
  var titleHeight = document.getElementsByClassName("title")[0].offsetHeight
  var firstRowHeight = document.getElementsByClassName("first-row")[0].offsetHeight
  var secondRowHeight = document.getElementsByClassName("first-row")[0].offsetHeight
  var contentRowHeight = (window.innerHeight - titleHeight - firstRowHeight - secondRowHeight) / 2;
  var height = "height:" + contentRowHeight + "px";
  groups[0].setAttribute("style", height);
  cookieContainer[0].setAttribute("style", height);
  requestDetails[0].setAttribute("style", height);
  responseDetails[0].setAttribute("style", height);
}

window.onresize = function() {
  resize();
}

document.addEventListener("DOMContentLoaded", function() {
  resize();
});

window.addEventListener("unload", function() {
  chrome.debugger.detach({tabId:tabId});
});


function DeleteTableRows(tableToClear) {
  if (tableToClear.rows) {
    var rowCount = tableToClear.rows.length;
    for (var i = rowCount - 1; i > 0; i--) {
      tableToClear.deleteRow(i);
    }
  }
}

function clearAll() {
  countUptoOneAfterClear = 0;
  document.getElementById("openChart").style.visibility = "hidden";
  didChartClose = false;
  showChart = false;
  if (chartTimer) {
    window.clearTimeout(chartTimer);
  }
  requests = {};
  responses = {};
  dataLengths = {};
  responseBodies = {};
  errorResponses = {};
  var requestTable = document.getElementById("request-table");
  DeleteTableRows(requestTable);
  var requestsHeader = document.getElementById("requests-header");
  requestsHeader.innerHTML = "Requests";
  var cookieTable = document.getElementById("cookie-table");
  DeleteTableRows(cookieTable);
  var requestResponseTable = document.getElementById("request-response-headers");
  DeleteTableRows(requestResponseTable);
  var otherRequestTable = document.getElementById("other-request-info");
  DeleteTableRows(otherRequestTable);
  var responseBodyTable = document.getElementById("response-body");
  DeleteTableRows(responseBodyTable);
  var cookieInfo = document.getElementById("cookieInfo");
  cookieInfo.innerHTML = "";
  var sortables = document.getElementsByClassName("sortable");
  for (var i = 0; i < sortables.length; i++) {
    sortables.item(i).setAttribute("data-sort-order", "none");
  }
  var sortinds = document.getElementsByClassName("sortind");
  for (var j = 0; j < sortinds.length; j++) {
    sortinds.item(j).innerHTML = "";
  }
  document.getElementById("url-full").value = "";
  document.getElementById("copy-as-string").disabled = true;
  document.getElementById("copy-as-json").disabled = true;

  if (document.getElementById("toggleNetworkCache").checked === true) {
    chrome.debugger.sendCommand({tabId:tabId}, "Network.setCacheDisabled", 
        {"cacheDisabled": true});
  }
  else {
    chrome.debugger.sendCommand({tabId:tabId}, "Network.setCacheDisabled", 
        {"cacheDisabled": false});
  }

  //maxRequestsBeforeClear = getMaxRequests();
}

clearAll();

function sortTable(tableId, n, sortType, sortOrder){
    var tbl = document.getElementById(tableId).tBodies[0];
    var store = [];
    for(var i=0, len=tbl.rows.length; i<len; i++){
        var row = tbl.rows[i];
        var sortnr = row.cells[n].textContent || row.cells[n].innerText;
        if(sortnr) store.push([sortnr, row]);
    }
    store.sort(function(x, y){
      if (sortType === sortEnum.NUMBER) {
        if (sortOrder === "desc") {
          return y[0] - x[0];
        }
        else {
          return x[0] - y[0];
        }
      }
      else if (sortType === sortEnum.COOKIESIZE) {
        var cookieSizeX = x[0].split("(")[1].slice(0, -1);
        var cookieSizeY = y[0].split("(")[1].slice(0, -1);
        if (sortOrder === "desc") {
          return cookieSizeY - cookieSizeX;
        }
        else {
          return cookieSizeX - cookieSizeY;
        }
      }
      else if (sortType === sortEnum.IDFLOAT) {
        var firstInt = parseInt(x[0].split(".")[0]);
        var firstDecimal = parseInt(x[0].split(".")[1]);
        var secondInt = parseInt(y[0].split(".")[0]);
        var secondDecimal = parseInt(y[0].split(".")[1]);
        if (sortOrder === "desc") {
          if (secondInt === firstInt) {
            return secondDecimal - firstDecimal;
          }
          else {
            return secondInt - firstInt;
          }
        }
        else {
          if (secondInt === firstInt) {
            return firstDecimal - secondDecimal;
          }
          else {
            return firstInt - secondInt;
          }
        }
      }
      else {
        if (sortOrder === "desc") {
          if (y[0] < x[0]) {
            return -1;
          }
          if (y[0] > x[0]) {
            return 1;
          }
          return 0;
        }
        else {
          if (x[0] < y[0]) {
            return -1;
          }
          if (x[0] > y[0]) {
            return 1;
          }
          return 0;
        }
      }
    });
    for(var i=0, len=store.length; i<len; i++){
        tbl.appendChild(store[i][1]);
    }
    store = null;
}

function getSummaryInfo() {
  var domains = {};
  var tableOutput = "";
  var loc = document.createElement("a");
  for (var aRequest in requests) {
    var aResponse = responses[aRequest];
    if (requests.hasOwnProperty(aRequest)) {
      loc.href = requests[aRequest].url;
      if (loc.hostname) {
        if (!(loc.hostname in domains)) {
          domains[loc.hostname] = {};
          domains[loc.hostname].count = 1;
          domains[loc.hostname].cookie = {};
          domains[loc.hostname].mimeTypes = {};
          domains[loc.hostname].protocols = {};
          domains[loc.hostname].securityStates = {};
        }
        //For each domain get cookie, url and response type and security type
        domains[loc.hostname].count++;

        var responseBody = responseBodies[aRequest];
        if (responseBody && responseBody.cookiesFromChrome) {
          var totalCookiesLength = 0;
          var numberOfCookies = responseBody.cookiesFromChrome.length;
          for (var i = 0; i < numberOfCookies; i++) {
            var cookie = responseBody.cookiesFromChrome[i];
            if (cookie && cookie.name) {
              domains[loc.hostname].cookie[cookie.name] = "";
            }
          }
        }
        var aResponse = responses[aRequest];
        if (aResponse) {
          if (aResponse.mimeType) {
            domains[loc.hostname].mimeTypes[aResponse.mimeType] = "";
          }
          if (aResponse.protocol) {
            domains[loc.hostname].protocols[aResponse.protocol] = "";
          }
          if (aResponse.securityState) {
            domains[loc.hostname].securityStates[aResponse.securityState] = "";
          }
        }

        //TODO: Get response type, security state and protocol
      }
      else {
        //TODO: Handle things without url here
      }
    }
  }

  tableOutput = '<table id="overlaySummaryTable"><thead><tr><th>Domain</th><th>Requests</th><th>(count) Protocols</th><th>(count) Security States</th><th>(count) Mime Types</th><th>(Count) Cookies</th></tr></thead>';
  
  for (var domain in domains) {
    tableOutput += "<tr>";
    tableOutput += "<td>";
    tableOutput += domain;
    tableOutput += "</td>";
    tableOutput += "<td>";
    tableOutput += domains[domain].count;
    tableOutput += "</td>";
    tableOutput += "</td>";
    tableOutput += "</td>";
    if (domains[domain].protocols) {
      tableOutput += "<td>";
      var protocolKeys = Object.keys(domains[domain].protocols);
      tableOutput += "(" + protocolKeys.length + ")<br>" + protocolKeys.join();
      tableOutput += "</td>";
    }
    tableOutput += "</td>";
    if (domains[domain].securityStates) {
      tableOutput += "<td>";
      var securityKeys = Object.keys(domains[domain].securityStates);
      tableOutput += "(" + securityKeys.length + ")<br>" + securityKeys.join();
      tableOutput += "</td>";
    }
    if (domains[domain].mimeTypes) {
      tableOutput += "<td>";
      var mimeKeys = Object.keys(domains[domain].mimeTypes);
      tableOutput += "(" + mimeKeys.length + ")<br>" + mimeKeys.join();
      tableOutput += "</td>";
    }
    if (domains[domain].cookie) {
      tableOutput += "<td>";
      var cookieKeys = Object.keys(domains[domain].cookie);
      tableOutput += "(" + cookieKeys.length + ")<br>" + cookieKeys.join();
      tableOutput += "</td>";
    }
    tableOutput += "</tr>";
  }
  tableOutput += "</table>";
  return tableOutput;
}

document.getElementById("openChart").addEventListener("click", function() {
  var overLay = document.getElementById("overlay");
  overLay.style.display = "block";
  var summaryInfo = getSummaryInfo();
  overLay.innerHTML += '<div class="container" id="overlayContainer"><h6 class="title"></h6><div class="row overlay-first-row"><div class="column"><button id="overlayCloseButton" class="button">&#10060; Close</button></div></div><div class="row overlay-second-row">' + summaryInfo + '</div></div>';

  document.getElementById("overlayCloseButton").addEventListener("click", function() {
    overLay.innerHTML = "";
    document.getElementById("overlay").style.display = "none";
  });

  /* 
   * TODO
  chrome.runtime.sendMessage({command: "getNavigation"}, function(response) {
    console.log(response.events);
    console.log(response.data);
  });
  * ~TODO
  */
});


document.getElementById("copy-as-string").addEventListener("click", function() {
  var copyUrl = document.querySelector("#url-full");
  copyUrl.select();

  try {
    var successful = document.execCommand("copy");
    if (!successful) {
      console.log("Error: unable to copy");
    }
  } catch (err) {
    console.log("Error: unable to copy");
  }
});

document.getElementById("copy-as-json").addEventListener("click", function() {
  var copyDetails = document.querySelector("#textAreaWithDetails");
  copyDetails.select();

  try {
    var successful = document.execCommand("copy");
    if (!successful) {
      console.log("Error: unable to copy");
    }
  } catch (err) {
    console.log("Error: unable to copy");
  }
});

window.addEventListener("load", function() {
  /* if (tabId != debuggeeId.tabId) {
    return;
  } */

  chrome.debugger.sendCommand({tabId:tabId}, "Network.enable");
  chrome.debugger.onEvent.addListener(processHttp);

  var recordButton;
  var stopButton;
  var clearButton;
  var progressText;

  function setActionButtonStates(recordDisabledState, stopDisabledState, clearDisabledState) {
    if (!recordButton) {
      recordbutton = document.getElementById("recordbutton");
      stopbutton = document.getElementById("stopbutton");
      clearbutton = document.getElementById("clearbutton");
      progressText = document.getElementById("progressText");
    }
    recordbutton.disabled = recordDisabledState;
    stopbutton.disabled = stopDisabledState;
    clearbutton.disabled = clearDisabledState;
    if (recordbutton.disabled) {
     progressText.innerHTML = "Recording...";
    }
    else
    {
      progressText.innerHTML = "Paused";
    }
  }

  stopbutton.addEventListener("click", function() {
    chrome.debugger.sendCommand({tabId:tabId}, "Network.disable");
    setActionButtonStates(false, true, false);
  });

  recordbutton.addEventListener("click", function() {
    chrome.debugger.sendCommand({tabId:tabId}, "Network.enable");
    setActionButtonStates(true, false, true);
  });

  clearbutton.addEventListener("click", function() {
    clearAll();
    setActionButtonStates(false, true, true);
  });

  setActionButtonStates(true, false, true);

  var sortables = document.getElementsByClassName("sortable");

  Array.prototype.forEach.call(sortables, function(sortable) {
    switch (sortable.id) {
      case "requestTableId" :
          AddSortEvent(sortable, "request-table", 0, sortEnum.IDFLOAT);
        break;
      case "requestTableMethod" :
          AddSortEvent(sortable, "request-table", 1, sortEnum.DEFAULT);
        break;
      case "requestTableUrl" :
          AddSortEvent(sortable, "request-table", 2, sortEnum.DEFAULT);
        break;
      case "cookieTableSize" :
          AddSortEvent(sortable, "cookie-table", 0, sortEnum.COOKIESIZE);
        break;
      case "headersTableHeader" :
          AddSortEvent(sortable, "request-response-headers", 0, sortEnum.DEFAULT);
        break;
      case "headersTableRequest" :
          AddSortEvent(sortable, "request-response-headers", 1, sortEnum.DEFAULT);
        break;
      case "headersTableValue" :
          AddSortEvent(sortable, "request-response-headers", 2, sortEnum.DEFAULT);
        break;
      }
    });
});

function AddSortEvent(sortable, table, column, sortType) {
  sortable.addEventListener("click", function(e) {
    var sortOrder = sortable.getAttribute("data-sort-order");
    if (sortOrder === "none") {
      sortOrder = "asc";
    }
    sortTable(table, column, sortType, sortOrder);
    sortable.setAttribute("data-sort-order", (sortOrder === "asc") ? "desc" : "asc");
    sortable.parentNode.childNodes.forEach(function (sortableSibling) {
      if (sortableSibling.constructor.name === "HTMLTableCellElement") {
        sortableSibling.getElementsByClassName("sortind")[0].innerHTML = "";
      }
    });

    sortable.getElementsByClassName("sortind")[0].innerHTML = (sortOrder === "asc") ? "&#9660;" : "&#9650;";
  });
}

function getRequestRowIdFromRequestId(id) {
  return "requestid_" + id.replace(/\./g, "_");
}

function getRequestIdFromRequestRowId(id) {
  return id.substring(10).replace(/_/g, "_");
}

function getContentType(response) {
  if (response.mimeType) {
    return response.mimeType;
  }
  else {
    return false;
  }
}

function appendHeaders(container, headerType, headers) {
  for (var name in headers) {
    var headerRow = container.insertRow(container.rows.length);
    //TODO: Give an id to the header row for giving tips?
    //headerRow.id = getRequestRowIdFromRequestId(params.requestId);
    var headerNameCell = headerRow.insertCell(0);
    var headerIsRequestCell = headerRow.insertCell(1);
    var headerValueCell = headerRow.insertCell(2);
    var helpLink = "https://www.google.com/?#q=http+header+" + name;
    headerNameCell.innerHTML = '<strong><a href="' + helpLink + '" target="_blank">' + name + '</a></strong>';
    headerIsRequestCell.innerHTML = headerType;
    headerValueCell.innerHTML = headers[name];
  }
}

function appendBody(container, request) {
  if (request) {
    for (var key in request) {
      if (request.hasOwnProperty(key) && key !== "headers") {
        var requestRow = container.insertRow(container.rows.length);
        var requestNameRowCell = requestRow.insertCell(0);
        var requestValueRowCell = requestRow.insertCell(1);
        requestNameRowCell.innerHTML = String(key);
        requestValueRowCell.innerHTML = String(request[key]);
      }
    }
  }
}

//Display response status information
function displayResponseStatus(responseBodyBody, response, requestId) {
  var statusLine = document.createElement("div");
  if (response) {
    var helpLink = "https://www.bing.com?q=http+response+status+code+" + response.status;
    statusLine.innerHTML = 'HTTP/1.1 <a href="' + helpLink + '" target="_blank">' + response.status + '</a>' + " " +
      response.statusText;
    if (response.fromDiskCache) {
      statusLine.innerHTML += "<strong> from disk cache</strong>";
    }
    else {
      statusLine.innerHTML += "<strong> network call, not from disk cache</strong>";
    }
    if (response.mimeType) {
      statusLine.innerHTML += "<br> Mime type: " + response.mimeType;
    }
    if (response.securityState) {
      statusLine.innerHTML += "<br> Security state: " + response.securityState;
    }
    if (response.connectionReused) {
      statusLine.innerHTML += "<br> Was physical connection reused? " + response.connectionReused;
    }
    if (dataLengths[requestId] && dataLengths[requestId]) {
      statusLine.innerHTML += "<br> Response encoded data length: " + dataLengths[requestId] + " bytes";
    }
    if (response.protocol) {
      statusLine.innerHTML += "<br> Protocol: " + response.protocol;
    }
    if (response.remoteIPAddress) {
      statusLine.innerHTML += "<br> Available remote IP Address: " + response.remoteIPAddress;
    }
    if (response.remotePort) {
      statusLine.innerHTML += "<br> Available remote port: " + response.remotePort;
    }
    if (response.securityDetails && response.securityDetails.protocol) {
      statusLine.innerHTML += "<br> Security protocol: " + response.securityDetails.protocol;
    }
  }

  var contentRow = responseBodyBody.insertRow(responseBodyBody.rows.length);
  //TODO: Give an id to the content row for giving tips?
  //contentRow.id = getRequestRowIdFromRequestId(params.requestId);
  var headerNameCell = contentRow.insertCell(0);
  headerNameCell.appendChild(statusLine);
}


/** Response formatters **/

function escapeHtml(content) {
  content = content.replace(/&/g, "&amp;");
  content = content.replace(/</g, "&lt;");
  content = content.replace(/>/g, "&gt;");
  content = content.replace(/\\r?\\n/g, "<br />");
  content = content.replace(/\\t/g, "&nbsp;&nbsp;");
  content = content.replace(/\\"/g, "\"");
  content = "<pre class='html-pre'><code>" + content + "</code></pre>";
  return content;
}

function escapeStaticContent(content) {
  content = content.replace(/\\t/g, "&nbsp;&nbsp;");
  content = content.replace(/(\\r)?\\n/g, "<br />");
  content = content.replace(/\\"/g, "\"");
  content = "<pre class='html-pre'><code>" + content + "</code></pre>";
  return content;
}

function escapeJavascript(content) {
  return content;
}

//From: http://stackoverflow.com/a/7220510
function syntaxHighlightJson(json) {
  if (typeof json != "string") {
    json = JSON.stringify(json, undefined, 2);
  }
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
      var cls = "number";
      if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = "key";
      } else {
        cls = "string";
      }
      } else if (/true|false/.test(match)) {
        cls = "boolean";
      } else if (/null/.test(match)) {
        cls = "null";
      }
      return '<span class="' + cls + '">' + match + '</span>';
      });
}

function escapeJson(content) {
  var formattedJson = syntaxHighlightJson(content);
  content = "<pre class='html-pre'><code>" + formattedJson + "</code></pre>";
  return content;
}

function noEscape(content) {
  return content;
}

function formatText(isEncoded, body, escapeFunc) {
  var content = "";
  if (isEncoded) {
    content = JSON.stringify(btoa(body));
  }
  else {
    content = JSON.stringify(body, null);
  }
  content = escapeFunc(content);
  return content;
}

/** ~Response formatters **/

//Display response. Where possible format the response.
function displayResponseBody(responseBodyBody, response, responseBody) {
  if (!responseBody) {
    return;
  }
  
  var contentType = getContentType(response);
  if (contentType) {

    var contentRow = responseBodyBody.insertRow(responseBodyBody.rows.length);
    //TODO: Give an id to the content row for giving tips?
    //contentRow.id = getRequestRowIdFromRequestId(params.requestId);
    var headerNameCell = contentRow.insertCell(0);

    var contentTypeParts = contentType.split("/");
    var contentTypeFirstPart = contentTypeParts[0].toUpperCase();
    var contentTypeSecondPart = contentTypeParts[1].toUpperCase();
    if (contentTypeFirstPart == "image".toUpperCase()) {
      var imgCanvas = document.createElement("canvas");
      var imgContext = imgCanvas.getContext("2d");
      var img = document.createElement("img");
      img.onload = function() {
        imgContext.drawImage(img, 0, 0);
      }

      var imgString = "data:image/" + contentTypeSecondPart + ";base64," + responseBody.body;
      img.src = imgString;

      headerNameCell.appendChild(imgCanvas);
    }
    else if (contentTypeFirstPart == "text".toUpperCase() || contentTypeFirstPart == "application".toUpperCase()) {
      var escapeFunc = noEscape;
      if (contentTypeSecondPart.toUpperCase().startsWith("html".toUpperCase())) {
        escapeFunc = escapeHtml;
      }
      else if (contentTypeSecondPart.toUpperCase().startsWith("css".toUpperCase())) {
        escapeFunc = escapeStaticContent;
      }
      else if (contentTypeSecondPart.toUpperCase().startsWith("x-javascript".toUpperCase()) || contentTypeSecondPart.toUpperCase().startsWith("javascript".toUpperCase())) {
        escapeFunc = escapeJavascript;
      }
      else if (contentTypeSecondPart.toUpperCase().startsWith("json".toUpperCase())) {
        escapeFunc = escapeJson;
      }
      var bodyTextContent = formatText(responseBody.base64Encoded, responseBody.body, escapeFunc);
      if (contentTypeSecondPart.toUpperCase().startsWith("x-javascript".toUpperCase()) || contentTypeSecondPart.toUpperCase().startsWith("javascript".toUpperCase())) {
        headerNameCell.appendChild(document.createTextNode(bodyTextContent));
      }
      else {
        headerNameCell.innerHTML = bodyTextContent;
      }
    }
    else {
      var bodyTextContentOtherContent = formatText(responseBody.base64Encoded, responseBody.body, noEscape);
      headerNameCell.innerHTM = bodyTextContentOtherContent;
    }
  }
  else 
  {
    var bodyTextContentDefault = formatText(responseBody.base64Encoded, responseBody.body, noEscape);
    headerNameCell.innerHTML = bodyTextContentDefault;
  }
}

//Display cookie information
function displayCookie(responseBody) {
  var cookieTable = document.getElementById("cookie-table"); 
  var cookieTableBody = cookieTable.getElementsByTagName("tbody")[0];
  var cookieInfo = document.getElementById("cookieInfo");
  DeleteTableRows(cookieTable);
  cookieInfo.innerHTML = ""; 
  if (responseBody && responseBody.cookiesFromChrome) {
    var totalCookiesLength = 0;
    var numberOfCookies = responseBody.cookiesFromChrome.length;
    for (var i = 0; i < numberOfCookies; i++) {
      var cookie = responseBody.cookiesFromChrome[i];
      if (cookie) {
        var cookieRow = cookieTableBody.insertRow(cookieTableBody.rows.length);
        var cookieLengthCell = cookieRow.insertCell(0);
        cookieLengthCell.className = "vertical-align-top";
        var cookieDecodedValueCell = cookieRow.insertCell(1);

        if (cookie.name || cookie.value) {
          var cookieLength = (cookie.name ? cookie.name.length : 0) + (cookie.value ? cookie.value.length : 0);
          totalCookiesLength += cookieLength;
          cookieLengthCell.innerHTML = (cookie.name ? " " + cookie.name : "") + "<br>(" + String(cookieLength) + ")";
        }
        var jsonStr = JSON.stringify(cookie,null, 1);
        var formattedJson = syntaxHighlightJson(jsonStr);
        cookieDecodedValueCell.innerHTML = "<pre><code>" + formattedJson + "</code></pre>";
      }
    }
    cookieInfo.innerHTML = String(numberOfCookies) + " cookies. Total size in bytes: " + String(totalCookiesLength); 
  }
}

//Process network messages
function processHttp(debuggeeId, message, params) {
  if (tabId != debuggeeId.tabId) {
    return;
  }

  if (navigateClearState === "c") {
        navigateClearState = "r";
        clearAll();
  }
  /* else {
    if (maxRequestsBeforeClear == 0) {
      clearAll();
    }
    else {
      maxRequestsBeforeClear -= maxRequestsBeforeClear;
    }
  } */

  if (message == "Network.requestWillBeSent") {
    if (params.timestamp) {
      if (countUptoOneAfterClear === 0) {
        countUptoOneAfterClear = 1;
        //Set chart timer here
        chartTimer = setTimeout(function() {
          showChart = false;
          document.getElementById("openChart").style.visibility = "hidden";
        }, chartTimeout);
      }
      else {
        //check chart timer here - if timer has not fired, clear and reset it
        if (showChart) {
        }
        else {
          window.clearTimeout(chartTimer);
          chartTimer = setTimeout(function() {
            showChart = true;
            document.getElementById("openChart").style.visibility = "visible";
          }, chartTimeout);
        }
      }

    }

    if (params.redirectResponse) {
      responses[params.requestId] = params.redirectResponse;
    }
    requests[params.requestId] = params.request;

    var requestTable = document.getElementById("request-table");
    var requestTableBody = requestTable.getElementsByTagName("tbody")[0];
    var requestRow = requestTableBody.insertRow(-1);
    requestRow.id = getRequestRowIdFromRequestId(params.requestId);
    var requestIdCell = requestRow.insertCell(0);
    var requestMethodCell = requestRow.insertCell(1);
    var requestUrlCell = requestRow.insertCell(2);
    requestIdCell.innerHTML = params.requestId;
    requestMethodCell.innerHTML = params.request.method;
    requestUrlCell.innerHTML = params.request.url;
    var requestsHeader = document.getElementById("requests-header");
    var numberOfRequests = requestTableBody.getElementsByTagName("tr").length; 
    requestsHeader.innerHTML = "Requests (" + String(numberOfRequests) + ")";

    //TODO: What is the cost of all these closures?
    requestRow.addEventListener("click", function() {
      for (var i = 0, row; row = requestTable.rows[i]; i++) {
        row.style.backgroundColor="#ffffff";
      }
      requestRow.style.backgroundColor="#BCD4EC";

      //Display the url in text
      document.getElementById("url-full").value = requests[params.requestId].url;
      document.getElementById("copy-as-string").disabled = false;
      document.getElementById("copy-as-json").disabled = false;
      document.getElementById("textAreaWithDetails").value = '{"request": ' + JSON.stringify(requests[params.requestId] || {}) + ', "response": ' +  JSON.stringify(responses[params.requestId] || {}) + ', "error": ' + JSON.stringify(errorResponses[params.requestId] || {}) + '}';

      //Handle headers and response
      var requestResponseHeaders = document.getElementById("request-response-headers"); 
      var headersTableBody = requestResponseHeaders.getElementsByTagName("tbody")[0];
      var responseBodyTable = document.getElementById("response-body"); 
      var responseBodyBody = responseBodyTable.getElementsByTagName("tbody")[0];
      var otherRequestTable = document.getElementById("other-request-info");
      var otherRequestBody = otherRequestTable.getElementsByTagName("tbody")[0];
      headersTableBody.innerHTML = "";
      responseBodyBody.innerHTML = "";
      otherRequestBody.innerHTML = "";
      appendHeaders(headersTableBody, "request", requests[params.requestId].headers);

      if (errorResponses.hasOwnProperty(params.requestId)) {
        appendHeaders(headersTableBody, "response.request", errorResponses[params.requestId].requestHeaders);
        appendHeaders(headersTableBody, "response.response", errorResponses[params.requestId].headers);
        //TODO
      }
      else if (responses.hasOwnProperty(params.requestId)) {
        //TODO: Show tbd till we get response headers on timer?
        var response = responses[params.requestId];
        var responseBody = responseBodies[params.requestId];
        appendHeaders(headersTableBody, "response.request", response.requestHeaders);
        appendHeaders(headersTableBody, "response.response", response.headers);

        displayResponseStatus(responseBodyBody, response, params.requestId);
        displayResponseBody(responseBodyBody, response, responseBody);
        displayCookie(responseBody);
      }
      else {
        //TODO: Clear and show that we dont know what is happening here
        headersTableBody.innerHTML = "";
        responseBodyBody.innerHTML = "";
      }
      appendBody(otherRequestBody, requests[params.requestId]);
    });

  } else if (message == "Network.responseReceived") {
    setTimeout(function() {
      responses[params.requestId] = params.response;
      chrome.debugger.sendCommand({
        tabId: debuggeeId.tabId
      }, "Network.getResponseBody", {
        "requestId": params.requestId
      }, function(response) {
        if (chrome.runtime.lastError) {
          /* console.log("requestid: ");
          console.log(params.requestId);
          console.log("request: ");
          console.log(requests[params.requestId]);
          console.log("error: ");
          console.log(chrome.runtime.lastError); */
        }
        else {                    
          responseBodies[params.requestId] = response;
          var hosturl = requests[params.requestId].url.split("?")[0]
          var hostname = hosturl.split("/")[0] + hosturl.split("/")[1] + hosturl.split("/")[2];
          if (chrome.cookies) {
            chrome.cookies.getAll({url: hostname}, function(cookies) {
              responseBodies[params.requestId].cookiesFromChrome = cookies;
            });
          }
          //TODO remove
          if (params.response && params.response.status) {
            if (params.response.status !== 200) {
              //console.log(params.requestId + " " + params.response.status + " " + requests[params.requestId].url);
            }
          }
          //TODO ~remove

      }

      });
    }, 500); 
  }
  else if (message == "Network.loadingFinished") {
    /* chrome.debugger.sendCommand({
       tabId: debuggeeId.tabId
       }, "Network.getResponseBody", {
       "requestId": params.requestId
       }, function(response) {
       if (chrome.runtime.lastError) {
       console.log("requestid: ");
       console.log(params.requestId);
       console.log("request: ");
       console.log(requests[params.requestId]);
       console.log("error: ");
       errorResponses[params.requestId] = params;
       console.log(chrome.runtime.lastError);
       }
       else {                    
       responseBodies[params.requestId] = response;
    //TODO remove
    if (params.response && params.response.status) {
    if (params.response.status !== 200) {
    console.log(params.requestId + " " + params.response.status + " " + requests[params.requestId].url);
    }
    }
    //TODO ~remove

    }
    }); */
    dataLengths[params.requestId] = params.encodedDataLength;
  }
  else if (message == "Network.loadingFailed") {
    /* console.log("loading failed");
    console.log("blocked reason: " + params.blockedReason);
    console.log("error text: " + params.errorText);
    console.log("type: " + params.type);
    console.log("request id: " + params.requestId);
    console.log("request url: " + JSON.stringify(requests[params.requestId]));
    console.log("" + "~loading failed");
    */
    errorResponses[params.requestId] = params;
  }
}
