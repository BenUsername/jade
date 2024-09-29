chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'someAsyncAction') {
    // Perform async operation
    someAsyncFunction().then(result => {
      sendResponse(result);
    });
    return true; // Indicates that the response will be sent asynchronously
  }
});