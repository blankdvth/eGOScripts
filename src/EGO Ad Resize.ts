// ==UserScript==
// @name         EdgeGamers Ad Resize
// @namespace    https://github.com/blankdvth/eGOScripts/blob/master/src/EGO%20Ad%20Resize.ts
// @downloadURL  %DOWNLOAD_URL%
// @updateURL    %DOWNLOAD_URL%
// @version      2.0.0
// @description  Removes whitespace left over from ads on the EdgeGamers website. This is to be used in combination with an adblocker (such as U-Block Origin).
// @author       blank_dvth, Skle, MSWS
// @match        https://www.edgegamers.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=edgegamers.com
// @grant        none
// ==/UserScript==

// An extra line, UglifyJS seems to remove the UserScript comment without it. It removes this line automatically anyhow.
if (false) {
}

(function () {
    // Remove banners
    document
        .querySelectorAll('div[style$="height:90px;"]')
        .forEach((banner) => banner.remove());

    // Remove sidebar
    const mainBody = document.querySelector("div .p-body-main--withSidebar");
    mainBody?.classList.replace("p-body-main--withSidebar", "p-body-main");
    const sideBar = document.querySelector(".p-body-sidebar");
    sideBar?.remove();
    const sideBarCol = document.querySelector(".p-body-sidebarCol");
    sideBarCol?.remove();
})();
