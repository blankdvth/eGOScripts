// ==UserScript==
// @name         EdgeGamers MAUL Enhancement
// @namespace    https://gist.github.com/blankdvth/0ab51b9a52dc3b7f5e96082902fd685d
// @version      1.7
// @description  Add various enhancements & QOL additions to the EdgeGamers MAUL page that are beneficial for CS Leadership members.
// @author       blank_dvth, Left
// @match        https://maul.edgegamers.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=edgegamers.com
// @require      https://peterolson.github.io/BigInteger.js/BigInteger.min.js
// @require      https://raw.githubusercontent.com/12pt/steamid-converter/master/js/converter-min.js
// @grant        none
// ==/UserScript==

'use strict';

const USERNAME = ""; // Change this to your own username

function add_preset(name, div, func) {
    div.appendChild(create_preset_button(name, func));
}

function create_preset_div() {
    var div = document.createElement("div");
    var subtitle = document.createElement("h4");
    var child_container = document.getElementById("child_container")
    div.id = "preset_div";
    div.style.display = "flex";
    div.style.flexDirection = "row";
    div.style.paddingLeft = "15px";
    div.style.paddingBottom = "10px";
    subtitle.innerHTML = "Presets";
    subtitle.style.paddingLeft = "15px";
    child_container.insertBefore(div, document.querySelector("form"));
    child_container.insertBefore(subtitle, div)
    return div;
}

function create_preset_button(text, callback) {
    var button = document.createElement("button");
    button.classList.add("btn", "btn-default");
    button.innerHTML = text;
    button.onclick = callback;
    button.style.marginRight = "4px";
    return button
}

function create_link_button(text, link) {
    var a = document.createElement("a");
    a.classList.add("btn", "btn-default");
    a.href = link;
    a.target = "_blank";
    a.innerHTML = text;
    a.style.marginRight = "4px";
    return a;
}

function generate_forums_url(threadId, postId) {
    return `https://edgegamers.com/threads/${threadId}/` + ((postId) ? `#post-${postId}` : "");
}

(function() {
    // Determine what page we're on
    var url = window.location.href;

    if (url.match(/^https:\/\/maul\.edgegamers\.com\/index\.php\?page=editban\/?$/)) { // Add Ban Page (not Edit, that will have &id=12345 in the URL)
        // Preconfigure game related selectors
        document.getElementById("division").selectedIndex = 5;
        document.getElementById("idTypeId").selectedIndex = 6;
        document.getElementById("gameId").disabled = false;

        var div = create_preset_div();

        // Insert presets
        add_preset("Get IP (via Ban)", div, function() {
            document.getElementById("handle").value = "x";
            document.getElementById("length").value = 1;
            document.getElementById("reason").value = "test";
            document.getElementById("notes").value = "ip";
        });
        add_preset("Ban Evasion", div, function() {
            document.getElementById("reason").value = "Ban Evasion";
            var length = document.getElementById("length");
            length.value = 0;
            length.disabled = true;
            document.getElementById("preventAmnesty").checked = true;
        });
        // You can add more presets following the format shown above
    } else if (url.match(/^https:\/\/maul\.edgegamers\.com\/index\.php\?page=editban&id=\d+$/)) { // Edit Ban Page
        var div = create_preset_div();

        // Insert presets
        add_preset("Ban Evasion", div, function() {
            document.getElementById("reason").value = "Ban Evasion";
            var length = document.getElementById("length");
            if (length.value != 0) {
                length.value = 0;
                length.disabled = true;
            }
        });

        // Steam ID buttons
        var id_group = document.querySelector(".control-label[for=gameId]").parentElement;
        var id = id_group.querySelector("p").innerText;
        var id_div = document.createElement("div");
        id_div.style.display = "flex";
        id_div.style.fledDirection = "row";
        id_div.style.paddingTop = "10px";
        id_group.appendChild(id_div);
        id_div.appendChild(create_link_button("Open Steam Profile", "https://steamcommunity.com/profiles/" + id, "_blank"));
        id_div.appendChild(create_link_button("Open in GameME", "https://edgegamers.gameme.com/search?si=uniqueid&rc=all&q=" + SteamIDConverter.toSteamID(id), "_blank"));
        id_div.appendChild(create_link_button("Open in SteamID.io", "https://steamid.io/lookup/" + id, "_blank"));
        id_div.appendChild(create_link_button("Open in SteamID.uk", "https://steamid.uk/profile/" + id, "_blank"));

        // IP buttons
        var ip_group = Array.from(document.querySelectorAll(".control-label")).find(el => el.textContent === "IP").parentElement; // BECAUSE MAUL HAS THE IP LABELED WITH THE WRONG FOR
        var ip = ip_group.querySelector("p").innerText;
        var ip_div = document.createElement("div");
        ip_div.style.display = "flex";
        ip_div.style.fledDirection = "row";
        ip_div.style.paddingTop = "10px";
        ip_group.appendChild(ip_div);
        ip_div.appendChild(create_link_button("Open in Spur", "https://spur.us/context/" + ip, "_blank"));
        ip_div.appendChild(create_link_button("Open in IPInfo", "https://ipinfo.io/" + ip, "_blank"));
    } else if (url.match(/^https:\/\/maul\.edgegamers\.com\/index\.php\?page=home&id=\d+$/)) { // Profile Page
        var userNotes = [...document.querySelectorAll("div.col-xs-6 > div > div:nth-child(3)")];
        userNotes.forEach(userNote => {
            userNote.textContent = userNote.textContent.replaceAll(
                /(?:https?:\/\/)?(?:www\.)?edge-gamers\.com\/forums\/showthread\.php\?p=(\d+)(?:#?post(\d+))?/g,
                function (match, threadId, postId) {
                    return generate_forums_url(threadId, postId);
            });
            userNote.textContent = userNote.textContent.replaceAll(
                /(?:https?:\/\/)?(?:www\.)?edge-gamers\.com\/forums\/showthread\.php\?(\d+)[\-a-zA-Z]*/g,
                function (match, threadId) {
                    return generate_forums_url(threadId, null);
            });
        });
    } else if (url.match(/^https:\/\/maul\.edgegamers\.com\/index\.php\?[-=a-zA-Z0-9&]*page=bans.*$/)) { // List Ban Page
        var banNotes = document.querySelectorAll("span[id*=notes].col-xs-10");
        banNotes.forEach(banNote => {
            // Replace the text with a linkified version
            var replaced = banNote.innerHTML.replaceAll(
                /https?:\/\/(www\.)?[-a-zA-Z0-9.]{1,256}\.[a-zA-Z0-9]{2,6}\b(\/[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/g,
                '<a href="$&" target="_blank">$&</a>'
            );
            // If the text hasn't been changed, move on
            if (replaced === banNote.innerHTML)
                return;
            // Create a hidden div to store the original text
            var hiddenDiv = document.createElement("span");
            hiddenDiv.style.display = "none";
            hiddenDiv.innerHTML = banNote.innerHTML;
            hiddenDiv.id = banNote.id + "_original";
            // Replace the text with a linkified version
            banNote.innerHTML = replaced;
            // Add the hidden div to the DOM
            banNote.parentElement.appendChild(hiddenDiv);
            // Add an event listener to the edit button to restore the original text. The edit notes button takes the text from the span, and we need to avoid having the linkified text in the edit box.
            editNotes = banNote.parentElement.querySelector("span.edit_note_button");
            // We're using mousedown instead of click because the click event fires too late, and the textarea is already populated with the linkified text. The textarea is populated during click/mouseup, so mousedown fires before that.
            function handleEditNotesClick(event) {
                banNote.innerHTML = hiddenDiv.innerHTML;
                event.target.removeEventListener("mousedown", handleEditNotesClick);
                hiddenDiv.remove();
            }
            editNotes.addEventListener("mousedown", handleEditNotesClick);
        });
    }
})();