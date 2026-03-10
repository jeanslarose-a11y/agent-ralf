var background = (function() {
  "use strict";
  function defineBackground(arg) {
    if (arg == null || typeof arg === "function") return { main: arg };
    return arg;
  }
  function handlePageControlMessage(message, sender, sendResponse) {
    const PREFIX2 = "[RemotePageController.background]";
    function debug2(...messages) {
      console.debug(`\x1B[90m${PREFIX2}\x1B[0m`, ...messages);
    }
    const { action, payload, targetTabId } = message;
    if (action === "get_my_tab_id") {
      debug2("get_my_tab_id", sender.tab?.id);
      sendResponse({ tabId: sender.tab?.id || null });
      return;
    }
    chrome.tabs.sendMessage(targetTabId, {
      type: "PAGE_CONTROL",
      action,
      payload
    }).then((result2) => {
      sendResponse(result2);
    }).catch((error) => {
      console.error(PREFIX2, error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    });
    return true;
  }
  const PREFIX = "[TabsController.background]";
  function debug(...messages) {
    console.debug(`\x1B[90m${PREFIX}\x1B[0m`, ...messages);
  }
  function handleTabControlMessage(message, sender, sendResponse) {
    const { action, payload } = message;
    switch (action) {
      case "get_active_tab": {
        debug("get_active_tab");
        chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
          const tabId = tabs.length > 0 ? tabs[0].id || null : null;
          debug("get_active_tab: success", tabId);
          sendResponse({ success: true, tabId });
        }).catch((error) => {
          sendResponse({ error: error instanceof Error ? error.message : String(error) });
        });
        return true;
      }
      case "get_tab_info": {
        debug("get_tab_info", payload);
        chrome.tabs.get(payload.tabId).then((tab) => {
          debug("get_tab_info: success", tab);
          sendResponse(tab);
        }).catch((error) => {
          sendResponse({ error: error instanceof Error ? error.message : String(error) });
        });
        return true;
      }
      case "open_new_tab": {
        debug("open_new_tab", payload);
        chrome.tabs.create({ url: payload.url, active: false }).then((newTab) => {
          debug("open_new_tab: success", newTab);
          sendResponse({ success: true, tabId: newTab.id, windowId: newTab.windowId });
        }).catch((error) => {
          sendResponse({ error: error instanceof Error ? error.message : String(error) });
        });
        return true;
      }
      case "create_tab_group": {
        debug("create_tab_group", payload);
        chrome.tabs.group({ tabIds: payload.tabIds, createProperties: { windowId: payload.windowId } }).then((groupId) => {
          debug("create_tab_group: success", groupId);
          sendResponse({ success: true, groupId });
        }).catch((error) => {
          console.error(PREFIX, "Failed to create tab group", error);
          sendResponse({ error: error instanceof Error ? error.message : String(error) });
        });
        return true;
      }
      case "update_tab_group": {
        debug("update_tab_group", payload);
        chrome.tabGroups.update(payload.groupId, payload.properties).then(() => {
          sendResponse({ success: true });
        }).catch((error) => {
          sendResponse({ error: error instanceof Error ? error.message : String(error) });
        });
        return true;
      }
      case "add_tab_to_group": {
        debug("add_tab_to_group", payload);
        chrome.tabs.group({ tabIds: payload.tabId, groupId: payload.groupId }).then(() => {
          sendResponse({ success: true });
        }).catch((error) => {
          sendResponse({ error: error instanceof Error ? error.message : String(error) });
        });
        return true;
      }
      case "close_tab": {
        debug("close_tab", payload);
        chrome.tabs.remove(payload.tabId).then(() => {
          sendResponse({ success: true });
        }).catch((error) => {
          sendResponse({ error: error instanceof Error ? error.message : String(error) });
        });
        return true;
      }
      default:
        sendResponse({ error: `Unknown action: ${action}` });
        return;
    }
  }
  function setupTabChangeEvents() {
    console.log("[TabsController.background] setupTabChangeEvents");
    chrome.tabs.onCreated.addListener((tab) => {
      debug("onCreated", tab);
      chrome.runtime.sendMessage({ type: "TAB_CHANGE", action: "created", payload: { tab } }).catch((error) => {
        debug("onCreated error:", error);
      });
    });
    chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
      debug("onRemoved", tabId, removeInfo);
      chrome.runtime.sendMessage({
        type: "TAB_CHANGE",
        action: "removed",
        payload: { tabId, removeInfo }
      }).catch((error) => {
        debug("onRemoved error:", error);
      });
    });
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      debug("onUpdated", tabId, changeInfo);
      chrome.runtime.sendMessage({
        type: "TAB_CHANGE",
        action: "updated",
        payload: { tabId, changeInfo, tab }
      }).catch((error) => {
        debug("onUpdated error:", error);
      });
    });
  }
  const definition = defineBackground(() => {
    console.log("[Background] Service Worker started");
    setupTabChangeEvents();
    chrome.storage.local.get("PageAgentExtUserAuthToken").then((result2) => {
      if (result2.PageAgentExtUserAuthToken) return;
      const userAuthToken = crypto.randomUUID();
      chrome.storage.local.set({ PageAgentExtUserAuthToken: userAuthToken });
    });
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === "TAB_CONTROL") {
        return handleTabControlMessage(message, sender, sendResponse);
      } else if (message.type === "PAGE_CONTROL") {
        return handlePageControlMessage(message, sender, sendResponse);
      } else {
        sendResponse({ error: "Unknown message type" });
        return;
      }
    });
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {
    });
  });
  function initPlugins() {
  }
  globalThis.browser?.runtime?.id ? globalThis.browser : globalThis.chrome;
  function print(method, ...args) {
    return;
  }
  const logger = {
    debug: (...args) => print(console.debug, ...args),
    log: (...args) => print(console.log, ...args),
    warn: (...args) => print(console.warn, ...args),
    error: (...args) => print(console.error, ...args)
  };
  let result;
  try {
    initPlugins();
    result = definition.main();
    if (result instanceof Promise) console.warn("The background's main() function return a promise, but it must be synchronous");
  } catch (err) {
    logger.error("The background crashed on startup!");
    throw err;
  }
  var background_entrypoint_default = result;
  return background_entrypoint_default;
})();
