// ==UserScript==
// @name         EdgeGamers MAUL Enhancement
// @namespace    https://github.com/blankdvth/eGOScripts/blob/master/EGO%20MAUL%20Enhancement.user.js
// @version      2.1.0
// @description  Add various enhancements & QOL additions to the EdgeGamers MAUL page that are beneficial for CS Leadership members.
// @author       blank_dvth, Left, Skle, MSWS
// @match        https://maul.edgegamers.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=edgegamers.com
// @require      https://peterolson.github.io/BigInteger.js/BigInteger.min.js
// @require      https://raw.githubusercontent.com/12pt/steamid-converter/master/js/converter-min.js
// @resource     admins https://raw.githubusercontent.com/blankdvth/eGOScripts/master/admins.txt
// @require      https://openuserjs.org/src/libs/sizzle/GM_config.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_getResourceText
// ==/UserScript==

"use strict";
let knownAdmins = {}; // Known admin list
let USERNAME = ""; // Current username

/**
 * Adds a preset button to the div
 * @param {string} name Name of button
 * @param {HTMLDivElement} div Div to add to
 * @param {function(HTMLElementEventMap)} func Function to call on click
 */
function addPreset(name, div, func) {
    div.appendChild(createPresetButton(name, func));
}

/**
 * Creates a preset div
 * @returns {HTMLDivElement} Div to add presets to
 */
function createPresetDiv() {
    var div = document.createElement("div");
    var subtitle = document.createElement("h4");
    var child_container = document.getElementById("child_container");
    div.id = "preset_div";
    div.style.display = "flex";
    div.style.flexDirection = "row";
    div.style.paddingLeft = "15px";
    div.style.paddingBottom = "10px";
    subtitle.innerHTML = "Presets";
    subtitle.style.paddingLeft = "15px";
    child_container.insertBefore(div, document.querySelector("form"));
    child_container.insertBefore(subtitle, div);
    return div;
}

/**
 * Creates a preset button
 * @param {string} text Button text
 * @param {function(HTMLElementEventMap)} callback Function to call on click
 * @returns {HTMLButtonElement} Button
 */
function createPresetButton(text, callback) {
    var button = document.createElement("button");
    button.classList.add("btn", "btn-default");
    button.innerHTML = text;
    button.onclick = callback;
    button.style.marginRight = "4px";
    return button;
}

/**
 * Creates a link button
 * @param {string} text
 * @param {string} link
 * @returns {HTMLButtonElement} Button
 */
function createLinkButton(text, link) {
    var a = document.createElement("a");
    a.classList.add("btn", "btn-default");
    a.href = link;
    a.target = "_blank";
    a.innerHTML = text;
    a.style.marginRight = "4px";
    return a;
}

/**
 * Generates the proper forum thread link
 * @param {*} threadId Thread ID
 * @param {*} postId Post ID
 * @returns Formatted link
 */
function generateForumsURL(threadId, postId) {
    return (
        `https://edgegamers.com/threads/${threadId}/` +
        (postId ? `#post-${postId}` : "")
    );
}

/**
 * Loads known admins from the admins resource into the knownAdmins dictionary
 */
function loadAdmins() {
    let admins = GM_getResourceText("admins");
    admins.split("\n").forEach((line) => {
        let separator = line.lastIndexOf("|");
        let username = line.substring(0, separator);
        let id = line.substring(separator + 1);
        knownAdmins[username] = id;
    });
}

/**
 * Attempt to retrieve the username of the current logged in user from the navbar
 */
function loadUsername() {
    if (USERNAME) return;
    let dropdown = document.querySelector("a.dropdown-toggle");
    if (dropdown) {
        USERNAME = dropdown.innerText.trim();
    }
}

/**
 * Adds presets for ban reason/duration/notes
 */
function handleAddBan() {
    var div = createPresetDiv();

    // Insert presets
    addPreset("Get IP (via Ban)", div, function () {
        document.getElementById("handle").value = "x";
        document.getElementById("length").value = 1;
        document.getElementById("reason").value = "x";
        document.getElementById("notes").value = "ip";
    });
    addPreset("Ban Evasion", div, function () {
        document.getElementById("reason").value = "Ban Evasion";
        var length = document.getElementById("length");
        length.value = 0;
        length.disabled = true;
    });
    // You can add more presets following the format shown above
}

/**
 * Adds presets for ban evasion, and misc. utility buttons
 */
function handleEditBan() {
    var div = createPresetDiv();

    // Insert presets
    addPreset("Ban Evasion", div, function () {
        document.getElementById("reason").value = "Ban Evasion";
        var length = document.getElementById("length");
        if (length.value != 0) {
            length.value = 0;
            length.disabled = true;
        }
    });

    // Steam ID buttons
    var id_group = document.querySelector(
        ".control-label[for=gameId]"
    ).parentElement;
    var id = id_group.querySelector("p").innerText;
    var id_div = document.createElement("div");
    id_div.style.display = "flex";
    id_div.style.fledDirection = "row";
    id_div.style.paddingTop = "10px";
    id_group.appendChild(id_div);
    id_div.appendChild(
        createLinkButton(
            "Steam",
            "https://steamcommunity.com/profiles/" + id,
            "_blank"
        )
    );
    id_div.appendChild(
        createLinkButton(
            "GameME",
            "https://edgegamers.gameme.com/search?si=uniqueid&rc=all&q=" +
                SteamIDConverter.toSteamID(id),
            "_blank"
        )
    );
    id_div.appendChild(
        createLinkButton(
            "SteamID (IO)",
            "https://steamid.io/lookup/" + id,
            "_blank"
        )
    );
    id_div.appendChild(
        createLinkButton(
            "SteamID (UK)",
            "https://steamid.uk/profile/" + id,
            "_blank"
        )
    );

    // IP buttons
    var ip_group = Array.from(document.querySelectorAll(".control-label")).find(
        (el) => el.textContent === "IP"
    ).parentElement; // BECAUSE MAUL HAS THE IP LABELED WITH THE WRONG FOR
    var ip = ip_group.querySelector("p").innerText;
    var ip_div = document.createElement("div");
    ip_div.style.display = "flex";
    ip_div.style.fledDirection = "row";
    ip_div.style.paddingTop = "10px";
    ip_group.appendChild(ip_div);
    ip_div.appendChild(
        createLinkButton(
            "Check Spur",
            "https://spur.us/context/" + ip,
            "_blank"
        )
    );
    ip_div.appendChild(
        createLinkButton("Check IPInfo", "https://ipinfo.io/" + ip, "_blank")
    );
}

/**
 * Automatically converts old links to updated ones, and adds a GameME link
 */
function handleProfile() {
    var userNotes = [
        ...document.querySelectorAll("div.col-xs-6 > div > div:nth-child(3)"),
    ];
    userNotes.forEach((userNote) => {
        userNote.textContent = userNote.textContent.replaceAll(
            /(?:https?:\/\/)?(?:www\.)?edge-gamers\.com\/forums\/showthread\.php\?p=(\d+)(?:#?post(\d+))?/g,
            function (match, threadId, postId) {
                return generateForumsURL(threadId, postId);
            }
        );
        userNote.textContent = userNote.textContent.replaceAll(
            /(?:https?:\/\/)?(?:www\.)?edge-gamers\.com\/forums\/showthread\.php\?(\d+)[\-a-zA-Z]*/g,
            function (match, threadId) {
                return generateForumsURL(threadId, null);
            }
        );
    });

    // Attempt to get Source ID
    var sourceIdHref = document.querySelector(
        'span.floatRight > a[href^="https://steamcommunity.com/profiles/"]'
    );
    if (sourceIdHref) {
        var id = sourceIdHref.innerText;
        var btn = createLinkButton(
            "GameME",
            "https://edgegamers.gameme.com/search?si=uniqueid&rc=all&q=" +
                SteamIDConverter.toSteamID(id),
            "_blank"
        );
        btn.classList.remove("btn", "btn-primary");
        sourceIdHref.parentElement.insertBefore(btn, sourceIdHref);
    }
}

/**
 * Updates banning admins and ban notes
 */
function handleBanList() {
    convertBanningAdmins();
    updateBanNoteURLs();
}

/**
 * Adds hyperlinks to each admin within a string
 * @param {string} str
 * @returns {string} The string with hyperlinks
 */
function assignAdminsOnlineHyperlink(str) {
    for (let admin of str.split(", ")) {
        let id = knownAdmins[admin];
        if (id == undefined) continue;
        str = str.replace(
            admin,
            `<a href="https://maul.edgegamers.com/index.php?page=home&id=${id}">${admin}</a>`
        );
    }
    return str;
}

/**
 * Adds hyperlinks to the Banning Admins fields
 */
function convertBanningAdmins() {
    if (Object.keys(knownAdmins).length === 0) loadAdmins();
    let headers = document.querySelectorAll(".expand > td > span.pull-left");
    let wasAdminOnline = false;
    for (let header of headers) {
        if (header.innerText === "Admins Online:") {
            wasAdminOnline = true;
            continue;
        } else if (!wasAdminOnline) continue;
        // Last header was Admins Online
        header.innerHTML = assignAdminsOnlineHyperlink(header.innerText);
        wasAdminOnline = false;
    }
}

function updateBanNoteURLs() {
    var banNotes = document.querySelectorAll("span[id*=notes].col-xs-10");
    banNotes.forEach((banNote) => {
        // Replace the text with a linkified version
        var replaced = banNote.innerHTML.replaceAll(
            /https?:\/\/(www\.)?[-a-zA-Z0-9.]{1,256}\.[a-zA-Z0-9]{2,6}\b(\/[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/g,
            '<a href="$&" target="_blank">$&</a>'
        );
        // If the text hasn't been changed, move on
        if (replaced === banNote.innerHTML) return;
        // Store the original text as a data attribute
        banNote.dataset.original = banNote.innerHTML;
        // Replace the text with a linkified version
        banNote.innerHTML = replaced;
        // Add an event listener to the edit button to restore the original text. The edit notes button takes the text from the span, and we need to avoid having the linkified text in the edit box.
        let editNotes = banNote.parentElement.querySelector(
            "span.edit_note_button"
        );
        // We're using mousedown instead of click because the click event fires too late, and the textarea is already populated with the linkified text. The textarea is populated during click/mouseup, so mousedown fires before that.
        function handleEditNotesClick(event) {
            banNote.innerHTML = banNote.dataset.original;
            event.target.removeEventListener("mousedown", handleEditNotesClick);
            delete banNote.dataset.original;
        }
        editNotes.addEventListener("mousedown", handleEditNotesClick);
    });
}

(function () {
    // Initialize the configuration manager
    GM_config.init({
        id: "maul-config",
        title: "MAUL Enhancement Script Configuration",
        fields: {},
    });
    var dropdownMenu = document.querySelector(
        ".user-dropdown > ul.dropdown-menu"
    );
    if (dropdownMenu) {
        var configButton = document.createElement("li");
        configButton.innerHTML = `<a><i class="fa fa-gear"></i> MAUL Enhancement Script Config</a>`;
        configButton.onclick = function () {
            GM_config.open();
        };
        configButton.style.cursor = "pointer";
        dropdownMenu.insertBefore(
            configButton,
            dropdownMenu.querySelector("li.divider")
        );
    }

    // Determine what page we're on
    var url = window.location.href;
    loadUsername();

    if (
        url.match(
            /^https:\/\/maul\.edgegamers\.com\/index\.php\?page=editban\/?$/
        )
    )
        // Add Ban Page (not Edit, that will have &id=12345 in the URL)
        handleAddBan();
    else if (
        url.match(
            /^https:\/\/maul\.edgegamers\.com\/index\.php\?page=editban&id=\d+$/
        )
    )
        // Edit Ban Page
        handleEditBan();
    else if (
        url.match(
            /^https:\/\/maul\.edgegamers\.com\/index\.php\?page=home&id=\d+$/
        )
    )
        // Profile Page
        handleProfile();
    else if (
        url.match(
            /^https:\/\/maul\.edgegamers\.com\/index\.php\?[-=a-zA-Z0-9&]*page=bans.*$/
        )
    )
        // List Ban Page
        handleBanList();
})();
