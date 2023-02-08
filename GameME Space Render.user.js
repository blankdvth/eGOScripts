// ==UserScript==
// @name         GameME Space Render
// @namespace    https://github.com/blankdvth/eGOScripts/blob/master/GameME%20Space%20Render.user.js
// @version      1.0.0
// @description  Renders additional whitespace between words in GameME Chat History
// @author       blank_dvth
// @match        https://*.gameme.com/*chat*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=edgegamers.com
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

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
