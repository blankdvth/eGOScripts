// ==UserScript==
// @name         GameME Space Render %RELEASE_TYPE%
// @namespace    https://github.com/blankdvth/eGOScripts/blob/master/src/GameME%20Space%20Render.ts
// @downloadURL  %DOWNLOAD_URL%
// @updateURL    %DOWNLOAD_URL%
// @version      2.0.0
// @description  Renders additional whitespace between words in GameME Chat History (and fixes console spam)
// @author       blank_dvth
// @match        http*://*.gameme.com/*chat*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=gameme.com
// @grant        none
// ==/UserScript==

interface Window {
    Tip: () => void;
    UnTip: () => void;
}

// The Global Chat page on GameME calls these two functions non-stop when hovering over messages and spams console. I got annoyed...
window.Tip = function () {};
window.UnTip = function () {};

(function () {
    const style = document.createElement("style");
    if (window.location.href.includes("player_histories")) {
        style.innerHTML = `
            td.t_sc {
                white-space: pre;
            }
        `;
    } else {
        style.innerHTML = `
            td[onmouseover][onmouseout][title] {
                white-space: pre;
            }
        `;
    }
    document.head.appendChild(style);
})();
