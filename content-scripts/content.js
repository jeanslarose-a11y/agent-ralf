var content = (function() {
  "use strict";
  function defineContentScript(definition2) {
    return definition2;
  }
  const browser$1 = globalThis.browser?.runtime?.id ? globalThis.browser : globalThis.chrome;
  const browser = browser$1;
  async function injectScript(path, options) {
    const url = browser.runtime.getURL(path);
    const script2 = document.createElement("script");
    if (browser.runtime.getManifest().manifest_version === 2) script2.text = await fetch(url).then((res) => res.text());
    else script2.src = url;
    const loadedPromise = makeLoadedPromise(script2);
    await options?.modifyScript?.(script2);
    (document.head ?? document.documentElement).append(script2);
    script2.remove();
    await loadedPromise;
    return { script: script2 };
  }
  function makeLoadedPromise(script2) {
    return new Promise((resolve, reject) => {
      const onload = () => {
        resolve();
        cleanup();
      };
      const onerror = () => {
        reject(/* @__PURE__ */ new Error(`Failed to load script: ${script2.src}`));
        cleanup();
      };
      const cleanup = () => {
        script2.removeEventListener("load", onload);
        script2.removeEventListener("error", onerror);
      };
      script2.addEventListener("load", onload);
      script2.addEventListener("error", onerror);
    });
  }
  var __defProp$3 = Object.defineProperty;
  var __name$3 = (target, value) => __defProp$3(target, "name", { value, configurable: true });
  async function waitFor$1(seconds) {
    await new Promise((resolve) => setTimeout(resolve, seconds * 1e3));
  }
  __name$3(waitFor$1, "waitFor");
  async function movePointerToElement(element) {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    window.dispatchEvent(new CustomEvent("PageAgent::MovePointerTo", { detail: { x, y } }));
    await waitFor$1(0.3);
  }
  __name$3(movePointerToElement, "movePointerToElement");
  function getElementByIndex(selectorMap, index) {
    const interactiveNode = selectorMap.get(index);
    if (!interactiveNode) {
      throw new Error(`No interactive element found at index ${index}`);
    }
    const element = interactiveNode.ref;
    if (!element) {
      throw new Error(`Element at index ${index} does not have a reference`);
    }
    if (!(element instanceof HTMLElement)) {
      throw new Error(`Element at index ${index} is not an HTMLElement`);
    }
    return element;
  }
  __name$3(getElementByIndex, "getElementByIndex");
  let lastClickedElement = null;
  function blurLastClickedElement() {
    if (lastClickedElement) {
      lastClickedElement.blur();
      lastClickedElement.dispatchEvent(
        new MouseEvent("mouseout", { bubbles: true, cancelable: true })
      );
      lastClickedElement = null;
    }
  }
  __name$3(blurLastClickedElement, "blurLastClickedElement");
  async function clickElement(element) {
    blurLastClickedElement();
    lastClickedElement = element;
    await scrollIntoViewIfNeeded(element);
    await movePointerToElement(element);
    window.dispatchEvent(new CustomEvent("PageAgent::ClickPointer"));
    await waitFor$1(0.1);
    element.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true, cancelable: true }));
    element.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, cancelable: true }));
    element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    element.focus();
    element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await waitFor$1(0.2);
  }
  __name$3(clickElement, "clickElement");
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  ).set;
  const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value"
  ).set;
  async function inputTextElement(element, text) {
    if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
      throw new Error("Lélément nest pas un input ou textarea");
    }
    await clickElement(element);
    if (element instanceof HTMLTextAreaElement) {
      nativeTextAreaValueSetter.call(element, text);
    } else {
      nativeInputValueSetter.call(element, text);
    }
    const inputEvent = new Event("input", { bubbles: true });
    element.dispatchEvent(inputEvent);
    await waitFor$1(0.1);
    blurLastClickedElement();
  }
  __name$3(inputTextElement, "inputTextElement");
  async function selectOptionElement(selectElement, optionText) {
    if (!(selectElement instanceof HTMLSelectElement)) {
      throw new Error("Lélément nest pas un élément select");
    }
    const options = Array.from(selectElement.options);
    const option = options.find((opt) => opt.textContent?.trim() === optionText.trim());
    if (!option) {
      throw new Error(`Option with text "${optionText}" not found in select element`);
    }
    selectElement.value = option.value;
    selectElement.dispatchEvent(new Event("change", { bubbles: true }));
    await waitFor$1(0.1);
  }
  __name$3(selectOptionElement, "selectOptionElement");
  async function scrollIntoViewIfNeeded(element) {
    const el = element;
    if (el.scrollIntoViewIfNeeded) {
      el.scrollIntoViewIfNeeded();
    } else {
      el.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" });
    }
  }
  __name$3(scrollIntoViewIfNeeded, "scrollIntoViewIfNeeded");
  async function scrollVertically(down, scroll_amount, element) {
    if (element) {
      const targetElement = element;
      let currentElement = targetElement;
      let scrollSuccess = false;
      let scrolledElement = null;
      let scrollDelta = 0;
      let attempts = 0;
      const dy2 = scroll_amount;
      while (currentElement && attempts < 10) {
        const computedStyle = window.getComputedStyle(currentElement);
        const hasScrollableY = /(auto|scroll|overlay)/.test(computedStyle.overflowY);
        const canScrollVertically = currentElement.scrollHeight > currentElement.clientHeight;
        if (hasScrollableY && canScrollVertically) {
          const beforeScroll = currentElement.scrollTop;
          const maxScroll = currentElement.scrollHeight - currentElement.clientHeight;
          let scrollAmount = dy2 / 3;
          if (scrollAmount > 0) {
            scrollAmount = Math.min(scrollAmount, maxScroll - beforeScroll);
          } else {
            scrollAmount = Math.max(scrollAmount, -beforeScroll);
          }
          currentElement.scrollTop = beforeScroll + scrollAmount;
          const afterScroll = currentElement.scrollTop;
          const actualScrollDelta = afterScroll - beforeScroll;
          if (Math.abs(actualScrollDelta) > 0.5) {
            scrollSuccess = true;
            scrolledElement = currentElement;
            scrollDelta = actualScrollDelta;
            break;
          }
        }
        if (currentElement === document.body || currentElement === document.documentElement) {
          break;
        }
        currentElement = currentElement.parentElement;
        attempts++;
      }
      if (scrollSuccess) {
        return `Scrolled container (${scrolledElement?.tagName}) by ${scrollDelta}px`;
      } else {
        return `No scrollable container found for element (${targetElement.tagName})`;
      }
    }
    const dy = scroll_amount;
    const bigEnough = /* @__PURE__ */ __name$3((el2) => el2.clientHeight >= window.innerHeight * 0.5, "bigEnough");
    const canScroll = /* @__PURE__ */ __name$3((el2) => el2 && /(auto|scroll|overlay)/.test(getComputedStyle(el2).overflowY) && el2.scrollHeight > el2.clientHeight && bigEnough(el2), "canScroll");
    let el = document.activeElement;
    while (el && !canScroll(el) && el !== document.body) el = el.parentElement;
    el = canScroll(el) ? el : Array.from(document.querySelectorAll("*")).find(canScroll) || document.scrollingElement || document.documentElement;
    if (el === document.scrollingElement || el === document.documentElement || el === document.body) {
      const scrollBefore = window.scrollY;
      const scrollMax = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollBy(0, dy);
      const scrollAfter = window.scrollY;
      const scrolled = scrollAfter - scrollBefore;
      if (Math.abs(scrolled) < 1) {
        return dy > 0 ? `⚠️ Already at the bottom of the page, cannot scroll down further.` : `⚠️ Already at the top of the page, cannot scroll up further.`;
      }
      const reachedBottom = dy > 0 && scrollAfter >= scrollMax - 1;
      const reachedTop = dy < 0 && scrollAfter <= 1;
      if (reachedBottom) return `✅ Scrolled page by ${scrolled}px. Reached the bottom of the page.`;
      if (reachedTop) return `✅ Scrolled page by ${scrolled}px. Reached the top of the page.`;
      return `✅ Scrolled page by ${scrolled}px.`;
    } else {
      const scrollBefore = el.scrollTop;
      const scrollMax = el.scrollHeight - el.clientHeight;
      el.scrollBy({ top: dy, behavior: "smooth" });
      await waitFor$1(0.1);
      const scrollAfter = el.scrollTop;
      const scrolled = scrollAfter - scrollBefore;
      if (Math.abs(scrolled) < 1) {
        return dy > 0 ? `⚠️ Already at the bottom of container (${el.tagName}), cannot scroll down further.` : `⚠️ Already at the top of container (${el.tagName}), cannot scroll up further.`;
      }
      const reachedBottom = dy > 0 && scrollAfter >= scrollMax - 1;
      const reachedTop = dy < 0 && scrollAfter <= 1;
      if (reachedBottom)
        return `✅ Scrolled container (${el.tagName}) by ${scrolled}px. Reached the bottom.`;
      if (reachedTop)
        return `✅ Scrolled container (${el.tagName}) by ${scrolled}px. Reached the top.`;
      return `✅ Scrolled container (${el.tagName}) by ${scrolled}px.`;
    }
  }
  __name$3(scrollVertically, "scrollVertically");
  async function scrollHorizontally(right, scroll_amount, element) {
    if (element) {
      const targetElement = element;
      let currentElement = targetElement;
      let scrollSuccess = false;
      let scrolledElement = null;
      let scrollDelta = 0;
      let attempts = 0;
      const dx2 = right ? scroll_amount : -scroll_amount;
      while (currentElement && attempts < 10) {
        const computedStyle = window.getComputedStyle(currentElement);
        const hasScrollableX = /(auto|scroll|overlay)/.test(computedStyle.overflowX);
        const canScrollHorizontally = currentElement.scrollWidth > currentElement.clientWidth;
        if (hasScrollableX && canScrollHorizontally) {
          const beforeScroll = currentElement.scrollLeft;
          const maxScroll = currentElement.scrollWidth - currentElement.clientWidth;
          let scrollAmount = dx2 / 3;
          if (scrollAmount > 0) {
            scrollAmount = Math.min(scrollAmount, maxScroll - beforeScroll);
          } else {
            scrollAmount = Math.max(scrollAmount, -beforeScroll);
          }
          currentElement.scrollLeft = beforeScroll + scrollAmount;
          const afterScroll = currentElement.scrollLeft;
          const actualScrollDelta = afterScroll - beforeScroll;
          if (Math.abs(actualScrollDelta) > 0.5) {
            scrollSuccess = true;
            scrolledElement = currentElement;
            scrollDelta = actualScrollDelta;
            break;
          }
        }
        if (currentElement === document.body || currentElement === document.documentElement) {
          break;
        }
        currentElement = currentElement.parentElement;
        attempts++;
      }
      if (scrollSuccess) {
        return `Scrolled container (${scrolledElement?.tagName}) horizontally by ${scrollDelta}px`;
      } else {
        return `No horizontally scrollable container found for element (${targetElement.tagName})`;
      }
    }
    const dx = right ? scroll_amount : -scroll_amount;
    const bigEnough = /* @__PURE__ */ __name$3((el2) => el2.clientWidth >= window.innerWidth * 0.5, "bigEnough");
    const canScroll = /* @__PURE__ */ __name$3((el2) => el2 && /(auto|scroll|overlay)/.test(getComputedStyle(el2).overflowX) && el2.scrollWidth > el2.clientWidth && bigEnough(el2), "canScroll");
    let el = document.activeElement;
    while (el && !canScroll(el) && el !== document.body) el = el.parentElement;
    el = canScroll(el) ? el : Array.from(document.querySelectorAll("*")).find(canScroll) || document.scrollingElement || document.documentElement;
    if (el === document.scrollingElement || el === document.documentElement || el === document.body) {
      const scrollBefore = window.scrollX;
      const scrollMax = document.documentElement.scrollWidth - window.innerWidth;
      window.scrollBy(dx, 0);
      const scrollAfter = window.scrollX;
      const scrolled = scrollAfter - scrollBefore;
      if (Math.abs(scrolled) < 1) {
        return dx > 0 ? `⚠️ Already at the right edge of the page, cannot scroll right further.` : `⚠️ Already at the left edge of the page, cannot scroll left further.`;
      }
      const reachedRight = dx > 0 && scrollAfter >= scrollMax - 1;
      const reachedLeft = dx < 0 && scrollAfter <= 1;
      if (reachedRight)
        return `✅ Scrolled page by ${scrolled}px. Reached the right edge of the page.`;
      if (reachedLeft) return `✅ Scrolled page by ${scrolled}px. Reached the left edge of the page.`;
      return `✅ Scrolled page horizontally by ${scrolled}px.`;
    } else {
      const scrollBefore = el.scrollLeft;
      const scrollMax = el.scrollWidth - el.clientWidth;
      el.scrollBy({ left: dx, behavior: "smooth" });
      await waitFor$1(0.1);
      const scrollAfter = el.scrollLeft;
      const scrolled = scrollAfter - scrollBefore;
      if (Math.abs(scrolled) < 1) {
        return dx > 0 ? `⚠️ Already at the right edge of container (${el.tagName}), cannot scroll right further.` : `⚠️ Already at the left edge of container (${el.tagName}), cannot scroll left further.`;
      }
      const reachedRight = dx > 0 && scrollAfter >= scrollMax - 1;
      const reachedLeft = dx < 0 && scrollAfter <= 1;
      if (reachedRight)
        return `✅ Scrolled container (${el.tagName}) by ${scrolled}px. Reached the right edge.`;
      if (reachedLeft)
        return `✅ Scrolled container (${el.tagName}) by ${scrolled}px. Reached the left edge.`;
      return `✅ Scrolled container (${el.tagName}) horizontally by ${scrolled}px.`;
    }
  }
  __name$3(scrollHorizontally, "scrollHorizontally");
  const VIEWPORT_EXPANSION = -1;
  const domTree = /* @__PURE__ */ __name$3((args = {
    doHighlightElements: true,
    focusHighlightIndex: -1,
    viewportExpansion: 0,
    debugMode: false,
    /**
     * @edit
     */
    /** @type {Element[]} */
    interactiveBlacklist: [],
    /** @type {Element[]} */
    interactiveWhitelist: [],
    highlightOpacity: 0.1,
    highlightLabelOpacity: 0.5
  }) => {
    const { interactiveBlacklist, interactiveWhitelist, highlightOpacity, highlightLabelOpacity } = args;
    const { doHighlightElements, focusHighlightIndex, viewportExpansion, debugMode } = args;
    let highlightIndex = 0;
    const extraData = /* @__PURE__ */ new WeakMap();
    function addExtraData(element, data) {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) return;
      extraData.set(element, { ...extraData.get(element), ...data });
    }
    __name$3(addExtraData, "addExtraData");
    const DOM_CACHE = {
      boundingRects: /* @__PURE__ */ new WeakMap(),
      clientRects: /* @__PURE__ */ new WeakMap(),
      computedStyles: /* @__PURE__ */ new WeakMap(),
      clearCache: /* @__PURE__ */ __name$3(() => {
        DOM_CACHE.boundingRects = /* @__PURE__ */ new WeakMap();
        DOM_CACHE.clientRects = /* @__PURE__ */ new WeakMap();
        DOM_CACHE.computedStyles = /* @__PURE__ */ new WeakMap();
      }, "clearCache")
    };
    function getCachedBoundingRect(element) {
      if (!element) return null;
      if (DOM_CACHE.boundingRects.has(element)) {
        return DOM_CACHE.boundingRects.get(element);
      }
      const rect = element.getBoundingClientRect();
      if (rect) {
        DOM_CACHE.boundingRects.set(element, rect);
      }
      return rect;
    }
    __name$3(getCachedBoundingRect, "getCachedBoundingRect");
    function getCachedComputedStyle(element) {
      if (!element) return null;
      if (DOM_CACHE.computedStyles.has(element)) {
        return DOM_CACHE.computedStyles.get(element);
      }
      const style = window.getComputedStyle(element);
      if (style) {
        DOM_CACHE.computedStyles.set(element, style);
      }
      return style;
    }
    __name$3(getCachedComputedStyle, "getCachedComputedStyle");
    function getCachedClientRects(element) {
      if (!element) return null;
      if (DOM_CACHE.clientRects.has(element)) {
        return DOM_CACHE.clientRects.get(element);
      }
      const rects = element.getClientRects();
      if (rects) {
        DOM_CACHE.clientRects.set(element, rects);
      }
      return rects;
    }
    __name$3(getCachedClientRects, "getCachedClientRects");
    const DOM_HASH_MAP = {};
    const ID = { current: 0 };
    const HIGHLIGHT_CONTAINER_ID = "playwright-highlight-container";
    function highlightElement(element, index, parentIframe = null) {
      if (!element) return index;
      const overlays = [];
      let label = null;
      let labelWidth = 20;
      let labelHeight = 16;
      let cleanupFn = null;
      try {
        let container = document.getElementById(HIGHLIGHT_CONTAINER_ID);
        if (!container) {
          container = document.createElement("div");
          container.id = HIGHLIGHT_CONTAINER_ID;
          container.style.position = "fixed";
          container.style.pointerEvents = "none";
          container.style.top = "0";
          container.style.left = "0";
          container.style.width = "100%";
          container.style.height = "100%";
          container.style.zIndex = "2147483640";
          container.style.backgroundColor = "transparent";
          document.body.appendChild(container);
        }
        const rects = element.getClientRects();
        if (!rects || rects.length === 0) return index;
        const colors = [
          "#FF0000",
          "#00FF00",
          "#0000FF",
          "#FFA500",
          "#800080",
          "#008080",
          "#FF69B4",
          "#4B0082",
          "#FF4500",
          "#2E8B57",
          "#DC143C",
          "#4682B4"
        ];
        const colorIndex = index % colors.length;
        let baseColor = colors[colorIndex];
        const backgroundColor = baseColor + Math.floor(highlightOpacity * 255).toString(16).padStart(2, "0");
        baseColor = baseColor + Math.floor(highlightLabelOpacity * 255).toString(16).padStart(2, "0");
        let iframeOffset = { x: 0, y: 0 };
        if (parentIframe) {
          const iframeRect = parentIframe.getBoundingClientRect();
          iframeOffset.x = iframeRect.left;
          iframeOffset.y = iframeRect.top;
        }
        const fragment = document.createDocumentFragment();
        for (const rect of rects) {
          if (rect.width === 0 || rect.height === 0) continue;
          const overlay = document.createElement("div");
          overlay.style.position = "fixed";
          overlay.style.border = `2px solid ${baseColor}`;
          overlay.style.backgroundColor = backgroundColor;
          overlay.style.pointerEvents = "none";
          overlay.style.boxSizing = "border-box";
          const top = rect.top + iframeOffset.y;
          const left = rect.left + iframeOffset.x;
          overlay.style.top = `${top}px`;
          overlay.style.left = `${left}px`;
          overlay.style.width = `${rect.width}px`;
          overlay.style.height = `${rect.height}px`;
          fragment.appendChild(overlay);
          overlays.push({ element: overlay, initialRect: rect });
        }
        const firstRect = rects[0];
        label = document.createElement("div");
        label.className = "playwright-highlight-label";
        label.style.position = "fixed";
        label.style.background = baseColor;
        label.style.color = "white";
        label.style.padding = "1px 4px";
        label.style.borderRadius = "4px";
        label.style.fontSize = `${Math.min(12, Math.max(8, firstRect.height / 2))}px`;
        label.textContent = index.toString();
        labelWidth = label.offsetWidth > 0 ? label.offsetWidth : labelWidth;
        labelHeight = label.offsetHeight > 0 ? label.offsetHeight : labelHeight;
        const firstRectTop = firstRect.top + iframeOffset.y;
        const firstRectLeft = firstRect.left + iframeOffset.x;
        let labelTop = firstRectTop + 2;
        let labelLeft = firstRectLeft + firstRect.width - labelWidth - 2;
        if (firstRect.width < labelWidth + 4 || firstRect.height < labelHeight + 4) {
          labelTop = firstRectTop - labelHeight - 2;
          labelLeft = firstRectLeft + firstRect.width - labelWidth;
          if (labelLeft < iframeOffset.x) labelLeft = firstRectLeft;
        }
        labelTop = Math.max(0, Math.min(labelTop, window.innerHeight - labelHeight));
        labelLeft = Math.max(0, Math.min(labelLeft, window.innerWidth - labelWidth));
        label.style.top = `${labelTop}px`;
        label.style.left = `${labelLeft}px`;
        fragment.appendChild(label);
        const updatePositions = /* @__PURE__ */ __name$3(() => {
          const newRects = element.getClientRects();
          let newIframeOffset = { x: 0, y: 0 };
          if (parentIframe) {
            const iframeRect = parentIframe.getBoundingClientRect();
            newIframeOffset.x = iframeRect.left;
            newIframeOffset.y = iframeRect.top;
          }
          overlays.forEach((overlayData, i) => {
            if (i < newRects.length) {
              const newRect = newRects[i];
              const newTop = newRect.top + newIframeOffset.y;
              const newLeft = newRect.left + newIframeOffset.x;
              overlayData.element.style.top = `${newTop}px`;
              overlayData.element.style.left = `${newLeft}px`;
              overlayData.element.style.width = `${newRect.width}px`;
              overlayData.element.style.height = `${newRect.height}px`;
              overlayData.element.style.display = newRect.width === 0 || newRect.height === 0 ? "none" : "block";
            } else {
              overlayData.element.style.display = "none";
            }
          });
          if (newRects.length < overlays.length) {
            for (let i = newRects.length; i < overlays.length; i++) {
              overlays[i].element.style.display = "none";
            }
          }
          if (label && newRects.length > 0) {
            const firstNewRect = newRects[0];
            const firstNewRectTop = firstNewRect.top + newIframeOffset.y;
            const firstNewRectLeft = firstNewRect.left + newIframeOffset.x;
            let newLabelTop = firstNewRectTop + 2;
            let newLabelLeft = firstNewRectLeft + firstNewRect.width - labelWidth - 2;
            if (firstNewRect.width < labelWidth + 4 || firstNewRect.height < labelHeight + 4) {
              newLabelTop = firstNewRectTop - labelHeight - 2;
              newLabelLeft = firstNewRectLeft + firstNewRect.width - labelWidth;
              if (newLabelLeft < newIframeOffset.x) newLabelLeft = firstNewRectLeft;
            }
            newLabelTop = Math.max(0, Math.min(newLabelTop, window.innerHeight - labelHeight));
            newLabelLeft = Math.max(0, Math.min(newLabelLeft, window.innerWidth - labelWidth));
            label.style.top = `${newLabelTop}px`;
            label.style.left = `${newLabelLeft}px`;
            label.style.display = "block";
          } else if (label) {
            label.style.display = "none";
          }
        }, "updatePositions");
        const throttleFunction = /* @__PURE__ */ __name$3((func, delay) => {
          let lastCall = 0;
          return (...args2) => {
            const now = performance.now();
            if (now - lastCall < delay) return;
            lastCall = now;
            return func(...args2);
          };
        }, "throttleFunction");
        const throttledUpdatePositions = throttleFunction(updatePositions, 16);
        window.addEventListener("scroll", throttledUpdatePositions, true);
        window.addEventListener("resize", throttledUpdatePositions);
        cleanupFn = /* @__PURE__ */ __name$3(() => {
          window.removeEventListener("scroll", throttledUpdatePositions, true);
          window.removeEventListener("resize", throttledUpdatePositions);
          overlays.forEach((overlay) => overlay.element.remove());
          if (label) label.remove();
        }, "cleanupFn");
        container.appendChild(fragment);
        return index + 1;
      } finally {
        if (cleanupFn) {
          (window._highlightCleanupFunctions = window._highlightCleanupFunctions || []).push(
            cleanupFn
          );
        }
      }
    }
    __name$3(highlightElement, "highlightElement");
    function isScrollableElement(element) {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) {
        return null;
      }
      const style = getCachedComputedStyle(element);
      if (!style) return null;
      const display = style.display;
      if (display === "inline" || display === "inline-block") {
        return null;
      }
      const overflowX = style.overflowX;
      const overflowY = style.overflowY;
      const scrollableX = overflowX === "auto" || overflowX === "scroll";
      const scrollableY = overflowY === "auto" || overflowY === "scroll";
      if (!scrollableX && !scrollableY) {
        return null;
      }
      const scrollWidth = element.scrollWidth - element.clientWidth;
      const scrollHeight = element.scrollHeight - element.clientHeight;
      const threshold = 4;
      if (scrollWidth < threshold && scrollHeight < threshold) {
        return null;
      }
      if (!scrollableY && scrollWidth < threshold) {
        return null;
      }
      if (!scrollableX && scrollHeight < threshold) {
        return null;
      }
      const distanceToTop = element.scrollTop;
      const distanceToLeft = element.scrollLeft;
      const distanceToRight = element.scrollWidth - element.clientWidth - element.scrollLeft;
      const distanceToBottom = element.scrollHeight - element.clientHeight - element.scrollTop;
      const scrollData = {
        top: distanceToTop,
        right: distanceToRight,
        bottom: distanceToBottom,
        left: distanceToLeft
      };
      addExtraData(element, {
        scrollable: true,
        scrollData
      });
      return scrollData;
    }
    __name$3(isScrollableElement, "isScrollableElement");
    function isTextNodeVisible(textNode) {
      try {
        if (viewportExpansion === -1) {
          const parentElement2 = textNode.parentElement;
          if (!parentElement2) return false;
          try {
            return parentElement2.checkVisibility({
              checkOpacity: true,
              checkVisibilityCSS: true
            });
          } catch (e) {
            const style = window.getComputedStyle(parentElement2);
            return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
          }
        }
        const range = document.createRange();
        range.selectNodeContents(textNode);
        const rects = range.getClientRects();
        if (!rects || rects.length === 0) {
          return false;
        }
        let isAnyRectVisible = false;
        let isAnyRectInViewport = false;
        for (const rect of rects) {
          if (rect.width > 0 && rect.height > 0) {
            isAnyRectVisible = true;
            if (!(rect.bottom < -viewportExpansion || rect.top > window.innerHeight + viewportExpansion || rect.right < -viewportExpansion || rect.left > window.innerWidth + viewportExpansion)) {
              isAnyRectInViewport = true;
              break;
            }
          }
        }
        if (!isAnyRectVisible || !isAnyRectInViewport) {
          return false;
        }
        const parentElement = textNode.parentElement;
        if (!parentElement) return false;
        try {
          return parentElement.checkVisibility({
            checkOpacity: true,
            checkVisibilityCSS: true
          });
        } catch (e) {
          const style = window.getComputedStyle(parentElement);
          return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
        }
      } catch (e) {
        console.warn("Error checking text node visibility:", e);
        return false;
      }
    }
    __name$3(isTextNodeVisible, "isTextNodeVisible");
    function isElementAccepted(element) {
      if (!element || !element.tagName) return false;
      const alwaysAccept = /* @__PURE__ */ new Set([
        "body",
        "div",
        "main",
        "article",
        "section",
        "nav",
        "header",
        "footer"
      ]);
      const tagName = element.tagName.toLowerCase();
      if (alwaysAccept.has(tagName)) return true;
      const leafElementDenyList = /* @__PURE__ */ new Set([
        "svg",
        "script",
        "style",
        "link",
        "meta",
        "noscript",
        "template"
      ]);
      return !leafElementDenyList.has(tagName);
    }
    __name$3(isElementAccepted, "isElementAccepted");
    function isElementVisible(element) {
      const style = getCachedComputedStyle(element);
      return element.offsetWidth > 0 && element.offsetHeight > 0 && style?.visibility !== "hidden" && style?.display !== "none";
    }
    __name$3(isElementVisible, "isElementVisible");
    function isInteractiveElement(element) {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) {
        return false;
      }
      if (interactiveBlacklist.includes(element)) {
        return false;
      }
      if (interactiveWhitelist.includes(element)) {
        return true;
      }
      const tagName = element.tagName.toLowerCase();
      const style = getCachedComputedStyle(element);
      const interactiveCursors = /* @__PURE__ */ new Set([
        "pointer",
        // Link/clickable elements
        "move",
        // Movable elements
        "text",
        // Text selection
        "grab",
        // Grabbable elements
        "grabbing",
        // Currently grabbing
        "cell",
        // Table cell selection
        "copy",
        // Copy operation
        "alias",
        // Alias creation
        "all-scroll",
        // Scrollable content
        "col-resize",
        // Column resize
        "context-menu",
        // Context menu available
        "crosshair",
        // Precise selection
        "e-resize",
        // East resize
        "ew-resize",
        // East-west resize
        "help",
        // Help available
        "n-resize",
        // North resize
        "ne-resize",
        // Northeast resize
        "nesw-resize",
        // Northeast-southwest resize
        "ns-resize",
        // North-south resize
        "nw-resize",
        // Northwest resize
        "nwse-resize",
        // Northwest-southeast resize
        "row-resize",
        // Row resize
        "s-resize",
        // South resize
        "se-resize",
        // Southeast resize
        "sw-resize",
        // Southwest resize
        "vertical-text",
        // Vertical text selection
        "w-resize",
        // West resize
        "zoom-in",
        // Zoom in
        "zoom-out"
        // Zoom out
      ]);
      const nonInteractiveCursors = /* @__PURE__ */ new Set([
        "not-allowed",
        // Action not allowed
        "no-drop",
        // Drop not allowed
        "wait",
        // Processing
        "progress",
        // In progress
        "initial",
        // Initial value
        "inherit"
        // Inherited value
        //? Let's just include all potentially clickable elements that are not specifically blocked
        // 'none',        // No cursor
        // 'default',     // Default cursor
        // 'auto',        // Browser default
      ]);
      function doesElementHaveInteractivePointer(element2) {
        if (element2.tagName.toLowerCase() === "html") return false;
        if (style?.cursor && interactiveCursors.has(style.cursor)) return true;
        return false;
      }
      __name$3(doesElementHaveInteractivePointer, "doesElementHaveInteractivePointer");
      let isInteractiveCursor = doesElementHaveInteractivePointer(element);
      if (isInteractiveCursor) {
        return true;
      }
      const interactiveElements = /* @__PURE__ */ new Set([
        "a",
        // Links
        "button",
        // Buttons
        "input",
        // All input types (text, checkbox, radio, etc.)
        "select",
        // Dropdown menus
        "textarea",
        // Text areas
        "details",
        // Expandable details
        "summary",
        // Summary element (clickable part of details)
        "label",
        // Form labels (often clickable)
        "option",
        // Select options
        "optgroup",
        // Option groups
        "fieldset",
        // Form fieldsets (can be interactive with legend)
        "legend"
        // Fieldset legends
      ]);
      const explicitDisableTags = /* @__PURE__ */ new Set([
        "disabled",
        // Standard disabled attribute
        // 'aria-disabled',      // ARIA disabled state
        "readonly"
        // Read-only state
        // 'aria-readonly',     // ARIA read-only state
        // 'aria-hidden',       // Hidden from accessibility
        // 'hidden',            // Hidden attribute
        // 'inert',             // Inert attribute
        // 'aria-inert',        // ARIA inert state
        // 'tabindex="-1"',     // Removed from tab order
        // 'aria-hidden="true"' // Hidden from screen readers
      ]);
      if (interactiveElements.has(tagName)) {
        if (style?.cursor && nonInteractiveCursors.has(style.cursor)) {
          return false;
        }
        for (const disableTag of explicitDisableTags) {
          if (element.hasAttribute(disableTag) || element.getAttribute(disableTag) === "true" || element.getAttribute(disableTag) === "") {
            return false;
          }
        }
        if (element.disabled) {
          return false;
        }
        if (element.readOnly) {
          return false;
        }
        if (element.inert) {
          return false;
        }
        return true;
      }
      const role = element.getAttribute("role");
      const ariaRole = element.getAttribute("aria-role");
      if (element.getAttribute("contenteditable") === "true" || element.isContentEditable) {
        return true;
      }
      if (element.classList && (element.classList.contains("button") || element.classList.contains("dropdown-toggle") || element.getAttribute("data-index") || element.getAttribute("data-toggle") === "dropdown" || element.getAttribute("aria-haspopup") === "true")) {
        return true;
      }
      const interactiveRoles = /* @__PURE__ */ new Set([
        "button",
        // Directly clickable element
        // 'link',            // Clickable link
        "menu",
        // Menu container (ARIA menus)
        "menubar",
        // Menu bar container
        "menuitem",
        // Clickable menu item
        "menuitemradio",
        // Radio-style menu item (selectable)
        "menuitemcheckbox",
        // Checkbox-style menu item (toggleable)
        "radio",
        // Radio button (selectable)
        "checkbox",
        // Checkbox (toggleable)
        "tab",
        // Tab (clickable to switch content)
        "switch",
        // Toggle switch (clickable to change state)
        "slider",
        // Slider control (draggable)
        "spinbutton",
        // Number input with up/down controls
        "combobox",
        // Dropdown with text input
        "searchbox",
        // Search input field
        "textbox",
        // Text input field
        "listbox",
        // Selectable list
        "option",
        // Selectable option in a list
        "scrollbar"
        // Scrollable control
      ]);
      const hasInteractiveRole = interactiveElements.has(tagName) || role && interactiveRoles.has(role) || ariaRole && interactiveRoles.has(ariaRole);
      if (hasInteractiveRole) return true;
      try {
        if (typeof getEventListeners === "function") {
          const listeners = getEventListeners(element);
          const mouseEvents = ["click", "mousedown", "mouseup", "dblclick"];
          for (const eventType of mouseEvents) {
            if (listeners[eventType] && listeners[eventType].length > 0) {
              return true;
            }
          }
        }
        const getEventListenersForNode = element?.ownerDocument?.defaultView?.getEventListenersForNode || window.getEventListenersForNode;
        if (typeof getEventListenersForNode === "function") {
          const listeners = getEventListenersForNode(element);
          const interactionEvents = [
            "click",
            "mousedown",
            "mouseup",
            "keydown",
            "keyup",
            "submit",
            "change",
            "input",
            "focus",
            "blur"
          ];
          for (const eventType of interactionEvents) {
            for (const listener of listeners) {
              if (listener.type === eventType) {
                return true;
              }
            }
          }
        }
        const commonMouseAttrs = ["onclick", "onmousedown", "onmouseup", "ondblclick"];
        for (const attr of commonMouseAttrs) {
          if (element.hasAttribute(attr) || typeof element[attr] === "function") {
            return true;
          }
        }
      } catch (e) {
      }
      if (isScrollableElement(element)) {
        return true;
      }
      return false;
    }
    __name$3(isInteractiveElement, "isInteractiveElement");
    function isTopElement(element) {
      if (viewportExpansion === -1) {
        return true;
      }
      const rects = getCachedClientRects(element);
      if (!rects || rects.length === 0) {
        return false;
      }
      let isAnyRectInViewport = false;
      for (const rect2 of rects) {
        if (rect2.width > 0 && rect2.height > 0 && !// Only check non-empty rects
        (rect2.bottom < -viewportExpansion || rect2.top > window.innerHeight + viewportExpansion || rect2.right < -viewportExpansion || rect2.left > window.innerWidth + viewportExpansion)) {
          isAnyRectInViewport = true;
          break;
        }
      }
      if (!isAnyRectInViewport) {
        return false;
      }
      let doc = element.ownerDocument;
      if (doc !== window.document) {
        return true;
      }
      let rect = Array.from(rects).find((r) => r.width > 0 && r.height > 0);
      if (!rect) {
        return false;
      }
      const shadowRoot = element.getRootNode();
      if (shadowRoot instanceof ShadowRoot) {
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        try {
          const topEl = shadowRoot.elementFromPoint(centerX, centerY);
          if (!topEl) return false;
          let current = topEl;
          while (current && current !== shadowRoot) {
            if (current === element) return true;
            current = current.parentElement;
          }
          return false;
        } catch (e) {
          return true;
        }
      }
      const margin = 5;
      const checkPoints = [
        // Initially only this was used, but it was not enough
        { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
        { x: rect.left + margin, y: rect.top + margin },
        // top left
        // { x: rect.right - margin, y: rect.top + margin },    // top right
        // { x: rect.left + margin, y: rect.bottom - margin },  // bottom left
        { x: rect.right - margin, y: rect.bottom - margin }
        // bottom right
      ];
      return checkPoints.some(({ x, y }) => {
        try {
          const topEl = document.elementFromPoint(x, y);
          if (!topEl) return false;
          let current = topEl;
          while (current && current !== document.documentElement) {
            if (current === element) return true;
            current = current.parentElement;
          }
          return false;
        } catch (e) {
          return true;
        }
      });
    }
    __name$3(isTopElement, "isTopElement");
    function isInExpandedViewport(element, viewportExpansion2) {
      if (viewportExpansion2 === -1) {
        return true;
      }
      const rects = element.getClientRects();
      if (!rects || rects.length === 0) {
        const boundingRect = getCachedBoundingRect(element);
        if (!boundingRect || boundingRect.width === 0 || boundingRect.height === 0) {
          return false;
        }
        return !(boundingRect.bottom < -viewportExpansion2 || boundingRect.top > window.innerHeight + viewportExpansion2 || boundingRect.right < -viewportExpansion2 || boundingRect.left > window.innerWidth + viewportExpansion2);
      }
      for (const rect of rects) {
        if (rect.width === 0 || rect.height === 0) continue;
        if (!(rect.bottom < -viewportExpansion2 || rect.top > window.innerHeight + viewportExpansion2 || rect.right < -viewportExpansion2 || rect.left > window.innerWidth + viewportExpansion2)) {
          return true;
        }
      }
      return false;
    }
    __name$3(isInExpandedViewport, "isInExpandedViewport");
    function isInteractiveCandidate(element) {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
      const tagName = element.tagName.toLowerCase();
      const interactiveElements = /* @__PURE__ */ new Set([
        "a",
        "button",
        "input",
        "select",
        "textarea",
        "details",
        "summary",
        "label"
      ]);
      if (interactiveElements.has(tagName)) return true;
      const hasQuickInteractiveAttr = element.hasAttribute("onclick") || element.hasAttribute("role") || element.hasAttribute("tabindex") || element.hasAttribute("aria-") || element.hasAttribute("data-action") || element.getAttribute("contenteditable") === "true";
      return hasQuickInteractiveAttr;
    }
    __name$3(isInteractiveCandidate, "isInteractiveCandidate");
    const DISTINCT_INTERACTIVE_TAGS = /* @__PURE__ */ new Set([
      "a",
      "button",
      "input",
      "select",
      "textarea",
      "summary",
      "details",
      "label",
      "option"
    ]);
    const INTERACTIVE_ROLES = /* @__PURE__ */ new Set([
      "button",
      "link",
      "menuitem",
      "menuitemradio",
      "menuitemcheckbox",
      "radio",
      "checkbox",
      "tab",
      "switch",
      "slider",
      "spinbutton",
      "combobox",
      "searchbox",
      "textbox",
      "listbox",
      "option",
      "scrollbar"
    ]);
    function isHeuristicallyInteractive(element) {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
      if (!isElementVisible(element)) return false;
      const hasInteractiveAttributes = element.hasAttribute("role") || element.hasAttribute("tabindex") || element.hasAttribute("onclick") || typeof element.onclick === "function";
      const hasInteractiveClass = /\b(btn|clickable|menu|item|entry|link)\b/i.test(
        element.className || ""
      );
      const isInKnownContainer = Boolean(
        element.closest('button,a,[role="button"],.menu,.dropdown,.list,.toolbar')
      );
      const hasVisibleChildren = [...element.children].some(isElementVisible);
      const isParentBody = element.parentElement && element.parentElement.isSameNode(document.body);
      return (isInteractiveElement(element) || hasInteractiveAttributes || hasInteractiveClass) && hasVisibleChildren && isInKnownContainer && !isParentBody;
    }
    __name$3(isHeuristicallyInteractive, "isHeuristicallyInteractive");
    function isElementDistinctInteraction(element) {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) {
        return false;
      }
      const tagName = element.tagName.toLowerCase();
      const role = element.getAttribute("role");
      if (tagName === "iframe") {
        return true;
      }
      if (DISTINCT_INTERACTIVE_TAGS.has(tagName)) {
        return true;
      }
      if (role && INTERACTIVE_ROLES.has(role)) {
        return true;
      }
      if (element.isContentEditable || element.getAttribute("contenteditable") === "true") {
        return true;
      }
      if (element.hasAttribute("data-testid") || element.hasAttribute("data-cy") || element.hasAttribute("data-test")) {
        return true;
      }
      if (element.hasAttribute("onclick") || typeof element.onclick === "function") {
        return true;
      }
      try {
        const getEventListenersForNode = element?.ownerDocument?.defaultView?.getEventListenersForNode || window.getEventListenersForNode;
        if (typeof getEventListenersForNode === "function") {
          const listeners = getEventListenersForNode(element);
          const interactionEvents = [
            "click",
            "mousedown",
            "mouseup",
            "keydown",
            "keyup",
            "submit",
            "change",
            "input",
            "focus",
            "blur"
          ];
          for (const eventType of interactionEvents) {
            for (const listener of listeners) {
              if (listener.type === eventType) {
                return true;
              }
            }
          }
        }
        const commonEventAttrs = [
          "onmousedown",
          "onmouseup",
          "onkeydown",
          "onkeyup",
          "onsubmit",
          "onchange",
          "oninput",
          "onfocus",
          "onblur"
        ];
        if (commonEventAttrs.some((attr) => element.hasAttribute(attr))) {
          return true;
        }
      } catch (e) {
      }
      if (isHeuristicallyInteractive(element)) {
        return true;
      }
      return false;
    }
    __name$3(isElementDistinctInteraction, "isElementDistinctInteraction");
    function handleHighlighting(nodeData, node, parentIframe, isParentHighlighted) {
      if (!nodeData.isInteractive) return false;
      let shouldHighlight = false;
      if (!isParentHighlighted) {
        shouldHighlight = true;
      } else {
        if (isElementDistinctInteraction(node)) {
          shouldHighlight = true;
        } else {
          shouldHighlight = false;
        }
      }
      if (shouldHighlight) {
        nodeData.isInViewport = isInExpandedViewport(node, viewportExpansion);
        if (nodeData.isInViewport || viewportExpansion === -1) {
          nodeData.highlightIndex = highlightIndex++;
          if (doHighlightElements) {
            if (focusHighlightIndex >= 0) {
              if (focusHighlightIndex === nodeData.highlightIndex) {
                highlightElement(node, nodeData.highlightIndex, parentIframe);
              }
            } else {
              highlightElement(node, nodeData.highlightIndex, parentIframe);
            }
            return true;
          }
        }
      }
      return false;
    }
    __name$3(handleHighlighting, "handleHighlighting");
    function buildDomTree(node, parentIframe = null, isParentHighlighted = false) {
      if (!node || node.id === HIGHLIGHT_CONTAINER_ID || node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.TEXT_NODE) {
        return null;
      }
      if (!node || node.id === HIGHLIGHT_CONTAINER_ID) {
        return null;
      }
      if (node.dataset?.browserUseIgnore === "true" || node.dataset?.pageAgentIgnore === "true") {
        return null;
      }
      if (node.getAttribute && node.getAttribute("aria-hidden") === "true") {
        return null;
      }
      if (node === document.body) {
        const nodeData2 = {
          tagName: "body",
          attributes: {},
          xpath: "/body",
          children: []
        };
        for (const child of node.childNodes) {
          const domElement = buildDomTree(child, parentIframe, false);
          if (domElement) nodeData2.children.push(domElement);
        }
        const id2 = `${ID.current++}`;
        DOM_HASH_MAP[id2] = nodeData2;
        return id2;
      }
      if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.TEXT_NODE) {
        return null;
      }
      if (node.nodeType === Node.TEXT_NODE) {
        const textContent = node.textContent?.trim();
        if (!textContent) {
          return null;
        }
        const parentElement = node.parentElement;
        if (!parentElement || parentElement.tagName.toLowerCase() === "script") {
          return null;
        }
        const id2 = `${ID.current++}`;
        DOM_HASH_MAP[id2] = {
          type: "TEXT_NODE",
          text: textContent,
          isVisible: isTextNodeVisible(node)
        };
        return id2;
      }
      if (node.nodeType === Node.ELEMENT_NODE && !isElementAccepted(node)) {
        return null;
      }
      if (viewportExpansion !== -1 && !node.shadowRoot) {
        const rect = getCachedBoundingRect(node);
        const style = getCachedComputedStyle(node);
        const isFixedOrSticky = style && (style.position === "fixed" || style.position === "sticky");
        const hasSize = node.offsetWidth > 0 || node.offsetHeight > 0;
        if (!rect || !isFixedOrSticky && !hasSize && (rect.bottom < -viewportExpansion || rect.top > window.innerHeight + viewportExpansion || rect.right < -viewportExpansion || rect.left > window.innerWidth + viewportExpansion)) {
          return null;
        }
      }
      const nodeData = {
        tagName: node.tagName.toLowerCase(),
        attributes: {},
        /**
         * @edit no need for xpath
         */
        // xpath: getXPathTree(node, true),
        children: []
      };
      if (isInteractiveCandidate(node) || node.tagName.toLowerCase() === "iframe" || node.tagName.toLowerCase() === "body") {
        const attributeNames = node.getAttributeNames?.() || [];
        for (const name of attributeNames) {
          const value = node.getAttribute(name);
          nodeData.attributes[name] = value;
        }
        if (node.tagName.toLowerCase() === "input" && (node.type === "checkbox" || node.type === "radio")) {
          nodeData.attributes.checked = node.checked ? "true" : "false";
        }
      }
      let nodeWasHighlighted = false;
      if (node.nodeType === Node.ELEMENT_NODE) {
        nodeData.isVisible = isElementVisible(node);
        if (nodeData.isVisible) {
          nodeData.isTopElement = isTopElement(node);
          const role = node.getAttribute("role");
          const isMenuContainer = role === "menu" || role === "menubar" || role === "listbox";
          if (nodeData.isTopElement || isMenuContainer) {
            nodeData.isInteractive = isInteractiveElement(node);
            nodeWasHighlighted = handleHighlighting(nodeData, node, parentIframe, isParentHighlighted);
            nodeData.ref = node;
          }
        }
      }
      if (node.tagName) {
        const tagName = node.tagName.toLowerCase();
        if (tagName === "iframe") {
          try {
            const iframeDoc = node.contentDocument || node.contentWindow?.document;
            if (iframeDoc) {
              for (const child of iframeDoc.childNodes) {
                const domElement = buildDomTree(child, node, false);
                if (domElement) nodeData.children.push(domElement);
              }
            }
          } catch (e) {
            console.warn("Unable to access iframe:", e);
          }
        } else if (node.isContentEditable || node.getAttribute("contenteditable") === "true" || node.id === "tinymce" || node.classList.contains("mce-content-body") || tagName === "body" && node.getAttribute("data-id")?.startsWith("mce_")) {
          for (const child of node.childNodes) {
            const domElement = buildDomTree(child, parentIframe, nodeWasHighlighted);
            if (domElement) nodeData.children.push(domElement);
          }
        } else {
          if (node.shadowRoot) {
            nodeData.shadowRoot = true;
            for (const child of node.shadowRoot.childNodes) {
              const domElement = buildDomTree(child, parentIframe, nodeWasHighlighted);
              if (domElement) nodeData.children.push(domElement);
            }
          }
          for (const child of node.childNodes) {
            const passHighlightStatusToChild = nodeWasHighlighted || isParentHighlighted;
            const domElement = buildDomTree(child, parentIframe, passHighlightStatusToChild);
            if (domElement) nodeData.children.push(domElement);
          }
        }
      }
      if (nodeData.tagName === "a" && nodeData.children.length === 0 && !nodeData.attributes.href) {
        const rect = getCachedBoundingRect(node);
        const hasSize = rect && rect.width > 0 && rect.height > 0 || node.offsetWidth > 0 || node.offsetHeight > 0;
        if (!hasSize) {
          return null;
        }
      }
      nodeData.extra = extraData.get(node) || null;
      const id = `${ID.current++}`;
      DOM_HASH_MAP[id] = nodeData;
      return id;
    }
    __name$3(buildDomTree, "buildDomTree");
    const rootId = buildDomTree(document.body);
    DOM_CACHE.clearCache();
    return { rootId, map: DOM_HASH_MAP };
  }, "domTree");
  const newElementsCache = /* @__PURE__ */ new WeakMap();
  function getFlatTree(config2) {
    const interactiveBlacklist = [];
    for (const item of config2.interactiveBlacklist || []) {
      if (typeof item === "function") {
        interactiveBlacklist.push(item());
      } else {
        interactiveBlacklist.push(item);
      }
    }
    const interactiveWhitelist = [];
    for (const item of config2.interactiveWhitelist || []) {
      if (typeof item === "function") {
        interactiveWhitelist.push(item());
      } else {
        interactiveWhitelist.push(item);
      }
    }
    const elements = domTree({
      doHighlightElements: true,
      debugMode: true,
      focusHighlightIndex: -1,
      viewportExpansion: VIEWPORT_EXPANSION,
      interactiveBlacklist,
      interactiveWhitelist,
      highlightOpacity: config2.highlightOpacity ?? 0,
      highlightLabelOpacity: config2.highlightLabelOpacity ?? 0.1
    });
    const currentUrl = window.location.href;
    for (const nodeId in elements.map) {
      const node = elements.map[nodeId];
      if (node.isInteractive && node.ref) {
        const ref = node.ref;
        if (!newElementsCache.has(ref)) {
          newElementsCache.set(ref, currentUrl);
          node.isNew = true;
        }
      }
    }
    return elements;
  }
  __name$3(getFlatTree, "getFlatTree");
  function flatTreeToString(flatTree, includeAttributes) {
    const DEFAULT_INCLUDE_ATTRIBUTES = [
      "title",
      "type",
      "checked",
      "name",
      "role",
      "value",
      "placeholder",
      "data-date-format",
      "alt",
      "aria-label",
      "aria-expanded",
      "data-state",
      "aria-checked",
      // @edit added for better form handling
      "id",
      "for",
      // for jump check
      "target",
      // absolute 定位的下拉菜单
      "aria-haspopup",
      "aria-controls",
      "aria-owns"
    ];
    const includeAttrs = [...includeAttributes || [], ...DEFAULT_INCLUDE_ATTRIBUTES];
    const capTextLength = /* @__PURE__ */ __name$3((text, maxLength) => {
      if (text.length > maxLength) {
        return text.substring(0, maxLength) + "...";
      }
      return text;
    }, "capTextLength");
    const buildTreeNode = /* @__PURE__ */ __name$3((nodeId) => {
      const node = flatTree.map[nodeId];
      if (!node) return null;
      if (node.type === "TEXT_NODE") {
        const textNode = node;
        return {
          type: "text",
          text: textNode.text,
          isVisible: textNode.isVisible,
          parent: null,
          children: []
        };
      } else {
        const elementNode = node;
        const children = [];
        if (elementNode.children) {
          for (const childId of elementNode.children) {
            const child = buildTreeNode(childId);
            if (child) {
              child.parent = null;
              children.push(child);
            }
          }
        }
        return {
          type: "element",
          tagName: elementNode.tagName,
          attributes: elementNode.attributes ?? {},
          isVisible: elementNode.isVisible ?? false,
          isInteractive: elementNode.isInteractive ?? false,
          isTopElement: elementNode.isTopElement ?? false,
          isNew: elementNode.isNew ?? false,
          highlightIndex: elementNode.highlightIndex,
          parent: null,
          children,
          extra: elementNode.extra ?? {}
        };
      }
    }, "buildTreeNode");
    const setParentReferences = /* @__PURE__ */ __name$3((node, parent = null) => {
      node.parent = parent;
      for (const child of node.children) {
        setParentReferences(child, node);
      }
    }, "setParentReferences");
    const rootNode = buildTreeNode(flatTree.rootId);
    if (!rootNode) return "";
    setParentReferences(rootNode);
    const hasParentWithHighlightIndex = /* @__PURE__ */ __name$3((node) => {
      let current = node.parent;
      while (current) {
        if (current.type === "element" && current.highlightIndex !== void 0) {
          return true;
        }
        current = current.parent;
      }
      return false;
    }, "hasParentWithHighlightIndex");
    const processNode = /* @__PURE__ */ __name$3((node, depth, result22) => {
      let nextDepth = depth;
      const depthStr = "	".repeat(depth);
      if (node.type === "element") {
        if (node.highlightIndex !== void 0) {
          nextDepth += 1;
          const text = getAllTextTillNextClickableElement(node);
          let attributesHtmlStr = "";
          if (includeAttrs.length > 0 && node.attributes) {
            const attributesToInclude = {};
            for (const key of includeAttrs) {
              const value = node.attributes[key];
              if (value && value.trim() !== "") {
                attributesToInclude[key] = value.trim();
              }
            }
            const orderedKeys = includeAttrs.filter((key) => key in attributesToInclude);
            if (orderedKeys.length > 1) {
              const keysToRemove = /* @__PURE__ */ new Set();
              const seenValues = {};
              for (const key of orderedKeys) {
                const value = attributesToInclude[key];
                if (value.length > 5) {
                  if (value in seenValues) {
                    keysToRemove.add(key);
                  } else {
                    seenValues[value] = key;
                  }
                }
              }
              for (const key of keysToRemove) {
                delete attributesToInclude[key];
              }
            }
            if (attributesToInclude.role === node.tagName) {
              delete attributesToInclude.role;
            }
            const attrsToRemoveIfTextMatches = ["aria-label", "placeholder", "title"];
            for (const attr of attrsToRemoveIfTextMatches) {
              if (attributesToInclude[attr] && attributesToInclude[attr].toLowerCase().trim() === text.toLowerCase().trim()) {
                delete attributesToInclude[attr];
              }
            }
            if (Object.keys(attributesToInclude).length > 0) {
              attributesHtmlStr = Object.entries(attributesToInclude).map(([key, value]) => `${key}=${capTextLength(value, 20)}`).join(" ");
            }
          }
          const highlightIndicator = node.isNew ? `*[${node.highlightIndex}]` : `[${node.highlightIndex}]`;
          let line = `${depthStr}${highlightIndicator}<${node.tagName ?? ""}`;
          if (attributesHtmlStr) {
            line += ` ${attributesHtmlStr}`;
          }
          if (node.extra) {
            if (node.extra.scrollable) {
              let scrollDataText = "";
              if (node.extra.scrollData?.left)
                scrollDataText += `left=${node.extra.scrollData.left}, `;
              if (node.extra.scrollData?.top) scrollDataText += `top=${node.extra.scrollData.top}, `;
              if (node.extra.scrollData?.right)
                scrollDataText += `right=${node.extra.scrollData.right}, `;
              if (node.extra.scrollData?.bottom)
                scrollDataText += `bottom=${node.extra.scrollData.bottom}`;
              line += ` data-scrollable="${scrollDataText}"`;
            }
          }
          if (text) {
            const trimmedText = text.trim();
            if (!attributesHtmlStr) {
              line += " ";
            }
            line += `>${trimmedText}`;
          } else if (!attributesHtmlStr) {
            line += " ";
          }
          line += " />";
          result22.push(line);
        }
        for (const child of node.children) {
          processNode(child, nextDepth, result22);
        }
      } else if (node.type === "text") {
        if (hasParentWithHighlightIndex(node)) {
          return;
        }
        if (node.parent && node.parent.type === "element" && node.parent.isVisible && node.parent.isTopElement) {
          result22.push(`${depthStr}${node.text ?? ""}`);
        }
      }
    }, "processNode");
    const result2 = [];
    processNode(rootNode, 0, result2);
    return result2.join("\n");
  }
  __name$3(flatTreeToString, "flatTreeToString");
  const getAllTextTillNextClickableElement = /* @__PURE__ */ __name$3((node, maxDepth = -1) => {
    const textParts = [];
    const collectText = /* @__PURE__ */ __name$3((currentNode, currentDepth) => {
      if (maxDepth !== -1 && currentDepth > maxDepth) {
        return;
      }
      if (currentNode.type === "element" && currentNode !== node && currentNode.highlightIndex !== void 0) {
        return;
      }
      if (currentNode.type === "text" && currentNode.text) {
        textParts.push(currentNode.text);
      } else if (currentNode.type === "element") {
        for (const child of currentNode.children) {
          collectText(child, currentDepth + 1);
        }
      }
    }, "collectText");
    collectText(node, 0);
    return textParts.join("\n").trim();
  }, "getAllTextTillNextClickableElement");
  function getSelectorMap(flatTree) {
    const selectorMap = /* @__PURE__ */ new Map();
    const keys = Object.keys(flatTree.map);
    for (const key of keys) {
      const node = flatTree.map[key];
      if (node.isInteractive && typeof node.highlightIndex === "number") {
        selectorMap.set(node.highlightIndex, node);
      }
    }
    return selectorMap;
  }
  __name$3(getSelectorMap, "getSelectorMap");
  function getElementTextMap(simplifiedHTML) {
    const lines = simplifiedHTML.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
    const elementTextMap = /* @__PURE__ */ new Map();
    for (const line of lines) {
      const regex = /^\[(\d+)\]<[^>]+>([^<]*)/;
      const match = regex.exec(line);
      if (match) {
        const index = parseInt(match[1], 10);
        elementTextMap.set(index, line);
      }
    }
    return elementTextMap;
  }
  __name$3(getElementTextMap, "getElementTextMap");
  function cleanUpHighlights() {
    const cleanupFunctions = window._highlightCleanupFunctions || [];
    for (const cleanup of cleanupFunctions) {
      if (typeof cleanup === "function") {
        cleanup();
      }
    }
    window._highlightCleanupFunctions = [];
  }
  __name$3(cleanUpHighlights, "cleanUpHighlights");
  window.addEventListener("popstate", () => {
    cleanUpHighlights();
  });
  window.addEventListener("hashchange", () => {
    cleanUpHighlights();
  });
  window.addEventListener("beforeunload", () => {
    cleanUpHighlights();
  });
  const navigation = window.navigation;
  if (navigation && typeof navigation.addEventListener === "function") {
    navigation.addEventListener("navigate", () => {
      cleanUpHighlights();
    });
  } else {
    let currentUrl = window.location.href;
    setInterval(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        cleanUpHighlights();
      }
    }, 500);
  }
  function getPageInfo() {
    const viewport_width = window.innerWidth;
    const viewport_height = window.innerHeight;
    const page_width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth || 0);
    const page_height = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight || 0
    );
    const scroll_x = window.scrollX || window.pageXOffset || document.documentElement.scrollLeft || 0;
    const scroll_y = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    const pixels_below = Math.max(0, page_height - (window.innerHeight + scroll_y));
    const pixels_right = Math.max(0, page_width - (window.innerWidth + scroll_x));
    return {
      // Current viewport dimensions
      viewport_width,
      viewport_height,
      // Total page dimensions
      page_width,
      page_height,
      // Current scroll position
      scroll_x,
      scroll_y,
      pixels_above: scroll_y,
      pixels_below,
      pages_above: viewport_height > 0 ? scroll_y / viewport_height : 0,
      pages_below: viewport_height > 0 ? pixels_below / viewport_height : 0,
      total_pages: viewport_height > 0 ? page_height / viewport_height : 0,
      current_page_position: scroll_y / Math.max(1, page_height - viewport_height),
      pixels_left: scroll_x,
      pixels_right
    };
  }
  __name$3(getPageInfo, "getPageInfo");
  function patchReact(pageController) {
    const reactRootElements = document.querySelectorAll(
      '[data-reactroot], [data-reactid], [data-react-checksum], #root, #app, [id^="root-"], [id^="app-"], #adex-wrapper, #adex-root'
    );
    for (const element of reactRootElements) {
      element.setAttribute("data-page-agent-not-interactive", "true");
    }
  }
  __name$3(patchReact, "patchReact");
  const _PageController = class _PageController extends EventTarget {
    config;
    /** Corresponds to eval_page in browser-use */
    flatTree = null;
    /**
     * All highlighted index-mapped interactive elements
     * Corresponds to DOMState.selector_map in browser-use
     */
    selectorMap = /* @__PURE__ */ new Map();
    /** Index -> element text description mapping */
    elementTextMap = /* @__PURE__ */ new Map();
    /**
     * Simplified HTML for LLM consumption.
     * Corresponds to clickable_elements_to_string in browser-use
     */
    simplifiedHTML = "<EMPTY>";
    /** last time the tree was updated */
    lastTimeUpdate = 0;
    /** Whether the tree has been indexed at least once */
    isIndexed = false;
    /** Visual mask overlay for blocking user interaction during automation */
    mask = null;
    maskReady = null;
    constructor(config2 = {}) {
      super();
      this.config = config2;
      patchReact();
      if (config2.enableMask) this.initMask();
    }
    /**
     * Initialize mask asynchronously (dynamic import to avoid CSS loading in Node)
     */
    initMask() {
      if (this.maskReady !== null) return;
      this.maskReady = (async () => {
        const { SimulatorMask: SimulatorMask2 } = await Promise.resolve().then(() => SimulatorMaskC7yoC9Lw);
        this.mask = new SimulatorMask2();
      })();
    }
    // ======= State Queries =======
    /**
     * Get current page URL
     */
    async getCurrentUrl() {
      return window.location.href;
    }
    /**
     * Get last tree update timestamp
     */
    async getLastUpdateTime() {
      return this.lastTimeUpdate;
    }
    /**
     * Get structured browser state for LLM consumption.
     * Automatically calls updateTree() to refresh the DOM state.
     */
    async getBrowserState() {
      const url = window.location.href;
      const title = document.title;
      const pi = getPageInfo();
      const viewportExpansion = this.config.viewportExpansion ?? VIEWPORT_EXPANSION;
      await this.updateTree();
      const content2 = this.simplifiedHTML;
      const titleLine = `Current Page: [${title}](${url})`;
      const pageInfoLine = `Page info: ${pi.viewport_width}x${pi.viewport_height}px viewport, ${pi.page_width}x${pi.page_height}px total page size, ${pi.pages_above.toFixed(1)} pages above, ${pi.pages_below.toFixed(1)} pages below, ${pi.total_pages.toFixed(1)} total pages, at ${(pi.current_page_position * 100).toFixed(0)}% of page`;
      const elementsLabel = viewportExpansion === -1 ? "Interactive elements from top layer of the current page (full page):" : "Interactive elements from top layer of the current page inside the viewport:";
      const hasContentAbove = pi.pixels_above > 4;
      const scrollHintAbove = hasContentAbove && viewportExpansion !== -1 ? `... ${pi.pixels_above} pixels above (${pi.pages_above.toFixed(1)} pages) - scroll to see more ...` : "[Start of page]";
      const header = `${titleLine}
${pageInfoLine}

${elementsLabel}

${scrollHintAbove}`;
      const hasContentBelow = pi.pixels_below > 4;
      const footer = hasContentBelow && viewportExpansion !== -1 ? `... ${pi.pixels_below} pixels below (${pi.pages_below.toFixed(1)} pages) - scroll to see more ...` : "[End of page]";
      return { url, title, header, content: content2, footer };
    }
    // ======= DOM Tree Operations =======
    /**
     * Update DOM tree, returns simplified HTML for LLM.
     * This is the main method to refresh the page state.
     * Automatically bypasses mask during DOM extraction if enabled.
     */
    async updateTree() {
      this.dispatchEvent(new Event("beforeUpdate"));
      this.lastTimeUpdate = Date.now();
      if (this.mask) {
        this.mask.wrapper.style.pointerEvents = "none";
      }
      cleanUpHighlights();
      const blacklist = [
        ...this.config.interactiveBlacklist || [],
        ...document.querySelectorAll("[data-page-agent-not-interactive]").values()
      ];
      this.flatTree = getFlatTree({
        ...this.config,
        interactiveBlacklist: blacklist
      });
      this.simplifiedHTML = flatTreeToString(this.flatTree, this.config.includeAttributes);
      this.selectorMap.clear();
      this.selectorMap = getSelectorMap(this.flatTree);
      this.elementTextMap.clear();
      this.elementTextMap = getElementTextMap(this.simplifiedHTML);
      this.isIndexed = true;
      if (this.mask) {
        this.mask.wrapper.style.pointerEvents = "auto";
      }
      this.dispatchEvent(new Event("afterUpdate"));
      return this.simplifiedHTML;
    }
    /**
     * Clean up all element highlights
     */
    async cleanUpHighlights() {
      cleanUpHighlights();
    }
    // ======= Element Actions =======
    /**
     * Ensure the tree has been indexed before any index-based operation.
     * Throws if updateTree() hasn't been called yet.
     */
    assertIndexed() {
      if (!this.isIndexed) {
        throw new Error("DOM tree not indexed yet. Can not perform actions on elements.");
      }
    }
    /**
     * Click element by index
     */
    async clickElement(index) {
      try {
        this.assertIndexed();
        const element = getElementByIndex(this.selectorMap, index);
        const elemText = this.elementTextMap.get(index);
        await clickElement(element);
        if (element instanceof HTMLAnchorElement && element.target === "_blank") {
          return {
            success: true,
            message: `✅ Clicked element (${elemText ?? index}). ⚠️ Link opened in a new tab.`
          };
        }
        return {
          success: true,
          message: `✅ Clicked element (${elemText ?? index}).`
        };
      } catch (error) {
        return {
          success: false,
          message: `❌ Failed to click element: ${error}`
        };
      }
    }
    /**
     * Input text into element by index
     */
    async inputText(index, text) {
      try {
        this.assertIndexed();
        const element = getElementByIndex(this.selectorMap, index);
        const elemText = this.elementTextMap.get(index);
        await inputTextElement(element, text);
        return {
          success: true,
          message: `✅ Input text (${text}) into element (${elemText ?? index}).`
        };
      } catch (error) {
        return {
          success: false,
          message: `❌ Failed to input text: ${error}`
        };
      }
    }
    /**
     * Select dropdown option by index and option text
     */
    async selectOption(index, optionText) {
      try {
        this.assertIndexed();
        const element = getElementByIndex(this.selectorMap, index);
        const elemText = this.elementTextMap.get(index);
        await selectOptionElement(element, optionText);
        return {
          success: true,
          message: `✅ Selected option (${optionText}) in element (${elemText ?? index}).`
        };
      } catch (error) {
        return {
          success: false,
          message: `❌ Failed to select option: ${error}`
        };
      }
    }
    /**
     * Scroll vertically
     */
    async scroll(options) {
      try {
        const { down, numPages, pixels, index } = options;
        this.assertIndexed();
        const scrollAmount = pixels ?? numPages * (down ? 1 : -1) * window.innerHeight;
        const element = index !== void 0 ? getElementByIndex(this.selectorMap, index) : null;
        const message = await scrollVertically(down, scrollAmount, element);
        return {
          success: true,
          message
        };
      } catch (error) {
        return {
          success: false,
          message: `❌ Failed to scroll: ${error}`
        };
      }
    }
    /**
     * Scroll horizontally
     */
    async scrollHorizontally(options) {
      try {
        const { right, pixels, index } = options;
        this.assertIndexed();
        const scrollAmount = pixels * (right ? 1 : -1);
        const element = index !== void 0 ? getElementByIndex(this.selectorMap, index) : null;
        const message = await scrollHorizontally(right, scrollAmount, element);
        return {
          success: true,
          message
        };
      } catch (error) {
        return {
          success: false,
          message: `❌ Failed to scroll horizontally: ${error}`
        };
      }
    }
    /**
     * Execute arbitrary JavaScript on the page
     */
    async executeJavascript(script) {
      try {
        const asyncFunction = eval(`(async () => { ${script} })`);
        const result = await asyncFunction();
        return {
          success: true,
          message: `✅ Executed JavaScript. Result: ${result}`
        };
      } catch (error) {
        return {
          success: false,
          message: `❌ Error executing JavaScript: ${error}`
        };
      }
    }
    // ======= Mask Operations =======
    /**
     * Show the visual mask overlay.
     * Only works after mask is setup.
     */
    async showMask() {
      await this.maskReady;
      this.mask?.show();
    }
    /**
     * Hide the visual mask overlay.
     * Only works after mask is setup.
     */
    async hideMask() {
      await this.maskReady;
      this.mask?.hide();
    }
    /**
     * Dispose and clean up resources
     */
    dispose() {
      cleanUpHighlights();
      this.flatTree = null;
      this.selectorMap.clear();
      this.elementTextMap.clear();
      this.simplifiedHTML = "<EMPTY>";
      this.isIndexed = false;
      this.mask?.dispose();
      this.mask = null;
    }
  };
  __name$3(_PageController, "PageController");
  let PageController = _PageController;
  function initPageController() {
    let pageController = null;
    const myTabIdPromise = chrome.runtime.sendMessage({ type: "PAGE_CONTROL", action: "get_my_tab_id" }).then((response) => {
      return response.tabId;
    }).catch((error) => {
      console.error("[RemotePageController.ContentScript]: Failed to get my tab id", error);
      return null;
    });
    function getPC() {
      if (!pageController) {
        pageController = new PageController({ enableMask: false, viewportExpansion: 400 });
      }
      return pageController;
    }
    window.setInterval(async () => {
      const agentHeartbeat = (await chrome.storage.local.get("agentHeartbeat")).agentHeartbeat;
      const now = Date.now();
      const agentInTouch = typeof agentHeartbeat === "number" && now - agentHeartbeat < 2e3;
      const isAgentRunning = (await chrome.storage.local.get("isAgentRunning")).isAgentRunning;
      const currentTabId = (await chrome.storage.local.get("currentTabId")).currentTabId;
      const shouldShowMask = isAgentRunning && agentInTouch && currentTabId === await myTabIdPromise;
      if (shouldShowMask) {
        const pc = getPC();
        pc.initMask();
        await pc.showMask();
      } else {
        if (pageController) {
          pageController.hideMask();
          pageController.cleanUpHighlights();
        }
      }
      if (!isAgentRunning && agentInTouch) {
        if (pageController) {
          pageController.dispose();
          pageController = null;
        }
      }
    }, 500);
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type !== "PAGE_CONTROL") {
        return;
      }
      const { action, payload } = message;
      const methodName = getMethodName(action);
      const pc = getPC();
      switch (action) {
        case "get_last_update_time":
        case "get_browser_state":
        case "update_tree":
        case "clean_up_highlights":
        case "click_element":
        case "input_text":
        case "select_option":
        case "scroll":
        case "scroll_horizontally":
        case "execute_javascript":
          pc[methodName](...payload || []).then((result2) => sendResponse(result2)).catch(
            (error) => sendResponse({
              success: false,
              error: error instanceof Error ? error.message : String(error)
            })
          );
          break;
        default:
          sendResponse({
            success: false,
            error: `Unknown PAGE_CONTROL action: ${action}`
          });
      }
      return true;
    });
  }
  function getMethodName(action) {
    switch (action) {
      case "get_last_update_time":
        return "getLastUpdateTime";
      case "get_browser_state":
        return "getBrowserState";
      case "update_tree":
        return "updateTree";
      case "clean_up_highlights":
        return "cleanUpHighlights";
      // DOM actions
      case "click_element":
        return "clickElement";
      case "input_text":
        return "inputText";
      case "select_option":
        return "selectOption";
      case "scroll":
        return "scroll";
      case "scroll_horizontally":
        return "scrollHorizontally";
      case "execute_javascript":
        return "executeJavascript";
      default:
        return action;
    }
  }
  const DEBUG_PREFIX = "[Content]";
  const definition = defineContentScript({
    matches: ["<all_urls>"],
    runAt: "document_end",
    main() {
      console.debug(`${DEBUG_PREFIX} Loaded on ${window.location.href}`);
      initPageController();
      chrome.storage.local.get("PageAgentExtUserAuthToken").then((result2) => {
        const extToken = result2.PageAgentExtUserAuthToken;
        if (!extToken) return;
        const pageToken = localStorage.getItem("PageAgentExtUserAuthToken");
        if (!pageToken) return;
        if (pageToken !== extToken) return;
        console.log("[PageAgentExt]: Auth tokens match. Exposing agent to page.");
        exposeAgentToPage().then(
          // add main-world script
          () => injectScript("/main-world.js")
        );
      });
    }
  });
  async function exposeAgentToPage() {
    const { MultiPageAgent: MultiPageAgent2 } = await Promise.resolve().then(() => MultiPageAgent$1);
    console.log("[PageAgentExt]: MultiPageAgent loaded");
    let multiPageAgent = null;
    window.addEventListener("message", async (e) => {
      const data = e.data;
      if (typeof data !== "object" || data === null) return;
      if (data.channel !== "PAGE_AGENT_EXT_REQUEST") return;
      const { action, payload, id } = data;
      switch (action) {
        case "execute": {
          if (multiPageAgent && multiPageAgent.status === "running") {
            window.postMessage(
              {
                channel: "PAGE_AGENT_EXT_RESPONSE",
                id,
                action: "execute_result",
                error: "Agent is already running a task. Please wait until it finishes."
              },
              "*"
            );
            return;
          }
          try {
            const { task, config: config2 } = payload;
            multiPageAgent?.dispose();
            multiPageAgent = new MultiPageAgent2(config2);
            multiPageAgent.addEventListener("statuschange", (event) => {
              if (!multiPageAgent) return;
              window.postMessage(
                {
                  channel: "PAGE_AGENT_EXT_RESPONSE",
                  id,
                  action: "status_change_event",
                  payload: multiPageAgent.status
                },
                "*"
              );
            });
            multiPageAgent.addEventListener("activity", (event) => {
              if (!multiPageAgent) return;
              window.postMessage(
                {
                  channel: "PAGE_AGENT_EXT_RESPONSE",
                  id,
                  action: "activity_event",
                  payload: event.detail
                },
                "*"
              );
            });
            multiPageAgent.addEventListener("historychange", (event) => {
              if (!multiPageAgent) return;
              window.postMessage(
                {
                  channel: "PAGE_AGENT_EXT_RESPONSE",
                  id,
                  action: "history_change_event",
                  payload: multiPageAgent.history
                },
                "*"
              );
            });
            const result2 = await multiPageAgent.execute(task);
            window.postMessage(
              {
                channel: "PAGE_AGENT_EXT_RESPONSE",
                id,
                action: "execute_result",
                payload: result2
              },
              "*"
            );
          } catch (error) {
            window.postMessage(
              {
                channel: "PAGE_AGENT_EXT_RESPONSE",
                id,
                action: "execute_result",
                error: error.message
              },
              "*"
            );
          }
          break;
        }
        case "stop": {
          multiPageAgent?.stop();
          break;
        }
        default:
          console.warn(`${DEBUG_PREFIX} Unknown action from page:`, action);
          break;
      }
    });
  }
  function print$1(method, ...args) {
    return;
  }
  const logger$1 = {
    debug: (...args) => print$1(console.debug, ...args),
    log: (...args) => print$1(console.log, ...args),
    warn: (...args) => print$1(console.warn, ...args),
    error: (...args) => print$1(console.error, ...args)
  };
  var WxtLocationChangeEvent = class WxtLocationChangeEvent2 extends Event {
    static EVENT_NAME = getUniqueEventName("wxt:locationchange");
    constructor(newUrl, oldUrl) {
      super(WxtLocationChangeEvent2.EVENT_NAME, {});
      this.newUrl = newUrl;
      this.oldUrl = oldUrl;
    }
  };
  function getUniqueEventName(eventName) {
    return `${browser?.runtime?.id}:${"content"}:${eventName}`;
  }
  const supportsNavigationApi = typeof globalThis.navigation?.addEventListener === "function";
  function createLocationWatcher(ctx) {
    let lastUrl;
    let watching = false;
    return { run() {
      if (watching) return;
      watching = true;
      lastUrl = new URL(location.href);
      if (supportsNavigationApi) globalThis.navigation.addEventListener("navigate", (event) => {
        const newUrl = new URL(event.destination.url);
        if (newUrl.href === lastUrl.href) return;
        window.dispatchEvent(new WxtLocationChangeEvent(newUrl, lastUrl));
        lastUrl = newUrl;
      }, { signal: ctx.signal });
      else ctx.setInterval(() => {
        const newUrl = new URL(location.href);
        if (newUrl.href !== lastUrl.href) {
          window.dispatchEvent(new WxtLocationChangeEvent(newUrl, lastUrl));
          lastUrl = newUrl;
        }
      }, 1e3);
    } };
  }
  var ContentScriptContext = class ContentScriptContext2 {
    static SCRIPT_STARTED_MESSAGE_TYPE = getUniqueEventName("wxt:content-script-started");
    id;
    abortController;
    locationWatcher = createLocationWatcher(this);
    constructor(contentScriptName, options) {
      this.contentScriptName = contentScriptName;
      this.options = options;
      this.id = Math.random().toString(36).slice(2);
      this.abortController = new AbortController();
      this.stopOldScripts();
      this.listenForNewerScripts();
    }
    get signal() {
      return this.abortController.signal;
    }
    abort(reason) {
      return this.abortController.abort(reason);
    }
    get isInvalid() {
      if (browser.runtime?.id == null) this.notifyInvalidated();
      return this.signal.aborted;
    }
    get isValid() {
      return !this.isInvalid;
    }
    /**
    * Add a listener that is called when the content script's context is invalidated.
    *
    * @returns A function to remove the listener.
    *
    * @example
    * browser.runtime.onMessage.addListener(cb);
    * const removeInvalidatedListener = ctx.onInvalidated(() => {
    *   browser.runtime.onMessage.removeListener(cb);
    * })
    * // ...
    * removeInvalidatedListener();
    */
    onInvalidated(cb) {
      this.signal.addEventListener("abort", cb);
      return () => this.signal.removeEventListener("abort", cb);
    }
    /**
    * Return a promise that never resolves. Useful if you have an async function that shouldn't run
    * after the context is expired.
    *
    * @example
    * const getValueFromStorage = async () => {
    *   if (ctx.isInvalid) return ctx.block();
    *
    *   // ...
    * }
    */
    block() {
      return new Promise(() => {
      });
    }
    /**
    * Wrapper around `window.setInterval` that automatically clears the interval when invalidated.
    *
    * Intervals can be cleared by calling the normal `clearInterval` function.
    */
    setInterval(handler, timeout) {
      const id = setInterval(() => {
        if (this.isValid) handler();
      }, timeout);
      this.onInvalidated(() => clearInterval(id));
      return id;
    }
    /**
    * Wrapper around `window.setTimeout` that automatically clears the interval when invalidated.
    *
    * Timeouts can be cleared by calling the normal `setTimeout` function.
    */
    setTimeout(handler, timeout) {
      const id = setTimeout(() => {
        if (this.isValid) handler();
      }, timeout);
      this.onInvalidated(() => clearTimeout(id));
      return id;
    }
    /**
    * Wrapper around `window.requestAnimationFrame` that automatically cancels the request when
    * invalidated.
    *
    * Callbacks can be canceled by calling the normal `cancelAnimationFrame` function.
    */
    requestAnimationFrame(callback) {
      const id = requestAnimationFrame((...args) => {
        if (this.isValid) callback(...args);
      });
      this.onInvalidated(() => cancelAnimationFrame(id));
      return id;
    }
    /**
    * Wrapper around `window.requestIdleCallback` that automatically cancels the request when
    * invalidated.
    *
    * Callbacks can be canceled by calling the normal `cancelIdleCallback` function.
    */
    requestIdleCallback(callback, options) {
      const id = requestIdleCallback((...args) => {
        if (!this.signal.aborted) callback(...args);
      }, options);
      this.onInvalidated(() => cancelIdleCallback(id));
      return id;
    }
    addEventListener(target, type, handler, options) {
      if (type === "wxt:locationchange") {
        if (this.isValid) this.locationWatcher.run();
      }
      target.addEventListener?.(type.startsWith("wxt:") ? getUniqueEventName(type) : type, handler, {
        ...options,
        signal: this.signal
      });
    }
    /**
    * @internal
    * Abort the abort controller and execute all `onInvalidated` listeners.
    */
    notifyInvalidated() {
      this.abort("Contexte du script de contenu invalidé");
      logger$1.debug(`Content script "${this.contentScriptName}" context invalidated`);
    }
    stopOldScripts() {
      document.dispatchEvent(new CustomEvent(ContentScriptContext2.SCRIPT_STARTED_MESSAGE_TYPE, { detail: {
        contentScriptName: this.contentScriptName,
        messageId: this.id
      } }));
      window.postMessage({
        type: ContentScriptContext2.SCRIPT_STARTED_MESSAGE_TYPE,
        contentScriptName: this.contentScriptName,
        messageId: this.id
      }, "*");
    }
    verifyScriptStartedEvent(event) {
      const isSameContentScript = event.detail?.contentScriptName === this.contentScriptName;
      const isFromSelf = event.detail?.messageId === this.id;
      return isSameContentScript && !isFromSelf;
    }
    listenForNewerScripts() {
      const cb = (event) => {
        if (!(event instanceof CustomEvent) || !this.verifyScriptStartedEvent(event)) return;
        this.notifyInvalidated();
      };
      document.addEventListener(ContentScriptContext2.SCRIPT_STARTED_MESSAGE_TYPE, cb);
      this.onInvalidated(() => document.removeEventListener(ContentScriptContext2.SCRIPT_STARTED_MESSAGE_TYPE, cb));
    }
  };
  function initPlugins() {
  }
  function print(method, ...args) {
    return;
  }
  const logger = {
    debug: (...args) => print(console.debug, ...args),
    log: (...args) => print(console.log, ...args),
    warn: (...args) => print(console.warn, ...args),
    error: (...args) => print(console.error, ...args)
  };
  const result = (async () => {
    try {
      initPlugins();
      const { main, ...options } = definition;
      return await main(new ContentScriptContext("content", options));
    } catch (err) {
      logger.error(`The content script "${"content"}" crashed on startup!`, err);
      throw err;
    }
  })();
  function computeBorderGeometry(pixelWidth, pixelHeight, borderWidth, glowWidth) {
    const shortSide = Math.max(1, Math.min(pixelWidth, pixelHeight));
    const borderWidthPx = Math.min(borderWidth, 20);
    const glowWidthPx = glowWidth;
    const totalThick = Math.min(borderWidthPx + glowWidthPx, shortSide);
    const insetX = Math.min(totalThick, Math.floor(pixelWidth / 2));
    const insetY = Math.min(totalThick, Math.floor(pixelHeight / 2));
    const toClipX = (x) => x / pixelWidth * 2 - 1;
    const toClipY = (y) => y / pixelHeight * 2 - 1;
    const x0 = 0;
    const x1 = pixelWidth;
    const y0 = 0;
    const y1 = pixelHeight;
    const xi0 = insetX;
    const xi1 = pixelWidth - insetX;
    const yi0 = insetY;
    const yi1 = pixelHeight - insetY;
    const X0 = toClipX(x0);
    const X1 = toClipX(x1);
    const Y0 = toClipY(y0);
    const Y1 = toClipY(y1);
    const Xi0 = toClipX(xi0);
    const Xi1 = toClipX(xi1);
    const Yi0 = toClipY(yi0);
    const Yi1 = toClipY(yi1);
    const u0 = 0;
    const v0 = 0;
    const u1 = 1;
    const v1 = 1;
    const ui0 = insetX / pixelWidth;
    const ui1 = 1 - insetX / pixelWidth;
    const vi0 = insetY / pixelHeight;
    const vi1 = 1 - insetY / pixelHeight;
    const positions = new Float32Array([
      // Top strip
      X0,
      Y0,
      X1,
      Y0,
      X0,
      Yi0,
      X0,
      Yi0,
      X1,
      Y0,
      X1,
      Yi0,
      // Bottom strip
      X0,
      Yi1,
      X1,
      Yi1,
      X0,
      Y1,
      X0,
      Y1,
      X1,
      Yi1,
      X1,
      Y1,
      // Left strip
      X0,
      Yi0,
      Xi0,
      Yi0,
      X0,
      Yi1,
      X0,
      Yi1,
      Xi0,
      Yi0,
      Xi0,
      Yi1,
      // Right strip
      Xi1,
      Yi0,
      X1,
      Yi0,
      Xi1,
      Yi1,
      Xi1,
      Yi1,
      X1,
      Yi0,
      X1,
      Yi1
    ]);
    const uvs = new Float32Array([
      // Top strip
      u0,
      v0,
      u1,
      v0,
      u0,
      vi0,
      u0,
      vi0,
      u1,
      v0,
      u1,
      vi0,
      // Bottom strip
      u0,
      vi1,
      u1,
      vi1,
      u0,
      v1,
      u0,
      v1,
      u1,
      vi1,
      u1,
      v1,
      // Left strip
      u0,
      vi0,
      ui0,
      vi0,
      u0,
      vi1,
      u0,
      vi1,
      ui0,
      vi0,
      ui0,
      vi1,
      // Right strip
      ui1,
      vi0,
      u1,
      vi0,
      ui1,
      vi1,
      ui1,
      vi1,
      u1,
      vi0,
      u1,
      vi1
    ]);
    return { positions, uvs };
  }
  function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Failed to create shader");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader) || "Unknown shader error";
      gl.deleteShader(shader);
      throw new Error(info);
    }
    return shader;
  }
  function createProgram(gl, vertexSource, fragmentSource) {
    const vs = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!program) throw new Error("Failed to create program");
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program) || "Unknown link error";
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      throw new Error(info);
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return program;
  }
  const fragmentShaderSource = `#version 300 es
precision lowp float;
in vec2 vUV;
out vec4 outColor;
uniform vec2 uResolution;
uniform float uTime;
uniform float uBorderWidth;
uniform float uGlowWidth;
uniform float uBorderRadius;
uniform vec3 uColors[4];
uniform float uGlowExponent;
uniform float uGlowFactor;
const float PI = 3.14159265359;
const float TWO_PI = 2.0 * PI;
const float HALF_PI = 0.5 * PI;
const vec4 startPositions = vec4(0.0, PI, HALF_PI, 1.5 * PI);
const vec4 speeds = vec4(-1.9, -1.9, -1.5, 2.1);
const vec4 innerRadius = vec4(PI * 0.8, PI * 0.7, PI * 0.3, PI * 0.1);
const vec4 outerRadius = vec4(PI * 1.2, PI * 0.9, PI * 0.6, PI * 0.4);
float random(vec2 st) {
return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}
vec2 random2(vec2 st) {
return vec2(random(st), random(st + 1.0));
}
float aaStep(float edge, float d) {
float width = fwidth(d);
return smoothstep(edge - width * 0.5, edge + width * 0.5, d);
}
float aaFract(float x) {
float f = fract(x);
float w = fwidth(x);
float smooth_f = f * (1.0 - smoothstep(1.0 - w, 1.0, f));
return smooth_f;
}
float sdRoundedBox(in vec2 p, in vec2 b, in float r) {
vec2 q = abs(p) - b + r;
return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}
float getInnerGlow(vec2 p, vec2 b, float radius) {
float dist_x = b.x - abs(p.x);
float dist_y = b.y - abs(p.y);
float glow_x = smoothstep(radius, 0.0, dist_x);
float glow_y = smoothstep(radius, 0.0, dist_y);
return 1.0 - (1.0 - glow_x) * (1.0 - glow_y);
}
float getVignette(vec2 uv) {
vec2 vignetteUv = uv;
vignetteUv = vignetteUv * (1.0 - vignetteUv);
float vignette = vignetteUv.x * vignetteUv.y * 25.0;
vignette = pow(vignette, 0.16);
vignette = 1.0 - vignette;
return vignette;
}
float uvToAngle(vec2 uv) {
vec2 center = vec2(0.5);
vec2 dir = uv - center;
return atan(dir.y, dir.x) + PI;
}
void main() {
vec2 uv = vUV;
vec2 pos = uv * uResolution;
vec2 centeredPos = pos - uResolution * 0.5;
vec2 size = uResolution - uBorderWidth;
vec2 halfSize = size * 0.5;
float dBorderBox = sdRoundedBox(centeredPos, halfSize, uBorderRadius);
float border = aaStep(0.0, dBorderBox);
float glow = getInnerGlow(centeredPos, halfSize, uGlowWidth);
float vignette = getVignette(uv);
glow *= vignette;
float posAngle = uvToAngle(uv);
vec4 lightCenter = mod(startPositions + speeds * uTime, TWO_PI);
vec4 angleDist = abs(posAngle - lightCenter);
vec4 disToLight = min(angleDist, TWO_PI - angleDist) / TWO_PI;
float intensityBorder[4];
intensityBorder[0] = 1.0;
intensityBorder[1] = smoothstep(0.4, 0.0, disToLight.y);
intensityBorder[2] = smoothstep(0.4, 0.0, disToLight.z);
intensityBorder[3] = smoothstep(0.2, 0.0, disToLight.w) * 0.5;
vec3 borderColor = vec3(0.0);
for(int i = 0; i < 4; i++) {
borderColor = mix(borderColor, uColors[i], intensityBorder[i]);
}
borderColor *= 1.1;
borderColor = clamp(borderColor, 0.0, 1.0);
float intensityGlow[4];
intensityGlow[0] = smoothstep(0.9, 0.0, disToLight.x);
intensityGlow[1] = smoothstep(0.7, 0.0, disToLight.y);
intensityGlow[2] = smoothstep(0.4, 0.0, disToLight.z);
intensityGlow[3] = smoothstep(0.1, 0.0, disToLight.w) * 0.7;
vec4 breath = smoothstep(0.0, 1.0, sin(uTime * 1.0 + startPositions * PI) * 0.2 + 0.8);
vec3 glowColor = vec3(0.0);
glowColor += uColors[0] * intensityGlow[0] * breath.x;
glowColor += uColors[1] * intensityGlow[1] * breath.y;
glowColor += uColors[2] * intensityGlow[2] * breath.z;
glowColor += uColors[3] * intensityGlow[3] * breath.w * glow;
glow = pow(glow, uGlowExponent);
glow *= random(pos + uTime) * 0.1 + 1.0;
glowColor *= glow * uGlowFactor;
glowColor = clamp(glowColor, 0.0, 1.0);
vec3 color = mix(glowColor, borderColor + glowColor * 0.2, border);
float alpha = mix(glow, 1.0, border);
outColor = vec4(color, alpha);
}`;
  const vertexShaderSource = `#version 300 es
in vec2 aPosition;
in vec2 aUV;
out vec2 vUV;
void main() {
vUV = aUV;
gl_Position = vec4(aPosition, 0.0, 1.0);
}`;
  const DEFAULT_COLORS = [
    "rgb(57, 182, 255)",
    "rgb(189, 69, 251)",
    "rgb(255, 87, 51)",
    "rgb(255, 214, 0)"
  ];
  function parseColor(colorStr) {
    const match = colorStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!match) {
      throw new Error(`Invalid color format: ${colorStr}`);
    }
    const [, r, g, b] = match;
    return [parseInt(r) / 255, parseInt(g) / 255, parseInt(b) / 255];
  }
  class Motion {
    element;
    canvas;
    options;
    running = false;
    disposed = false;
    startTime = 0;
    lastTime = 0;
    rafId = null;
    glr;
    observer;
    constructor(options = {}) {
      this.options = {
        width: options.width ?? 600,
        height: options.height ?? 600,
        ratio: options.ratio ?? window.devicePixelRatio ?? 1,
        borderWidth: options.borderWidth ?? 8,
        glowWidth: options.glowWidth ?? 200,
        borderRadius: options.borderRadius ?? 8,
        mode: options.mode ?? "light",
        ...options
      };
      this.canvas = document.createElement("canvas");
      if (this.options.classNames) {
        this.canvas.className = this.options.classNames;
      }
      if (this.options.styles) {
        Object.assign(this.canvas.style, this.options.styles);
      }
      this.canvas.style.display = "block";
      this.canvas.style.transformOrigin = "center";
      this.canvas.style.pointerEvents = "none";
      this.element = this.canvas;
      this.setupGL();
      if (!this.options.skipGreeting) this.greet();
    }
    start() {
      if (this.disposed) throw new Error("Motion instance has been disposed.");
      if (this.running) return;
      if (!this.glr) {
        console.error("WebGL resources are not initialized.");
        return;
      }
      this.running = true;
      this.startTime = performance.now();
      this.resize(this.options.width ?? 600, this.options.height ?? 600, this.options.ratio);
      this.glr.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      this.glr.gl.useProgram(this.glr.program);
      this.glr.gl.uniform2f(this.glr.uResolution, this.canvas.width, this.canvas.height);
      this.checkGLError(this.glr.gl, "start: after initial setup");
      const loop = () => {
        if (!this.running || !this.glr) return;
        this.rafId = requestAnimationFrame(loop);
        const now = performance.now();
        const delta = now - this.lastTime;
        if (delta < 1e3 / 32) return;
        this.lastTime = now;
        const t = (now - this.startTime) * 1e-3;
        this.render(t);
      };
      this.rafId = requestAnimationFrame(loop);
    }
    pause() {
      if (this.disposed) throw new Error("Motion instance has been disposed.");
      this.running = false;
      if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    }
    dispose() {
      if (this.disposed) return;
      this.disposed = true;
      this.running = false;
      if (this.rafId !== null) cancelAnimationFrame(this.rafId);
      const { gl, vao, positionBuffer, uvBuffer, program } = this.glr;
      if (vao) gl.deleteVertexArray(vao);
      if (positionBuffer) gl.deleteBuffer(positionBuffer);
      if (uvBuffer) gl.deleteBuffer(uvBuffer);
      gl.deleteProgram(program);
      if (this.observer) this.observer.disconnect();
      this.canvas.remove();
    }
    resize(width, height, ratio) {
      if (this.disposed) throw new Error("Motion instance has been disposed.");
      this.options.width = width;
      this.options.height = height;
      if (ratio) this.options.ratio = ratio;
      if (!this.running) return;
      const { gl, program, vao, positionBuffer, uvBuffer, uResolution } = this.glr;
      const dpr = ratio ?? this.options.ratio ?? window.devicePixelRatio ?? 1;
      const desiredWidth = Math.max(1, Math.floor(width * dpr));
      const desiredHeight = Math.max(1, Math.floor(height * dpr));
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
      if (this.canvas.width !== desiredWidth || this.canvas.height !== desiredHeight) {
        this.canvas.width = desiredWidth;
        this.canvas.height = desiredHeight;
      }
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      this.checkGLError(gl, "resize: after viewport setup");
      const { positions, uvs } = computeBorderGeometry(
        this.canvas.width,
        this.canvas.height,
        this.options.borderWidth * dpr,
        this.options.glowWidth * dpr
      );
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
      const aPosition = gl.getAttribLocation(program, "aPosition");
      gl.enableVertexAttribArray(aPosition);
      gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
      this.checkGLError(gl, "resize: after position buffer update");
      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
      const aUV = gl.getAttribLocation(program, "aUV");
      gl.enableVertexAttribArray(aUV);
      gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 0, 0);
      this.checkGLError(gl, "resize: after UV buffer update");
      gl.useProgram(program);
      gl.uniform2f(uResolution, this.canvas.width, this.canvas.height);
      gl.uniform1f(this.glr.uBorderWidth, this.options.borderWidth * dpr);
      gl.uniform1f(this.glr.uGlowWidth, this.options.glowWidth * dpr);
      gl.uniform1f(this.glr.uBorderRadius, this.options.borderRadius * dpr);
      this.checkGLError(gl, "resize: after uniform updates");
      const now = performance.now();
      this.lastTime = now;
      const t = (now - this.startTime) * 1e-3;
      this.render(t);
    }
    /**
     * Automatically resizes the canvas to match the dimensions of the given element.
     * @note using ResizeObserver
     */
    autoResize(sourceElement) {
      if (this.observer) {
        this.observer.disconnect();
      }
      this.observer = new ResizeObserver(() => {
        const rect = sourceElement.getBoundingClientRect();
        this.resize(rect.width, rect.height);
      });
      this.observer.observe(sourceElement);
    }
    fadeIn() {
      if (this.disposed) throw new Error("Motion instance has been disposed.");
      return new Promise((resolve, reject) => {
        const animation = this.canvas.animate(
          [
            { opacity: 0, transform: "scale(1.2)" },
            { opacity: 1, transform: "scale(1)" }
          ],
          { duration: 300, easing: "ease-out", fill: "forwards" }
        );
        animation.onfinish = () => resolve();
        animation.oncancel = () => reject("canceled");
      });
    }
    fadeOut() {
      if (this.disposed) throw new Error("Motion instance has been disposed.");
      return new Promise((resolve, reject) => {
        const animation = this.canvas.animate(
          [
            { opacity: 1, transform: "scale(1)" },
            { opacity: 0, transform: "scale(1.2)" }
          ],
          { duration: 300, easing: "ease-in", fill: "forwards" }
        );
        animation.onfinish = () => resolve();
        animation.oncancel = () => reject("canceled");
      });
    }
    checkGLError(gl, context) {
      let error = gl.getError();
      if (error !== gl.NO_ERROR) {
        console.group(`🔴 WebGL Error in ${context}`);
        while (error !== gl.NO_ERROR) {
          const errorName = this.getGLErrorName(gl, error);
          console.error(`${errorName} (0x${error.toString(16)})`);
          error = gl.getError();
        }
        console.groupEnd();
      }
    }
    getGLErrorName(gl, error) {
      switch (error) {
        case gl.INVALID_ENUM:
          return "INVALID_ENUM";
        case gl.INVALID_VALUE:
          return "INVALID_VALUE";
        case gl.INVALID_OPERATION:
          return "INVALID_OPERATION";
        case gl.INVALID_FRAMEBUFFER_OPERATION:
          return "INVALID_FRAMEBUFFER_OPERATION";
        case gl.OUT_OF_MEMORY:
          return "OUT_OF_MEMORY";
        case gl.CONTEXT_LOST_WEBGL:
          return "CONTEXT_LOST_WEBGL";
        default:
          return "UNKNOWN_ERROR";
      }
    }
    setupGL() {
      const gl = this.canvas.getContext("webgl2", { antialias: false, alpha: true });
      if (!gl) {
        throw new Error("WebGL2 is required but not available.");
      }
      const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
      this.checkGLError(gl, "setupGL: after createProgram");
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      this.checkGLError(gl, "setupGL: after VAO creation");
      const pw = this.canvas.width || 2;
      const ph = this.canvas.height || 2;
      const { positions, uvs } = computeBorderGeometry(
        pw,
        ph,
        this.options.borderWidth,
        this.options.glowWidth
      );
      const positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
      const aPosition = gl.getAttribLocation(program, "aPosition");
      gl.enableVertexAttribArray(aPosition);
      gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
      this.checkGLError(gl, "setupGL: after position buffer setup");
      const uvBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
      const aUV = gl.getAttribLocation(program, "aUV");
      gl.enableVertexAttribArray(aUV);
      gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 0, 0);
      this.checkGLError(gl, "setupGL: after UV buffer setup");
      const uResolution = gl.getUniformLocation(program, "uResolution");
      const uTime = gl.getUniformLocation(program, "uTime");
      const uBorderWidth = gl.getUniformLocation(program, "uBorderWidth");
      const uGlowWidth = gl.getUniformLocation(program, "uGlowWidth");
      const uBorderRadius = gl.getUniformLocation(program, "uBorderRadius");
      const uColors = gl.getUniformLocation(program, "uColors");
      const uGlowExponent = gl.getUniformLocation(program, "uGlowExponent");
      const uGlowFactor = gl.getUniformLocation(program, "uGlowFactor");
      gl.useProgram(program);
      gl.uniform1f(uBorderWidth, this.options.borderWidth);
      gl.uniform1f(uGlowWidth, this.options.glowWidth);
      gl.uniform1f(uBorderRadius, this.options.borderRadius);
      if (this.options.mode === "dark") {
        gl.uniform1f(uGlowExponent, 2);
        gl.uniform1f(uGlowFactor, 1.8);
      } else {
        gl.uniform1f(uGlowExponent, 1);
        gl.uniform1f(uGlowFactor, 1);
      }
      const colorVecs = (this.options.colors || DEFAULT_COLORS).map(parseColor);
      for (let i = 0; i < colorVecs.length; i++) {
        gl.uniform3f(gl.getUniformLocation(program, `uColors[${i}]`), ...colorVecs[i]);
      }
      this.checkGLError(gl, "setupGL: after uniform setup");
      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      this.glr = {
        gl,
        program,
        vao,
        positionBuffer,
        uvBuffer,
        uResolution,
        uTime,
        uBorderWidth,
        uGlowWidth,
        uBorderRadius,
        uColors
      };
    }
    render(t) {
      if (!this.glr) return;
      const { gl, program, vao, uTime } = this.glr;
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.uniform1f(uTime, t);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.disable(gl.BLEND);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 24);
      this.checkGLError(gl, "render: after draw call");
      gl.bindVertexArray(null);
    }
    greet() {
      console.log(
        `%c🌈 ai-motion ${"0.4.8"} 🌈`,
        "background: linear-gradient(90deg, #39b6ff, #bd45fb, #ff5733, #ffd600); color: white; text-shadow: 0 0 2px rgba(0, 0, 0, 0.2); font-weight: bold; font-size: 1em; padding: 2px 12px; border-radius: 6px;"
      );
    }
  }
  (function() {
    try {
      if (typeof document != "undefined") {
        var elementStyle = document.createElement("style");
        elementStyle.appendChild(document.createTextNode(`._wrapper_gf8tz_1 {
	position: fixed;
	inset: 0;
	z-index: 2147483641; /* 确保在所有元素之上，除了 panel */
	cursor: wait;
	overflow: hidden;

	display: none;
}
/* AI 光标样式 */
._cursor_1dgwb_2 {
	position: absolute;
	width: var(--cursor-size, 75px);
	height: var(--cursor-size, 75px);
	pointer-events: none;
	z-index: 10000;
}

._cursorBorder_1dgwb_10 {
	position: absolute;
	width: 100%;
	height: 100%;
	background: linear-gradient(45deg, rgb(57, 182, 255), rgb(189, 69, 251));
	mask-image: url("data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20100%20100'%20fill='none'%3e%3cg%3e%3cpath%20d='M%2015%2042%20L%2015%2036.99%20Q%2015%2031.99%2023.7%2031.99%20L%2028.05%2031.99%20Q%2032.41%2031.99%2032.41%2021.99%20L%2032.41%2017%20Q%2032.41%2012%2041.09%2016.95%20L%2076.31%2037.05%20Q%2085%2042%2076.31%2046.95%20L%2041.09%2067.05%20Q%2032.41%2072%2032.41%2062.01%20L%2032.41%2057.01%20Q%2032.41%2052.01%2023.7%2052.01%20L%2019.35%2052.01%20Q%2015%2052.01%2015%2047.01%20Z'%20fill='none'%20stroke='%23000000'%20stroke-width='6'%20stroke-miterlimit='10'%20style='stroke:%20light-dark(rgb(0,%200,%200),%20rgb(255,%20255,%20255));'/%3e%3c/g%3e%3c/svg%3e");
	mask-size: 100% 100%;
	mask-repeat: no-repeat;

	transform-origin: center;
	transform: rotate(-135deg) scale(1.2);
	margin-left: -10px;
	margin-top: -18px;
}

._cursorFilling_1dgwb_25 {
	position: absolute;
	width: 100%;
	height: 100%;
	background: url("data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20100%20100'%3e%3cdefs%3e%3c/defs%3e%3cg%20xmlns='http://www.w3.org/2000/svg'%20style='filter:%20drop-shadow(light-dark(rgba(0,%200,%200,%200.4),%20rgba(237,%20237,%20237,%200.4))%203px%204px%204px);'%3e%3cpath%20d='M%2015%2042%20L%2015%2036.99%20Q%2015%2031.99%2023.7%2031.99%20L%2028.05%2031.99%20Q%2032.41%2031.99%2032.41%2021.99%20L%2032.41%2017%20Q%2032.41%2012%2041.09%2016.95%20L%2076.31%2037.05%20Q%2085%2042%2076.31%2046.95%20L%2041.09%2067.05%20Q%2032.41%2072%2032.41%2062.01%20L%2032.41%2057.01%20Q%2032.41%2052.01%2023.7%2052.01%20L%2019.35%2052.01%20Q%2015%2052.01%2015%2047.01%20Z'%20fill='%23ffffff'%20stroke='none'%20style='fill:%20%23ffffff;'/%3e%3c/g%3e%3c/svg%3e");
	background-size: 100% 100%;
	background-repeat: no-repeat;

	transform-origin: center;
	transform: rotate(-135deg) scale(1.2);
	margin-left: -10px;
	margin-top: -18px;
}

._cursorRipple_1dgwb_39 {
	position: absolute;
	width: 100%;
	height: 100%;
	pointer-events: none;
	margin-left: -50%;
	margin-top: -50%;

	&::after {
		content: '';
		opacity: 0;
		position: absolute;
		inset: 0;
		border: 4px solid rgba(57, 182, 255, 1);
		border-radius: 50%;
	}
}

._cursor_1dgwb_2._clicking_1dgwb_57 ._cursorRipple_1dgwb_39::after {
	animation: _cursor-ripple_1dgwb_1 300ms ease-out forwards;
}

@keyframes _cursor-ripple_1dgwb_1 {
	0% {
		transform: scale(0);
		opacity: 1;
	}
	100% {
		transform: scale(2);
		opacity: 0;
	}
}`));
        document.head.appendChild(elementStyle);
      }
    } catch (e) {
      console.error("vite-plugin-css-injected-by-js", e);
    }
  })();
  var __defProp$2 = Object.defineProperty;
  var __typeError$1 = (msg) => {
    throw TypeError(msg);
  };
  var __defNormalProp$1 = (obj, key, value) => key in obj ? __defProp$2(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __name$2 = (target, value) => __defProp$2(target, "name", { value, configurable: true });
  var __publicField$1 = (obj, key, value) => __defNormalProp$1(obj, typeof key !== "symbol" ? key + "" : key, value);
  var __accessCheck$1 = (obj, member, msg) => member.has(obj) || __typeError$1("Cannot " + msg);
  var __privateGet$1 = (obj, member, getter) => (__accessCheck$1(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd$1 = (obj, member, value) => member.has(obj) ? __typeError$1("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet$1 = (obj, member, value, setter) => (__accessCheck$1(obj, member, "write to private field"), member.set(obj, value), value);
  var __privateMethod$1 = (obj, member, method) => (__accessCheck$1(obj, member, "access private method"), method);
  var _cursor, _currentCursorX, _currentCursorY, _targetCursorX, _targetCursorY, _SimulatorMask_instances, createCursor_fn, moveCursorToTarget_fn;
  function hasDarkModeClass() {
    const DEFAULT_DARK_MODE_CLASSES = ["dark", "dark-mode", "theme-dark", "night", "night-mode"];
    const htmlElement = document.documentElement;
    const bodyElement = document.body || document.documentElement;
    for (const className of DEFAULT_DARK_MODE_CLASSES) {
      if (htmlElement.classList.contains(className) || bodyElement?.classList.contains(className)) {
        return true;
      }
    }
    const darkThemeAttribute = htmlElement.getAttribute("data-theme");
    if (darkThemeAttribute?.toLowerCase().includes("dark")) {
      return true;
    }
    return false;
  }
  __name$2(hasDarkModeClass, "hasDarkModeClass");
  function parseRgbColor(colorString) {
    const rgbMatch = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(colorString);
    if (!rgbMatch) {
      return null;
    }
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3])
    };
  }
  __name$2(parseRgbColor, "parseRgbColor");
  function isColorDark(colorString, threshold = 128) {
    if (!colorString || colorString === "transparent" || colorString.startsWith("rgba(0, 0, 0, 0)")) {
      return false;
    }
    const rgb = parseRgbColor(colorString);
    if (!rgb) {
      return false;
    }
    const luminance = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
    return luminance < threshold;
  }
  __name$2(isColorDark, "isColorDark");
  function isBackgroundDark() {
    const htmlStyle = window.getComputedStyle(document.documentElement);
    const bodyStyle = window.getComputedStyle(document.body || document.documentElement);
    const htmlBgColor = htmlStyle.backgroundColor;
    const bodyBgColor = bodyStyle.backgroundColor;
    if (isColorDark(bodyBgColor)) {
      return true;
    } else if (bodyBgColor === "transparent" || bodyBgColor.startsWith("rgba(0, 0, 0, 0)")) {
      return isColorDark(htmlBgColor);
    }
    return false;
  }
  __name$2(isBackgroundDark, "isBackgroundDark");
  function isPageDark() {
    try {
      if (hasDarkModeClass()) {
        return true;
      }
      if (isBackgroundDark()) {
        return true;
      }
      return false;
    } catch (error) {
      console.warn("Error determining if page is dark:", error);
      return false;
    }
  }
  __name$2(isPageDark, "isPageDark");
  const wrapper = "_wrapper_gf8tz_1";
  const styles$2 = {
    wrapper
  };
  const cursor = "_cursor_1dgwb_2";
  const cursorBorder = "_cursorBorder_1dgwb_10";
  const cursorFilling = "_cursorFilling_1dgwb_25";
  const cursorRipple = "_cursorRipple_1dgwb_39";
  const clicking = "_clicking_1dgwb_57";
  const cursorStyles = {
    cursor,
    cursorBorder,
    cursorFilling,
    cursorRipple,
    clicking
  };
  const _SimulatorMask = class _SimulatorMask {
    constructor() {
      __privateAdd$1(this, _SimulatorMask_instances);
      __publicField$1(this, "shown", false);
      __publicField$1(this, "wrapper", document.createElement("div"));
      __publicField$1(this, "motion", null);
      __privateAdd$1(this, _cursor, document.createElement("div"));
      __privateAdd$1(this, _currentCursorX, 0);
      __privateAdd$1(this, _currentCursorY, 0);
      __privateAdd$1(this, _targetCursorX, 0);
      __privateAdd$1(this, _targetCursorY, 0);
      this.wrapper.id = "page-agent-runtime_simulator-mask";
      this.wrapper.className = styles$2.wrapper;
      this.wrapper.setAttribute("data-browser-use-ignore", "true");
      this.wrapper.setAttribute("data-page-agent-ignore", "true");
      try {
        const motion = new Motion({
          mode: isPageDark() ? "dark" : "light",
          styles: { position: "absolute", inset: "0" }
        });
        this.motion = motion;
        this.wrapper.appendChild(motion.element);
        motion.autoResize(this.wrapper);
      } catch (e) {
        console.warn("[SimulatorMask] Motion overlay unavailable:", e);
      }
      this.wrapper.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
      });
      this.wrapper.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        e.preventDefault();
      });
      this.wrapper.addEventListener("mouseup", (e) => {
        e.stopPropagation();
        e.preventDefault();
      });
      this.wrapper.addEventListener("mousemove", (e) => {
        e.stopPropagation();
        e.preventDefault();
      });
      this.wrapper.addEventListener("wheel", (e) => {
        e.stopPropagation();
        e.preventDefault();
      });
      this.wrapper.addEventListener("keydown", (e) => {
        e.stopPropagation();
        e.preventDefault();
      });
      this.wrapper.addEventListener("keyup", (e) => {
        e.stopPropagation();
        e.preventDefault();
      });
      __privateMethod$1(this, _SimulatorMask_instances, createCursor_fn).call(this);
      document.body.appendChild(this.wrapper);
      __privateMethod$1(this, _SimulatorMask_instances, moveCursorToTarget_fn).call(this);
      window.addEventListener("PageAgent::MovePointerTo", (event) => {
        const { x, y } = event.detail;
        this.setCursorPosition(x, y);
      });
      window.addEventListener("PageAgent::ClickPointer", (event) => {
        this.triggerClickAnimation();
      });
    }
    setCursorPosition(x, y) {
      __privateSet$1(this, _targetCursorX, x);
      __privateSet$1(this, _targetCursorY, y);
    }
    triggerClickAnimation() {
      __privateGet$1(this, _cursor).classList.remove(cursorStyles.clicking);
      void __privateGet$1(this, _cursor).offsetHeight;
      __privateGet$1(this, _cursor).classList.add(cursorStyles.clicking);
    }
    show() {
      if (this.shown) return;
      this.shown = true;
      this.motion?.start();
      this.motion?.fadeIn();
      this.wrapper.style.display = "block";
      __privateSet$1(this, _currentCursorX, window.innerWidth / 2);
      __privateSet$1(this, _currentCursorY, window.innerHeight / 2);
      __privateSet$1(this, _targetCursorX, __privateGet$1(this, _currentCursorX));
      __privateSet$1(this, _targetCursorY, __privateGet$1(this, _currentCursorY));
      __privateGet$1(this, _cursor).style.left = `${__privateGet$1(this, _currentCursorX)}px`;
      __privateGet$1(this, _cursor).style.top = `${__privateGet$1(this, _currentCursorY)}px`;
    }
    hide() {
      if (!this.shown) return;
      this.shown = false;
      this.motion?.fadeOut();
      this.motion?.pause();
      __privateGet$1(this, _cursor).classList.remove(cursorStyles.clicking);
      setTimeout(() => {
        this.wrapper.style.display = "none";
      }, 800);
    }
    dispose() {
      this.motion?.dispose();
      this.wrapper.remove();
    }
  };
  _cursor = /* @__PURE__ */ new WeakMap();
  _currentCursorX = /* @__PURE__ */ new WeakMap();
  _currentCursorY = /* @__PURE__ */ new WeakMap();
  _targetCursorX = /* @__PURE__ */ new WeakMap();
  _targetCursorY = /* @__PURE__ */ new WeakMap();
  _SimulatorMask_instances = /* @__PURE__ */ new WeakSet();
  createCursor_fn = /* @__PURE__ */ __name$2(function() {
    __privateGet$1(this, _cursor).className = cursorStyles.cursor;
    const rippleContainer = document.createElement("div");
    rippleContainer.className = cursorStyles.cursorRipple;
    __privateGet$1(this, _cursor).appendChild(rippleContainer);
    const fillingLayer = document.createElement("div");
    fillingLayer.className = cursorStyles.cursorFilling;
    __privateGet$1(this, _cursor).appendChild(fillingLayer);
    const borderLayer = document.createElement("div");
    borderLayer.className = cursorStyles.cursorBorder;
    __privateGet$1(this, _cursor).appendChild(borderLayer);
    this.wrapper.appendChild(__privateGet$1(this, _cursor));
  }, "#createCursor");
  moveCursorToTarget_fn = /* @__PURE__ */ __name$2(function() {
    const newX = __privateGet$1(this, _currentCursorX) + (__privateGet$1(this, _targetCursorX) - __privateGet$1(this, _currentCursorX)) * 0.2;
    const newY = __privateGet$1(this, _currentCursorY) + (__privateGet$1(this, _targetCursorY) - __privateGet$1(this, _currentCursorY)) * 0.2;
    const xDistance = Math.abs(newX - __privateGet$1(this, _targetCursorX));
    if (xDistance > 0) {
      if (xDistance < 2) {
        __privateSet$1(this, _currentCursorX, __privateGet$1(this, _targetCursorX));
      } else {
        __privateSet$1(this, _currentCursorX, newX);
      }
      __privateGet$1(this, _cursor).style.left = `${__privateGet$1(this, _currentCursorX)}px`;
    }
    const yDistance = Math.abs(newY - __privateGet$1(this, _targetCursorY));
    if (yDistance > 0) {
      if (yDistance < 2) {
        __privateSet$1(this, _currentCursorY, __privateGet$1(this, _targetCursorY));
      } else {
        __privateSet$1(this, _currentCursorY, newY);
      }
      __privateGet$1(this, _cursor).style.top = `${__privateGet$1(this, _currentCursorY)}px`;
    }
    requestAnimationFrame(() => __privateMethod$1(this, _SimulatorMask_instances, moveCursorToTarget_fn).call(this));
  }, "#moveCursorToTarget");
  __name$2(_SimulatorMask, "SimulatorMask");
  let SimulatorMask = _SimulatorMask;
  const SimulatorMaskC7yoC9Lw = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    SimulatorMask
  }, Symbol.toStringTag, { value: "Module" }));
  function $constructor(name, initializer2, params) {
    function init(inst, def) {
      if (!inst._zod) {
        Object.defineProperty(inst, "_zod", {
          value: {
            def,
            constr: _,
            traits: /* @__PURE__ */ new Set()
          },
          enumerable: false
        });
      }
      if (inst._zod.traits.has(name)) {
        return;
      }
      inst._zod.traits.add(name);
      initializer2(inst, def);
      const proto2 = _.prototype;
      const keys = Object.keys(proto2);
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if (!(k in inst)) {
          inst[k] = proto2[k].bind(inst);
        }
      }
    }
    const Parent = params?.Parent ?? Object;
    class Definition extends Parent {
    }
    Object.defineProperty(Definition, "name", { value: name });
    function _(def) {
      var _a2;
      const inst = params?.Parent ? new Definition() : this;
      init(inst, def);
      (_a2 = inst._zod).deferred ?? (_a2.deferred = []);
      for (const fn of inst._zod.deferred) {
        fn();
      }
      return inst;
    }
    Object.defineProperty(_, "init", { value: init });
    Object.defineProperty(_, Symbol.hasInstance, {
      value: (inst) => {
        if (params?.Parent && inst instanceof params.Parent)
          return true;
        return inst?._zod?.traits?.has(name);
      }
    });
    Object.defineProperty(_, "name", { value: name });
    return _;
  }
  class $ZodAsyncError extends Error {
    constructor() {
      super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
    }
  }
  class $ZodEncodeError extends Error {
    constructor(name) {
      super(`Encountered unidirectional transform during encode: ${name}`);
      this.name = "ZodEncodeError";
    }
  }
  const globalConfig = {};
  function config(newConfig) {
    return globalConfig;
  }
  function getEnumValues(entries) {
    const numericValues = Object.values(entries).filter((v) => typeof v === "number");
    const values = Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
    return values;
  }
  function jsonStringifyReplacer(_, value) {
    if (typeof value === "bigint")
      return value.toString();
    return value;
  }
  function cached(getter) {
    return {
      get value() {
        {
          const value = getter();
          Object.defineProperty(this, "value", { value });
          return value;
        }
      }
    };
  }
  function nullish(input) {
    return input === null || input === void 0;
  }
  function cleanRegex(source) {
    const start = source.startsWith("^") ? 1 : 0;
    const end = source.endsWith("$") ? source.length - 1 : source.length;
    return source.slice(start, end);
  }
  function floatSafeRemainder(val, step) {
    const valDecCount = (val.toString().split(".")[1] || "").length;
    const stepString = step.toString();
    let stepDecCount = (stepString.split(".")[1] || "").length;
    if (stepDecCount === 0 && /\d?e-\d?/.test(stepString)) {
      const match = stepString.match(/\d?e-(\d?)/);
      if (match?.[1]) {
        stepDecCount = Number.parseInt(match[1]);
      }
    }
    const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
    const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
    const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
    return valInt % stepInt / 10 ** decCount;
  }
  const EVALUATING = /* @__PURE__ */ Symbol("evaluating");
  function defineLazy(object2, key, getter) {
    let value = void 0;
    Object.defineProperty(object2, key, {
      get() {
        if (value === EVALUATING) {
          return void 0;
        }
        if (value === void 0) {
          value = EVALUATING;
          value = getter();
        }
        return value;
      },
      set(v) {
        Object.defineProperty(object2, key, {
          value: v
          // configurable: true,
        });
      },
      configurable: true
    });
  }
  function assignProp(target, prop, value) {
    Object.defineProperty(target, prop, {
      value,
      writable: true,
      enumerable: true,
      configurable: true
    });
  }
  function mergeDefs(...defs) {
    const mergedDescriptors = {};
    for (const def of defs) {
      const descriptors = Object.getOwnPropertyDescriptors(def);
      Object.assign(mergedDescriptors, descriptors);
    }
    return Object.defineProperties({}, mergedDescriptors);
  }
  function esc(str) {
    return JSON.stringify(str);
  }
  function slugify(input) {
    return input.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
  }
  const captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {
  };
  function isObject(data) {
    return typeof data === "object" && data !== null && !Array.isArray(data);
  }
  const allowsEval = cached(() => {
    if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) {
      return false;
    }
    try {
      const F = Function;
      new F("");
      return true;
    } catch (_) {
      return false;
    }
  });
  function isPlainObject(o) {
    if (isObject(o) === false)
      return false;
    const ctor = o.constructor;
    if (ctor === void 0)
      return true;
    if (typeof ctor !== "function")
      return true;
    const prot = ctor.prototype;
    if (isObject(prot) === false)
      return false;
    if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) {
      return false;
    }
    return true;
  }
  function shallowClone(o) {
    if (isPlainObject(o))
      return { ...o };
    if (Array.isArray(o))
      return [...o];
    return o;
  }
  const propertyKeyTypes = /* @__PURE__ */ new Set(["string", "number", "symbol"]);
  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function clone(inst, def, params) {
    const cl = new inst._zod.constr(def ?? inst._zod.def);
    if (!def || params?.parent)
      cl._zod.parent = inst;
    return cl;
  }
  function normalizeParams(_params) {
    const params = _params;
    if (!params)
      return {};
    if (typeof params === "string")
      return { error: () => params };
    if (params?.message !== void 0) {
      if (params?.error !== void 0)
        throw new Error("Cannot specify both `message` and `error` params");
      params.error = params.message;
    }
    delete params.message;
    if (typeof params.error === "string")
      return { ...params, error: () => params.error };
    return params;
  }
  function optionalKeys(shape) {
    return Object.keys(shape).filter((k) => {
      return shape[k]._zod.optin === "optional" && shape[k]._zod.optout === "optional";
    });
  }
  const NUMBER_FORMAT_RANGES = {
    safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
    int32: [-2147483648, 2147483647],
    uint32: [0, 4294967295],
    float32: [-34028234663852886e22, 34028234663852886e22],
    float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
  };
  function pick(schema, mask) {
    const currDef = schema._zod.def;
    const checks = currDef.checks;
    const hasChecks = checks && checks.length > 0;
    if (hasChecks) {
      throw new Error(".pick() cannot be used on object schemas containing refinements");
    }
    const def = mergeDefs(schema._zod.def, {
      get shape() {
        const newShape = {};
        for (const key in mask) {
          if (!(key in currDef.shape)) {
            throw new Error(`Unrecognized key: "${key}"`);
          }
          if (!mask[key])
            continue;
          newShape[key] = currDef.shape[key];
        }
        assignProp(this, "shape", newShape);
        return newShape;
      },
      checks: []
    });
    return clone(schema, def);
  }
  function omit(schema, mask) {
    const currDef = schema._zod.def;
    const checks = currDef.checks;
    const hasChecks = checks && checks.length > 0;
    if (hasChecks) {
      throw new Error(".omit() cannot be used on object schemas containing refinements");
    }
    const def = mergeDefs(schema._zod.def, {
      get shape() {
        const newShape = { ...schema._zod.def.shape };
        for (const key in mask) {
          if (!(key in currDef.shape)) {
            throw new Error(`Unrecognized key: "${key}"`);
          }
          if (!mask[key])
            continue;
          delete newShape[key];
        }
        assignProp(this, "shape", newShape);
        return newShape;
      },
      checks: []
    });
    return clone(schema, def);
  }
  function extend(schema, shape) {
    if (!isPlainObject(shape)) {
      throw new Error("Invalid input to extend: expected a plain object");
    }
    const checks = schema._zod.def.checks;
    const hasChecks = checks && checks.length > 0;
    if (hasChecks) {
      const existingShape = schema._zod.def.shape;
      for (const key in shape) {
        if (Object.getOwnPropertyDescriptor(existingShape, key) !== void 0) {
          throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
        }
      }
    }
    const def = mergeDefs(schema._zod.def, {
      get shape() {
        const _shape = { ...schema._zod.def.shape, ...shape };
        assignProp(this, "shape", _shape);
        return _shape;
      }
    });
    return clone(schema, def);
  }
  function safeExtend(schema, shape) {
    if (!isPlainObject(shape)) {
      throw new Error("Invalid input to safeExtend: expected a plain object");
    }
    const def = mergeDefs(schema._zod.def, {
      get shape() {
        const _shape = { ...schema._zod.def.shape, ...shape };
        assignProp(this, "shape", _shape);
        return _shape;
      }
    });
    return clone(schema, def);
  }
  function merge(a, b) {
    const def = mergeDefs(a._zod.def, {
      get shape() {
        const _shape = { ...a._zod.def.shape, ...b._zod.def.shape };
        assignProp(this, "shape", _shape);
        return _shape;
      },
      get catchall() {
        return b._zod.def.catchall;
      },
      checks: []
      // delete existing checks
    });
    return clone(a, def);
  }
  function partial(Class, schema, mask) {
    const currDef = schema._zod.def;
    const checks = currDef.checks;
    const hasChecks = checks && checks.length > 0;
    if (hasChecks) {
      throw new Error(".partial() cannot be used on object schemas containing refinements");
    }
    const def = mergeDefs(schema._zod.def, {
      get shape() {
        const oldShape = schema._zod.def.shape;
        const shape = { ...oldShape };
        if (mask) {
          for (const key in mask) {
            if (!(key in oldShape)) {
              throw new Error(`Unrecognized key: "${key}"`);
            }
            if (!mask[key])
              continue;
            shape[key] = Class ? new Class({
              type: "optional",
              innerType: oldShape[key]
            }) : oldShape[key];
          }
        } else {
          for (const key in oldShape) {
            shape[key] = Class ? new Class({
              type: "optional",
              innerType: oldShape[key]
            }) : oldShape[key];
          }
        }
        assignProp(this, "shape", shape);
        return shape;
      },
      checks: []
    });
    return clone(schema, def);
  }
  function required(Class, schema, mask) {
    const def = mergeDefs(schema._zod.def, {
      get shape() {
        const oldShape = schema._zod.def.shape;
        const shape = { ...oldShape };
        if (mask) {
          for (const key in mask) {
            if (!(key in shape)) {
              throw new Error(`Unrecognized key: "${key}"`);
            }
            if (!mask[key])
              continue;
            shape[key] = new Class({
              type: "nonoptional",
              innerType: oldShape[key]
            });
          }
        } else {
          for (const key in oldShape) {
            shape[key] = new Class({
              type: "nonoptional",
              innerType: oldShape[key]
            });
          }
        }
        assignProp(this, "shape", shape);
        return shape;
      }
    });
    return clone(schema, def);
  }
  function aborted(x, startIndex = 0) {
    if (x.aborted === true)
      return true;
    for (let i = startIndex; i < x.issues.length; i++) {
      if (x.issues[i]?.continue !== true) {
        return true;
      }
    }
    return false;
  }
  function prefixIssues(path, issues) {
    return issues.map((iss) => {
      var _a2;
      (_a2 = iss).path ?? (_a2.path = []);
      iss.path.unshift(path);
      return iss;
    });
  }
  function unwrapMessage(message) {
    return typeof message === "string" ? message : message?.message;
  }
  function finalizeIssue(iss, ctx, config2) {
    const full = { ...iss, path: iss.path ?? [] };
    if (!iss.message) {
      const message = unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config2.customError?.(iss)) ?? unwrapMessage(config2.localeError?.(iss)) ?? "Invalid input";
      full.message = message;
    }
    delete full.inst;
    delete full.continue;
    if (!ctx?.reportInput) {
      delete full.input;
    }
    return full;
  }
  function getLengthableOrigin(input) {
    if (Array.isArray(input))
      return "array";
    if (typeof input === "string")
      return "string";
    return "unknown";
  }
  function issue(...args) {
    const [iss, input, inst] = args;
    if (typeof iss === "string") {
      return {
        message: iss,
        code: "custom",
        input,
        inst
      };
    }
    return { ...iss };
  }
  const initializer$1 = (inst, def) => {
    inst.name = "$ZodError";
    Object.defineProperty(inst, "_zod", {
      value: inst._zod,
      enumerable: false
    });
    Object.defineProperty(inst, "issues", {
      value: def,
      enumerable: false
    });
    inst.message = JSON.stringify(def, jsonStringifyReplacer, 2);
    Object.defineProperty(inst, "toString", {
      value: () => inst.message,
      enumerable: false
    });
  };
  const $ZodError = $constructor("$ZodError", initializer$1);
  const $ZodRealError = $constructor("$ZodError", initializer$1, { Parent: Error });
  function flattenError(error, mapper = (issue2) => issue2.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of error.issues) {
      if (sub.path.length > 0) {
        fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
        fieldErrors[sub.path[0]].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  function formatError(error, mapper = (issue2) => issue2.message) {
    const fieldErrors = { _errors: [] };
    const processError = (error2) => {
      for (const issue2 of error2.issues) {
        if (issue2.code === "invalid_union" && issue2.errors.length) {
          issue2.errors.map((issues) => processError({ issues }));
        } else if (issue2.code === "invalid_key") {
          processError({ issues: issue2.issues });
        } else if (issue2.code === "invalid_element") {
          processError({ issues: issue2.issues });
        } else if (issue2.path.length === 0) {
          fieldErrors._errors.push(mapper(issue2));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue2.path.length) {
            const el = issue2.path[i];
            const terminal = i === issue2.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue2));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(error);
    return fieldErrors;
  }
  function toDotPath(_path) {
    const segs = [];
    const path = _path.map((seg) => typeof seg === "object" ? seg.key : seg);
    for (const seg of path) {
      if (typeof seg === "number")
        segs.push(`[${seg}]`);
      else if (typeof seg === "symbol")
        segs.push(`[${JSON.stringify(String(seg))}]`);
      else if (/[^\w$]/.test(seg))
        segs.push(`[${JSON.stringify(seg)}]`);
      else {
        if (segs.length)
          segs.push(".");
        segs.push(seg);
      }
    }
    return segs.join("");
  }
  function prettifyError(error) {
    const lines = [];
    const issues = [...error.issues].sort((a, b) => (a.path ?? []).length - (b.path ?? []).length);
    for (const issue2 of issues) {
      lines.push(`✖ ${issue2.message}`);
      if (issue2.path?.length)
        lines.push(`  → at ${toDotPath(issue2.path)}`);
    }
    return lines.join("\n");
  }
  const _parse = (_Err) => (schema, value, _ctx, _params) => {
    const ctx = _ctx ? Object.assign(_ctx, { async: false }) : { async: false };
    const result2 = schema._zod.run({ value, issues: [] }, ctx);
    if (result2 instanceof Promise) {
      throw new $ZodAsyncError();
    }
    if (result2.issues.length) {
      const e = new (_params?.Err ?? _Err)(result2.issues.map((iss) => finalizeIssue(iss, ctx, config())));
      captureStackTrace(e, _params?.callee);
      throw e;
    }
    return result2.value;
  };
  const _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
    const ctx = _ctx ? Object.assign(_ctx, { async: true }) : { async: true };
    let result2 = schema._zod.run({ value, issues: [] }, ctx);
    if (result2 instanceof Promise)
      result2 = await result2;
    if (result2.issues.length) {
      const e = new (params?.Err ?? _Err)(result2.issues.map((iss) => finalizeIssue(iss, ctx, config())));
      captureStackTrace(e, params?.callee);
      throw e;
    }
    return result2.value;
  };
  const _safeParse = (_Err) => (schema, value, _ctx) => {
    const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
    const result2 = schema._zod.run({ value, issues: [] }, ctx);
    if (result2 instanceof Promise) {
      throw new $ZodAsyncError();
    }
    return result2.issues.length ? {
      success: false,
      error: new (_Err ?? $ZodError)(result2.issues.map((iss) => finalizeIssue(iss, ctx, config())))
    } : { success: true, data: result2.value };
  };
  const safeParse$1 = /* @__PURE__ */ _safeParse($ZodRealError);
  const _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
    const ctx = _ctx ? Object.assign(_ctx, { async: true }) : { async: true };
    let result2 = schema._zod.run({ value, issues: [] }, ctx);
    if (result2 instanceof Promise)
      result2 = await result2;
    return result2.issues.length ? {
      success: false,
      error: new _Err(result2.issues.map((iss) => finalizeIssue(iss, ctx, config())))
    } : { success: true, data: result2.value };
  };
  const safeParseAsync$1 = /* @__PURE__ */ _safeParseAsync($ZodRealError);
  const _encode = (_Err) => (schema, value, _ctx) => {
    const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
    return _parse(_Err)(schema, value, ctx);
  };
  const _decode = (_Err) => (schema, value, _ctx) => {
    return _parse(_Err)(schema, value, _ctx);
  };
  const _encodeAsync = (_Err) => async (schema, value, _ctx) => {
    const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
    return _parseAsync(_Err)(schema, value, ctx);
  };
  const _decodeAsync = (_Err) => async (schema, value, _ctx) => {
    return _parseAsync(_Err)(schema, value, _ctx);
  };
  const _safeEncode = (_Err) => (schema, value, _ctx) => {
    const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
    return _safeParse(_Err)(schema, value, ctx);
  };
  const _safeDecode = (_Err) => (schema, value, _ctx) => {
    return _safeParse(_Err)(schema, value, _ctx);
  };
  const _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
    const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
    return _safeParseAsync(_Err)(schema, value, ctx);
  };
  const _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
    return _safeParseAsync(_Err)(schema, value, _ctx);
  };
  const cuid = /^[cC][^\s-]{8,}$/;
  const cuid2 = /^[0-9a-z]+$/;
  const ulid = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
  const xid = /^[0-9a-vA-V]{20}$/;
  const ksuid = /^[A-Za-z0-9]{27}$/;
  const nanoid = /^[a-zA-Z0-9_-]{21}$/;
  const duration$1 = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
  const guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
  const uuid = (version2) => {
    if (!version2)
      return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
    return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version2}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
  };
  const email = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
  const _emoji$1 = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
  function emoji() {
    return new RegExp(_emoji$1, "u");
  }
  const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
  const ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
  const cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
  const cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
  const base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
  const base64url = /^[A-Za-z0-9_-]*$/;
  const e164 = /^\+[1-9]\d{6,14}$/;
  const dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
  const date$1 = /* @__PURE__ */ new RegExp(`^${dateSource}$`);
  function timeSource(args) {
    const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
    const regex = typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
    return regex;
  }
  function time$1(args) {
    return new RegExp(`^${timeSource(args)}$`);
  }
  function datetime$1(args) {
    const time2 = timeSource({ precision: args.precision });
    const opts = ["Z"];
    if (args.local)
      opts.push("");
    if (args.offset)
      opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
    const timeRegex = `${time2}(?:${opts.join("|")})`;
    return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
  }
  const string$1 = (params) => {
    const regex = params ? `[\\s\\S]{${params?.minimum ?? 0},${params?.maximum ?? ""}}` : `[\\s\\S]*`;
    return new RegExp(`^${regex}$`);
  };
  const integer = /^-?\d+$/;
  const number$1 = /^-?\d+(?:\.\d+)?$/;
  const boolean$1 = /^(?:true|false)$/i;
  const lowercase = /^[^A-Z]*$/;
  const uppercase = /^[^a-z]*$/;
  const $ZodCheck = /* @__PURE__ */ $constructor("$ZodCheck", (inst, def) => {
    var _a2;
    inst._zod ?? (inst._zod = {});
    inst._zod.def = def;
    (_a2 = inst._zod).onattach ?? (_a2.onattach = []);
  });
  const numericOriginMap = {
    number: "number",
    bigint: "bigint",
    object: "date"
  };
  const $ZodCheckLessThan = /* @__PURE__ */ $constructor("$ZodCheckLessThan", (inst, def) => {
    $ZodCheck.init(inst, def);
    const origin = numericOriginMap[typeof def.value];
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      const curr = (def.inclusive ? bag.maximum : bag.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
      if (def.value < curr) {
        if (def.inclusive)
          bag.maximum = def.value;
        else
          bag.exclusiveMaximum = def.value;
      }
    });
    inst._zod.check = (payload) => {
      if (def.inclusive ? payload.value <= def.value : payload.value < def.value) {
        return;
      }
      payload.issues.push({
        origin,
        code: "too_big",
        maximum: typeof def.value === "object" ? def.value.getTime() : def.value,
        input: payload.value,
        inclusive: def.inclusive,
        inst,
        continue: !def.abort
      });
    };
  });
  const $ZodCheckGreaterThan = /* @__PURE__ */ $constructor("$ZodCheckGreaterThan", (inst, def) => {
    $ZodCheck.init(inst, def);
    const origin = numericOriginMap[typeof def.value];
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      const curr = (def.inclusive ? bag.minimum : bag.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
      if (def.value > curr) {
        if (def.inclusive)
          bag.minimum = def.value;
        else
          bag.exclusiveMinimum = def.value;
      }
    });
    inst._zod.check = (payload) => {
      if (def.inclusive ? payload.value >= def.value : payload.value > def.value) {
        return;
      }
      payload.issues.push({
        origin,
        code: "too_small",
        minimum: typeof def.value === "object" ? def.value.getTime() : def.value,
        input: payload.value,
        inclusive: def.inclusive,
        inst,
        continue: !def.abort
      });
    };
  });
  const $ZodCheckMultipleOf = /* @__PURE__ */ $constructor("$ZodCheckMultipleOf", (inst, def) => {
    $ZodCheck.init(inst, def);
    inst._zod.onattach.push((inst2) => {
      var _a2;
      (_a2 = inst2._zod.bag).multipleOf ?? (_a2.multipleOf = def.value);
    });
    inst._zod.check = (payload) => {
      if (typeof payload.value !== typeof def.value)
        throw new Error("Cannot mix number and bigint in multiple_of check.");
      const isMultiple = typeof payload.value === "bigint" ? payload.value % def.value === BigInt(0) : floatSafeRemainder(payload.value, def.value) === 0;
      if (isMultiple)
        return;
      payload.issues.push({
        origin: typeof payload.value,
        code: "not_multiple_of",
        divisor: def.value,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  const $ZodCheckNumberFormat = /* @__PURE__ */ $constructor("$ZodCheckNumberFormat", (inst, def) => {
    $ZodCheck.init(inst, def);
    def.format = def.format || "float64";
    const isInt = def.format?.includes("int");
    const origin = isInt ? "int" : "number";
    const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.format = def.format;
      bag.minimum = minimum;
      bag.maximum = maximum;
      if (isInt)
        bag.pattern = integer;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      if (isInt) {
        if (!Number.isInteger(input)) {
          payload.issues.push({
            expected: origin,
            format: def.format,
            code: "invalid_type",
            continue: false,
            input,
            inst
          });
          return;
        }
        if (!Number.isSafeInteger(input)) {
          if (input > 0) {
            payload.issues.push({
              input,
              code: "too_big",
              maximum: Number.MAX_SAFE_INTEGER,
              note: "Integers must be within the safe integer range.",
              inst,
              origin,
              inclusive: true,
              continue: !def.abort
            });
          } else {
            payload.issues.push({
              input,
              code: "too_small",
              minimum: Number.MIN_SAFE_INTEGER,
              note: "Integers must be within the safe integer range.",
              inst,
              origin,
              inclusive: true,
              continue: !def.abort
            });
          }
          return;
        }
      }
      if (input < minimum) {
        payload.issues.push({
          origin: "number",
          input,
          code: "too_small",
          minimum,
          inclusive: true,
          inst,
          continue: !def.abort
        });
      }
      if (input > maximum) {
        payload.issues.push({
          origin: "number",
          input,
          code: "too_big",
          maximum,
          inclusive: true,
          inst,
          continue: !def.abort
        });
      }
    };
  });
  const $ZodCheckMaxLength = /* @__PURE__ */ $constructor("$ZodCheckMaxLength", (inst, def) => {
    var _a2;
    $ZodCheck.init(inst, def);
    (_a2 = inst._zod.def).when ?? (_a2.when = (payload) => {
      const val = payload.value;
      return !nullish(val) && val.length !== void 0;
    });
    inst._zod.onattach.push((inst2) => {
      const curr = inst2._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
      if (def.maximum < curr)
        inst2._zod.bag.maximum = def.maximum;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      const length = input.length;
      if (length <= def.maximum)
        return;
      const origin = getLengthableOrigin(input);
      payload.issues.push({
        origin,
        code: "too_big",
        maximum: def.maximum,
        inclusive: true,
        input,
        inst,
        continue: !def.abort
      });
    };
  });
  const $ZodCheckMinLength = /* @__PURE__ */ $constructor("$ZodCheckMinLength", (inst, def) => {
    var _a2;
    $ZodCheck.init(inst, def);
    (_a2 = inst._zod.def).when ?? (_a2.when = (payload) => {
      const val = payload.value;
      return !nullish(val) && val.length !== void 0;
    });
    inst._zod.onattach.push((inst2) => {
      const curr = inst2._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
      if (def.minimum > curr)
        inst2._zod.bag.minimum = def.minimum;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      const length = input.length;
      if (length >= def.minimum)
        return;
      const origin = getLengthableOrigin(input);
      payload.issues.push({
        origin,
        code: "too_small",
        minimum: def.minimum,
        inclusive: true,
        input,
        inst,
        continue: !def.abort
      });
    };
  });
  const $ZodCheckLengthEquals = /* @__PURE__ */ $constructor("$ZodCheckLengthEquals", (inst, def) => {
    var _a2;
    $ZodCheck.init(inst, def);
    (_a2 = inst._zod.def).when ?? (_a2.when = (payload) => {
      const val = payload.value;
      return !nullish(val) && val.length !== void 0;
    });
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.minimum = def.length;
      bag.maximum = def.length;
      bag.length = def.length;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      const length = input.length;
      if (length === def.length)
        return;
      const origin = getLengthableOrigin(input);
      const tooBig = length > def.length;
      payload.issues.push({
        origin,
        ...tooBig ? { code: "too_big", maximum: def.length } : { code: "too_small", minimum: def.length },
        inclusive: true,
        exact: true,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  const $ZodCheckStringFormat = /* @__PURE__ */ $constructor("$ZodCheckStringFormat", (inst, def) => {
    var _a2, _b;
    $ZodCheck.init(inst, def);
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.format = def.format;
      if (def.pattern) {
        bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
        bag.patterns.add(def.pattern);
      }
    });
    if (def.pattern)
      (_a2 = inst._zod).check ?? (_a2.check = (payload) => {
        def.pattern.lastIndex = 0;
        if (def.pattern.test(payload.value))
          return;
        payload.issues.push({
          origin: "string",
          code: "invalid_format",
          format: def.format,
          input: payload.value,
          ...def.pattern ? { pattern: def.pattern.toString() } : {},
          inst,
          continue: !def.abort
        });
      });
    else
      (_b = inst._zod).check ?? (_b.check = () => {
      });
  });
  const $ZodCheckRegex = /* @__PURE__ */ $constructor("$ZodCheckRegex", (inst, def) => {
    $ZodCheckStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      def.pattern.lastIndex = 0;
      if (def.pattern.test(payload.value))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "regex",
        input: payload.value,
        pattern: def.pattern.toString(),
        inst,
        continue: !def.abort
      });
    };
  });
  const $ZodCheckLowerCase = /* @__PURE__ */ $constructor("$ZodCheckLowerCase", (inst, def) => {
    def.pattern ?? (def.pattern = lowercase);
    $ZodCheckStringFormat.init(inst, def);
  });
  const $ZodCheckUpperCase = /* @__PURE__ */ $constructor("$ZodCheckUpperCase", (inst, def) => {
    def.pattern ?? (def.pattern = uppercase);
    $ZodCheckStringFormat.init(inst, def);
  });
  const $ZodCheckIncludes = /* @__PURE__ */ $constructor("$ZodCheckIncludes", (inst, def) => {
    $ZodCheck.init(inst, def);
    const escapedRegex = escapeRegex(def.includes);
    const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position}}${escapedRegex}` : escapedRegex);
    def.pattern = pattern;
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
      bag.patterns.add(pattern);
    });
    inst._zod.check = (payload) => {
      if (payload.value.includes(def.includes, def.position))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "includes",
        includes: def.includes,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  const $ZodCheckStartsWith = /* @__PURE__ */ $constructor("$ZodCheckStartsWith", (inst, def) => {
    $ZodCheck.init(inst, def);
    const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
    def.pattern ?? (def.pattern = pattern);
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
      bag.patterns.add(pattern);
    });
    inst._zod.check = (payload) => {
      if (payload.value.startsWith(def.prefix))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "starts_with",
        prefix: def.prefix,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  const $ZodCheckEndsWith = /* @__PURE__ */ $constructor("$ZodCheckEndsWith", (inst, def) => {
    $ZodCheck.init(inst, def);
    const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
    def.pattern ?? (def.pattern = pattern);
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
      bag.patterns.add(pattern);
    });
    inst._zod.check = (payload) => {
      if (payload.value.endsWith(def.suffix))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "ends_with",
        suffix: def.suffix,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  const $ZodCheckOverwrite = /* @__PURE__ */ $constructor("$ZodCheckOverwrite", (inst, def) => {
    $ZodCheck.init(inst, def);
    inst._zod.check = (payload) => {
      payload.value = def.tx(payload.value);
    };
  });
  class Doc {
    constructor(args = []) {
      this.content = [];
      this.indent = 0;
      if (this)
        this.args = args;
    }
    indented(fn) {
      this.indent += 1;
      fn(this);
      this.indent -= 1;
    }
    write(arg) {
      if (typeof arg === "function") {
        arg(this, { execution: "sync" });
        arg(this, { execution: "async" });
        return;
      }
      const content2 = arg;
      const lines = content2.split("\n").filter((x) => x);
      const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
      const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
      for (const line of dedented) {
        this.content.push(line);
      }
    }
    compile() {
      const F = Function;
      const args = this?.args;
      const content2 = this?.content ?? [``];
      const lines = [...content2.map((x) => `  ${x}`)];
      return new F(...args, lines.join("\n"));
    }
  }
  const version = {
    major: 4,
    minor: 3,
    patch: 6
  };
  const $ZodType = /* @__PURE__ */ $constructor("$ZodType", (inst, def) => {
    var _a2;
    inst ?? (inst = {});
    inst._zod.def = def;
    inst._zod.bag = inst._zod.bag || {};
    inst._zod.version = version;
    const checks = [...inst._zod.def.checks ?? []];
    if (inst._zod.traits.has("$ZodCheck")) {
      checks.unshift(inst);
    }
    for (const ch of checks) {
      for (const fn of ch._zod.onattach) {
        fn(inst);
      }
    }
    if (checks.length === 0) {
      (_a2 = inst._zod).deferred ?? (_a2.deferred = []);
      inst._zod.deferred?.push(() => {
        inst._zod.run = inst._zod.parse;
      });
    } else {
      const runChecks = (payload, checks2, ctx) => {
        let isAborted = aborted(payload);
        let asyncResult;
        for (const ch of checks2) {
          if (ch._zod.def.when) {
            const shouldRun = ch._zod.def.when(payload);
            if (!shouldRun)
              continue;
          } else if (isAborted) {
            continue;
          }
          const currLen = payload.issues.length;
          const _ = ch._zod.check(payload);
          if (_ instanceof Promise && ctx?.async === false) {
            throw new $ZodAsyncError();
          }
          if (asyncResult || _ instanceof Promise) {
            asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
              await _;
              const nextLen = payload.issues.length;
              if (nextLen === currLen)
                return;
              if (!isAborted)
                isAborted = aborted(payload, currLen);
            });
          } else {
            const nextLen = payload.issues.length;
            if (nextLen === currLen)
              continue;
            if (!isAborted)
              isAborted = aborted(payload, currLen);
          }
        }
        if (asyncResult) {
          return asyncResult.then(() => {
            return payload;
          });
        }
        return payload;
      };
      const handleCanaryResult = (canary, payload, ctx) => {
        if (aborted(canary)) {
          canary.aborted = true;
          return canary;
        }
        const checkResult = runChecks(payload, checks, ctx);
        if (checkResult instanceof Promise) {
          if (ctx.async === false)
            throw new $ZodAsyncError();
          return checkResult.then((checkResult2) => inst._zod.parse(checkResult2, ctx));
        }
        return inst._zod.parse(checkResult, ctx);
      };
      inst._zod.run = (payload, ctx) => {
        if (ctx.skipChecks) {
          return inst._zod.parse(payload, ctx);
        }
        if (ctx.direction === "backward") {
          const canary = inst._zod.parse({ value: payload.value, issues: [] }, { ...ctx, skipChecks: true });
          if (canary instanceof Promise) {
            return canary.then((canary2) => {
              return handleCanaryResult(canary2, payload, ctx);
            });
          }
          return handleCanaryResult(canary, payload, ctx);
        }
        const result2 = inst._zod.parse(payload, ctx);
        if (result2 instanceof Promise) {
          if (ctx.async === false)
            throw new $ZodAsyncError();
          return result2.then((result3) => runChecks(result3, checks, ctx));
        }
        return runChecks(result2, checks, ctx);
      };
    }
    defineLazy(inst, "~standard", () => ({
      validate: (value) => {
        try {
          const r = safeParse$1(inst, value);
          return r.success ? { value: r.data } : { issues: r.error?.issues };
        } catch (_) {
          return safeParseAsync$1(inst, value).then((r) => r.success ? { value: r.data } : { issues: r.error?.issues });
        }
      },
      vendor: "zod",
      version: 1
    }));
  });
  const $ZodString = /* @__PURE__ */ $constructor("$ZodString", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = [...inst?._zod.bag?.patterns ?? []].pop() ?? string$1(inst._zod.bag);
    inst._zod.parse = (payload, _) => {
      if (def.coerce)
        try {
          payload.value = String(payload.value);
        } catch (_2) {
        }
      if (typeof payload.value === "string")
        return payload;
      payload.issues.push({
        expected: "string",
        code: "invalid_type",
        input: payload.value,
        inst
      });
      return payload;
    };
  });
  const $ZodStringFormat = /* @__PURE__ */ $constructor("$ZodStringFormat", (inst, def) => {
    $ZodCheckStringFormat.init(inst, def);
    $ZodString.init(inst, def);
  });
  const $ZodGUID = /* @__PURE__ */ $constructor("$ZodGUID", (inst, def) => {
    def.pattern ?? (def.pattern = guid);
    $ZodStringFormat.init(inst, def);
  });
  const $ZodUUID = /* @__PURE__ */ $constructor("$ZodUUID", (inst, def) => {
    if (def.version) {
      const versionMap = {
        v1: 1,
        v2: 2,
        v3: 3,
        v4: 4,
        v5: 5,
        v6: 6,
        v7: 7,
        v8: 8
      };
      const v = versionMap[def.version];
      if (v === void 0)
        throw new Error(`Invalid UUID version: "${def.version}"`);
      def.pattern ?? (def.pattern = uuid(v));
    } else
      def.pattern ?? (def.pattern = uuid());
    $ZodStringFormat.init(inst, def);
  });
  const $ZodEmail = /* @__PURE__ */ $constructor("$ZodEmail", (inst, def) => {
    def.pattern ?? (def.pattern = email);
    $ZodStringFormat.init(inst, def);
  });
  const $ZodURL = /* @__PURE__ */ $constructor("$ZodURL", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      try {
        const trimmed = payload.value.trim();
        const url = new URL(trimmed);
        if (def.hostname) {
          def.hostname.lastIndex = 0;
          if (!def.hostname.test(url.hostname)) {
            payload.issues.push({
              code: "invalid_format",
              format: "url",
              note: "Invalid hostname",
              pattern: def.hostname.source,
              input: payload.value,
              inst,
              continue: !def.abort
            });
          }
        }
        if (def.protocol) {
          def.protocol.lastIndex = 0;
          if (!def.protocol.test(url.protocol.endsWith(":") ? url.protocol.slice(0, -1) : url.protocol)) {
            payload.issues.push({
              code: "invalid_format",
              format: "url",
              note: "Invalid protocol",
              pattern: def.protocol.source,
              input: payload.value,
              inst,
              continue: !def.abort
            });
          }
        }
        if (def.normalize) {
          payload.value = url.href;
        } else {
          payload.value = trimmed;
        }
        return;
      } catch (_) {
        payload.issues.push({
          code: "invalid_format",
          format: "url",
          input: payload.value,
          inst,
          continue: !def.abort
        });
      }
    };
  });
  const $ZodEmoji = /* @__PURE__ */ $constructor("$ZodEmoji", (inst, def) => {
    def.pattern ?? (def.pattern = emoji());
    $ZodStringFormat.init(inst, def);
  });
  const $ZodNanoID = /* @__PURE__ */ $constructor("$ZodNanoID", (inst, def) => {
    def.pattern ?? (def.pattern = nanoid);
    $ZodStringFormat.init(inst, def);
  });
  const $ZodCUID = /* @__PURE__ */ $constructor("$ZodCUID", (inst, def) => {
    def.pattern ?? (def.pattern = cuid);
    $ZodStringFormat.init(inst, def);
  });
  const $ZodCUID2 = /* @__PURE__ */ $constructor("$ZodCUID2", (inst, def) => {
    def.pattern ?? (def.pattern = cuid2);
    $ZodStringFormat.init(inst, def);
  });
  const $ZodULID = /* @__PURE__ */ $constructor("$ZodULID", (inst, def) => {
    def.pattern ?? (def.pattern = ulid);
    $ZodStringFormat.init(inst, def);
  });
  const $ZodXID = /* @__PURE__ */ $constructor("$ZodXID", (inst, def) => {
    def.pattern ?? (def.pattern = xid);
    $ZodStringFormat.init(inst, def);
  });
  const $ZodKSUID = /* @__PURE__ */ $constructor("$ZodKSUID", (inst, def) => {
    def.pattern ?? (def.pattern = ksuid);
    $ZodStringFormat.init(inst, def);
  });
  const $ZodISODateTime = /* @__PURE__ */ $constructor("$ZodISODateTime", (inst, def) => {
    def.pattern ?? (def.pattern = datetime$1(def));
    $ZodStringFormat.init(inst, def);
  });
  const $ZodISODate = /* @__PURE__ */ $constructor("$ZodISODate", (inst, def) => {
    def.pattern ?? (def.pattern = date$1);
    $ZodStringFormat.init(inst, def);
  });
  const $ZodISOTime = /* @__PURE__ */ $constructor("$ZodISOTime", (inst, def) => {
    def.pattern ?? (def.pattern = time$1(def));
    $ZodStringFormat.init(inst, def);
  });
  const $ZodISODuration = /* @__PURE__ */ $constructor("$ZodISODuration", (inst, def) => {
    def.pattern ?? (def.pattern = duration$1);
    $ZodStringFormat.init(inst, def);
  });
  const $ZodIPv4 = /* @__PURE__ */ $constructor("$ZodIPv4", (inst, def) => {
    def.pattern ?? (def.pattern = ipv4);
    $ZodStringFormat.init(inst, def);
    inst._zod.bag.format = `ipv4`;
  });
  const $ZodIPv6 = /* @__PURE__ */ $constructor("$ZodIPv6", (inst, def) => {
    def.pattern ?? (def.pattern = ipv6);
    $ZodStringFormat.init(inst, def);
    inst._zod.bag.format = `ipv6`;
    inst._zod.check = (payload) => {
      try {
        new URL(`http://[${payload.value}]`);
      } catch {
        payload.issues.push({
          code: "invalid_format",
          format: "ipv6",
          input: payload.value,
          inst,
          continue: !def.abort
        });
      }
    };
  });
  const $ZodCIDRv4 = /* @__PURE__ */ $constructor("$ZodCIDRv4", (inst, def) => {
    def.pattern ?? (def.pattern = cidrv4);
    $ZodStringFormat.init(inst, def);
  });
  const $ZodCIDRv6 = /* @__PURE__ */ $constructor("$ZodCIDRv6", (inst, def) => {
    def.pattern ?? (def.pattern = cidrv6);
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      const parts = payload.value.split("/");
      try {
        if (parts.length !== 2)
          throw new Error();
        const [address, prefix] = parts;
        if (!prefix)
          throw new Error();
        const prefixNum = Number(prefix);
        if (`${prefixNum}` !== prefix)
          throw new Error();
        if (prefixNum < 0 || prefixNum > 128)
          throw new Error();
        new URL(`http://[${address}]`);
      } catch {
        payload.issues.push({
          code: "invalid_format",
          format: "cidrv6",
          input: payload.value,
          inst,
          continue: !def.abort
        });
      }
    };
  });
  function isValidBase64(data) {
    if (data === "")
      return true;
    if (data.length % 4 !== 0)
      return false;
    try {
      atob(data);
      return true;
    } catch {
      return false;
    }
  }
  const $ZodBase64 = /* @__PURE__ */ $constructor("$ZodBase64", (inst, def) => {
    def.pattern ?? (def.pattern = base64);
    $ZodStringFormat.init(inst, def);
    inst._zod.bag.contentEncoding = "base64";
    inst._zod.check = (payload) => {
      if (isValidBase64(payload.value))
        return;
      payload.issues.push({
        code: "invalid_format",
        format: "base64",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  function isValidBase64URL(data) {
    if (!base64url.test(data))
      return false;
    const base642 = data.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
    const padded = base642.padEnd(Math.ceil(base642.length / 4) * 4, "=");
    return isValidBase64(padded);
  }
  const $ZodBase64URL = /* @__PURE__ */ $constructor("$ZodBase64URL", (inst, def) => {
    def.pattern ?? (def.pattern = base64url);
    $ZodStringFormat.init(inst, def);
    inst._zod.bag.contentEncoding = "base64url";
    inst._zod.check = (payload) => {
      if (isValidBase64URL(payload.value))
        return;
      payload.issues.push({
        code: "invalid_format",
        format: "base64url",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  const $ZodE164 = /* @__PURE__ */ $constructor("$ZodE164", (inst, def) => {
    def.pattern ?? (def.pattern = e164);
    $ZodStringFormat.init(inst, def);
  });
  function isValidJWT(token, algorithm = null) {
    try {
      const tokensParts = token.split(".");
      if (tokensParts.length !== 3)
        return false;
      const [header] = tokensParts;
      if (!header)
        return false;
      const parsedHeader = JSON.parse(atob(header));
      if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT")
        return false;
      if (!parsedHeader.alg)
        return false;
      if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm))
        return false;
      return true;
    } catch {
      return false;
    }
  }
  const $ZodJWT = /* @__PURE__ */ $constructor("$ZodJWT", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      if (isValidJWT(payload.value, def.alg))
        return;
      payload.issues.push({
        code: "invalid_format",
        format: "jwt",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  const $ZodNumber = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = inst._zod.bag.pattern ?? number$1;
    inst._zod.parse = (payload, _ctx) => {
      if (def.coerce)
        try {
          payload.value = Number(payload.value);
        } catch (_) {
        }
      const input = payload.value;
      if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) {
        return payload;
      }
      const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? "Infinity" : void 0 : void 0;
      payload.issues.push({
        expected: "number",
        code: "invalid_type",
        input,
        inst,
        ...received ? { received } : {}
      });
      return payload;
    };
  });
  const $ZodNumberFormat = /* @__PURE__ */ $constructor("$ZodNumberFormat", (inst, def) => {
    $ZodCheckNumberFormat.init(inst, def);
    $ZodNumber.init(inst, def);
  });
  const $ZodBoolean = /* @__PURE__ */ $constructor("$ZodBoolean", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = boolean$1;
    inst._zod.parse = (payload, _ctx) => {
      if (def.coerce)
        try {
          payload.value = Boolean(payload.value);
        } catch (_) {
        }
      const input = payload.value;
      if (typeof input === "boolean")
        return payload;
      payload.issues.push({
        expected: "boolean",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    };
  });
  const $ZodUnknown = /* @__PURE__ */ $constructor("$ZodUnknown", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload) => payload;
  });
  const $ZodNever = /* @__PURE__ */ $constructor("$ZodNever", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      payload.issues.push({
        expected: "never",
        code: "invalid_type",
        input: payload.value,
        inst
      });
      return payload;
    };
  });
  function handleArrayResult(result2, final, index) {
    if (result2.issues.length) {
      final.issues.push(...prefixIssues(index, result2.issues));
    }
    final.value[index] = result2.value;
  }
  const $ZodArray = /* @__PURE__ */ $constructor("$ZodArray", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      if (!Array.isArray(input)) {
        payload.issues.push({
          expected: "array",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      payload.value = Array(input.length);
      const proms = [];
      for (let i = 0; i < input.length; i++) {
        const item = input[i];
        const result2 = def.element._zod.run({
          value: item,
          issues: []
        }, ctx);
        if (result2 instanceof Promise) {
          proms.push(result2.then((result3) => handleArrayResult(result3, payload, i)));
        } else {
          handleArrayResult(result2, payload, i);
        }
      }
      if (proms.length) {
        return Promise.all(proms).then(() => payload);
      }
      return payload;
    };
  });
  function handlePropertyResult(result2, final, key, input, isOptionalOut) {
    if (result2.issues.length) {
      if (isOptionalOut && !(key in input)) {
        return;
      }
      final.issues.push(...prefixIssues(key, result2.issues));
    }
    if (result2.value === void 0) {
      if (key in input) {
        final.value[key] = void 0;
      }
    } else {
      final.value[key] = result2.value;
    }
  }
  function normalizeDef(def) {
    const keys = Object.keys(def.shape);
    for (const k of keys) {
      if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) {
        throw new Error(`Invalid element at key "${k}": expected a Zod schema`);
      }
    }
    const okeys = optionalKeys(def.shape);
    return {
      ...def,
      keys,
      keySet: new Set(keys),
      numKeys: keys.length,
      optionalKeys: new Set(okeys)
    };
  }
  function handleCatchall(proms, input, payload, ctx, def, inst) {
    const unrecognized = [];
    const keySet = def.keySet;
    const _catchall = def.catchall._zod;
    const t = _catchall.def.type;
    const isOptionalOut = _catchall.optout === "optional";
    for (const key in input) {
      if (keySet.has(key))
        continue;
      if (t === "never") {
        unrecognized.push(key);
        continue;
      }
      const r = _catchall.run({ value: input[key], issues: [] }, ctx);
      if (r instanceof Promise) {
        proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input, isOptionalOut)));
      } else {
        handlePropertyResult(r, payload, key, input, isOptionalOut);
      }
    }
    if (unrecognized.length) {
      payload.issues.push({
        code: "unrecognized_keys",
        keys: unrecognized,
        input,
        inst
      });
    }
    if (!proms.length)
      return payload;
    return Promise.all(proms).then(() => {
      return payload;
    });
  }
  const $ZodObject = /* @__PURE__ */ $constructor("$ZodObject", (inst, def) => {
    $ZodType.init(inst, def);
    const desc = Object.getOwnPropertyDescriptor(def, "shape");
    if (!desc?.get) {
      const sh = def.shape;
      Object.defineProperty(def, "shape", {
        get: () => {
          const newSh = { ...sh };
          Object.defineProperty(def, "shape", {
            value: newSh
          });
          return newSh;
        }
      });
    }
    const _normalized = cached(() => normalizeDef(def));
    defineLazy(inst._zod, "propValues", () => {
      const shape = def.shape;
      const propValues = {};
      for (const key in shape) {
        const field = shape[key]._zod;
        if (field.values) {
          propValues[key] ?? (propValues[key] = /* @__PURE__ */ new Set());
          for (const v of field.values)
            propValues[key].add(v);
        }
      }
      return propValues;
    });
    const isObject$1 = isObject;
    const catchall = def.catchall;
    let value;
    inst._zod.parse = (payload, ctx) => {
      value ?? (value = _normalized.value);
      const input = payload.value;
      if (!isObject$1(input)) {
        payload.issues.push({
          expected: "object",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      payload.value = {};
      const proms = [];
      const shape = value.shape;
      for (const key of value.keys) {
        const el = shape[key];
        const isOptionalOut = el._zod.optout === "optional";
        const r = el._zod.run({ value: input[key], issues: [] }, ctx);
        if (r instanceof Promise) {
          proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input, isOptionalOut)));
        } else {
          handlePropertyResult(r, payload, key, input, isOptionalOut);
        }
      }
      if (!catchall) {
        return proms.length ? Promise.all(proms).then(() => payload) : payload;
      }
      return handleCatchall(proms, input, payload, ctx, _normalized.value, inst);
    };
  });
  const $ZodObjectJIT = /* @__PURE__ */ $constructor("$ZodObjectJIT", (inst, def) => {
    $ZodObject.init(inst, def);
    const superParse = inst._zod.parse;
    const _normalized = cached(() => normalizeDef(def));
    const generateFastpass = (shape) => {
      const doc = new Doc(["shape", "payload", "ctx"]);
      const normalized = _normalized.value;
      const parseStr = (key) => {
        const k = esc(key);
        return `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
      };
      doc.write(`const input = payload.value;`);
      const ids2 = /* @__PURE__ */ Object.create(null);
      let counter = 0;
      for (const key of normalized.keys) {
        ids2[key] = `key_${counter++}`;
      }
      doc.write(`const newResult = {};`);
      for (const key of normalized.keys) {
        const id = ids2[key];
        const k = esc(key);
        const schema = shape[key];
        const isOptionalOut = schema?._zod?.optout === "optional";
        doc.write(`const ${id} = ${parseStr(key)};`);
        if (isOptionalOut) {
          doc.write(`
        if (${id}.issues.length) {
          if (${k} in input) {
            payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
              ...iss,
              path: iss.path ? [${k}, ...iss.path] : [${k}]
            })));
          }
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
        } else {
          doc.write(`
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
        }
      }
      doc.write(`payload.value = newResult;`);
      doc.write(`return payload;`);
      const fn = doc.compile();
      return (payload, ctx) => fn(shape, payload, ctx);
    };
    let fastpass;
    const isObject$1 = isObject;
    const jit = !globalConfig.jitless;
    const allowsEval$1 = allowsEval;
    const fastEnabled = jit && allowsEval$1.value;
    const catchall = def.catchall;
    let value;
    inst._zod.parse = (payload, ctx) => {
      value ?? (value = _normalized.value);
      const input = payload.value;
      if (!isObject$1(input)) {
        payload.issues.push({
          expected: "object",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
        if (!fastpass)
          fastpass = generateFastpass(def.shape);
        payload = fastpass(payload, ctx);
        if (!catchall)
          return payload;
        return handleCatchall([], input, payload, ctx, value, inst);
      }
      return superParse(payload, ctx);
    };
  });
  function handleUnionResults(results, final, inst, ctx) {
    for (const result2 of results) {
      if (result2.issues.length === 0) {
        final.value = result2.value;
        return final;
      }
    }
    const nonaborted = results.filter((r) => !aborted(r));
    if (nonaborted.length === 1) {
      final.value = nonaborted[0].value;
      return nonaborted[0];
    }
    final.issues.push({
      code: "invalid_union",
      input: final.value,
      inst,
      errors: results.map((result2) => result2.issues.map((iss) => finalizeIssue(iss, ctx, config())))
    });
    return final;
  }
  const $ZodUnion = /* @__PURE__ */ $constructor("$ZodUnion", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "optin", () => def.options.some((o) => o._zod.optin === "optional") ? "optional" : void 0);
    defineLazy(inst._zod, "optout", () => def.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0);
    defineLazy(inst._zod, "values", () => {
      if (def.options.every((o) => o._zod.values)) {
        return new Set(def.options.flatMap((option) => Array.from(option._zod.values)));
      }
      return void 0;
    });
    defineLazy(inst._zod, "pattern", () => {
      if (def.options.every((o) => o._zod.pattern)) {
        const patterns = def.options.map((o) => o._zod.pattern);
        return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
      }
      return void 0;
    });
    const single = def.options.length === 1;
    const first = def.options[0]._zod.run;
    inst._zod.parse = (payload, ctx) => {
      if (single) {
        return first(payload, ctx);
      }
      let async = false;
      const results = [];
      for (const option of def.options) {
        const result2 = option._zod.run({
          value: payload.value,
          issues: []
        }, ctx);
        if (result2 instanceof Promise) {
          results.push(result2);
          async = true;
        } else {
          if (result2.issues.length === 0)
            return result2;
          results.push(result2);
        }
      }
      if (!async)
        return handleUnionResults(results, payload, inst, ctx);
      return Promise.all(results).then((results2) => {
        return handleUnionResults(results2, payload, inst, ctx);
      });
    };
  });
  const $ZodIntersection = /* @__PURE__ */ $constructor("$ZodIntersection", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      const left = def.left._zod.run({ value: input, issues: [] }, ctx);
      const right = def.right._zod.run({ value: input, issues: [] }, ctx);
      const async = left instanceof Promise || right instanceof Promise;
      if (async) {
        return Promise.all([left, right]).then(([left2, right2]) => {
          return handleIntersectionResults(payload, left2, right2);
        });
      }
      return handleIntersectionResults(payload, left, right);
    };
  });
  function mergeValues(a, b) {
    if (a === b) {
      return { valid: true, data: a };
    }
    if (a instanceof Date && b instanceof Date && +a === +b) {
      return { valid: true, data: a };
    }
    if (isPlainObject(a) && isPlainObject(b)) {
      const bKeys = Object.keys(b);
      const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
      const newObj = { ...a, ...b };
      for (const key of sharedKeys) {
        const sharedValue = mergeValues(a[key], b[key]);
        if (!sharedValue.valid) {
          return {
            valid: false,
            mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
          };
        }
        newObj[key] = sharedValue.data;
      }
      return { valid: true, data: newObj };
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) {
        return { valid: false, mergeErrorPath: [] };
      }
      const newArray = [];
      for (let index = 0; index < a.length; index++) {
        const itemA = a[index];
        const itemB = b[index];
        const sharedValue = mergeValues(itemA, itemB);
        if (!sharedValue.valid) {
          return {
            valid: false,
            mergeErrorPath: [index, ...sharedValue.mergeErrorPath]
          };
        }
        newArray.push(sharedValue.data);
      }
      return { valid: true, data: newArray };
    }
    return { valid: false, mergeErrorPath: [] };
  }
  function handleIntersectionResults(result2, left, right) {
    const unrecKeys = /* @__PURE__ */ new Map();
    let unrecIssue;
    for (const iss of left.issues) {
      if (iss.code === "unrecognized_keys") {
        unrecIssue ?? (unrecIssue = iss);
        for (const k of iss.keys) {
          if (!unrecKeys.has(k))
            unrecKeys.set(k, {});
          unrecKeys.get(k).l = true;
        }
      } else {
        result2.issues.push(iss);
      }
    }
    for (const iss of right.issues) {
      if (iss.code === "unrecognized_keys") {
        for (const k of iss.keys) {
          if (!unrecKeys.has(k))
            unrecKeys.set(k, {});
          unrecKeys.get(k).r = true;
        }
      } else {
        result2.issues.push(iss);
      }
    }
    const bothKeys = [...unrecKeys].filter(([, f]) => f.l && f.r).map(([k]) => k);
    if (bothKeys.length && unrecIssue) {
      result2.issues.push({ ...unrecIssue, keys: bothKeys });
    }
    if (aborted(result2))
      return result2;
    const merged = mergeValues(left.value, right.value);
    if (!merged.valid) {
      throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(merged.mergeErrorPath)}`);
    }
    result2.value = merged.data;
    return result2;
  }
  const $ZodEnum = /* @__PURE__ */ $constructor("$ZodEnum", (inst, def) => {
    $ZodType.init(inst, def);
    const values = getEnumValues(def.entries);
    const valuesSet = new Set(values);
    inst._zod.values = valuesSet;
    inst._zod.pattern = new RegExp(`^(${values.filter((k) => propertyKeyTypes.has(typeof k)).map((o) => typeof o === "string" ? escapeRegex(o) : o.toString()).join("|")})$`);
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (valuesSet.has(input)) {
        return payload;
      }
      payload.issues.push({
        code: "invalid_value",
        values,
        input,
        inst
      });
      return payload;
    };
  });
  const $ZodTransform = /* @__PURE__ */ $constructor("$ZodTransform", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        throw new $ZodEncodeError(inst.constructor.name);
      }
      const _out = def.transform(payload.value, payload);
      if (ctx.async) {
        const output = _out instanceof Promise ? _out : Promise.resolve(_out);
        return output.then((output2) => {
          payload.value = output2;
          return payload;
        });
      }
      if (_out instanceof Promise) {
        throw new $ZodAsyncError();
      }
      payload.value = _out;
      return payload;
    };
  });
  function handleOptionalResult(result2, input) {
    if (result2.issues.length && input === void 0) {
      return { issues: [], value: void 0 };
    }
    return result2;
  }
  const $ZodOptional = /* @__PURE__ */ $constructor("$ZodOptional", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "optional";
    inst._zod.optout = "optional";
    defineLazy(inst._zod, "values", () => {
      return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, void 0]) : void 0;
    });
    defineLazy(inst._zod, "pattern", () => {
      const pattern = def.innerType._zod.pattern;
      return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
    });
    inst._zod.parse = (payload, ctx) => {
      if (def.innerType._zod.optin === "optional") {
        const result2 = def.innerType._zod.run(payload, ctx);
        if (result2 instanceof Promise)
          return result2.then((r) => handleOptionalResult(r, payload.value));
        return handleOptionalResult(result2, payload.value);
      }
      if (payload.value === void 0) {
        return payload;
      }
      return def.innerType._zod.run(payload, ctx);
    };
  });
  const $ZodExactOptional = /* @__PURE__ */ $constructor("$ZodExactOptional", (inst, def) => {
    $ZodOptional.init(inst, def);
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    defineLazy(inst._zod, "pattern", () => def.innerType._zod.pattern);
    inst._zod.parse = (payload, ctx) => {
      return def.innerType._zod.run(payload, ctx);
    };
  });
  const $ZodNullable = /* @__PURE__ */ $constructor("$ZodNullable", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
    defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
    defineLazy(inst._zod, "pattern", () => {
      const pattern = def.innerType._zod.pattern;
      return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : void 0;
    });
    defineLazy(inst._zod, "values", () => {
      return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, null]) : void 0;
    });
    inst._zod.parse = (payload, ctx) => {
      if (payload.value === null)
        return payload;
      return def.innerType._zod.run(payload, ctx);
    };
  });
  const $ZodDefault = /* @__PURE__ */ $constructor("$ZodDefault", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "optional";
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        return def.innerType._zod.run(payload, ctx);
      }
      if (payload.value === void 0) {
        payload.value = def.defaultValue;
        return payload;
      }
      const result2 = def.innerType._zod.run(payload, ctx);
      if (result2 instanceof Promise) {
        return result2.then((result3) => handleDefaultResult(result3, def));
      }
      return handleDefaultResult(result2, def);
    };
  });
  function handleDefaultResult(payload, def) {
    if (payload.value === void 0) {
      payload.value = def.defaultValue;
    }
    return payload;
  }
  const $ZodPrefault = /* @__PURE__ */ $constructor("$ZodPrefault", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "optional";
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        return def.innerType._zod.run(payload, ctx);
      }
      if (payload.value === void 0) {
        payload.value = def.defaultValue;
      }
      return def.innerType._zod.run(payload, ctx);
    };
  });
  const $ZodNonOptional = /* @__PURE__ */ $constructor("$ZodNonOptional", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "values", () => {
      const v = def.innerType._zod.values;
      return v ? new Set([...v].filter((x) => x !== void 0)) : void 0;
    });
    inst._zod.parse = (payload, ctx) => {
      const result2 = def.innerType._zod.run(payload, ctx);
      if (result2 instanceof Promise) {
        return result2.then((result3) => handleNonOptionalResult(result3, inst));
      }
      return handleNonOptionalResult(result2, inst);
    };
  });
  function handleNonOptionalResult(payload, inst) {
    if (!payload.issues.length && payload.value === void 0) {
      payload.issues.push({
        code: "invalid_type",
        expected: "nonoptional",
        input: payload.value,
        inst
      });
    }
    return payload;
  }
  const $ZodCatch = /* @__PURE__ */ $constructor("$ZodCatch", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
    defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        return def.innerType._zod.run(payload, ctx);
      }
      const result2 = def.innerType._zod.run(payload, ctx);
      if (result2 instanceof Promise) {
        return result2.then((result3) => {
          payload.value = result3.value;
          if (result3.issues.length) {
            payload.value = def.catchValue({
              ...payload,
              error: {
                issues: result3.issues.map((iss) => finalizeIssue(iss, ctx, config()))
              },
              input: payload.value
            });
            payload.issues = [];
          }
          return payload;
        });
      }
      payload.value = result2.value;
      if (result2.issues.length) {
        payload.value = def.catchValue({
          ...payload,
          error: {
            issues: result2.issues.map((iss) => finalizeIssue(iss, ctx, config()))
          },
          input: payload.value
        });
        payload.issues = [];
      }
      return payload;
    };
  });
  const $ZodPipe = /* @__PURE__ */ $constructor("$ZodPipe", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "values", () => def.in._zod.values);
    defineLazy(inst._zod, "optin", () => def.in._zod.optin);
    defineLazy(inst._zod, "optout", () => def.out._zod.optout);
    defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        const right = def.out._zod.run(payload, ctx);
        if (right instanceof Promise) {
          return right.then((right2) => handlePipeResult(right2, def.in, ctx));
        }
        return handlePipeResult(right, def.in, ctx);
      }
      const left = def.in._zod.run(payload, ctx);
      if (left instanceof Promise) {
        return left.then((left2) => handlePipeResult(left2, def.out, ctx));
      }
      return handlePipeResult(left, def.out, ctx);
    };
  });
  function handlePipeResult(left, next, ctx) {
    if (left.issues.length) {
      left.aborted = true;
      return left;
    }
    return next._zod.run({ value: left.value, issues: left.issues }, ctx);
  }
  const $ZodReadonly = /* @__PURE__ */ $constructor("$ZodReadonly", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "propValues", () => def.innerType._zod.propValues);
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    defineLazy(inst._zod, "optin", () => def.innerType?._zod?.optin);
    defineLazy(inst._zod, "optout", () => def.innerType?._zod?.optout);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        return def.innerType._zod.run(payload, ctx);
      }
      const result2 = def.innerType._zod.run(payload, ctx);
      if (result2 instanceof Promise) {
        return result2.then(handleReadonlyResult);
      }
      return handleReadonlyResult(result2);
    };
  });
  function handleReadonlyResult(payload) {
    payload.value = Object.freeze(payload.value);
    return payload;
  }
  const $ZodCustom = /* @__PURE__ */ $constructor("$ZodCustom", (inst, def) => {
    $ZodCheck.init(inst, def);
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _) => {
      return payload;
    };
    inst._zod.check = (payload) => {
      const input = payload.value;
      const r = def.fn(input);
      if (r instanceof Promise) {
        return r.then((r2) => handleRefineResult(r2, payload, input, inst));
      }
      handleRefineResult(r, payload, input, inst);
      return;
    };
  });
  function handleRefineResult(result2, payload, input, inst) {
    if (!result2) {
      const _iss = {
        code: "custom",
        input,
        inst,
        // incorporates params.error into issue reporting
        path: [...inst._zod.def.path ?? []],
        // incorporates params.error into issue reporting
        continue: !inst._zod.def.abort
        // params: inst._zod.def.params,
      };
      if (inst._zod.def.params)
        _iss.params = inst._zod.def.params;
      payload.issues.push(issue(_iss));
    }
  }
  var _a;
  class $ZodRegistry {
    constructor() {
      this._map = /* @__PURE__ */ new WeakMap();
      this._idmap = /* @__PURE__ */ new Map();
    }
    add(schema, ..._meta) {
      const meta = _meta[0];
      this._map.set(schema, meta);
      if (meta && typeof meta === "object" && "id" in meta) {
        this._idmap.set(meta.id, schema);
      }
      return this;
    }
    clear() {
      this._map = /* @__PURE__ */ new WeakMap();
      this._idmap = /* @__PURE__ */ new Map();
      return this;
    }
    remove(schema) {
      const meta = this._map.get(schema);
      if (meta && typeof meta === "object" && "id" in meta) {
        this._idmap.delete(meta.id);
      }
      this._map.delete(schema);
      return this;
    }
    get(schema) {
      const p = schema._zod.parent;
      if (p) {
        const pm = { ...this.get(p) ?? {} };
        delete pm.id;
        const f = { ...pm, ...this._map.get(schema) };
        return Object.keys(f).length ? f : void 0;
      }
      return this._map.get(schema);
    }
    has(schema) {
      return this._map.has(schema);
    }
  }
  function registry() {
    return new $ZodRegistry();
  }
  (_a = globalThis).__zod_globalRegistry ?? (_a.__zod_globalRegistry = registry());
  const globalRegistry = globalThis.__zod_globalRegistry;
  // @__NO_SIDE_EFFECTS__
  function _string(Class, params) {
    return new Class({
      type: "string",
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _email(Class, params) {
    return new Class({
      type: "string",
      format: "email",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _guid(Class, params) {
    return new Class({
      type: "string",
      format: "guid",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _uuid(Class, params) {
    return new Class({
      type: "string",
      format: "uuid",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _uuidv4(Class, params) {
    return new Class({
      type: "string",
      format: "uuid",
      check: "string_format",
      abort: false,
      version: "v4",
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _uuidv6(Class, params) {
    return new Class({
      type: "string",
      format: "uuid",
      check: "string_format",
      abort: false,
      version: "v6",
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _uuidv7(Class, params) {
    return new Class({
      type: "string",
      format: "uuid",
      check: "string_format",
      abort: false,
      version: "v7",
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _url(Class, params) {
    return new Class({
      type: "string",
      format: "url",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _emoji(Class, params) {
    return new Class({
      type: "string",
      format: "emoji",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _nanoid(Class, params) {
    return new Class({
      type: "string",
      format: "nanoid",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _cuid(Class, params) {
    return new Class({
      type: "string",
      format: "cuid",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _cuid2(Class, params) {
    return new Class({
      type: "string",
      format: "cuid2",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _ulid(Class, params) {
    return new Class({
      type: "string",
      format: "ulid",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _xid(Class, params) {
    return new Class({
      type: "string",
      format: "xid",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _ksuid(Class, params) {
    return new Class({
      type: "string",
      format: "ksuid",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _ipv4(Class, params) {
    return new Class({
      type: "string",
      format: "ipv4",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _ipv6(Class, params) {
    return new Class({
      type: "string",
      format: "ipv6",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _cidrv4(Class, params) {
    return new Class({
      type: "string",
      format: "cidrv4",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _cidrv6(Class, params) {
    return new Class({
      type: "string",
      format: "cidrv6",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _base64(Class, params) {
    return new Class({
      type: "string",
      format: "base64",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _base64url(Class, params) {
    return new Class({
      type: "string",
      format: "base64url",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _e164(Class, params) {
    return new Class({
      type: "string",
      format: "e164",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _jwt(Class, params) {
    return new Class({
      type: "string",
      format: "jwt",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _isoDateTime(Class, params) {
    return new Class({
      type: "string",
      format: "datetime",
      check: "string_format",
      offset: false,
      local: false,
      precision: null,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _isoDate(Class, params) {
    return new Class({
      type: "string",
      format: "date",
      check: "string_format",
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _isoTime(Class, params) {
    return new Class({
      type: "string",
      format: "time",
      check: "string_format",
      precision: null,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _isoDuration(Class, params) {
    return new Class({
      type: "string",
      format: "duration",
      check: "string_format",
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _number(Class, params) {
    return new Class({
      type: "number",
      checks: [],
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _int(Class, params) {
    return new Class({
      type: "number",
      check: "number_format",
      abort: false,
      format: "safeint",
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _boolean(Class, params) {
    return new Class({
      type: "boolean",
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _unknown(Class) {
    return new Class({
      type: "unknown"
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _never(Class, params) {
    return new Class({
      type: "never",
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _lt(value, params) {
    return new $ZodCheckLessThan({
      check: "less_than",
      ...normalizeParams(params),
      value,
      inclusive: false
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _lte(value, params) {
    return new $ZodCheckLessThan({
      check: "less_than",
      ...normalizeParams(params),
      value,
      inclusive: true
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _gt(value, params) {
    return new $ZodCheckGreaterThan({
      check: "greater_than",
      ...normalizeParams(params),
      value,
      inclusive: false
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _gte(value, params) {
    return new $ZodCheckGreaterThan({
      check: "greater_than",
      ...normalizeParams(params),
      value,
      inclusive: true
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _multipleOf(value, params) {
    return new $ZodCheckMultipleOf({
      check: "multiple_of",
      ...normalizeParams(params),
      value
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _maxLength(maximum, params) {
    const ch = new $ZodCheckMaxLength({
      check: "max_length",
      ...normalizeParams(params),
      maximum
    });
    return ch;
  }
  // @__NO_SIDE_EFFECTS__
  function _minLength(minimum, params) {
    return new $ZodCheckMinLength({
      check: "min_length",
      ...normalizeParams(params),
      minimum
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _length(length, params) {
    return new $ZodCheckLengthEquals({
      check: "length_equals",
      ...normalizeParams(params),
      length
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _regex(pattern, params) {
    return new $ZodCheckRegex({
      check: "string_format",
      format: "regex",
      ...normalizeParams(params),
      pattern
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _lowercase(params) {
    return new $ZodCheckLowerCase({
      check: "string_format",
      format: "lowercase",
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _uppercase(params) {
    return new $ZodCheckUpperCase({
      check: "string_format",
      format: "uppercase",
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _includes(includes, params) {
    return new $ZodCheckIncludes({
      check: "string_format",
      format: "includes",
      ...normalizeParams(params),
      includes
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _startsWith(prefix, params) {
    return new $ZodCheckStartsWith({
      check: "string_format",
      format: "starts_with",
      ...normalizeParams(params),
      prefix
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _endsWith(suffix, params) {
    return new $ZodCheckEndsWith({
      check: "string_format",
      format: "ends_with",
      ...normalizeParams(params),
      suffix
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _overwrite(tx) {
    return new $ZodCheckOverwrite({
      check: "overwrite",
      tx
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _normalize(form) {
    return /* @__PURE__ */ _overwrite((input) => input.normalize(form));
  }
  // @__NO_SIDE_EFFECTS__
  function _trim() {
    return /* @__PURE__ */ _overwrite((input) => input.trim());
  }
  // @__NO_SIDE_EFFECTS__
  function _toLowerCase() {
    return /* @__PURE__ */ _overwrite((input) => input.toLowerCase());
  }
  // @__NO_SIDE_EFFECTS__
  function _toUpperCase() {
    return /* @__PURE__ */ _overwrite((input) => input.toUpperCase());
  }
  // @__NO_SIDE_EFFECTS__
  function _slugify() {
    return /* @__PURE__ */ _overwrite((input) => slugify(input));
  }
  // @__NO_SIDE_EFFECTS__
  function _array(Class, element, params) {
    return new Class({
      type: "array",
      element,
      // get element() {
      //   return element;
      // },
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _refine(Class, fn, _params) {
    const schema = new Class({
      type: "custom",
      check: "custom",
      fn,
      ...normalizeParams(_params)
    });
    return schema;
  }
  // @__NO_SIDE_EFFECTS__
  function _superRefine(fn) {
    const ch = /* @__PURE__ */ _check((payload) => {
      payload.addIssue = (issue$1) => {
        if (typeof issue$1 === "string") {
          payload.issues.push(issue(issue$1, payload.value, ch._zod.def));
        } else {
          const _issue = issue$1;
          if (_issue.fatal)
            _issue.continue = false;
          _issue.code ?? (_issue.code = "custom");
          _issue.input ?? (_issue.input = payload.value);
          _issue.inst ?? (_issue.inst = ch);
          _issue.continue ?? (_issue.continue = !ch._zod.def.abort);
          payload.issues.push(issue(_issue));
        }
      };
      return fn(payload.value, payload);
    });
    return ch;
  }
  // @__NO_SIDE_EFFECTS__
  function _check(fn, params) {
    const ch = new $ZodCheck({
      check: "custom",
      ...normalizeParams(params)
    });
    ch._zod.check = fn;
    return ch;
  }
  function initializeContext(params) {
    let target = params?.target ?? "draft-2020-12";
    if (target === "draft-4")
      target = "draft-04";
    if (target === "draft-7")
      target = "draft-07";
    return {
      processors: params.processors ?? {},
      metadataRegistry: params?.metadata ?? globalRegistry,
      target,
      unrepresentable: params?.unrepresentable ?? "throw",
      override: params?.override ?? (() => {
      }),
      io: params?.io ?? "output",
      counter: 0,
      seen: /* @__PURE__ */ new Map(),
      cycles: params?.cycles ?? "ref",
      reused: params?.reused ?? "inline",
      external: params?.external ?? void 0
    };
  }
  function process(schema, ctx, _params = { path: [], schemaPath: [] }) {
    var _a2;
    const def = schema._zod.def;
    const seen = ctx.seen.get(schema);
    if (seen) {
      seen.count++;
      const isCycle = _params.schemaPath.includes(schema);
      if (isCycle) {
        seen.cycle = _params.path;
      }
      return seen.schema;
    }
    const result2 = { schema: {}, count: 1, cycle: void 0, path: _params.path };
    ctx.seen.set(schema, result2);
    const overrideSchema = schema._zod.toJSONSchema?.();
    if (overrideSchema) {
      result2.schema = overrideSchema;
    } else {
      const params = {
        ..._params,
        schemaPath: [..._params.schemaPath, schema],
        path: _params.path
      };
      if (schema._zod.processJSONSchema) {
        schema._zod.processJSONSchema(ctx, result2.schema, params);
      } else {
        const _json = result2.schema;
        const processor = ctx.processors[def.type];
        if (!processor) {
          throw new Error(`[toJSONSchema]: Non-representable type encountered: ${def.type}`);
        }
        processor(schema, ctx, _json, params);
      }
      const parent = schema._zod.parent;
      if (parent) {
        if (!result2.ref)
          result2.ref = parent;
        process(parent, ctx, params);
        ctx.seen.get(parent).isParent = true;
      }
    }
    const meta = ctx.metadataRegistry.get(schema);
    if (meta)
      Object.assign(result2.schema, meta);
    if (ctx.io === "input" && isTransforming(schema)) {
      delete result2.schema.examples;
      delete result2.schema.default;
    }
    if (ctx.io === "input" && result2.schema._prefault)
      (_a2 = result2.schema).default ?? (_a2.default = result2.schema._prefault);
    delete result2.schema._prefault;
    const _result = ctx.seen.get(schema);
    return _result.schema;
  }
  function extractDefs(ctx, schema) {
    const root = ctx.seen.get(schema);
    if (!root)
      throw new Error("Unprocessed schema. This is a bug in Zod.");
    const idToSchema = /* @__PURE__ */ new Map();
    for (const entry of ctx.seen.entries()) {
      const id = ctx.metadataRegistry.get(entry[0])?.id;
      if (id) {
        const existing = idToSchema.get(id);
        if (existing && existing !== entry[0]) {
          throw new Error(`Duplicate schema id "${id}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
        }
        idToSchema.set(id, entry[0]);
      }
    }
    const makeURI = (entry) => {
      const defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
      if (ctx.external) {
        const externalId = ctx.external.registry.get(entry[0])?.id;
        const uriGenerator = ctx.external.uri ?? ((id2) => id2);
        if (externalId) {
          return { ref: uriGenerator(externalId) };
        }
        const id = entry[1].defId ?? entry[1].schema.id ?? `schema${ctx.counter++}`;
        entry[1].defId = id;
        return { defId: id, ref: `${uriGenerator("__shared")}#/${defsSegment}/${id}` };
      }
      if (entry[1] === root) {
        return { ref: "#" };
      }
      const uriPrefix = `#`;
      const defUriPrefix = `${uriPrefix}/${defsSegment}/`;
      const defId = entry[1].schema.id ?? `__schema${ctx.counter++}`;
      return { defId, ref: defUriPrefix + defId };
    };
    const extractToDef = (entry) => {
      if (entry[1].schema.$ref) {
        return;
      }
      const seen = entry[1];
      const { ref, defId } = makeURI(entry);
      seen.def = { ...seen.schema };
      if (defId)
        seen.defId = defId;
      const schema2 = seen.schema;
      for (const key in schema2) {
        delete schema2[key];
      }
      schema2.$ref = ref;
    };
    if (ctx.cycles === "throw") {
      for (const entry of ctx.seen.entries()) {
        const seen = entry[1];
        if (seen.cycle) {
          throw new Error(`Cycle detected: #/${seen.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
        }
      }
    }
    for (const entry of ctx.seen.entries()) {
      const seen = entry[1];
      if (schema === entry[0]) {
        extractToDef(entry);
        continue;
      }
      if (ctx.external) {
        const ext = ctx.external.registry.get(entry[0])?.id;
        if (schema !== entry[0] && ext) {
          extractToDef(entry);
          continue;
        }
      }
      const id = ctx.metadataRegistry.get(entry[0])?.id;
      if (id) {
        extractToDef(entry);
        continue;
      }
      if (seen.cycle) {
        extractToDef(entry);
        continue;
      }
      if (seen.count > 1) {
        if (ctx.reused === "ref") {
          extractToDef(entry);
          continue;
        }
      }
    }
  }
  function finalize(ctx, schema) {
    const root = ctx.seen.get(schema);
    if (!root)
      throw new Error("Unprocessed schema. This is a bug in Zod.");
    const flattenRef = (zodSchema) => {
      const seen = ctx.seen.get(zodSchema);
      if (seen.ref === null)
        return;
      const schema2 = seen.def ?? seen.schema;
      const _cached = { ...schema2 };
      const ref = seen.ref;
      seen.ref = null;
      if (ref) {
        flattenRef(ref);
        const refSeen = ctx.seen.get(ref);
        const refSchema = refSeen.schema;
        if (refSchema.$ref && (ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0")) {
          schema2.allOf = schema2.allOf ?? [];
          schema2.allOf.push(refSchema);
        } else {
          Object.assign(schema2, refSchema);
        }
        Object.assign(schema2, _cached);
        const isParentRef = zodSchema._zod.parent === ref;
        if (isParentRef) {
          for (const key in schema2) {
            if (key === "$ref" || key === "allOf")
              continue;
            if (!(key in _cached)) {
              delete schema2[key];
            }
          }
        }
        if (refSchema.$ref && refSeen.def) {
          for (const key in schema2) {
            if (key === "$ref" || key === "allOf")
              continue;
            if (key in refSeen.def && JSON.stringify(schema2[key]) === JSON.stringify(refSeen.def[key])) {
              delete schema2[key];
            }
          }
        }
      }
      const parent = zodSchema._zod.parent;
      if (parent && parent !== ref) {
        flattenRef(parent);
        const parentSeen = ctx.seen.get(parent);
        if (parentSeen?.schema.$ref) {
          schema2.$ref = parentSeen.schema.$ref;
          if (parentSeen.def) {
            for (const key in schema2) {
              if (key === "$ref" || key === "allOf")
                continue;
              if (key in parentSeen.def && JSON.stringify(schema2[key]) === JSON.stringify(parentSeen.def[key])) {
                delete schema2[key];
              }
            }
          }
        }
      }
      ctx.override({
        zodSchema,
        jsonSchema: schema2,
        path: seen.path ?? []
      });
    };
    for (const entry of [...ctx.seen.entries()].reverse()) {
      flattenRef(entry[0]);
    }
    const result2 = {};
    if (ctx.target === "draft-2020-12") {
      result2.$schema = "https://json-schema.org/draft/2020-12/schema";
    } else if (ctx.target === "draft-07") {
      result2.$schema = "http://json-schema.org/draft-07/schema#";
    } else if (ctx.target === "draft-04") {
      result2.$schema = "http://json-schema.org/draft-04/schema#";
    } else if (ctx.target === "openapi-3.0") ;
    else ;
    if (ctx.external?.uri) {
      const id = ctx.external.registry.get(schema)?.id;
      if (!id)
        throw new Error("Schema is missing an `id` property");
      result2.$id = ctx.external.uri(id);
    }
    Object.assign(result2, root.def ?? root.schema);
    const defs = ctx.external?.defs ?? {};
    for (const entry of ctx.seen.entries()) {
      const seen = entry[1];
      if (seen.def && seen.defId) {
        defs[seen.defId] = seen.def;
      }
    }
    if (ctx.external) ;
    else {
      if (Object.keys(defs).length > 0) {
        if (ctx.target === "draft-2020-12") {
          result2.$defs = defs;
        } else {
          result2.definitions = defs;
        }
      }
    }
    try {
      const finalized = JSON.parse(JSON.stringify(result2));
      Object.defineProperty(finalized, "~standard", {
        value: {
          ...schema["~standard"],
          jsonSchema: {
            input: createStandardJSONSchemaMethod(schema, "input", ctx.processors),
            output: createStandardJSONSchemaMethod(schema, "output", ctx.processors)
          }
        },
        enumerable: false,
        writable: false
      });
      return finalized;
    } catch (_err) {
      throw new Error("Error converting schema to JSON.");
    }
  }
  function isTransforming(_schema, _ctx) {
    const ctx = _ctx ?? { seen: /* @__PURE__ */ new Set() };
    if (ctx.seen.has(_schema))
      return false;
    ctx.seen.add(_schema);
    const def = _schema._zod.def;
    if (def.type === "transform")
      return true;
    if (def.type === "array")
      return isTransforming(def.element, ctx);
    if (def.type === "set")
      return isTransforming(def.valueType, ctx);
    if (def.type === "lazy")
      return isTransforming(def.getter(), ctx);
    if (def.type === "promise" || def.type === "optional" || def.type === "nonoptional" || def.type === "nullable" || def.type === "readonly" || def.type === "default" || def.type === "prefault") {
      return isTransforming(def.innerType, ctx);
    }
    if (def.type === "intersection") {
      return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
    }
    if (def.type === "record" || def.type === "map") {
      return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
    }
    if (def.type === "pipe") {
      return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
    }
    if (def.type === "object") {
      for (const key in def.shape) {
        if (isTransforming(def.shape[key], ctx))
          return true;
      }
      return false;
    }
    if (def.type === "union") {
      for (const option of def.options) {
        if (isTransforming(option, ctx))
          return true;
      }
      return false;
    }
    if (def.type === "tuple") {
      for (const item of def.items) {
        if (isTransforming(item, ctx))
          return true;
      }
      if (def.rest && isTransforming(def.rest, ctx))
        return true;
      return false;
    }
    return false;
  }
  const createToJSONSchemaMethod = (schema, processors = {}) => (params) => {
    const ctx = initializeContext({ ...params, processors });
    process(schema, ctx);
    extractDefs(ctx, schema);
    return finalize(ctx, schema);
  };
  const createStandardJSONSchemaMethod = (schema, io, processors = {}) => (params) => {
    const { libraryOptions, target } = params ?? {};
    const ctx = initializeContext({ ...libraryOptions ?? {}, target, io, processors });
    process(schema, ctx);
    extractDefs(ctx, schema);
    return finalize(ctx, schema);
  };
  const formatMap = {
    guid: "uuid",
    url: "uri",
    datetime: "date-time",
    json_string: "json-string",
    regex: ""
    // do not set
  };
  const stringProcessor = (schema, ctx, _json, _params) => {
    const json = _json;
    json.type = "string";
    const { minimum, maximum, format, patterns, contentEncoding } = schema._zod.bag;
    if (typeof minimum === "number")
      json.minLength = minimum;
    if (typeof maximum === "number")
      json.maxLength = maximum;
    if (format) {
      json.format = formatMap[format] ?? format;
      if (json.format === "")
        delete json.format;
      if (format === "time") {
        delete json.format;
      }
    }
    if (contentEncoding)
      json.contentEncoding = contentEncoding;
    if (patterns && patterns.size > 0) {
      const regexes = [...patterns];
      if (regexes.length === 1)
        json.pattern = regexes[0].source;
      else if (regexes.length > 1) {
        json.allOf = [
          ...regexes.map((regex) => ({
            ...ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0" ? { type: "string" } : {},
            pattern: regex.source
          }))
        ];
      }
    }
  };
  const numberProcessor = (schema, ctx, _json, _params) => {
    const json = _json;
    const { minimum, maximum, format, multipleOf, exclusiveMaximum, exclusiveMinimum } = schema._zod.bag;
    if (typeof format === "string" && format.includes("int"))
      json.type = "integer";
    else
      json.type = "number";
    if (typeof exclusiveMinimum === "number") {
      if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") {
        json.minimum = exclusiveMinimum;
        json.exclusiveMinimum = true;
      } else {
        json.exclusiveMinimum = exclusiveMinimum;
      }
    }
    if (typeof minimum === "number") {
      json.minimum = minimum;
      if (typeof exclusiveMinimum === "number" && ctx.target !== "draft-04") {
        if (exclusiveMinimum >= minimum)
          delete json.minimum;
        else
          delete json.exclusiveMinimum;
      }
    }
    if (typeof exclusiveMaximum === "number") {
      if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") {
        json.maximum = exclusiveMaximum;
        json.exclusiveMaximum = true;
      } else {
        json.exclusiveMaximum = exclusiveMaximum;
      }
    }
    if (typeof maximum === "number") {
      json.maximum = maximum;
      if (typeof exclusiveMaximum === "number" && ctx.target !== "draft-04") {
        if (exclusiveMaximum <= maximum)
          delete json.maximum;
        else
          delete json.exclusiveMaximum;
      }
    }
    if (typeof multipleOf === "number")
      json.multipleOf = multipleOf;
  };
  const booleanProcessor = (_schema, _ctx, json, _params) => {
    json.type = "boolean";
  };
  const bigintProcessor = (_schema, ctx, _json, _params) => {
    if (ctx.unrepresentable === "throw") {
      throw new Error("BigInt cannot be represented in JSON Schema");
    }
  };
  const symbolProcessor = (_schema, ctx, _json, _params) => {
    if (ctx.unrepresentable === "throw") {
      throw new Error("Symbols cannot be represented in JSON Schema");
    }
  };
  const nullProcessor = (_schema, ctx, json, _params) => {
    if (ctx.target === "openapi-3.0") {
      json.type = "string";
      json.nullable = true;
      json.enum = [null];
    } else {
      json.type = "null";
    }
  };
  const undefinedProcessor = (_schema, ctx, _json, _params) => {
    if (ctx.unrepresentable === "throw") {
      throw new Error("Undefined cannot be represented in JSON Schema");
    }
  };
  const voidProcessor = (_schema, ctx, _json, _params) => {
    if (ctx.unrepresentable === "throw") {
      throw new Error("Void cannot be represented in JSON Schema");
    }
  };
  const neverProcessor = (_schema, _ctx, json, _params) => {
    json.not = {};
  };
  const anyProcessor = (_schema, _ctx, _json, _params) => {
  };
  const unknownProcessor = (_schema, _ctx, _json, _params) => {
  };
  const dateProcessor = (_schema, ctx, _json, _params) => {
    if (ctx.unrepresentable === "throw") {
      throw new Error("Date cannot be represented in JSON Schema");
    }
  };
  const enumProcessor = (schema, _ctx, json, _params) => {
    const def = schema._zod.def;
    const values = getEnumValues(def.entries);
    if (values.every((v) => typeof v === "number"))
      json.type = "number";
    if (values.every((v) => typeof v === "string"))
      json.type = "string";
    json.enum = values;
  };
  const literalProcessor = (schema, ctx, json, _params) => {
    const def = schema._zod.def;
    const vals = [];
    for (const val of def.values) {
      if (val === void 0) {
        if (ctx.unrepresentable === "throw") {
          throw new Error("Literal `undefined` cannot be represented in JSON Schema");
        }
      } else if (typeof val === "bigint") {
        if (ctx.unrepresentable === "throw") {
          throw new Error("BigInt literals cannot be represented in JSON Schema");
        } else {
          vals.push(Number(val));
        }
      } else {
        vals.push(val);
      }
    }
    if (vals.length === 0) ;
    else if (vals.length === 1) {
      const val = vals[0];
      json.type = val === null ? "null" : typeof val;
      if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") {
        json.enum = [val];
      } else {
        json.const = val;
      }
    } else {
      if (vals.every((v) => typeof v === "number"))
        json.type = "number";
      if (vals.every((v) => typeof v === "string"))
        json.type = "string";
      if (vals.every((v) => typeof v === "boolean"))
        json.type = "boolean";
      if (vals.every((v) => v === null))
        json.type = "null";
      json.enum = vals;
    }
  };
  const nanProcessor = (_schema, ctx, _json, _params) => {
    if (ctx.unrepresentable === "throw") {
      throw new Error("NaN cannot be represented in JSON Schema");
    }
  };
  const templateLiteralProcessor = (schema, _ctx, json, _params) => {
    const _json = json;
    const pattern = schema._zod.pattern;
    if (!pattern)
      throw new Error("Pattern not found in template literal");
    _json.type = "string";
    _json.pattern = pattern.source;
  };
  const fileProcessor = (schema, _ctx, json, _params) => {
    const _json = json;
    const file = {
      type: "string",
      format: "binary",
      contentEncoding: "binary"
    };
    const { minimum, maximum, mime } = schema._zod.bag;
    if (minimum !== void 0)
      file.minLength = minimum;
    if (maximum !== void 0)
      file.maxLength = maximum;
    if (mime) {
      if (mime.length === 1) {
        file.contentMediaType = mime[0];
        Object.assign(_json, file);
      } else {
        Object.assign(_json, file);
        _json.anyOf = mime.map((m) => ({ contentMediaType: m }));
      }
    } else {
      Object.assign(_json, file);
    }
  };
  const successProcessor = (_schema, _ctx, json, _params) => {
    json.type = "boolean";
  };
  const customProcessor = (_schema, ctx, _json, _params) => {
    if (ctx.unrepresentable === "throw") {
      throw new Error("Custom types cannot be represented in JSON Schema");
    }
  };
  const functionProcessor = (_schema, ctx, _json, _params) => {
    if (ctx.unrepresentable === "throw") {
      throw new Error("Function types cannot be represented in JSON Schema");
    }
  };
  const transformProcessor = (_schema, ctx, _json, _params) => {
    if (ctx.unrepresentable === "throw") {
      throw new Error("Transforms cannot be represented in JSON Schema");
    }
  };
  const mapProcessor = (_schema, ctx, _json, _params) => {
    if (ctx.unrepresentable === "throw") {
      throw new Error("Map cannot be represented in JSON Schema");
    }
  };
  const setProcessor = (_schema, ctx, _json, _params) => {
    if (ctx.unrepresentable === "throw") {
      throw new Error("Set cannot be represented in JSON Schema");
    }
  };
  const arrayProcessor = (schema, ctx, _json, params) => {
    const json = _json;
    const def = schema._zod.def;
    const { minimum, maximum } = schema._zod.bag;
    if (typeof minimum === "number")
      json.minItems = minimum;
    if (typeof maximum === "number")
      json.maxItems = maximum;
    json.type = "array";
    json.items = process(def.element, ctx, { ...params, path: [...params.path, "items"] });
  };
  const objectProcessor = (schema, ctx, _json, params) => {
    const json = _json;
    const def = schema._zod.def;
    json.type = "object";
    json.properties = {};
    const shape = def.shape;
    for (const key in shape) {
      json.properties[key] = process(shape[key], ctx, {
        ...params,
        path: [...params.path, "properties", key]
      });
    }
    const allKeys = new Set(Object.keys(shape));
    const requiredKeys = new Set([...allKeys].filter((key) => {
      const v = def.shape[key]._zod;
      if (ctx.io === "input") {
        return v.optin === void 0;
      } else {
        return v.optout === void 0;
      }
    }));
    if (requiredKeys.size > 0) {
      json.required = Array.from(requiredKeys);
    }
    if (def.catchall?._zod.def.type === "never") {
      json.additionalProperties = false;
    } else if (!def.catchall) {
      if (ctx.io === "output")
        json.additionalProperties = false;
    } else if (def.catchall) {
      json.additionalProperties = process(def.catchall, ctx, {
        ...params,
        path: [...params.path, "additionalProperties"]
      });
    }
  };
  const unionProcessor = (schema, ctx, json, params) => {
    const def = schema._zod.def;
    const isExclusive = def.inclusive === false;
    const options = def.options.map((x, i) => process(x, ctx, {
      ...params,
      path: [...params.path, isExclusive ? "oneOf" : "anyOf", i]
    }));
    if (isExclusive) {
      json.oneOf = options;
    } else {
      json.anyOf = options;
    }
  };
  const intersectionProcessor = (schema, ctx, json, params) => {
    const def = schema._zod.def;
    const a = process(def.left, ctx, {
      ...params,
      path: [...params.path, "allOf", 0]
    });
    const b = process(def.right, ctx, {
      ...params,
      path: [...params.path, "allOf", 1]
    });
    const isSimpleIntersection = (val) => "allOf" in val && Object.keys(val).length === 1;
    const allOf = [
      ...isSimpleIntersection(a) ? a.allOf : [a],
      ...isSimpleIntersection(b) ? b.allOf : [b]
    ];
    json.allOf = allOf;
  };
  const tupleProcessor = (schema, ctx, _json, params) => {
    const json = _json;
    const def = schema._zod.def;
    json.type = "array";
    const prefixPath = ctx.target === "draft-2020-12" ? "prefixItems" : "items";
    const restPath = ctx.target === "draft-2020-12" ? "items" : ctx.target === "openapi-3.0" ? "items" : "additionalItems";
    const prefixItems = def.items.map((x, i) => process(x, ctx, {
      ...params,
      path: [...params.path, prefixPath, i]
    }));
    const rest = def.rest ? process(def.rest, ctx, {
      ...params,
      path: [...params.path, restPath, ...ctx.target === "openapi-3.0" ? [def.items.length] : []]
    }) : null;
    if (ctx.target === "draft-2020-12") {
      json.prefixItems = prefixItems;
      if (rest) {
        json.items = rest;
      }
    } else if (ctx.target === "openapi-3.0") {
      json.items = {
        anyOf: prefixItems
      };
      if (rest) {
        json.items.anyOf.push(rest);
      }
      json.minItems = prefixItems.length;
      if (!rest) {
        json.maxItems = prefixItems.length;
      }
    } else {
      json.items = prefixItems;
      if (rest) {
        json.additionalItems = rest;
      }
    }
    const { minimum, maximum } = schema._zod.bag;
    if (typeof minimum === "number")
      json.minItems = minimum;
    if (typeof maximum === "number")
      json.maxItems = maximum;
  };
  const recordProcessor = (schema, ctx, _json, params) => {
    const json = _json;
    const def = schema._zod.def;
    json.type = "object";
    const keyType = def.keyType;
    const keyBag = keyType._zod.bag;
    const patterns = keyBag?.patterns;
    if (def.mode === "loose" && patterns && patterns.size > 0) {
      const valueSchema = process(def.valueType, ctx, {
        ...params,
        path: [...params.path, "patternProperties", "*"]
      });
      json.patternProperties = {};
      for (const pattern of patterns) {
        json.patternProperties[pattern.source] = valueSchema;
      }
    } else {
      if (ctx.target === "draft-07" || ctx.target === "draft-2020-12") {
        json.propertyNames = process(def.keyType, ctx, {
          ...params,
          path: [...params.path, "propertyNames"]
        });
      }
      json.additionalProperties = process(def.valueType, ctx, {
        ...params,
        path: [...params.path, "additionalProperties"]
      });
    }
    const keyValues = keyType._zod.values;
    if (keyValues) {
      const validKeyValues = [...keyValues].filter((v) => typeof v === "string" || typeof v === "number");
      if (validKeyValues.length > 0) {
        json.required = validKeyValues;
      }
    }
  };
  const nullableProcessor = (schema, ctx, json, params) => {
    const def = schema._zod.def;
    const inner = process(def.innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    if (ctx.target === "openapi-3.0") {
      seen.ref = def.innerType;
      json.nullable = true;
    } else {
      json.anyOf = [inner, { type: "null" }];
    }
  };
  const nonoptionalProcessor = (schema, ctx, _json, params) => {
    const def = schema._zod.def;
    process(def.innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
  };
  const defaultProcessor = (schema, ctx, json, params) => {
    const def = schema._zod.def;
    process(def.innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
    json.default = JSON.parse(JSON.stringify(def.defaultValue));
  };
  const prefaultProcessor = (schema, ctx, json, params) => {
    const def = schema._zod.def;
    process(def.innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
    if (ctx.io === "input")
      json._prefault = JSON.parse(JSON.stringify(def.defaultValue));
  };
  const catchProcessor = (schema, ctx, json, params) => {
    const def = schema._zod.def;
    process(def.innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
    let catchValue;
    try {
      catchValue = def.catchValue(void 0);
    } catch {
      throw new Error("Dynamic catch values are not supported in JSON Schema");
    }
    json.default = catchValue;
  };
  const pipeProcessor = (schema, ctx, _json, params) => {
    const def = schema._zod.def;
    const innerType = ctx.io === "input" ? def.in._zod.def.type === "transform" ? def.out : def.in : def.out;
    process(innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = innerType;
  };
  const readonlyProcessor = (schema, ctx, json, params) => {
    const def = schema._zod.def;
    process(def.innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
    json.readOnly = true;
  };
  const promiseProcessor = (schema, ctx, _json, params) => {
    const def = schema._zod.def;
    process(def.innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
  };
  const optionalProcessor = (schema, ctx, _json, params) => {
    const def = schema._zod.def;
    process(def.innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
  };
  const lazyProcessor = (schema, ctx, _json, params) => {
    const innerType = schema._zod.innerType;
    process(innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = innerType;
  };
  const allProcessors = {
    string: stringProcessor,
    number: numberProcessor,
    boolean: booleanProcessor,
    bigint: bigintProcessor,
    symbol: symbolProcessor,
    null: nullProcessor,
    undefined: undefinedProcessor,
    void: voidProcessor,
    never: neverProcessor,
    any: anyProcessor,
    unknown: unknownProcessor,
    date: dateProcessor,
    enum: enumProcessor,
    literal: literalProcessor,
    nan: nanProcessor,
    template_literal: templateLiteralProcessor,
    file: fileProcessor,
    success: successProcessor,
    custom: customProcessor,
    function: functionProcessor,
    transform: transformProcessor,
    map: mapProcessor,
    set: setProcessor,
    array: arrayProcessor,
    object: objectProcessor,
    union: unionProcessor,
    intersection: intersectionProcessor,
    tuple: tupleProcessor,
    record: recordProcessor,
    nullable: nullableProcessor,
    nonoptional: nonoptionalProcessor,
    default: defaultProcessor,
    prefault: prefaultProcessor,
    catch: catchProcessor,
    pipe: pipeProcessor,
    readonly: readonlyProcessor,
    promise: promiseProcessor,
    optional: optionalProcessor,
    lazy: lazyProcessor
  };
  function toJSONSchema(input, params) {
    if ("_idmap" in input) {
      const registry2 = input;
      const ctx2 = initializeContext({ ...params, processors: allProcessors });
      const defs = {};
      for (const entry of registry2._idmap.entries()) {
        const [_, schema] = entry;
        process(schema, ctx2);
      }
      const schemas = {};
      const external = {
        registry: registry2,
        uri: params?.uri,
        defs
      };
      ctx2.external = external;
      for (const entry of registry2._idmap.entries()) {
        const [key, schema] = entry;
        extractDefs(ctx2, schema);
        schemas[key] = finalize(ctx2, schema);
      }
      if (Object.keys(defs).length > 0) {
        const defsSegment = ctx2.target === "draft-2020-12" ? "$defs" : "definitions";
        schemas.__shared = {
          [defsSegment]: defs
        };
      }
      return { schemas };
    }
    const ctx = initializeContext({ ...params, processors: allProcessors });
    process(input, ctx);
    extractDefs(ctx, input);
    return finalize(ctx, input);
  }
  const ZodISODateTime = /* @__PURE__ */ $constructor("ZodISODateTime", (inst, def) => {
    $ZodISODateTime.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function datetime(params) {
    return /* @__PURE__ */ _isoDateTime(ZodISODateTime, params);
  }
  const ZodISODate = /* @__PURE__ */ $constructor("ZodISODate", (inst, def) => {
    $ZodISODate.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function date(params) {
    return /* @__PURE__ */ _isoDate(ZodISODate, params);
  }
  const ZodISOTime = /* @__PURE__ */ $constructor("ZodISOTime", (inst, def) => {
    $ZodISOTime.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function time(params) {
    return /* @__PURE__ */ _isoTime(ZodISOTime, params);
  }
  const ZodISODuration = /* @__PURE__ */ $constructor("ZodISODuration", (inst, def) => {
    $ZodISODuration.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function duration(params) {
    return /* @__PURE__ */ _isoDuration(ZodISODuration, params);
  }
  const initializer = (inst, issues) => {
    $ZodError.init(inst, issues);
    inst.name = "ZodError";
    Object.defineProperties(inst, {
      format: {
        value: (mapper) => formatError(inst, mapper)
        // enumerable: false,
      },
      flatten: {
        value: (mapper) => flattenError(inst, mapper)
        // enumerable: false,
      },
      addIssue: {
        value: (issue2) => {
          inst.issues.push(issue2);
          inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
        }
        // enumerable: false,
      },
      addIssues: {
        value: (issues2) => {
          inst.issues.push(...issues2);
          inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
        }
        // enumerable: false,
      },
      isEmpty: {
        get() {
          return inst.issues.length === 0;
        }
        // enumerable: false,
      }
    });
  };
  const ZodRealError = $constructor("ZodError", initializer, {
    Parent: Error
  });
  const parse = /* @__PURE__ */ _parse(ZodRealError);
  const parseAsync = /* @__PURE__ */ _parseAsync(ZodRealError);
  const safeParse = /* @__PURE__ */ _safeParse(ZodRealError);
  const safeParseAsync = /* @__PURE__ */ _safeParseAsync(ZodRealError);
  const encode = /* @__PURE__ */ _encode(ZodRealError);
  const decode = /* @__PURE__ */ _decode(ZodRealError);
  const encodeAsync = /* @__PURE__ */ _encodeAsync(ZodRealError);
  const decodeAsync = /* @__PURE__ */ _decodeAsync(ZodRealError);
  const safeEncode = /* @__PURE__ */ _safeEncode(ZodRealError);
  const safeDecode = /* @__PURE__ */ _safeDecode(ZodRealError);
  const safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
  const safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);
  const ZodType = /* @__PURE__ */ $constructor("ZodType", (inst, def) => {
    $ZodType.init(inst, def);
    Object.assign(inst["~standard"], {
      jsonSchema: {
        input: createStandardJSONSchemaMethod(inst, "input"),
        output: createStandardJSONSchemaMethod(inst, "output")
      }
    });
    inst.toJSONSchema = createToJSONSchemaMethod(inst, {});
    inst.def = def;
    inst.type = def.type;
    Object.defineProperty(inst, "_def", { value: def });
    inst.check = (...checks) => {
      return inst.clone(mergeDefs(def, {
        checks: [
          ...def.checks ?? [],
          ...checks.map((ch) => typeof ch === "function" ? { _zod: { check: ch, def: { check: "custom" }, onattach: [] } } : ch)
        ]
      }), {
        parent: true
      });
    };
    inst.with = inst.check;
    inst.clone = (def2, params) => clone(inst, def2, params);
    inst.brand = () => inst;
    inst.register = ((reg, meta) => {
      reg.add(inst, meta);
      return inst;
    });
    inst.parse = (data, params) => parse(inst, data, params, { callee: inst.parse });
    inst.safeParse = (data, params) => safeParse(inst, data, params);
    inst.parseAsync = async (data, params) => parseAsync(inst, data, params, { callee: inst.parseAsync });
    inst.safeParseAsync = async (data, params) => safeParseAsync(inst, data, params);
    inst.spa = inst.safeParseAsync;
    inst.encode = (data, params) => encode(inst, data, params);
    inst.decode = (data, params) => decode(inst, data, params);
    inst.encodeAsync = async (data, params) => encodeAsync(inst, data, params);
    inst.decodeAsync = async (data, params) => decodeAsync(inst, data, params);
    inst.safeEncode = (data, params) => safeEncode(inst, data, params);
    inst.safeDecode = (data, params) => safeDecode(inst, data, params);
    inst.safeEncodeAsync = async (data, params) => safeEncodeAsync(inst, data, params);
    inst.safeDecodeAsync = async (data, params) => safeDecodeAsync(inst, data, params);
    inst.refine = (check, params) => inst.check(refine(check, params));
    inst.superRefine = (refinement) => inst.check(superRefine(refinement));
    inst.overwrite = (fn) => inst.check(/* @__PURE__ */ _overwrite(fn));
    inst.optional = () => optional(inst);
    inst.exactOptional = () => exactOptional(inst);
    inst.nullable = () => nullable(inst);
    inst.nullish = () => optional(nullable(inst));
    inst.nonoptional = (params) => nonoptional(inst, params);
    inst.array = () => array(inst);
    inst.or = (arg) => union([inst, arg]);
    inst.and = (arg) => intersection(inst, arg);
    inst.transform = (tx) => pipe(inst, transform(tx));
    inst.default = (def2) => _default(inst, def2);
    inst.prefault = (def2) => prefault(inst, def2);
    inst.catch = (params) => _catch(inst, params);
    inst.pipe = (target) => pipe(inst, target);
    inst.readonly = () => readonly(inst);
    inst.describe = (description) => {
      const cl = inst.clone();
      globalRegistry.add(cl, { description });
      return cl;
    };
    Object.defineProperty(inst, "description", {
      get() {
        return globalRegistry.get(inst)?.description;
      },
      configurable: true
    });
    inst.meta = (...args) => {
      if (args.length === 0) {
        return globalRegistry.get(inst);
      }
      const cl = inst.clone();
      globalRegistry.add(cl, args[0]);
      return cl;
    };
    inst.isOptional = () => inst.safeParse(void 0).success;
    inst.isNullable = () => inst.safeParse(null).success;
    inst.apply = (fn) => fn(inst);
    return inst;
  });
  const _ZodString = /* @__PURE__ */ $constructor("_ZodString", (inst, def) => {
    $ZodString.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => stringProcessor(inst, ctx, json);
    const bag = inst._zod.bag;
    inst.format = bag.format ?? null;
    inst.minLength = bag.minimum ?? null;
    inst.maxLength = bag.maximum ?? null;
    inst.regex = (...args) => inst.check(/* @__PURE__ */ _regex(...args));
    inst.includes = (...args) => inst.check(/* @__PURE__ */ _includes(...args));
    inst.startsWith = (...args) => inst.check(/* @__PURE__ */ _startsWith(...args));
    inst.endsWith = (...args) => inst.check(/* @__PURE__ */ _endsWith(...args));
    inst.min = (...args) => inst.check(/* @__PURE__ */ _minLength(...args));
    inst.max = (...args) => inst.check(/* @__PURE__ */ _maxLength(...args));
    inst.length = (...args) => inst.check(/* @__PURE__ */ _length(...args));
    inst.nonempty = (...args) => inst.check(/* @__PURE__ */ _minLength(1, ...args));
    inst.lowercase = (params) => inst.check(/* @__PURE__ */ _lowercase(params));
    inst.uppercase = (params) => inst.check(/* @__PURE__ */ _uppercase(params));
    inst.trim = () => inst.check(/* @__PURE__ */ _trim());
    inst.normalize = (...args) => inst.check(/* @__PURE__ */ _normalize(...args));
    inst.toLowerCase = () => inst.check(/* @__PURE__ */ _toLowerCase());
    inst.toUpperCase = () => inst.check(/* @__PURE__ */ _toUpperCase());
    inst.slugify = () => inst.check(/* @__PURE__ */ _slugify());
  });
  const ZodString = /* @__PURE__ */ $constructor("ZodString", (inst, def) => {
    $ZodString.init(inst, def);
    _ZodString.init(inst, def);
    inst.email = (params) => inst.check(/* @__PURE__ */ _email(ZodEmail, params));
    inst.url = (params) => inst.check(/* @__PURE__ */ _url(ZodURL, params));
    inst.jwt = (params) => inst.check(/* @__PURE__ */ _jwt(ZodJWT, params));
    inst.emoji = (params) => inst.check(/* @__PURE__ */ _emoji(ZodEmoji, params));
    inst.guid = (params) => inst.check(/* @__PURE__ */ _guid(ZodGUID, params));
    inst.uuid = (params) => inst.check(/* @__PURE__ */ _uuid(ZodUUID, params));
    inst.uuidv4 = (params) => inst.check(/* @__PURE__ */ _uuidv4(ZodUUID, params));
    inst.uuidv6 = (params) => inst.check(/* @__PURE__ */ _uuidv6(ZodUUID, params));
    inst.uuidv7 = (params) => inst.check(/* @__PURE__ */ _uuidv7(ZodUUID, params));
    inst.nanoid = (params) => inst.check(/* @__PURE__ */ _nanoid(ZodNanoID, params));
    inst.guid = (params) => inst.check(/* @__PURE__ */ _guid(ZodGUID, params));
    inst.cuid = (params) => inst.check(/* @__PURE__ */ _cuid(ZodCUID, params));
    inst.cuid2 = (params) => inst.check(/* @__PURE__ */ _cuid2(ZodCUID2, params));
    inst.ulid = (params) => inst.check(/* @__PURE__ */ _ulid(ZodULID, params));
    inst.base64 = (params) => inst.check(/* @__PURE__ */ _base64(ZodBase64, params));
    inst.base64url = (params) => inst.check(/* @__PURE__ */ _base64url(ZodBase64URL, params));
    inst.xid = (params) => inst.check(/* @__PURE__ */ _xid(ZodXID, params));
    inst.ksuid = (params) => inst.check(/* @__PURE__ */ _ksuid(ZodKSUID, params));
    inst.ipv4 = (params) => inst.check(/* @__PURE__ */ _ipv4(ZodIPv4, params));
    inst.ipv6 = (params) => inst.check(/* @__PURE__ */ _ipv6(ZodIPv6, params));
    inst.cidrv4 = (params) => inst.check(/* @__PURE__ */ _cidrv4(ZodCIDRv4, params));
    inst.cidrv6 = (params) => inst.check(/* @__PURE__ */ _cidrv6(ZodCIDRv6, params));
    inst.e164 = (params) => inst.check(/* @__PURE__ */ _e164(ZodE164, params));
    inst.datetime = (params) => inst.check(datetime(params));
    inst.date = (params) => inst.check(date(params));
    inst.time = (params) => inst.check(time(params));
    inst.duration = (params) => inst.check(duration(params));
  });
  function string(params) {
    return /* @__PURE__ */ _string(ZodString, params);
  }
  const ZodStringFormat = /* @__PURE__ */ $constructor("ZodStringFormat", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    _ZodString.init(inst, def);
  });
  const ZodEmail = /* @__PURE__ */ $constructor("ZodEmail", (inst, def) => {
    $ZodEmail.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodGUID = /* @__PURE__ */ $constructor("ZodGUID", (inst, def) => {
    $ZodGUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodUUID = /* @__PURE__ */ $constructor("ZodUUID", (inst, def) => {
    $ZodUUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodURL = /* @__PURE__ */ $constructor("ZodURL", (inst, def) => {
    $ZodURL.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodEmoji = /* @__PURE__ */ $constructor("ZodEmoji", (inst, def) => {
    $ZodEmoji.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodNanoID = /* @__PURE__ */ $constructor("ZodNanoID", (inst, def) => {
    $ZodNanoID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodCUID = /* @__PURE__ */ $constructor("ZodCUID", (inst, def) => {
    $ZodCUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodCUID2 = /* @__PURE__ */ $constructor("ZodCUID2", (inst, def) => {
    $ZodCUID2.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodULID = /* @__PURE__ */ $constructor("ZodULID", (inst, def) => {
    $ZodULID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodXID = /* @__PURE__ */ $constructor("ZodXID", (inst, def) => {
    $ZodXID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodKSUID = /* @__PURE__ */ $constructor("ZodKSUID", (inst, def) => {
    $ZodKSUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodIPv4 = /* @__PURE__ */ $constructor("ZodIPv4", (inst, def) => {
    $ZodIPv4.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodIPv6 = /* @__PURE__ */ $constructor("ZodIPv6", (inst, def) => {
    $ZodIPv6.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodCIDRv4 = /* @__PURE__ */ $constructor("ZodCIDRv4", (inst, def) => {
    $ZodCIDRv4.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodCIDRv6 = /* @__PURE__ */ $constructor("ZodCIDRv6", (inst, def) => {
    $ZodCIDRv6.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodBase64 = /* @__PURE__ */ $constructor("ZodBase64", (inst, def) => {
    $ZodBase64.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodBase64URL = /* @__PURE__ */ $constructor("ZodBase64URL", (inst, def) => {
    $ZodBase64URL.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodE164 = /* @__PURE__ */ $constructor("ZodE164", (inst, def) => {
    $ZodE164.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodJWT = /* @__PURE__ */ $constructor("ZodJWT", (inst, def) => {
    $ZodJWT.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodNumber = /* @__PURE__ */ $constructor("ZodNumber", (inst, def) => {
    $ZodNumber.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => numberProcessor(inst, ctx, json);
    inst.gt = (value, params) => inst.check(/* @__PURE__ */ _gt(value, params));
    inst.gte = (value, params) => inst.check(/* @__PURE__ */ _gte(value, params));
    inst.min = (value, params) => inst.check(/* @__PURE__ */ _gte(value, params));
    inst.lt = (value, params) => inst.check(/* @__PURE__ */ _lt(value, params));
    inst.lte = (value, params) => inst.check(/* @__PURE__ */ _lte(value, params));
    inst.max = (value, params) => inst.check(/* @__PURE__ */ _lte(value, params));
    inst.int = (params) => inst.check(int(params));
    inst.safe = (params) => inst.check(int(params));
    inst.positive = (params) => inst.check(/* @__PURE__ */ _gt(0, params));
    inst.nonnegative = (params) => inst.check(/* @__PURE__ */ _gte(0, params));
    inst.negative = (params) => inst.check(/* @__PURE__ */ _lt(0, params));
    inst.nonpositive = (params) => inst.check(/* @__PURE__ */ _lte(0, params));
    inst.multipleOf = (value, params) => inst.check(/* @__PURE__ */ _multipleOf(value, params));
    inst.step = (value, params) => inst.check(/* @__PURE__ */ _multipleOf(value, params));
    inst.finite = () => inst;
    const bag = inst._zod.bag;
    inst.minValue = Math.max(bag.minimum ?? Number.NEGATIVE_INFINITY, bag.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null;
    inst.maxValue = Math.min(bag.maximum ?? Number.POSITIVE_INFINITY, bag.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null;
    inst.isInt = (bag.format ?? "").includes("int") || Number.isSafeInteger(bag.multipleOf ?? 0.5);
    inst.isFinite = true;
    inst.format = bag.format ?? null;
  });
  function number(params) {
    return /* @__PURE__ */ _number(ZodNumber, params);
  }
  const ZodNumberFormat = /* @__PURE__ */ $constructor("ZodNumberFormat", (inst, def) => {
    $ZodNumberFormat.init(inst, def);
    ZodNumber.init(inst, def);
  });
  function int(params) {
    return /* @__PURE__ */ _int(ZodNumberFormat, params);
  }
  const ZodBoolean = /* @__PURE__ */ $constructor("ZodBoolean", (inst, def) => {
    $ZodBoolean.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => booleanProcessor(inst, ctx, json);
  });
  function boolean(params) {
    return /* @__PURE__ */ _boolean(ZodBoolean, params);
  }
  const ZodUnknown = /* @__PURE__ */ $constructor("ZodUnknown", (inst, def) => {
    $ZodUnknown.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => unknownProcessor();
  });
  function unknown() {
    return /* @__PURE__ */ _unknown(ZodUnknown);
  }
  const ZodNever = /* @__PURE__ */ $constructor("ZodNever", (inst, def) => {
    $ZodNever.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => neverProcessor(inst, ctx, json);
  });
  function never(params) {
    return /* @__PURE__ */ _never(ZodNever, params);
  }
  const ZodArray = /* @__PURE__ */ $constructor("ZodArray", (inst, def) => {
    $ZodArray.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => arrayProcessor(inst, ctx, json, params);
    inst.element = def.element;
    inst.min = (minLength, params) => inst.check(/* @__PURE__ */ _minLength(minLength, params));
    inst.nonempty = (params) => inst.check(/* @__PURE__ */ _minLength(1, params));
    inst.max = (maxLength, params) => inst.check(/* @__PURE__ */ _maxLength(maxLength, params));
    inst.length = (len, params) => inst.check(/* @__PURE__ */ _length(len, params));
    inst.unwrap = () => inst.element;
  });
  function array(element, params) {
    return /* @__PURE__ */ _array(ZodArray, element, params);
  }
  const ZodObject = /* @__PURE__ */ $constructor("ZodObject", (inst, def) => {
    $ZodObjectJIT.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => objectProcessor(inst, ctx, json, params);
    defineLazy(inst, "shape", () => {
      return def.shape;
    });
    inst.keyof = () => _enum(Object.keys(inst._zod.def.shape));
    inst.catchall = (catchall) => inst.clone({ ...inst._zod.def, catchall });
    inst.passthrough = () => inst.clone({ ...inst._zod.def, catchall: unknown() });
    inst.loose = () => inst.clone({ ...inst._zod.def, catchall: unknown() });
    inst.strict = () => inst.clone({ ...inst._zod.def, catchall: never() });
    inst.strip = () => inst.clone({ ...inst._zod.def, catchall: void 0 });
    inst.extend = (incoming) => {
      return extend(inst, incoming);
    };
    inst.safeExtend = (incoming) => {
      return safeExtend(inst, incoming);
    };
    inst.merge = (other) => merge(inst, other);
    inst.pick = (mask) => pick(inst, mask);
    inst.omit = (mask) => omit(inst, mask);
    inst.partial = (...args) => partial(ZodOptional, inst, args[0]);
    inst.required = (...args) => required(ZodNonOptional, inst, args[0]);
  });
  function object(shape, params) {
    const def = {
      type: "object",
      shape: shape ?? {},
      ...normalizeParams(params)
    };
    return new ZodObject(def);
  }
  const ZodUnion = /* @__PURE__ */ $constructor("ZodUnion", (inst, def) => {
    $ZodUnion.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => unionProcessor(inst, ctx, json, params);
    inst.options = def.options;
  });
  function union(options, params) {
    return new ZodUnion({
      type: "union",
      options,
      ...normalizeParams(params)
    });
  }
  const ZodIntersection = /* @__PURE__ */ $constructor("ZodIntersection", (inst, def) => {
    $ZodIntersection.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => intersectionProcessor(inst, ctx, json, params);
  });
  function intersection(left, right) {
    return new ZodIntersection({
      type: "intersection",
      left,
      right
    });
  }
  const ZodEnum = /* @__PURE__ */ $constructor("ZodEnum", (inst, def) => {
    $ZodEnum.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => enumProcessor(inst, ctx, json);
    inst.enum = def.entries;
    inst.options = Object.values(def.entries);
    const keys = new Set(Object.keys(def.entries));
    inst.extract = (values, params) => {
      const newEntries = {};
      for (const value of values) {
        if (keys.has(value)) {
          newEntries[value] = def.entries[value];
        } else
          throw new Error(`Key ${value} not found in enum`);
      }
      return new ZodEnum({
        ...def,
        checks: [],
        ...normalizeParams(params),
        entries: newEntries
      });
    };
    inst.exclude = (values, params) => {
      const newEntries = { ...def.entries };
      for (const value of values) {
        if (keys.has(value)) {
          delete newEntries[value];
        } else
          throw new Error(`Key ${value} not found in enum`);
      }
      return new ZodEnum({
        ...def,
        checks: [],
        ...normalizeParams(params),
        entries: newEntries
      });
    };
  });
  function _enum(values, params) {
    const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
    return new ZodEnum({
      type: "enum",
      entries,
      ...normalizeParams(params)
    });
  }
  const ZodTransform = /* @__PURE__ */ $constructor("ZodTransform", (inst, def) => {
    $ZodTransform.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => transformProcessor(inst, ctx);
    inst._zod.parse = (payload, _ctx) => {
      if (_ctx.direction === "backward") {
        throw new $ZodEncodeError(inst.constructor.name);
      }
      payload.addIssue = (issue$1) => {
        if (typeof issue$1 === "string") {
          payload.issues.push(issue(issue$1, payload.value, def));
        } else {
          const _issue = issue$1;
          if (_issue.fatal)
            _issue.continue = false;
          _issue.code ?? (_issue.code = "custom");
          _issue.input ?? (_issue.input = payload.value);
          _issue.inst ?? (_issue.inst = inst);
          payload.issues.push(issue(_issue));
        }
      };
      const output = def.transform(payload.value, payload);
      if (output instanceof Promise) {
        return output.then((output2) => {
          payload.value = output2;
          return payload;
        });
      }
      payload.value = output;
      return payload;
    };
  });
  function transform(fn) {
    return new ZodTransform({
      type: "transform",
      transform: fn
    });
  }
  const ZodOptional = /* @__PURE__ */ $constructor("ZodOptional", (inst, def) => {
    $ZodOptional.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function optional(innerType) {
    return new ZodOptional({
      type: "optional",
      innerType
    });
  }
  const ZodExactOptional = /* @__PURE__ */ $constructor("ZodExactOptional", (inst, def) => {
    $ZodExactOptional.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function exactOptional(innerType) {
    return new ZodExactOptional({
      type: "optional",
      innerType
    });
  }
  const ZodNullable = /* @__PURE__ */ $constructor("ZodNullable", (inst, def) => {
    $ZodNullable.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => nullableProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function nullable(innerType) {
    return new ZodNullable({
      type: "nullable",
      innerType
    });
  }
  const ZodDefault = /* @__PURE__ */ $constructor("ZodDefault", (inst, def) => {
    $ZodDefault.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => defaultProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
    inst.removeDefault = inst.unwrap;
  });
  function _default(innerType, defaultValue) {
    return new ZodDefault({
      type: "default",
      innerType,
      get defaultValue() {
        return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
      }
    });
  }
  const ZodPrefault = /* @__PURE__ */ $constructor("ZodPrefault", (inst, def) => {
    $ZodPrefault.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => prefaultProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function prefault(innerType, defaultValue) {
    return new ZodPrefault({
      type: "prefault",
      innerType,
      get defaultValue() {
        return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
      }
    });
  }
  const ZodNonOptional = /* @__PURE__ */ $constructor("ZodNonOptional", (inst, def) => {
    $ZodNonOptional.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => nonoptionalProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function nonoptional(innerType, params) {
    return new ZodNonOptional({
      type: "nonoptional",
      innerType,
      ...normalizeParams(params)
    });
  }
  const ZodCatch = /* @__PURE__ */ $constructor("ZodCatch", (inst, def) => {
    $ZodCatch.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => catchProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
    inst.removeCatch = inst.unwrap;
  });
  function _catch(innerType, catchValue) {
    return new ZodCatch({
      type: "catch",
      innerType,
      catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
    });
  }
  const ZodPipe = /* @__PURE__ */ $constructor("ZodPipe", (inst, def) => {
    $ZodPipe.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => pipeProcessor(inst, ctx, json, params);
    inst.in = def.in;
    inst.out = def.out;
  });
  function pipe(in_, out) {
    return new ZodPipe({
      type: "pipe",
      in: in_,
      out
      // ...util.normalizeParams(params),
    });
  }
  const ZodReadonly = /* @__PURE__ */ $constructor("ZodReadonly", (inst, def) => {
    $ZodReadonly.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => readonlyProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function readonly(innerType) {
    return new ZodReadonly({
      type: "readonly",
      innerType
    });
  }
  const ZodCustom = /* @__PURE__ */ $constructor("ZodCustom", (inst, def) => {
    $ZodCustom.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => customProcessor(inst, ctx);
  });
  function refine(fn, _params = {}) {
    return /* @__PURE__ */ _refine(ZodCustom, fn, _params);
  }
  function superRefine(fn) {
    return /* @__PURE__ */ _superRefine(fn);
  }
  const ANSI_BACKGROUND_OFFSET = 10;
  const wrapAnsi16 = (offset = 0) => (code) => `\x1B[${code + offset}m`;
  const wrapAnsi256 = (offset = 0) => (code) => `\x1B[${38 + offset};5;${code}m`;
  const wrapAnsi16m = (offset = 0) => (red, green, blue) => `\x1B[${38 + offset};2;${red};${green};${blue}m`;
  const styles$1 = {
    modifier: {
      reset: [0, 0],
      // 21 isn't widely supported and 22 does the same thing
      bold: [1, 22],
      dim: [2, 22],
      italic: [3, 23],
      underline: [4, 24],
      overline: [53, 55],
      inverse: [7, 27],
      hidden: [8, 28],
      strikethrough: [9, 29]
    },
    color: {
      black: [30, 39],
      red: [31, 39],
      green: [32, 39],
      yellow: [33, 39],
      blue: [34, 39],
      magenta: [35, 39],
      cyan: [36, 39],
      white: [37, 39],
      // Bright color
      blackBright: [90, 39],
      gray: [90, 39],
      // Alias of `blackBright`
      grey: [90, 39],
      // Alias of `blackBright`
      redBright: [91, 39],
      greenBright: [92, 39],
      yellowBright: [93, 39],
      blueBright: [94, 39],
      magentaBright: [95, 39],
      cyanBright: [96, 39],
      whiteBright: [97, 39]
    },
    bgColor: {
      bgBlack: [40, 49],
      bgRed: [41, 49],
      bgGreen: [42, 49],
      bgYellow: [43, 49],
      bgBlue: [44, 49],
      bgMagenta: [45, 49],
      bgCyan: [46, 49],
      bgWhite: [47, 49],
      // Bright color
      bgBlackBright: [100, 49],
      bgGray: [100, 49],
      // Alias of `bgBlackBright`
      bgGrey: [100, 49],
      // Alias of `bgBlackBright`
      bgRedBright: [101, 49],
      bgGreenBright: [102, 49],
      bgYellowBright: [103, 49],
      bgBlueBright: [104, 49],
      bgMagentaBright: [105, 49],
      bgCyanBright: [106, 49],
      bgWhiteBright: [107, 49]
    }
  };
  Object.keys(styles$1.modifier);
  const foregroundColorNames = Object.keys(styles$1.color);
  const backgroundColorNames = Object.keys(styles$1.bgColor);
  [...foregroundColorNames, ...backgroundColorNames];
  function assembleStyles() {
    const codes = /* @__PURE__ */ new Map();
    for (const [groupName, group] of Object.entries(styles$1)) {
      for (const [styleName, style] of Object.entries(group)) {
        styles$1[styleName] = {
          open: `\x1B[${style[0]}m`,
          close: `\x1B[${style[1]}m`
        };
        group[styleName] = styles$1[styleName];
        codes.set(style[0], style[1]);
      }
      Object.defineProperty(styles$1, groupName, {
        value: group,
        enumerable: false
      });
    }
    Object.defineProperty(styles$1, "codes", {
      value: codes,
      enumerable: false
    });
    styles$1.color.close = "\x1B[39m";
    styles$1.bgColor.close = "\x1B[49m";
    styles$1.color.ansi = wrapAnsi16();
    styles$1.color.ansi256 = wrapAnsi256();
    styles$1.color.ansi16m = wrapAnsi16m();
    styles$1.bgColor.ansi = wrapAnsi16(ANSI_BACKGROUND_OFFSET);
    styles$1.bgColor.ansi256 = wrapAnsi256(ANSI_BACKGROUND_OFFSET);
    styles$1.bgColor.ansi16m = wrapAnsi16m(ANSI_BACKGROUND_OFFSET);
    Object.defineProperties(styles$1, {
      rgbToAnsi256: {
        value(red, green, blue) {
          if (red === green && green === blue) {
            if (red < 8) {
              return 16;
            }
            if (red > 248) {
              return 231;
            }
            return Math.round((red - 8) / 247 * 24) + 232;
          }
          return 16 + 36 * Math.round(red / 255 * 5) + 6 * Math.round(green / 255 * 5) + Math.round(blue / 255 * 5);
        },
        enumerable: false
      },
      hexToRgb: {
        value(hex) {
          const matches = /[a-f\d]{6}|[a-f\d]{3}/i.exec(hex.toString(16));
          if (!matches) {
            return [0, 0, 0];
          }
          let [colorString] = matches;
          if (colorString.length === 3) {
            colorString = [...colorString].map((character) => character + character).join("");
          }
          const integer2 = Number.parseInt(colorString, 16);
          return [
            /* eslint-disable no-bitwise */
            integer2 >> 16 & 255,
            integer2 >> 8 & 255,
            integer2 & 255
            /* eslint-enable no-bitwise */
          ];
        },
        enumerable: false
      },
      hexToAnsi256: {
        value: (hex) => styles$1.rgbToAnsi256(...styles$1.hexToRgb(hex)),
        enumerable: false
      },
      ansi256ToAnsi: {
        value(code) {
          if (code < 8) {
            return 30 + code;
          }
          if (code < 16) {
            return 90 + (code - 8);
          }
          let red;
          let green;
          let blue;
          if (code >= 232) {
            red = ((code - 232) * 10 + 8) / 255;
            green = red;
            blue = red;
          } else {
            code -= 16;
            const remainder = code % 36;
            red = Math.floor(code / 36) / 5;
            green = Math.floor(remainder / 6) / 5;
            blue = remainder % 6 / 5;
          }
          const value = Math.max(red, green, blue) * 2;
          if (value === 0) {
            return 30;
          }
          let result2 = 30 + (Math.round(blue) << 2 | Math.round(green) << 1 | Math.round(red));
          if (value === 2) {
            result2 += 60;
          }
          return result2;
        },
        enumerable: false
      },
      rgbToAnsi: {
        value: (red, green, blue) => styles$1.ansi256ToAnsi(styles$1.rgbToAnsi256(red, green, blue)),
        enumerable: false
      },
      hexToAnsi: {
        value: (hex) => styles$1.ansi256ToAnsi(styles$1.hexToAnsi256(hex)),
        enumerable: false
      }
    });
    return styles$1;
  }
  const ansiStyles = assembleStyles();
  const level = (() => {
    if (!("navigator" in globalThis)) {
      return 0;
    }
    if (globalThis.navigator.userAgentData) {
      const brand = navigator.userAgentData.brands.find(({ brand: brand2 }) => brand2 === "Chromium");
      if (brand && brand.version > 93) {
        return 3;
      }
    }
    if (/\b(Chrome|Chromium)\//.test(globalThis.navigator.userAgent)) {
      return 1;
    }
    return 0;
  })();
  const colorSupport = level !== 0 && {
    level
  };
  const supportsColor = {
    stdout: colorSupport,
    stderr: colorSupport
  };
  function stringReplaceAll(string2, substring, replacer) {
    let index = string2.indexOf(substring);
    if (index === -1) {
      return string2;
    }
    const substringLength = substring.length;
    let endIndex = 0;
    let returnValue = "";
    do {
      returnValue += string2.slice(endIndex, index) + substring + replacer;
      endIndex = index + substringLength;
      index = string2.indexOf(substring, endIndex);
    } while (index !== -1);
    returnValue += string2.slice(endIndex);
    return returnValue;
  }
  function stringEncaseCRLFWithFirstIndex(string2, prefix, postfix, index) {
    let endIndex = 0;
    let returnValue = "";
    do {
      const gotCR = string2[index - 1] === "\r";
      returnValue += string2.slice(endIndex, gotCR ? index - 1 : index) + prefix + (gotCR ? "\r\n" : "\n") + postfix;
      endIndex = index + 1;
      index = string2.indexOf("\n", endIndex);
    } while (index !== -1);
    returnValue += string2.slice(endIndex);
    return returnValue;
  }
  const { stdout: stdoutColor, stderr: stderrColor } = supportsColor;
  const GENERATOR = /* @__PURE__ */ Symbol("GENERATOR");
  const STYLER = /* @__PURE__ */ Symbol("STYLER");
  const IS_EMPTY = /* @__PURE__ */ Symbol("IS_EMPTY");
  const levelMapping = [
    "ansi",
    "ansi",
    "ansi256",
    "ansi16m"
  ];
  const styles = /* @__PURE__ */ Object.create(null);
  const applyOptions = (object2, options = {}) => {
    if (options.level && !(Number.isInteger(options.level) && options.level >= 0 && options.level <= 3)) {
      throw new Error("The `level` option should be an integer from 0 to 3");
    }
    const colorLevel = stdoutColor ? stdoutColor.level : 0;
    object2.level = options.level === void 0 ? colorLevel : options.level;
  };
  const chalkFactory = (options) => {
    const chalk2 = (...strings) => strings.join(" ");
    applyOptions(chalk2, options);
    Object.setPrototypeOf(chalk2, createChalk.prototype);
    return chalk2;
  };
  function createChalk(options) {
    return chalkFactory(options);
  }
  Object.setPrototypeOf(createChalk.prototype, Function.prototype);
  for (const [styleName, style] of Object.entries(ansiStyles)) {
    styles[styleName] = {
      get() {
        const builder = createBuilder(this, createStyler(style.open, style.close, this[STYLER]), this[IS_EMPTY]);
        Object.defineProperty(this, styleName, { value: builder });
        return builder;
      }
    };
  }
  styles.visible = {
    get() {
      const builder = createBuilder(this, this[STYLER], true);
      Object.defineProperty(this, "visible", { value: builder });
      return builder;
    }
  };
  const getModelAnsi = (model, level2, type, ...arguments_) => {
    if (model === "rgb") {
      if (level2 === "ansi16m") {
        return ansiStyles[type].ansi16m(...arguments_);
      }
      if (level2 === "ansi256") {
        return ansiStyles[type].ansi256(ansiStyles.rgbToAnsi256(...arguments_));
      }
      return ansiStyles[type].ansi(ansiStyles.rgbToAnsi(...arguments_));
    }
    if (model === "hex") {
      return getModelAnsi("rgb", level2, type, ...ansiStyles.hexToRgb(...arguments_));
    }
    return ansiStyles[type][model](...arguments_);
  };
  const usedModels = ["rgb", "hex", "ansi256"];
  for (const model of usedModels) {
    styles[model] = {
      get() {
        const { level: level2 } = this;
        return function(...arguments_) {
          const styler = createStyler(getModelAnsi(model, levelMapping[level2], "color", ...arguments_), ansiStyles.color.close, this[STYLER]);
          return createBuilder(this, styler, this[IS_EMPTY]);
        };
      }
    };
    const bgModel = "bg" + model[0].toUpperCase() + model.slice(1);
    styles[bgModel] = {
      get() {
        const { level: level2 } = this;
        return function(...arguments_) {
          const styler = createStyler(getModelAnsi(model, levelMapping[level2], "bgColor", ...arguments_), ansiStyles.bgColor.close, this[STYLER]);
          return createBuilder(this, styler, this[IS_EMPTY]);
        };
      }
    };
  }
  const proto = Object.defineProperties(() => {
  }, {
    ...styles,
    level: {
      enumerable: true,
      get() {
        return this[GENERATOR].level;
      },
      set(level2) {
        this[GENERATOR].level = level2;
      }
    }
  });
  const createStyler = (open, close, parent) => {
    let openAll;
    let closeAll;
    if (parent === void 0) {
      openAll = open;
      closeAll = close;
    } else {
      openAll = parent.openAll + open;
      closeAll = close + parent.closeAll;
    }
    return {
      open,
      close,
      openAll,
      closeAll,
      parent
    };
  };
  const createBuilder = (self, _styler, _isEmpty) => {
    const builder = (...arguments_) => applyStyle(builder, arguments_.length === 1 ? "" + arguments_[0] : arguments_.join(" "));
    Object.setPrototypeOf(builder, proto);
    builder[GENERATOR] = self;
    builder[STYLER] = _styler;
    builder[IS_EMPTY] = _isEmpty;
    return builder;
  };
  const applyStyle = (self, string2) => {
    if (self.level <= 0 || !string2) {
      return self[IS_EMPTY] ? "" : string2;
    }
    let styler = self[STYLER];
    if (styler === void 0) {
      return string2;
    }
    const { openAll, closeAll } = styler;
    if (string2.includes("\x1B")) {
      while (styler !== void 0) {
        string2 = stringReplaceAll(string2, styler.close, styler.open);
        styler = styler.parent;
      }
    }
    const lfIndex = string2.indexOf("\n");
    if (lfIndex !== -1) {
      string2 = stringEncaseCRLFWithFirstIndex(string2, closeAll, openAll, lfIndex);
    }
    return openAll + string2 + closeAll;
  };
  Object.defineProperties(createChalk.prototype, styles);
  const chalk = createChalk();
  createChalk({ level: stderrColor ? stderrColor.level : 0 });
  var __defProp$1 = Object.defineProperty;
  var __name$1 = (target, value) => __defProp$1(target, "name", { value, configurable: true });
  const InvokeErrorType = {
    // Retryable
    NETWORK_ERROR: "network_error",
    // Network error, retry
    RATE_LIMIT: "rate_limit",
    // Rate limit, retry
    SERVER_ERROR: "server_error",
    // 5xx, retry
    NO_TOOL_CALL: "no_tool_call",
    // Model did not call tool
    INVALID_TOOL_ARGS: "invalid_tool_args",
    // Tool args don't match schema
    TOOL_EXECUTION_ERROR: "tool_execution_error",
    // Tool execution error
    UNKNOWN: "unknown",
    // Non-retryable
    AUTH_ERROR: "auth_error",
    // Authentication failed
    CONTEXT_LENGTH: "context_length",
    // Prompt too long
    CONTENT_FILTER: "content_filter"
    // Content filtered
  };
  const _InvokeError = class _InvokeError extends Error {
    type;
    retryable;
    statusCode;
    /* raw error (provided if this error is caused by another error) */
    rawError;
    /* raw response from the API (provided if this error is caused by an API calling) */
    rawResponse;
    constructor(type, message, rawError, rawResponse) {
      super(message);
      this.name = "InvokeError";
      this.type = type;
      this.retryable = this.isRetryable(type, rawError);
      this.rawError = rawError;
      this.rawResponse = rawResponse;
    }
    isRetryable(type, rawError) {
      const isAbortError = rawError?.name === "AbortError";
      if (isAbortError) return false;
      const retryableTypes = [
        InvokeErrorType.NETWORK_ERROR,
        InvokeErrorType.RATE_LIMIT,
        InvokeErrorType.SERVER_ERROR,
        InvokeErrorType.NO_TOOL_CALL,
        InvokeErrorType.INVALID_TOOL_ARGS,
        InvokeErrorType.TOOL_EXECUTION_ERROR,
        InvokeErrorType.UNKNOWN
      ];
      return retryableTypes.includes(type);
    }
  };
  __name$1(_InvokeError, "InvokeError");
  let InvokeError = _InvokeError;
  const debug$2 = console.debug.bind(console, chalk.gray("[LLM]"));
  function zodToOpenAITool(name, tool2) {
    return {
      type: "function",
      function: {
        name,
        description: tool2.description,
        parameters: toJSONSchema(tool2.inputSchema, { target: "openapi-3.0" })
      }
    };
  }
  __name$1(zodToOpenAITool, "zodToOpenAITool");
  function modelPatch(body) {
    const model = body.model || "";
    if (!model) return body;
    const modelName = normalizeModelName(model);
    if (modelName.startsWith("qwen")) {
      debug$2("Applying Qwen patch: use higher temperature for auto fixing");
      body.temperature = Math.max(body.temperature || 0, 1);
      body.enable_thinking = false;
    }
    if (modelName.startsWith("claude")) {
      debug$2("Applying Claude patch: disable thinking");
      body.thinking = { type: "disabled" };
      if (body.tool_choice === "required") {
        debug$2('Applying Claude patch: convert tool_choice "required" to { type: "any" }');
        body.tool_choice = { type: "any" };
      } else if (body.tool_choice?.function?.name) {
        debug$2("Applying Claude patch: convert tool_choice format");
        body.tool_choice = { type: "tool", name: body.tool_choice.function.name };
      }
    }
    if (modelName.startsWith("grok")) {
      debug$2("Applying Grok patch: removing tool_choice");
      delete body.tool_choice;
      debug$2("Applying Grok patch: disable reasoning and thinking");
      body.thinking = { type: "disabled", effort: "minimal" };
      body.reasoning = { enabled: false, effort: "low" };
    }
    if (modelName.startsWith("gpt")) {
      debug$2("Applying GPT patch: set verbosity to low");
      body.verbosity = "low";
      if (modelName.startsWith("gpt-52")) {
        debug$2("Applying GPT-52 patch: disable reasoning");
        body.reasoning_effort = "none";
      } else if (modelName.startsWith("gpt-51")) {
        debug$2("Applying GPT-51 patch: disable reasoning");
        body.reasoning_effort = "none";
      } else if (modelName.startsWith("gpt-54")) {
        debug$2(
          "Applying GPT-5.4 patch: skip reasoning_effort because chat/completions rejects it with function tools"
        );
        delete body.reasoning_effort;
      } else if (modelName.startsWith("gpt-5-mini")) {
        debug$2("Applying GPT-5-mini patch: set reasoning effort to low, temperature to 1");
        body.reasoning_effort = "low";
        body.temperature = 1;
      } else if (modelName.startsWith("gpt-5")) {
        debug$2("Applying GPT-5 patch: set reasoning effort to low");
        body.reasoning_effort = "low";
      }
    }
    if (modelName.startsWith("gemini")) {
      debug$2("Applying Gemini patch: set reasoning effort to minimal");
      body.reasoning_effort = "minimal";
    }
    return body;
  }
  __name$1(modelPatch, "modelPatch");
  function normalizeModelName(modelName) {
    let normalizedName = modelName.toLowerCase();
    if (normalizedName.includes("/")) {
      normalizedName = normalizedName.split("/")[1];
    }
    normalizedName = normalizedName.replace(/_/g, "");
    normalizedName = normalizedName.replace(/\./g, "");
    return normalizedName;
  }
  __name$1(normalizeModelName, "normalizeModelName");
  const _OpenAIClient = class _OpenAIClient {
    config;
    fetch;
    constructor(config2) {
      this.config = config2;
      this.fetch = config2.customFetch;
    }
    async invoke(messages, tools2, abortSignal, options) {
      const openaiTools = Object.entries(tools2).map(([name, t]) => zodToOpenAITool(name, t));
      const requestBody = {
        model: this.config.model,
        temperature: this.config.temperature,
        messages,
        tools: openaiTools,
        parallel_tool_calls: false,
        // Require tool call: specific tool if provided, otherwise any tool
        tool_choice: options?.toolChoiceName ? { type: "function", function: { name: options.toolChoiceName } } : "required"
      };
      modelPatch(requestBody);
      let response;
      try {
        response = await this.fetch(`${this.config.baseURL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.config.apiKey}`
          },
          body: JSON.stringify(requestBody),
          signal: abortSignal
        });
      } catch (error) {
        const isAbortError = error?.name === "AbortError";
        const errorMessage = isAbortError ? "Network request aborted" : "Network request failed";
        if (!isAbortError) console.error(error);
        throw new InvokeError(InvokeErrorType.NETWORK_ERROR, errorMessage, error);
      }
      if (!response.ok) {
        const errorData = await response.json().catch();
        const errorMessage = errorData.error?.message || response.statusText;
        if (response.status === 401 || response.status === 403) {
          throw new InvokeError(
            InvokeErrorType.AUTH_ERROR,
            `Authentication failed: ${errorMessage}`,
            errorData
          );
        }
        if (response.status === 429) {
          throw new InvokeError(
            InvokeErrorType.RATE_LIMIT,
            `Rate limit exceeded: ${errorMessage}`,
            errorData
          );
        }
        if (response.status >= 500) {
          throw new InvokeError(
            InvokeErrorType.SERVER_ERROR,
            `Server error: ${errorMessage}`,
            errorData
          );
        }
        throw new InvokeError(
          InvokeErrorType.UNKNOWN,
          `HTTP ${response.status}: ${errorMessage}`,
          errorData
        );
      }
      const data = await response.json();
      const choice = data.choices?.[0];
      if (!choice) {
        throw new InvokeError(InvokeErrorType.UNKNOWN, "No choices in response", data);
      }
      switch (choice.finish_reason) {
        case "tool_calls":
        case "function_call":
        // gemini
        case "stop":
          break;
        case "length":
          throw new InvokeError(
            InvokeErrorType.CONTEXT_LENGTH,
            "Response truncated: max tokens reached",
            void 0,
            data
          );
        case "content_filter":
          throw new InvokeError(
            InvokeErrorType.CONTENT_FILTER,
            "Contenu filtré par le système de sécurité",
            void 0,
            data
          );
        default:
          throw new InvokeError(
            InvokeErrorType.UNKNOWN,
            `Unexpected finish_reason: ${choice.finish_reason}`,
            void 0,
            data
          );
      }
      const normalizedData = options?.normalizeResponse ? options.normalizeResponse(data) : data;
      const normalizedChoice = normalizedData.choices?.[0];
      const toolCallName = normalizedChoice?.message?.tool_calls?.[0]?.function?.name;
      if (!toolCallName) {
        throw new InvokeError(
          InvokeErrorType.NO_TOOL_CALL,
          "No tool call found in response",
          void 0,
          data
        );
      }
      const tool2 = tools2[toolCallName];
      if (!tool2) {
        throw new InvokeError(
          InvokeErrorType.UNKNOWN,
          `Tool "${toolCallName}" not found in tools`,
          void 0,
          data
        );
      }
      const argString = normalizedChoice.message?.tool_calls?.[0]?.function?.arguments;
      if (!argString) {
        throw new InvokeError(
          InvokeErrorType.INVALID_TOOL_ARGS,
          "No tool call arguments found",
          void 0,
          data
        );
      }
      let parsedArgs;
      try {
        parsedArgs = JSON.parse(argString);
      } catch (error) {
        throw new InvokeError(
          InvokeErrorType.INVALID_TOOL_ARGS,
          "Failed to parse tool arguments as JSON",
          error,
          data
        );
      }
      const validation = tool2.inputSchema.safeParse(parsedArgs);
      if (!validation.success) {
        console.error(prettifyError(validation.error));
        throw new InvokeError(
          InvokeErrorType.INVALID_TOOL_ARGS,
          "Tool arguments validation failed",
          validation.error,
          data
        );
      }
      const toolInput = validation.data;
      let toolResult;
      try {
        toolResult = await tool2.execute(toolInput);
      } catch (e) {
        throw new InvokeError(
          InvokeErrorType.TOOL_EXECUTION_ERROR,
          `Tool execution failed: ${e.message}`,
          e,
          data
        );
      }
      return {
        toolCall: {
          name: toolCallName,
          args: toolInput
        },
        toolResult,
        usage: {
          promptTokens: data.usage?.prompt_tokens ?? 0,
          completionTokens: data.usage?.completion_tokens ?? 0,
          totalTokens: data.usage?.total_tokens ?? 0,
          cachedTokens: data.usage?.prompt_tokens_details?.cached_tokens,
          reasoningTokens: data.usage?.completion_tokens_details?.reasoning_tokens
        },
        rawResponse: data,
        rawRequest: requestBody
      };
    }
  };
  __name$1(_OpenAIClient, "OpenAIClient");
  let OpenAIClient = _OpenAIClient;
  const LLM_MAX_RETRIES = 2;
  const DEFAULT_TEMPERATURE = 0.7;
  function parseLLMConfig(config2) {
    if (!config2.baseURL || !config2.apiKey || !config2.model) {
      throw new Error(
        "[PageAgent] LLM configuration required. Please provide: baseURL, apiKey, model. See: https://alibaba.github.io/page-agent/docs/features/models"
      );
    }
    return {
      baseURL: config2.baseURL,
      apiKey: config2.apiKey,
      model: config2.model,
      temperature: config2.temperature ?? DEFAULT_TEMPERATURE,
      maxRetries: config2.maxRetries ?? LLM_MAX_RETRIES,
      customFetch: (config2.customFetch ?? fetch).bind(globalThis)
      // fetch will be illegal unless bound
    };
  }
  __name$1(parseLLMConfig, "parseLLMConfig");
  const _LLM = class _LLM extends EventTarget {
    config;
    client;
    constructor(config2) {
      super();
      this.config = parseLLMConfig(config2);
      this.client = new OpenAIClient(this.config);
    }
    /**
     * - call llm api *once*
     * - invoke tool call *once*
     * - return the result of the tool
     */
    async invoke(messages, tools2, abortSignal, options) {
      return await withRetry(
        async () => {
          if (abortSignal.aborted) throw new Error("AbortError");
          const result2 = await this.client.invoke(messages, tools2, abortSignal, options);
          return result2;
        },
        // retry settings
        {
          maxRetries: this.config.maxRetries,
          onRetry: /* @__PURE__ */ __name$1((attempt) => {
            this.dispatchEvent(
              new CustomEvent("retry", { detail: { attempt, maxAttempts: this.config.maxRetries } })
            );
          }, "onRetry"),
          onError: /* @__PURE__ */ __name$1((error) => {
            this.dispatchEvent(new CustomEvent("error", { detail: { error } }));
          }, "onError")
        }
      );
    }
  };
  __name$1(_LLM, "LLM");
  let LLM = _LLM;
  async function withRetry(fn, settings) {
    let attempt = 0;
    let lastError = null;
    while (attempt <= settings.maxRetries) {
      if (attempt > 0) {
        settings.onRetry(attempt);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      try {
        return await fn();
      } catch (error) {
        if (error?.rawError?.name === "AbortError") throw error;
        console.error(error);
        settings.onError(error);
        if (error instanceof InvokeError && !error.retryable) throw error;
        lastError = error;
        attempt++;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    throw lastError;
  }
  __name$1(withRetry, "withRetry");
  var __defProp = Object.defineProperty;
  var __typeError = (msg) => {
    throw TypeError(msg);
  };
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
  var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), member.set(obj, value), value);
  var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
  var _status, _llm, _abortController, _observations, _states, _PageAgentCore_instances, emitStatusChange_fn, emitHistoryChange_fn, emitActivity_fn, setStatus_fn, packMacroTool_fn, getSystemPrompt_fn, getInstructions_fn, handleObservations_fn, assembleUserPrompt_fn, onDone_fn;
  const SYSTEM_PROMPT$1 = 'You are an AI agent designed to operate in an iterative loop to automate browser tasks. Your ultimate goal is accomplishing the task provided in <user_request>.\n\n<intro>\nYou excel at following tasks:\n1. Navigating complex websites and extracting precise information\n2. Automating form submissions and interactive web actions\n3. Gathering and saving information \n4. Operate effectively in an agent loop\n5. Efficiently performing diverse web tasks\n</intro>\n\n<language_settings>\n- Default working language: **English**\n- Use the language that user is using. Return in user\'s language.\n</language_settings>\n\n<input>\nAt every step, your input will consist of: \n1. <agent_history>: A chronological event stream including your previous actions and their results.\n2. <agent_state>: Current <user_request> and <step_info>.\n3. <browser_state>: Current URL, interactive elements indexed for actions, and visible page content.\n</input>\n\n<agent_history>\nAgent history will be given as a list of step information as follows:\n\n<step_{step_number}>:\nEvaluation of Previous Step: Assessment of last action\nMemory: Your memory of this step\nNext Goal: Your goal for this step\nAction Results: Your actions and their results\n</step_{step_number}>\n\nand system messages wrapped in <sys> tag.\n</agent_history>\n\n<user_request>\nUSER REQUEST: This is your ultimate objective and always remains visible.\n- This has the highest priority. Make the user happy.\n- If the user request is very specific - then carefully follow each step and dont skip or hallucinate steps.\n- If the task is open ended you can plan yourself how to get it done.\n</user_request>\n\n<browser_state>\n1. Browser State will be given as:\n\nCurrent URL: URL of the page you are currently viewing.\nInteractive Elements: All interactive elements will be provided in format as [index]<type>text</type> where\n- index: Numeric identifier for interaction\n- type: HTML element type (button, input, etc.)\n- text: Element description\n\nExamples:\n[33]<div>User form</div>\n\\t*[35]<button aria-label=\'Submit form\'>Submit</button>\n\nNote that:\n- Only elements with numeric indexes in [] are interactive\n- (stacked) indentation (with \\t) is important and means that the element is a (html) child of the element above (with a lower index)\n- Elements tagged with `*[` are the new clickable elements that appeared on the website since the last step - if url has not changed.\n- Pure text elements without [] are not interactive.\n</browser_state>\n\n<browser_rules>\nStrictly follow these rules while using the browser and navigating the web:\n- Only interact with elements that have a numeric [index] assigned.\n- Only use indexes that are explicitly provided.\n- If the page changes after, for example, an input text action, analyze if you need to interact with new elements, e.g. selecting the right option from the list.\n- By default, only elements in the visible viewport are listed. Use scrolling actions if you suspect relevant content is offscreen which you need to interact with. Scroll ONLY if there are more pixels below or above the page.\n- You can scroll by a specific number of pages using the num_pages parameter (e.g., 0.5 for half page, 2.0 for two pages).\n- All the elements that are scrollable are marked with `data-scrollable` attribute. Including the scrollable distance in every directions. You can scroll *the element* in case some area are overflowed.\n- If a captcha appears, tell user you can not solve captcha. finished the task and ask user to solve it.\n- If expected elements are missing, try scrolling, or navigating back.\n- If the page is not fully loaded, use the `wait` action.\n- Do not repeat one action for more than 3 times unless some conditions changed.\n- If you fill an input field and your action sequence is interrupted, most often something changed e.g. suggestions popped up under the field.\n- If the <user_request> includes specific page information such as product type, rating, price, location, etc., try to apply filters to be more efficient.\n- The <user_request> is the ultimate goal. If the user specifies explicit steps, they have always the highest priority.\n- If you input_text into a field, you might need to press enter, click the search button, or select from dropdown for completion.\n- Don\'t login into a page if you don\'t have to. Don\'t login if you don\'t have the credentials. \n- There are 2 types of tasks always first think which type of request you are dealing with:\n1. Very specific step by step instructions:\n- Follow them as very precise and don\'t skip steps. Try to complete everything as requested.\n2. Open ended tasks. Plan yourself, be creative in achieving them.\n- If you get stuck e.g. with logins or captcha in open-ended tasks you can re-evaluate the task and try alternative ways, e.g. sometimes accidentally login pops up, even though there some part of the page is accessible or you get some information via web search.\n</browser_rules>\n\n<capability>\n- You can only handle single page app. Do not jump out of current page.\n- Do not click on link if it will open in a new page (etc. <a target="_blank">)\n- It is ok to fail the task.\n	- User can be wrong. If the request of user is not achievable, inappropriate or you do not have enough information or tools to achieve it. Tell user to make a better request.\n	- Webpage can be broken. All webpages or apps have bugs. Some bug will make it hard for your job. It\'s encouraged to tell user the problem of current page. Your feedbacks (including failing) are valuable for user.\n	- Trying to hard can be harmful. Repeating some action back and forth or pushing for a complex procedure with little knowledge can cause unwanted result and harmful side-effects. User would rather you to complete the task with a fail.\n- If you do not have knowledge for the current webpage or task. You must require user to give specific instructions and detailed steps.\n</capability>\n\n<task_completion_rules>\nYou must call the `done` action in one of three cases:\n- When you have fully completed the USER REQUEST.\n- When you reach the final allowed step (`max_steps`), even if the task is incomplete.\n- When you feel stuck or unable to solve user request. Or user request is not clear or contains inappropriate content.\n- If it is ABSOLUTELY IMPOSSIBLE to continue.\n\nThe `done` action is your opportunity to terminate and share your findings with the user.\n- Set `success` to `true` only if the full USER REQUEST has been completed with no missing components.\n- If any part of the request is missing, incomplete, or uncertain, set `success` to `false`.\n- You can use the `text` field of the `done` action to communicate your findings and to provide a coherent reply to the user and fulfill the USER REQUEST.\n- You are ONLY ALLOWED to call `done` as a single action. Don\'t call it together with other actions.\n- If the user asks for specified format, such as "return JSON with following structure", "return a list of format...", MAKE sure to use the right format in your answer.\n- If the user asks for a structured output, your `done` action\'s schema may be modified. Take this schema into account when solving the task!\n</task_completion_rules>\n\n<reasoning_rules>\nExhibit the following reasoning patterns to successfully achieve the <user_request>:\n\n- Reason about <agent_history> to track progress and context toward <user_request>.\n- Analyze the most recent "Next Goal" and "Résultat de laction" in <agent_history> and clearly state what you previously tried to achieve.\n- Analyze all relevant items in <agent_history> and <browser_state> to understand your state.\n- Explicitly judge success/failure/uncertainty of the last action. Never assume an action succeeded just because it appears to be executed in your last step in <agent_history>. If the expected change is missing, mark the last action as failed (or uncertain) and plan a recovery.\n- Analyze whether you are stuck, e.g. when you repeat the same actions multiple times without any progress. Then consider alternative approaches e.g. scrolling for more context or ask user for help.\n- Ask user for help if you have any difficulty. Keep user in the loop.\n- If you see information relevant to <user_request>, plan saving the information to memory.\n- Always reason about the <user_request>. Make sure to carefully analyze the specific steps and information required. E.g. specific filters, specific form fields, specific information to search. Make sure to always compare the current trajectory with the user request and think carefully if thats how the user requested it.\n</reasoning_rules>\n\n<examples>\nHere are examples of good output patterns. Use them as reference but never copy them directly.\n\n<evaluation_examples>\n"evaluation_previous_goal": "Successfully navigated to the product page and found the target information. Verdict: Success"\n"evaluation_previous_goal": "Clicked the login button and user authentication form appeared. Verdict: Success"\n</evaluation_examples>\n\n<memory_examples>\n"memory": "Found many pending reports that need to be analyzed in the main page. Successfully processed the first 2 reports on quarterly sales data and moving on to inventory analysis and customer feedback reports."\n</memory_examples>\n\n<next_goal_examples>\n"next_goal": "Click on the \'Add to Cart\' button to proceed with the purchase flow."\n</next_goal_examples>\n</examples>\n\n<output>\n{\n  "evaluation_previous_goal": "Concise one-sentence analysis of your last action. Clearly state success, failure, or uncertain.",\n  "memory": "1-3 concise sentences of specific memory of this step and overall progress. You should put here everything that will help you track progress in future steps. Like counting pages visited, items found, etc.",\n  "next_goal": "State the next immediate goal and action to achieve it, in one clear sentence.",\n  "action":{\n    "Action name": {// Action parameters}\n  }\n}\n</output>\n';
  const log = console.log.bind(console, chalk.yellow("[autoFixer]"));
  function normalizeResponse(response, tools2) {
    let resolvedArguments = null;
    const choice = response.choices?.[0];
    if (!choice) throw new Error("No choices in response");
    const message = choice.message;
    if (!message) throw new Error("No message in choice");
    const toolCall = message.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      resolvedArguments = safeJsonParse(toolCall.function.arguments);
      if (toolCall.function.name && toolCall.function.name !== "AgentOutput") {
        log(`#1: fixing tool_call`);
        resolvedArguments = { action: safeJsonParse(resolvedArguments) };
      }
    } else {
      if (message.content) {
        const content2 = message.content.trim();
        const jsonInContent = retrieveJsonFromString(content2);
        if (jsonInContent) {
          resolvedArguments = safeJsonParse(jsonInContent);
          if (resolvedArguments?.name === "AgentOutput") {
            log(`#2: fixing tool_call`);
            resolvedArguments = safeJsonParse(resolvedArguments.arguments);
          }
          if (resolvedArguments?.type === "function") {
            log(`#3: fixing tool_call`);
            resolvedArguments = safeJsonParse(resolvedArguments.function.arguments);
          }
          if (!resolvedArguments?.action && !resolvedArguments?.evaluation_previous_goal && !resolvedArguments?.memory && !resolvedArguments?.next_goal && !resolvedArguments?.thinking) {
            log(`#4: fixing tool_call`);
            resolvedArguments = { action: safeJsonParse(resolvedArguments) };
          }
        } else {
          throw new Error("No tool_call and the message content does not contain valid JSON");
        }
      } else {
        throw new Error("No tool_call nor message content is present");
      }
    }
    resolvedArguments = safeJsonParse(resolvedArguments);
    if (resolvedArguments.action) {
      resolvedArguments.action = safeJsonParse(resolvedArguments.action);
    }
    if (resolvedArguments.action && tools2) {
      resolvedArguments.action = validateAction(resolvedArguments.action, tools2);
    }
    if (!resolvedArguments.action) {
      log(`#5: fixing tool_call`);
      resolvedArguments.action = { name: "wait", input: { seconds: 1 } };
    }
    return {
      ...response,
      choices: [
        {
          ...choice,
          message: {
            ...message,
            tool_calls: [
              {
                ...toolCall || {},
                function: {
                  ...toolCall?.function || {},
                  name: "AgentOutput",
                  arguments: JSON.stringify(resolvedArguments)
                }
              }
            ]
          }
        }
      ]
    };
  }
  __name(normalizeResponse, "normalizeResponse");
  function validateAction(action, tools2) {
    if (typeof action !== "object" || action === null) return action;
    const toolName = Object.keys(action)[0];
    if (!toolName) return action;
    const tool2 = tools2.get(toolName);
    if (!tool2) {
      const available = Array.from(tools2.keys()).join(", ");
      throw new InvokeError(
        InvokeErrorType.INVALID_TOOL_ARGS,
        `Unknown action "${toolName}". Available: ${available}`
      );
    }
    let value = action[toolName];
    const schema = tool2.inputSchema;
    if (schema instanceof ZodObject && value !== null && typeof value !== "object") {
      const requiredKey = Object.keys(schema.shape).find(
        (k) => !schema.shape[k].safeParse(void 0).success
      );
      if (requiredKey) {
        log(`coercing primitive action input for "${toolName}"`);
        value = { [requiredKey]: value };
      }
    }
    const result2 = schema.safeParse(value);
    if (!result2.success) {
      throw new InvokeError(
        InvokeErrorType.INVALID_TOOL_ARGS,
        `Invalid input for action "${toolName}": ${prettifyError(result2.error)}`
      );
    }
    return { [toolName]: result2.data };
  }
  __name(validateAction, "validateAction");
  function safeJsonParse(input) {
    if (typeof input === "string") {
      try {
        return JSON.parse(input.trim());
      } catch {
        return input;
      }
    }
    return input;
  }
  __name(safeJsonParse, "safeJsonParse");
  function retrieveJsonFromString(str) {
    try {
      const json = /({[\s\S]*})/.exec(str) ?? [];
      if (json.length === 0) {
        return null;
      }
      return JSON.parse(json[0]);
    } catch {
      return null;
    }
  }
  __name(retrieveJsonFromString, "retrieveJsonFromString");
  async function waitFor(seconds) {
    await new Promise((resolve) => setTimeout(resolve, seconds * 1e3));
  }
  __name(waitFor, "waitFor");
  function truncate(text, maxLength) {
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + "...";
    }
    return text;
  }
  __name(truncate, "truncate");
  function randomID(existingIDs) {
    let id = Math.random().toString(36).substring(2, 11);
    if (!existingIDs) {
      return id;
    }
    const MAX_TRY = 1e3;
    let tryCount = 0;
    while (existingIDs.includes(id)) {
      id = Math.random().toString(36).substring(2, 11);
      tryCount++;
      if (tryCount > MAX_TRY) {
        throw new Error("randomID: too many try");
      }
    }
    return id;
  }
  __name(randomID, "randomID");
  const _global = globalThis;
  if (!_global.__PAGE_AGENT_IDS__) {
    _global.__PAGE_AGENT_IDS__ = [];
  }
  const ids = _global.__PAGE_AGENT_IDS__;
  function uid() {
    const id = randomID(ids);
    ids.push(id);
    return id;
  }
  __name(uid, "uid");
  const llmsTxtCache = /* @__PURE__ */ new Map();
  async function fetchLlmsTxt(url) {
    const origin = new URL(url).origin;
    if (llmsTxtCache.has(origin)) return llmsTxtCache.get(origin);
    const endpoint = `${origin}/llms.txt`;
    let result2 = null;
    try {
      console.log(chalk.gray(`[llms.txt] Fetching ${endpoint}`));
      const res = await fetch(endpoint, { signal: AbortSignal.timeout(3e3) });
      if (res.ok) {
        result2 = await res.text();
        console.log(chalk.green(`[llms.txt] Found (${result2.length} chars)`));
        if (result2.length > 1e3) {
          console.log(chalk.yellow(`[llms.txt] Truncating to 1000 chars`));
          result2 = truncate(result2, 1e3);
        }
      } else {
        console.debug(chalk.gray(`[llms.txt] ${res.status} for ${endpoint}`));
      }
    } catch (e) {
      console.debug(chalk.gray(`[llms.txt] not found for ${endpoint}`), e);
    }
    llmsTxtCache.set(origin, result2);
    return result2;
  }
  __name(fetchLlmsTxt, "fetchLlmsTxt");
  function assert(condition, message, silent) {
    if (!condition) {
      const errorMessage = message ?? "Assertion failed";
      console.error(chalk.red(`❌ assert: ${errorMessage}`));
      throw new Error(errorMessage);
    }
  }
  __name(assert, "assert");
  function tool(options) {
    return options;
  }
  __name(tool, "tool");
  const tools = /* @__PURE__ */ new Map();
  tools.set(
    "done",
    tool({
      description: "Complete task. Text is your final response to the user — keep it concise unless the user explicitly asks for detail.",
      inputSchema: object({
        text: string(),
        success: boolean().default(true)
      }),
      execute: /* @__PURE__ */ __name(async function(input) {
        return Promise.resolve("Task completed");
      }, "execute")
    })
  );
  tools.set(
    "wait",
    tool({
      description: "Wait for x seconds. Can be used to wait until the page or data is fully loaded.",
      inputSchema: object({
        seconds: number().min(1).max(10).default(1)
      }),
      execute: /* @__PURE__ */ __name(async function(input) {
        const lastTimeUpdate = await this.pageController.getLastUpdateTime();
        const actualWaitTime = Math.max(0, input.seconds - (Date.now() - lastTimeUpdate) / 1e3);
        console.log(`actualWaitTime: ${actualWaitTime} seconds`);
        await waitFor(actualWaitTime);
        return `✅ Waited for ${input.seconds} seconds.`;
      }, "execute")
    })
  );
  tools.set(
    "ask_user",
    tool({
      description: "Ask the user a question and wait for their answer. Use this if you need more information or clarification.",
      inputSchema: object({
        question: string()
      }),
      execute: /* @__PURE__ */ __name(async function(input) {
        if (!this.onAskUser) {
          throw new Error("ask_user tool requires onAskUser callback to be set");
        }
        const answer = await this.onAskUser(input.question);
        return `User answered: ${answer}`;
      }, "execute")
    })
  );
  tools.set(
    "click_element_by_index",
    tool({
      description: "Cliquer sur lélément par index",
      inputSchema: object({
        index: int().min(0)
      }),
      execute: /* @__PURE__ */ __name(async function(input) {
        const result2 = await this.pageController.clickElement(input.index);
        return result2.message;
      }, "execute")
    })
  );
  tools.set(
    "input_text",
    tool({
      description: "Cliquez et tapez du texte dans un élément interactif",
      inputSchema: object({
        index: int().min(0),
        text: string()
      }),
      execute: /* @__PURE__ */ __name(async function(input) {
        const result2 = await this.pageController.inputText(input.index, input.text);
        return result2.message;
      }, "execute")
    })
  );
  tools.set(
    "select_dropdown_option",
    tool({
      description: "Select dropdown option for interactive element index by the text of the option you want to select",
      inputSchema: object({
        index: int().min(0),
        text: string()
      }),
      execute: /* @__PURE__ */ __name(async function(input) {
        const result2 = await this.pageController.selectOption(input.index, input.text);
        return result2.message;
      }, "execute")
    })
  );
  tools.set(
    "scroll",
    tool({
      description: "Scroll the page vertically. Use index for scroll elements (dropdowns/custom UI).",
      inputSchema: object({
        down: boolean().default(true),
        num_pages: number().min(0).max(10).optional().default(0.1),
        pixels: number().int().min(0).optional(),
        index: number().int().min(0).optional()
      }),
      execute: /* @__PURE__ */ __name(async function(input) {
        const result2 = await this.pageController.scroll({
          ...input,
          numPages: input.num_pages
        });
        return result2.message;
      }, "execute")
    })
  );
  tools.set(
    "scroll_horizontally",
    tool({
      description: "Scroll the page horizontally, or within a specific element by index. Useful for wide tables.",
      inputSchema: object({
        right: boolean().default(true),
        pixels: number().int().min(0),
        index: number().int().min(0).optional()
      }),
      execute: /* @__PURE__ */ __name(async function(input) {
        const result2 = await this.pageController.scrollHorizontally(input);
        return result2.message;
      }, "execute")
    })
  );
  tools.set(
    "execute_javascript",
    tool({
      description: "Execute JavaScript code on the current page. Supports async/await syntax. Use with caution!",
      inputSchema: object({
        script: string()
      }),
      execute: /* @__PURE__ */ __name(async function(input) {
        const result2 = await this.pageController.executeJavascript(input.script);
        return result2.message;
      }, "execute")
    })
  );
  const _PageAgentCore = class _PageAgentCore extends EventTarget {
    constructor(config2) {
      super();
      __privateAdd(this, _PageAgentCore_instances);
      __publicField(this, "id", uid());
      __publicField(this, "config");
      __publicField(this, "tools");
      __publicField(this, "pageController");
      __publicField(this, "task", "");
      __publicField(this, "taskId", "");
      __publicField(this, "history", []);
      __publicField(this, "disposed", false);
      __publicField(this, "onAskUser");
      __privateAdd(this, _status, "idle");
      __privateAdd(this, _llm);
      __privateAdd(this, _abortController, new AbortController());
      __privateAdd(this, _observations, []);
      __privateAdd(this, _states, {
        /** Accumulated wait time in seconds */
        totalWaitTime: 0,
        /** For detecting navigation */
        lastURL: "",
        /** Browser state */
        browserState: null
      });
      this.config = { ...config2, maxSteps: config2.maxSteps ?? 40 };
      __privateSet(this, _llm, new LLM(this.config));
      this.tools = new Map(tools);
      this.pageController = config2.pageController;
      __privateGet(this, _llm).addEventListener("retry", (e) => {
        const { attempt, maxAttempts } = e.detail;
        __privateMethod(this, _PageAgentCore_instances, emitActivity_fn).call(this, { type: "retrying", attempt, maxAttempts });
        this.history.push({
          type: "retry",
          message: `LLM retry attempt ${attempt} of ${maxAttempts}`,
          attempt,
          maxAttempts
        });
        __privateMethod(this, _PageAgentCore_instances, emitHistoryChange_fn).call(this);
      });
      __privateGet(this, _llm).addEventListener("error", (e) => {
        const error = e.detail.error;
        if (error?.rawError?.name === "AbortError") return;
        const message = String(error);
        __privateMethod(this, _PageAgentCore_instances, emitActivity_fn).call(this, { type: "error", message });
        this.history.push({
          type: "error",
          message,
          rawResponse: error.rawResponse
        });
        __privateMethod(this, _PageAgentCore_instances, emitHistoryChange_fn).call(this);
      });
      if (this.config.customTools) {
        for (const [name, tool2] of Object.entries(this.config.customTools)) {
          if (tool2 === null) {
            this.tools.delete(name);
            continue;
          }
          this.tools.set(name, tool2);
        }
      }
      if (!this.config.experimentalScriptExecutionTool) {
        this.tools.delete("execute_javascript");
      }
    }
    /** Get current agent status */
    get status() {
      return __privateGet(this, _status);
    }
    /**
     * Push a observation message to the history event stream.
     * This will be visible in <agent_history> and remain persistent in memory across steps.
     * @experimental @internal
     * @note history change will be emitted before next step starts
     */
    pushObservation(content2) {
      __privateGet(this, _observations).push(content2);
    }
    /** Stop the current task. Agent remains reusable. */
    stop() {
      this.pageController.cleanUpHighlights();
      this.pageController.hideMask();
      __privateGet(this, _abortController).abort();
    }
    async execute(task) {
      if (this.disposed) throw new Error("PageAgent has been disposed. Create a new instance.");
      if (!task) throw new Error("Task is required");
      this.task = task;
      this.taskId = uid();
      if (!this.onAskUser) {
        this.tools.delete("ask_user");
      }
      const onBeforeStep = this.config.onBeforeStep;
      const onAfterStep = this.config.onAfterStep;
      const onBeforeTask = this.config.onBeforeTask;
      const onAfterTask = this.config.onAfterTask;
      await onBeforeTask?.(this);
      await this.pageController.showMask();
      if (__privateGet(this, _abortController)) {
        __privateGet(this, _abortController).abort();
        __privateSet(this, _abortController, new AbortController());
      }
      this.history = [];
      __privateMethod(this, _PageAgentCore_instances, setStatus_fn).call(this, "running");
      __privateMethod(this, _PageAgentCore_instances, emitHistoryChange_fn).call(this);
      __privateSet(this, _observations, []);
      __privateSet(this, _states, { totalWaitTime: 0, lastURL: "", browserState: null });
      let step = 0;
      while (true) {
        try {
          console.group(`step: ${step}`);
          await onBeforeStep?.(this, step);
          console.log(chalk.blue.bold("👀 Observing..."));
          __privateGet(this, _states).browserState = await this.pageController.getBrowserState();
          await __privateMethod(this, _PageAgentCore_instances, handleObservations_fn).call(this, step);
          const messages = [
            { role: "system", content: __privateMethod(this, _PageAgentCore_instances, getSystemPrompt_fn).call(this) },
            { role: "user", content: await __privateMethod(this, _PageAgentCore_instances, assembleUserPrompt_fn).call(this) }
          ];
          const macroTool = { AgentOutput: __privateMethod(this, _PageAgentCore_instances, packMacroTool_fn).call(this) };
          console.log(chalk.blue.bold("🧠 Thinking..."));
          __privateMethod(this, _PageAgentCore_instances, emitActivity_fn).call(this, { type: "thinking" });
          const result2 = await __privateGet(this, _llm).invoke(messages, macroTool, __privateGet(this, _abortController).signal, {
            toolChoiceName: "AgentOutput",
            normalizeResponse: /* @__PURE__ */ __name((res) => normalizeResponse(res, this.tools), "normalizeResponse")
          });
          const macroResult = result2.toolResult;
          const input = macroResult.input;
          const output = macroResult.output;
          const reflection = {
            evaluation_previous_goal: input.evaluation_previous_goal,
            memory: input.memory,
            next_goal: input.next_goal
          };
          const actionName = Object.keys(input.action)[0];
          const action = {
            name: actionName,
            input: input.action[actionName],
            output
          };
          this.history.push({
            type: "step",
            stepIndex: step,
            reflection,
            action,
            usage: result2.usage,
            rawResponse: result2.rawResponse,
            rawRequest: result2.rawRequest
          });
          __privateMethod(this, _PageAgentCore_instances, emitHistoryChange_fn).call(this);
          await onAfterStep?.(this, this.history);
          console.groupEnd();
          if (actionName === "done") {
            const success = action.input?.success ?? false;
            const text = action.input?.text || "no text provided";
            console.log(chalk.green.bold("Task completed"), success, text);
            __privateMethod(this, _PageAgentCore_instances, onDone_fn).call(this, success);
            const result22 = {
              success,
              data: text,
              history: this.history
            };
            await onAfterTask?.(this, result22);
            return result22;
          }
        } catch (error) {
          console.groupEnd();
          const isAbortError = error?.rawError?.name === "AbortError";
          console.error("Task failed", error);
          const errorMessage = isAbortError ? "Task stopped" : String(error);
          __privateMethod(this, _PageAgentCore_instances, emitActivity_fn).call(this, { type: "error", message: errorMessage });
          this.history.push({ type: "error", message: errorMessage, rawResponse: error });
          __privateMethod(this, _PageAgentCore_instances, emitHistoryChange_fn).call(this);
          __privateMethod(this, _PageAgentCore_instances, onDone_fn).call(this, false);
          const result2 = {
            success: false,
            data: errorMessage,
            history: this.history
          };
          await onAfterTask?.(this, result2);
          return result2;
        }
        step++;
        if (step > this.config.maxSteps) {
          const errorMessage = "Step count exceeded maximum limit";
          this.history.push({ type: "error", message: errorMessage });
          __privateMethod(this, _PageAgentCore_instances, emitHistoryChange_fn).call(this);
          __privateMethod(this, _PageAgentCore_instances, onDone_fn).call(this, false);
          const result2 = {
            success: false,
            data: errorMessage,
            history: this.history
          };
          await onAfterTask?.(this, result2);
          return result2;
        }
        await waitFor(0.4);
      }
    }
    dispose() {
      console.log("Fermeture de PageAgent...");
      this.disposed = true;
      this.pageController.dispose();
      __privateGet(this, _abortController).abort();
      this.dispatchEvent(new Event("dispose"));
      this.config.onDispose?.(this);
    }
  };
  _status = /* @__PURE__ */ new WeakMap();
  _llm = /* @__PURE__ */ new WeakMap();
  _abortController = /* @__PURE__ */ new WeakMap();
  _observations = /* @__PURE__ */ new WeakMap();
  _states = /* @__PURE__ */ new WeakMap();
  _PageAgentCore_instances = /* @__PURE__ */ new WeakSet();
  emitStatusChange_fn = /* @__PURE__ */ __name(function() {
    this.dispatchEvent(new Event("statuschange"));
  }, "#emitStatusChange");
  emitHistoryChange_fn = /* @__PURE__ */ __name(function() {
    this.dispatchEvent(new Event("historychange"));
  }, "#emitHistoryChange");
  emitActivity_fn = /* @__PURE__ */ __name(function(activity) {
    this.dispatchEvent(new CustomEvent("activity", { detail: activity }));
  }, "#emitActivity");
  setStatus_fn = /* @__PURE__ */ __name(function(status) {
    if (__privateGet(this, _status) !== status) {
      __privateSet(this, _status, status);
      __privateMethod(this, _PageAgentCore_instances, emitStatusChange_fn).call(this);
    }
  }, "#setStatus");
  packMacroTool_fn = /* @__PURE__ */ __name(function() {
    const tools2 = this.tools;
    const actionSchemas = Array.from(tools2.entries()).map(([toolName, tool2]) => {
      return object({ [toolName]: tool2.inputSchema }).describe(tool2.description);
    });
    const actionSchema = union(actionSchemas);
    const macroToolSchema = object({
      // thinking: z.string().optional(),
      evaluation_previous_goal: string().optional(),
      memory: string().optional(),
      next_goal: string().optional(),
      action: actionSchema
    });
    return {
      description: "You MUST call this tool every step!",
      inputSchema: macroToolSchema,
      execute: /* @__PURE__ */ __name(async (input) => {
        if (__privateGet(this, _abortController).signal.aborted) throw new Error("AbortError");
        console.log(chalk.blue.bold("MacroTool input"), input);
        const action = input.action;
        const toolName = Object.keys(action)[0];
        const toolInput = action[toolName];
        const reflectionLines = [];
        if (input.evaluation_previous_goal)
          reflectionLines.push(`✅: ${input.evaluation_previous_goal}`);
        if (input.memory) reflectionLines.push(`💾: ${input.memory}`);
        if (input.next_goal) reflectionLines.push(`🎯: ${input.next_goal}`);
        const reflectionText = reflectionLines.length > 0 ? reflectionLines.join("\n") : "";
        if (reflectionText) {
          console.log(reflectionText);
        }
        const tool2 = tools2.get(toolName);
        assert(tool2, `Tool ${toolName} not found`);
        console.log(chalk.blue.bold(`Executing tool: ${toolName}`), toolInput);
        __privateMethod(this, _PageAgentCore_instances, emitActivity_fn).call(this, { type: "executing", tool: toolName, input: toolInput });
        const startTime = Date.now();
        const result2 = await tool2.execute.bind(this)(toolInput);
        const duration2 = Date.now() - startTime;
        console.log(chalk.green.bold(`Tool (${toolName}) executed for ${duration2}ms`), result2);
        __privateMethod(this, _PageAgentCore_instances, emitActivity_fn).call(this, {
          type: "executed",
          tool: toolName,
          input: toolInput,
          output: result2,
          duration: duration2
        });
        if (toolName === "wait") {
          __privateGet(this, _states).totalWaitTime += toolInput?.seconds || 0;
        } else {
          __privateGet(this, _states).totalWaitTime = 0;
        }
        return {
          input,
          output: result2
        };
      }, "execute")
    };
  }, "#packMacroTool");
  getSystemPrompt_fn = /* @__PURE__ */ __name(function() {
    if (this.config.customSystemPrompt) {
      return this.config.customSystemPrompt;
    }
    const targetLanguage = this.config.language === "zh-CN" ? "中文" : "English";
    const systemPrompt = SYSTEM_PROMPT$1.replace(
      /Default working language: \*\*.*?\*\*/,
      `Default working language: **${targetLanguage}**`
    );
    return systemPrompt;
  }, "#getSystemPrompt");
  getInstructions_fn = /* @__PURE__ */ __name(async function() {
    const { instructions, experimentalLlmsTxt } = this.config;
    const systemInstructions = instructions?.system?.trim();
    let pageInstructions;
    const url = __privateGet(this, _states).browserState?.url || "";
    if (instructions?.getPageInstructions && url) {
      try {
        pageInstructions = instructions.getPageInstructions(url)?.trim();
      } catch (error) {
        console.error(
          chalk.red("[PageAgent] Failed to execute getPageInstructions callback:"),
          error
        );
      }
    }
    const llmsTxt = experimentalLlmsTxt && url ? await fetchLlmsTxt(url) : void 0;
    if (!systemInstructions && !pageInstructions && !llmsTxt) return "";
    let result2 = "<instructions>\n";
    if (systemInstructions) {
      result2 += `<system_instructions>
${systemInstructions}
</system_instructions>
`;
    }
    if (pageInstructions) {
      result2 += `<page_instructions>
${pageInstructions}
</page_instructions>
`;
    }
    if (llmsTxt) {
      result2 += `<llms_txt>
${llmsTxt}
</llms_txt>
`;
    }
    result2 += "</instructions>\n\n";
    return result2;
  }, "#getInstructions");
  handleObservations_fn = /* @__PURE__ */ __name(async function(step) {
    if (__privateGet(this, _states).totalWaitTime >= 3) {
      this.pushObservation(
        `You have waited ${__privateGet(this, _states).totalWaitTime} seconds accumulatively. DO NOT wait any longer unless you have a good reason.`
      );
    }
    const currentURL = __privateGet(this, _states).browserState?.url || "";
    if (currentURL !== __privateGet(this, _states).lastURL) {
      this.pushObservation(`Page navigated to → ${currentURL}`);
      __privateGet(this, _states).lastURL = currentURL;
      await waitFor(0.5);
    }
    const remaining = this.config.maxSteps - step;
    if (remaining === 5) {
      this.pushObservation(
        `⚠️ Only ${remaining} steps remaining. Consider wrapping up or calling done with partial results.`
      );
    } else if (remaining === 2) {
      this.pushObservation(
        `⚠️ Critical: Only ${remaining} steps left! You must finish the task or call done immediately.`
      );
    }
    if (__privateGet(this, _observations).length > 0) {
      for (const content2 of __privateGet(this, _observations)) {
        this.history.push({ type: "observation", content: content2 });
        console.log(chalk.cyan("Observation:"), content2);
      }
      __privateSet(this, _observations, []);
      __privateMethod(this, _PageAgentCore_instances, emitHistoryChange_fn).call(this);
    }
  }, "#handleObservations");
  assembleUserPrompt_fn = /* @__PURE__ */ __name(async function() {
    const browserState = __privateGet(this, _states).browserState;
    let prompt = "";
    prompt += await __privateMethod(this, _PageAgentCore_instances, getInstructions_fn).call(this);
    const stepCount = this.history.filter((e) => e.type === "step").length;
    prompt += "<agent_state>\n";
    prompt += "<user_request>\n";
    prompt += `${this.task}
`;
    prompt += "</user_request>\n";
    prompt += "<step_info>\n";
    prompt += `Step ${stepCount + 1} of ${this.config.maxSteps} max possible steps
`;
    prompt += `Current time: ${(/* @__PURE__ */ new Date()).toLocaleString()}
`;
    prompt += "</step_info>\n";
    prompt += "</agent_state>\n\n";
    prompt += "<agent_history>\n";
    let stepIndex = 0;
    for (const event of this.history) {
      if (event.type === "step") {
        stepIndex++;
        prompt += `<step_${stepIndex}>
`;
        prompt += `Evaluation of Previous Step: ${event.reflection.evaluation_previous_goal}
`;
        prompt += `Memory: ${event.reflection.memory}
`;
        prompt += `Next Goal: ${event.reflection.next_goal}
`;
        prompt += `Action Results: ${event.action.output}
`;
        prompt += `</step_${stepIndex}>
`;
      } else if (event.type === "observation") {
        prompt += `<sys>${event.content}</sys>
`;
      } else if (event.type === "user_takeover") {
        prompt += `<sys>User took over control and made changes to the page</sys>
`;
      } else if (event.type === "error") ;
    }
    prompt += "</agent_history>\n\n";
    let pageContent = browserState.content;
    if (this.config.transformPageContent) {
      pageContent = await this.config.transformPageContent(pageContent);
    }
    prompt += "<browser_state>\n";
    prompt += browserState.header + "\n";
    prompt += pageContent + "\n";
    prompt += browserState.footer + "\n\n";
    prompt += "</browser_state>\n\n";
    return prompt;
  }, "#assembleUserPrompt");
  onDone_fn = /* @__PURE__ */ __name(function(success = true) {
    this.pageController.cleanUpHighlights();
    this.pageController.hideMask();
    __privateMethod(this, _PageAgentCore_instances, setStatus_fn).call(this, success ? "completed" : "error");
    __privateGet(this, _abortController).abort();
  }, "#onDone");
  __name(_PageAgentCore, "PageAgentCore");
  let PageAgentCore = _PageAgentCore;
  const PREFIX$1 = "[RemotePageController]";
  function debug$1(...messages) {
    console.debug(`\x1B[90m${PREFIX$1}\x1B[0m`, ...messages);
  }
  function sendMessage$1(message) {
    return chrome.runtime.sendMessage(message).catch((error) => {
      console.error(PREFIX$1, message.action, error);
      return null;
    });
  }
  class RemotePageController {
    tabsController;
    constructor(tabsController) {
      this.tabsController = tabsController;
    }
    get currentTabId() {
      return this.tabsController.currentTabId;
    }
    async getCurrentUrl() {
      if (!this.currentTabId) return "";
      const { url } = await this.tabsController.getTabInfo(this.currentTabId);
      return url || "";
    }
    async getCurrentTitle() {
      if (!this.currentTabId) return "";
      const { title } = await this.tabsController.getTabInfo(this.currentTabId);
      return title || "";
    }
    async getLastUpdateTime() {
      if (!this.currentTabId) throw new Error("tabsController not initialized.");
      return sendMessage$1({
        type: "PAGE_CONTROL",
        action: "get_last_update_time",
        targetTabId: this.currentTabId
      });
    }
    async getBrowserState() {
      if (!this.currentTabId) throw new Error("tabsController not initialized.");
      let browserState = {};
      debug$1("getBrowserState", this.currentTabId);
      const currentUrl = await this.getCurrentUrl();
      const currentTitle = await this.getCurrentTitle();
      if (!this.currentTabId || !isContentScriptAllowed(currentUrl)) {
        browserState = {
          url: currentUrl,
          title: currentTitle,
          header: "",
          content: "(empty page. either current page is not readable or not loaded yet.)",
          footer: ""
        };
      } else {
        browserState = await sendMessage$1({
          type: "PAGE_CONTROL",
          action: "get_browser_state",
          targetTabId: this.currentTabId
        });
      }
      const sum = await this.tabsController.summarizeTabs();
      browserState.header = sum + "\n\n" + (browserState.header || "");
      debug$1("getBrowserState: success", this.currentTabId, browserState);
      return browserState;
    }
    async updateTree() {
      if (!this.currentTabId || !isContentScriptAllowed(await this.getCurrentUrl())) {
        return;
      }
      await sendMessage$1({
        type: "PAGE_CONTROL",
        action: "update_tree",
        targetTabId: this.currentTabId
      });
    }
    async cleanUpHighlights() {
      if (!this.currentTabId || !isContentScriptAllowed(await this.getCurrentUrl())) {
        return;
      }
      await sendMessage$1({
        type: "PAGE_CONTROL",
        action: "clean_up_highlights",
        targetTabId: this.currentTabId
      });
    }
    async clickElement(...args) {
      const res = await this.remoteCallDomAction("click_element", args);
      await new Promise((resolve) => setTimeout(resolve, 1e3));
      return res;
    }
    async inputText(...args) {
      return this.remoteCallDomAction("input_text", args);
    }
    async selectOption(...args) {
      return this.remoteCallDomAction("select_option", args);
    }
    async scroll(...args) {
      return this.remoteCallDomAction("scroll", args);
    }
    async scrollHorizontally(...args) {
      return this.remoteCallDomAction("scroll_horizontally", args);
    }
    async executeJavascript(...args) {
      return this.remoteCallDomAction("execute_javascript", args);
    }
    /** @note Managed by content script via storage polling. */
    async showMask() {
    }
    /** @note Managed by content script via storage polling. */
    async hideMask() {
    }
    /** @note Managed by content script via storage polling. */
    dispose() {
    }
    async remoteCallDomAction(action, payload) {
      if (!this.currentTabId) {
        return { success: false, message: "RemotePageController not initialized." };
      }
      if (!isContentScriptAllowed(await this.getCurrentUrl())) {
        return {
          success: false,
          message: "Operation not allowed on this page. Use open_new_tab to navigate to a web page first."
        };
      }
      return sendMessage$1({
        type: "PAGE_CONTROL",
        action,
        targetTabId: this.currentTabId,
        payload
      });
    }
  }
  function isContentScriptAllowed(url) {
    if (!url) return false;
    const restrictedPatterns = [
      /^chrome:\/\//,
      /^chrome-extension:\/\//,
      /^about:/,
      /^edge:\/\//,
      /^brave:\/\//,
      /^opera:\/\//,
      /^vivaldi:\/\//,
      /^file:\/\//,
      /^view-source:/,
      /^devtools:\/\//
    ];
    return !restrictedPatterns.some((pattern) => pattern.test(url));
  }
  const PREFIX = "[TabsController]";
  function debug(...messages) {
    console.debug(`\x1B[90m${PREFIX}\x1B[0m`, ...messages);
  }
  function sendMessage(message) {
    return chrome.runtime.sendMessage(message).catch((error) => {
      console.error(PREFIX, message.action, error);
      return null;
    });
  }
  class TabsController extends EventTarget {
    currentTabId = null;
    tabs = [];
    initialTabId = null;
    tabGroupId = null;
    task = "";
    windowId = null;
    async init(task, includeInitialTab = true) {
      debug("init", task, includeInitialTab);
      this.task = task;
      this.tabs = [];
      this.currentTabId = null;
      this.tabGroupId = null;
      this.initialTabId = null;
      this.windowId = null;
      const result2 = await sendMessage({
        type: "TAB_CONTROL",
        action: "get_active_tab"
      });
      this.initialTabId = result2.tabId;
      if (!this.initialTabId) {
        throw new Error("Failed to get initial tab ID");
      }
      if (includeInitialTab) {
        this.currentTabId = this.initialTabId;
        const info = await sendMessage({
          type: "TAB_CONTROL",
          action: "get_tab_info",
          payload: { tabId: this.initialTabId }
        });
        this.tabs.push({
          id: result2.tabId,
          isInitial: true,
          url: info.url,
          title: info.title,
          status: info.status
        });
      }
      await this.updateCurrentTabId(this.currentTabId);
      const tabChangeHandler = (message) => {
        if (message.type !== "TAB_CHANGE") {
          return;
        }
        if (message.action === "created") {
          const tab = message.payload.tab;
          if (tab.groupId === this.tabGroupId && tab.id != null) {
            if (!this.tabs.find((t) => t.id === tab.id)) {
              this.tabs.push({ id: tab.id, isInitial: false });
            }
            this.switchToTab(tab.id);
          }
        } else if (message.action === "removed") {
          const { tabId } = message.payload;
          const targetTab = this.tabs.find((t) => t.id === tabId);
          if (targetTab) {
            this.tabs = this.tabs.filter((t) => t.id !== tabId);
            if (this.currentTabId === tabId) {
              const newCurrentTab = this.tabs[this.tabs.length - 1] || null;
              if (newCurrentTab) {
                this.switchToTab(newCurrentTab.id);
              } else {
                this.updateCurrentTabId(null);
              }
            }
          }
        } else if (message.action === "updated") {
          const { tabId, tab } = message.payload;
          const targetTab = this.tabs.find((t) => t.id === tabId);
          if (targetTab) {
            targetTab.url = tab.url;
            targetTab.title = tab.title;
            targetTab.status = tab.status;
          }
        }
      };
      chrome.runtime.onMessage.addListener(tabChangeHandler);
      this.addEventListener("dispose", () => {
        chrome.runtime.onMessage.removeListener(tabChangeHandler);
      });
    }
    async openNewTab(url) {
      debug("openNewTab", url);
      const result2 = await sendMessage({
        type: "TAB_CONTROL",
        action: "open_new_tab",
        payload: { url }
      });
      if (!result2.success) {
        throw new Error(`Failed to open new tab: ${result2.error}`);
      }
      const tabId = result2.tabId;
      const windowId = result2.windowId;
      this.windowId = windowId;
      this.tabs.push({
        id: tabId,
        isInitial: false
      });
      await this.switchToTab(tabId);
      if (!this.tabGroupId) {
        const result22 = await sendMessage({
          type: "TAB_CONTROL",
          action: "create_tab_group",
          payload: { tabIds: [tabId], windowId: this.windowId }
        });
        if (!result22.success) {
          throw new Error(`Failed to create tab group: ${result22.error}`);
        }
        const groupId = result22.groupId;
        this.tabGroupId = groupId;
        await sendMessage({
          type: "TAB_CONTROL",
          action: "update_tab_group",
          payload: {
            groupId: this.tabGroupId,
            properties: {
              title: `PageAgent(${this.task})`,
              color: randomColor(),
              collapsed: false
            }
          }
        });
      } else {
        await sendMessage({
          type: "TAB_CONTROL",
          action: "add_tab_to_group",
          payload: { tabId: result2.tabId, groupId: this.tabGroupId }
        });
      }
      await this.waitUntilTabLoaded(tabId);
      return `✅ Opened new tab ID ${tabId} with URL ${url}`;
    }
    async switchToTab(tabId) {
      debug("switchToTab", tabId);
      const targetTab = this.tabs.find((t) => t.id === tabId);
      if (!targetTab) {
        throw new Error(`Tab ID ${tabId} not found in tab list.`);
      }
      await this.updateCurrentTabId(tabId);
      return `✅ Switched to tab ID ${tabId}.`;
    }
    async closeTab(tabId) {
      debug("closeTab", tabId);
      const targetTab = this.tabs.find((t) => t.id === tabId);
      if (!targetTab) {
        throw new Error(`Tab ID ${tabId} not found in tab list.`);
      }
      if (targetTab.isInitial) {
        throw new Error(`Cannot close the initial tab ID ${tabId}.`);
      }
      const result2 = await sendMessage({
        type: "TAB_CONTROL",
        action: "close_tab",
        payload: { tabId }
      });
      if (result2.success) {
        this.tabs = this.tabs.filter((t) => t.id !== tabId);
        if (this.currentTabId === tabId) {
          const newCurrentTab = this.tabs[this.tabs.length - 1] || null;
          if (newCurrentTab) {
            await this.switchToTab(newCurrentTab.id);
          } else {
            await this.updateCurrentTabId(null);
          }
        }
        return `✅ Closed tab ID ${tabId}.`;
      } else {
        throw new Error(`Failed to close tab ID ${tabId}: ${result2.error}`);
      }
    }
    async updateCurrentTabId(tabId) {
      debug("updateCurrentTabId", tabId);
      this.currentTabId = tabId;
      await chrome.storage.local.set({ currentTabId: tabId });
    }
    async getTabInfo(tabId) {
      const tabMeta = this.tabs.find((t) => t.id === tabId);
      if (tabMeta && tabMeta.url && tabMeta.title) {
        return { title: tabMeta.title, url: tabMeta.url };
      }
      debug("getTabInfo: pulling from background script", tabId);
      const result2 = await sendMessage({
        type: "TAB_CONTROL",
        action: "get_tab_info",
        payload: { tabId }
      });
      if (tabMeta) {
        tabMeta.url = result2.url;
        tabMeta.title = result2.title;
      }
      return result2;
    }
    async summarizeTabs() {
      const summaries = [`| Tab ID | URL | Title | Current |`, `|-----|-----|-----|-----|`];
      for (const tab of this.tabs) {
        const { title, url } = await this.getTabInfo(tab.id);
        summaries.push(
          `| ${tab.id} | ${url} | ${title} | ${this.currentTabId === tab.id ? "✅" : ""} |`
        );
      }
      if (!this.tabs.length) {
        summaries.push("\nNo tabs available. Open a tab if needed.");
      }
      return summaries.join("\n");
    }
    async waitUntilTabLoaded(tabId) {
      const tab = this.tabs.find((t) => t.id === tabId);
      if (!tab) throw new Error(`Tab ID ${tabId} not found in tab list.`);
      if (tab.status === "unloaded") throw new Error(`Tab ID ${tabId} is unloaded.`);
      if (tab.status === "complete") return;
      debug("waitUntilTabLoaded", tabId);
      await waitUntil(() => tab.status === "complete", 4e3);
    }
    dispose() {
      this.dispatchEvent(new Event("dispose"));
    }
  }
  const TAB_GROUP_COLORS = [
    "grey",
    "blue",
    "red",
    "yellow",
    "green",
    "pink",
    "purple",
    "cyan"
  ];
  function randomColor() {
    return TAB_GROUP_COLORS[Math.floor(Math.random() * TAB_GROUP_COLORS.length)];
  }
  async function waitUntil(check, timeoutMS = 6e4, error) {
    if (await check()) return true;
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const poll = async () => {
        if (await check()) return resolve(true);
        if (Date.now() - start > timeoutMS) {
          {
            return resolve(false);
          }
        }
        setTimeout(poll, 100);
      };
      setTimeout(poll, 100);
    });
  }
  const SYSTEM_PROMPT = 'You are an AI agent designed to operate in an iterative loop to automate browser tasks. Your ultimate goal is accomplishing the task provided in <user_request>.\n\n<intro>\nYou excel at following tasks:\n1. Navigating complex websites and extracting precise information\n2. Automating form submissions and interactive web actions\n3. Gathering and saving information \n4. Operate effectively in an agent loop\n5. Efficiently performing diverse web tasks\n</intro>\n\n<language_settings>\n- Default working language: **English**\n- Use the language that user is using. Return in user\'s language.\n</language_settings>\n\n<input>\nAt every step, your input will consist of: \n1. <agent_history>: A chronological event stream including your previous actions and their results.\n2. <agent_state>: Current <user_request> and <step_info>.\n3. <browser_state>: Tabs, Current Tab, Current URL, interactive elements indexed for actions, and visible page content.\n</input>\n\n<agent_history>\nAgent history will be given as a list of step information as follows:\n\n<step_{step_number}>:\nEvaluation of Previous Step: Assessment of last action\nMemory: Your memory of this step\nNext Goal: Your goal for this step\nAction Results: Your actions and their results\n</step_{step_number}>\n\nand system messages wrapped in <sys> tag.\n</agent_history>\n\n<user_request>\nUSER REQUEST: This is your ultimate objective and always remains visible.\n- This has the highest priority. Make the user happy.\n- If the user request is very specific - then carefully follow each step and dont skip or hallucinate steps.\n- If the task is open ended you can plan yourself how to get it done.\n</user_request>\n\n<browser_state>\n1. Browser State will be given as:\n\nOpen Tabs: Open tabs with their ids.\nCurrent Tab: The tab you are currently viewing.\nCurrent URL: URL of the page you are currently viewing.\nInteractive Elements: All interactive elements will be provided in format as [index]<type>text</type> where\n- index: Numeric identifier for interaction\n- type: HTML element type (button, input, etc.)\n- text: Element description\n\nExamples:\n[33]<div>User form</div>\n\\t*[35]<button aria-label=\'Submit form\'>Submit</button>\n\nNote that:\n- Only elements with numeric indexes in [] are interactive\n- (stacked) indentation (with \\t) is important and means that the element is a (html) child of the element above (with a lower index)\n- Elements tagged with `*[` are the new clickable elements that appeared on the website since the last step - if url has not changed.\n- Pure text elements without [] are not interactive.\n</browser_state>\n\n<browser_rules>\nStrictly follow these rules while using the browser and navigating the web:\n- Only interact with elements that have a numeric [index] assigned.\n- Only use indexes that are explicitly provided.\n- If the page changes after, for example, an input text action, analyze if you need to interact with new elements, e.g. selecting the right option from the list.\n- By default, only elements in the visible viewport are listed. Use scrolling actions if you suspect relevant content is offscreen which you need to interact with. Scroll ONLY if there are more pixels below or above the page.\n- You can scroll by a specific number of pages using the num_pages parameter (e.g., 0.5 for half page, 2.0 for two pages).\n- All the elements that are scrollable are marked with `data-scrollable` attribute. Including the scrollable distance in every directions. You can scroll *the element* in case some area are overflowed.\n- If a captcha appears, tell user you can not solve captcha. finished the task and ask user to solve it.\n- If expected elements are missing, try scrolling, or navigating back.\n- If the page is not fully loaded, use the `wait` action.\n- Do not repeat one action for more than 3 times unless some conditions changed.\n- If you fill an input field and your action sequence is interrupted, most often something changed e.g. suggestions popped up under the field.\n- If the <user_request> includes specific page information such as product type, rating, price, location, etc., try to apply filters to be more efficient.\n- The <user_request> is the ultimate goal. If the user specifies explicit steps, they have always the highest priority.\n- If you input_text into a field, you might need to press enter, click the search button, or select from dropdown for completion.\n- Don\'t login into a page if you don\'t have to. Don\'t login if you don\'t have the credentials. \n- There are 2 types of tasks always first think which type of request you are dealing with:\n1. Very specific step by step instructions:\n- Follow them as very precise and don\'t skip steps. Try to complete everything as requested.\n2. Open ended tasks. Plan yourself, be creative in achieving them.\n- If you get stuck e.g. with logins or captcha in open-ended tasks you can re-evaluate the task and try alternative ways, e.g. sometimes accidentally login pops up, even though there some part of the page is accessible or you get some information via web search.\n</browser_rules>\n\n<task_completion_rules>\nYou must call the `done` action in one of three cases:\n- When you have fully completed the USER REQUEST.\n- When you reach the final allowed step (`max_steps`), even if the task is incomplete.\n- When you feel stuck or unable to solve user request. Or user request is not clear or contains inappropriate content.\n- When it is ABSOLUTELY IMPOSSIBLE to continue.\n\nThe `done` action is your opportunity to terminate and share your findings with the user.\n- Set `success` to `true` only if the full USER REQUEST has been completed with no missing components.\n- If any part of the request is missing, incomplete, or uncertain, set `success` to `false`.\n- You can use the `text` field of the `done` action to communicate your findings and to provide a coherent reply to the user and fulfill the USER REQUEST.\n- You are ONLY ALLOWED to call `done` as a single action. Don\'t call it together with other actions.\n- If the user asks for specified format, such as "return JSON with following structure", "return a list of format...", MAKE sure to use the right format in your answer.\n- If the user asks for a structured output, your `done` action\'s schema may be modified. Take this schema into account when solving the task!\n</task_completion_rules>\n\n<reasoning_rules>\nExhibit the following reasoning patterns to successfully achieve the <user_request>:\n\n- Reason about <agent_history> to track progress and context toward <user_request>.\n- Analyze the most recent "Next Goal" and "Résultat de laction" in <agent_history> and clearly state what you previously tried to achieve.\n- Analyze all relevant items in <agent_history> and <browser_state> to understand your state.\n- Explicitly judge success/failure/uncertainty of the last action. Never assume an action succeeded just because it appears to be executed in your last step in <agent_history>. If the expected change is missing, mark the last action as failed (or uncertain) and plan a recovery.\n- Analyze whether you are stuck, e.g. when you repeat the same actions multiple times without any progress. Then consider alternative approaches e.g. scrolling for more context or ask user for help.\n- Ask user for help if you have any difficulty. Keep user in the loop.\n- If you see information relevant to <user_request>, plan saving the information to memory.\n- Always reason about the <user_request>. Make sure to carefully analyze the specific steps and information required. E.g. specific filters, specific form fields, specific information to search. Make sure to always compare the current trajectory with the user request and think carefully if thats how the user requested it.\n</reasoning_rules>\n\n<examples>\nHere are examples of good output patterns. Use them as reference but never copy them directly.\n\n<evaluation_examples>\n"evaluation_previous_goal": "Successfully navigated to the product page and found the target information. Verdict: Success"\n"evaluation_previous_goal": "Clicked the login button and user authentication form appeared. Verdict: Success"\n</evaluation_examples>\n\n<memory_examples>\n"memory": "Found many pending reports that need to be analyzed in the main page. Successfully processed the first 2 reports on quarterly sales data and moving on to inventory analysis and customer feedback reports."\n</memory_examples>\n\n<next_goal_examples>\n"next_goal": "Click on the \'Add to Cart\' button to proceed with the purchase flow."\n</next_goal_examples>\n</examples>\n\n<output>\n{\n  "evaluation_previous_goal": "Concise one-sentence analysis of your last action. Clearly state success, failure, or uncertain.",\n  "memory": "1-3 concise sentences of specific memory of this step and overall progress. You should put here everything that will help you track progress in future steps. Like counting pages visited, items found, etc.",\n  "next_goal": "State the next immediate goal and action to achieve it, in one clear sentence.",\n  "action":{\n    "Action name": {// Action parameters}\n  }\n}\n</output>\n';
  function createTabTools(tabsController) {
    return {
      open_new_tab: {
        description: "Open a new browser tab with the specified URL. The new tab becomes the current tab for all subsequent page operations.",
        inputSchema: object({
          url: string().describe("The URL to open in the new tab")
        }),
        execute: async (input) => {
          const { url } = input;
          try {
            return await tabsController.openNewTab(url);
          } catch (error) {
            return `❌ Failed: ${error instanceof Error ? error.message : String(error)}`;
          }
        }
      },
      switch_to_tab: {
        description: "Switch to an existing tab by its ID. After switching, all page operations will target the new current tab. You can only switch to tabs in the tab list shown in browser state.",
        inputSchema: object({
          tab_id: number().int().describe("The tab ID to switch to")
        }),
        execute: async (input) => {
          const { tab_id } = input;
          try {
            return await tabsController.switchToTab(tab_id);
          } catch (error) {
            return `❌ Failed: ${error instanceof Error ? error.message : String(error)}`;
          }
        }
      },
      close_tab: {
        description: "Close a tab by its ID. Cannot close the initial tab. Optionally specify which tab to switch to after closing.",
        inputSchema: object({
          tab_id: number().int().describe("The tab ID to close")
        }),
        execute: async (input) => {
          const { tab_id } = input;
          try {
            return await tabsController.closeTab(tab_id);
          } catch (error) {
            return `❌ Failed: ${error instanceof Error ? error.message : String(error)}`;
          }
        }
      }
    };
  }
  function detectLanguage() {
    const lang = navigator.language || navigator.languages?.[0] || "en-US";
    return lang.startsWith("zh") ? "zh-CN" : "en-US";
  }
  class MultiPageAgent extends PageAgentCore {
    constructor(config2) {
      const tabsController = new TabsController();
      const pageController = new RemotePageController(tabsController);
      const customTools = createTabTools(tabsController);
      const language = config2.language ?? detectLanguage();
      const targetLanguage = language === "zh-CN" ? "中文" : "English";
      const systemPrompt = SYSTEM_PROMPT.replace(
        /Default working language: \*\*.*?\*\*/,
        `Default working language: **${targetLanguage}**`
      );
      const includeInitialTab = config2.includeInitialTab ?? true;
      let heartBeatInterval = null;
      super({
        ...config2,
        pageController,
        customTools,
        customSystemPrompt: systemPrompt,
        onBeforeTask: async (agent) => {
          await tabsController.init(agent.task, includeInitialTab);
          heartBeatInterval = window.setInterval(() => {
            chrome.storage.local.set({
              agentHeartbeat: Date.now()
            });
          }, 1e3);
          await chrome.storage.local.set({
            isAgentRunning: true
          });
        },
        onAfterTask: async () => {
          if (heartBeatInterval) {
            window.clearInterval(heartBeatInterval);
            heartBeatInterval = null;
          }
          await chrome.storage.local.set({
            isAgentRunning: false
          });
        },
        onBeforeStep: async (agent) => {
          await tabsController.waitUntilTabLoaded(tabsController.currentTabId);
        },
        onDispose: () => {
          if (heartBeatInterval) {
            window.clearInterval(heartBeatInterval);
            heartBeatInterval = null;
          }
          chrome.storage.local.set({
            isAgentRunning: false
          });
          tabsController.dispose();
        }
      });
    }
  }
  const MultiPageAgent$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    MultiPageAgent
  }, Symbol.toStringTag, { value: "Module" }));
  return result;
})();
content;