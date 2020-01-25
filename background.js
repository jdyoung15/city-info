//chrome.runtime.onInstalled.addListener(function() {
//  chrome.storage.sync.set({color: '#3aa757'}, function() {
//    console.log("The color is green.");
//  });
//
//	chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
//    chrome.declarativeContent.onPageChanged.addRules([{
//      conditions: [new chrome.declarativeContent.PageStateMatcher({
//        pageUrl: {hostEquals: 'developer.chrome.com'},
//      })
//      ],
//          actions: [new chrome.declarativeContent.ShowPageAction()]
//    }]);
//  });
//
//	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
//	  chrome.tabs.sendMessage(tabs[0].id, {message: "urlChange"});
//	});
//
//});

//chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
//  console.log('background js');
//  chrome.tabs.sendMessage(
//    tabId, 
//    {message: 'urlChange', url: changeInfo.url}
//  );
//});
