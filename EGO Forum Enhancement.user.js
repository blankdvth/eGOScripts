// ==UserScript==
// @name         EdgeGamers Forum Enhancement
// @namespace    https://github.com/blankdvth/eGOScripts/blob/master/EGO%20Forum%20Enhancement.user.js
// @version      3.1.0
// @description  Add various enhancements & QOL additions to the EdgeGamers Forums that are beneficial for Leadership members.
// @author       blank_dvth, Skle, MSWS
// @match        https://www.edgegamers.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=edgegamers.com
// @require      https://peterolson.github.io/BigInteger.js/BigInteger.min.js
// @require      https://raw.githubusercontent.com/12pt/steamid-converter/master/js/converter-min.js
// @grant        none
// ==/UserScript==

'use strict';
const MAUL_BUTTON_TEXT = "MAUL";

/**
 * Creates a preset button
 * @param {string} text Button text
 * @param {function(HTMLElementEventMap)} callback Function to call on click  
 * @returns {HTMLButtonElement} Button
 */
function createPresetButton(text, callback) {
    var button = document.createElement("span");
    button.classList.add("button");
    button.innerHTML = text;
    button.onclick = callback;
    button.style.marginLeft = "4px";
    button.style.marginTop = "4px";
    return button
}

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
 * Creates a button and adds it to the given div
 * @param {string} href URL that button should link to
 * @param {string} text Buttons' text
 * @param {HTMLDivElement} div Div to add/append to
 * @param {string} target Meta target for button
 * @param {boolean} append True to append, false to insert
 */
function createButton(href, text, div, target = "_blank", append = false) {
    var button = document.createElement("a");
    button.href = href;
    button.target = target;
    button.classList.add('button--link', 'button');

    var button_text = document.createElement("span"); // Create button text
    button_text.classList.add('button-text');
    button_text.innerHTML = text;

    // Add all elements to their respective parents
    button.appendChild(button_text);
    append ? div.appendChild(button, div.lastElementChild) : div.insertBefore(button, div.lastElementChild);
}

/**
 * Adds a MAUL profile button to the given div
 * @param {HTMLDivElement} div Div to add to
 * @param {number} member_id Member's ID
 */
function addMAULProfileButton(div, member_id) { createButton("https://maul.edgegamers.com/index.php?page=home&id=" + member_id, MAUL_BUTTON_TEXT, div); }

/**
 * Adds a "List Bans" button to the div
 * @param {HTMLDivElement} div Div to add to
 * @param {number} steam_id_64 Steam ID to check
 * TODO: Add support for other game IDs
 */
function addBansButton(div, steam_id_64) { createButton("https://maul.edgegamers.com/index.php?page=bans&qType=gameId&q=" + steam_id_64, "List Bans", div); }

/**
 * Adds a "Lookup ID" button to the div
 * @param {HTMLDivElement} div Div to add to
 * @param {number} post_title Steam ID to lookup
 */
function addLookupButton(div, post_title) {
    var steam_id_unknown = post_title.match(/^.* - .* - (?<game_id>[\w\d\/\[\]\-\.:]*)$/);
    if (steam_id_unknown)
        createButton("https://steamid.io/lookup/" + steam_id_unknown.groups.game_id, "Lookup ID", div);
}

/**
 * Adds a Move button to the div {@see handleThreadMovePage}
 * @param {HTMLDivElement} div Div to add to
 * @param {string} url URL to move to
 * @param {string} text Text for the button
 * @param {string} id Movement ID, this is a parameter in the URL that is used to determine where to move in the movement handling page
 */
function addMoveButton(div, url, text = "Move to Completed", id = "to_completed") {
    var post_id = url.match(/threads\/(?<post_id>\d+)/)
    if (post_id)
        createButton("https://www.edgegamers.com/threads/" + post_id.groups.post_id + "/move?move_" + id, text, div, "_self");
}

/**
 * Adds a NAV item to the website's nav bar
 * @param {string} href URL to link to
 * @param {string} text Text for button
 * @param {HTMLElement} nav Nav to add to
 * @returns void
 */
function addNav(href, text, nav) {
    var li = document.createElement("li");
    var div = document.createElement("div");
    var a = document.createElement("a");
    a.href = href;
    a.innerHTML = text;
    a.target = "_blank";
    a.classList.add("p-navEl-link")
    div.classList.add("p-navEl")
    div.appendChild(a);
    li.appendChild(div);
    nav.insertBefore(li, nav.childNodes[nav.childNodes.length - 5]);
}

/**
 * Adds dropdown options for MAUL specifically
 * @param {HTMLElement} nav_list Site's navbar
 * @returns void
 */
function addMAULNav(nav_list) {
    // MAUL DIV
    var maul_div = nav_list.childNodes[11].childNodes[1]
    maul_div.setAttribute('data-has-children', 'true');
    var dropdown = document.createElement("a");

    dropdown.setAttribute('data-xf-key', '3');
    dropdown.setAttribute('data-xf-click', 'menu');
    dropdown.setAttribute('data-menu-pos-ref', '< .p-navEl');
    dropdown.setAttribute('class', 'p-navEl-splitTrigger');
    dropdown.setAttribute('role', 'button');
    dropdown.setAttribute('tabindex', '0');
    dropdown.setAttribute('aria-label', 'Toggle expanded');
    dropdown.setAttribute('aria-expanded', 'false');
    dropdown.setAttribute('aria-haspopup', 'true');

    maul_div.append(dropdown);

    var maul_dropdown = document.createElement("div");
    maul_dropdown.setAttribute('class', 'menu menu--structural');
    maul_dropdown.setAttribute('data-menu', 'menu');
    maul_dropdown.setAttribute('aria-hidden', 'true');

    var dropdownhtml = '<div class="menu-content"> \
    <a href="https://maul.edgegamers.com/index.php?page=bans" target="_blank" class="menu-linkRow u-indentDepth0 js-offCanvasCopy " data-nav-id="maulBans">Bans</a> \
    <a href="https://maul.edgegamers.com/index.php?page=users" target="_blank" class="menu-linkRow u-indentDepth0 js-offCanvasCopy " data-nav-id="newProfilePosts">Users</a> \
    <hr class="menu-separator"> \
    </div>'

    maul_dropdown.innerHTML = dropdownhtml;
    maul_div.append(maul_dropdown);
}

/**
 * Generates large, transparent text (basically a watermark)
 * @param {string} top CSS Top Style
 * @param {string} str Text to display
 */
function generateRedText(top, str = "Confidential") {
    var text = document.createElement("div");
    document.body.appendChild(text);

    text.innerHTML = str;
    text.style.color = "rgba(255,0,0,0.25)";
    text.style.fontSize = "100px";
    text.style.position = "fixed";
    text.style.top = top;
    text.style.left = "50%";
    text.style.transform = "translateX(-50%)"
    text.style.pointerEvents = "none";
    text.style.zIndex = "999";
}

/**
 * Listens to and appends MAUL button when user hovers over a profile
 * @param {HTMLElementEventMap} event 
 * @returns void
 */
function tooltipMAULListener(event) {
    // Make sure this specific event is the node we want
    if (event.target.nodeName != 'DIV' || !event.target.classList.contains('tooltip-content-inner'))
        return;

    // The buttongroup containing the "Follow" button
    var buttenGroupOne = event.target.querySelector('.memberTooltip > .memberTooltip-actions > :nth-child(1)');
    buttenGroupOne.querySelector('a').href.match(/^https:\/\/www\.edgegamers\.com\/members\/(\d+)\/follow$/);
    var matches = buttenGroupOne.querySelector('a').href.match(/^https:\/\/www\.edgegamers\.com\/members\/(\d+)\/follow$/);
    // Make sure matches were found, exit gracefully if not.
    if (!matches)
        return;

    var id = matches[1];
    // The buttongroup containing the "Start conversation" button
    var buttonGroupTwo = event.target.querySelector('.memberTooltip > .memberTooltip-actions > :nth-child(2)');
    // If the user is banned, buttonGroupTwo will be null. Default to buttonGroupOne.
    createButton("https://maul.edgegamers.com/index.php?page=home&id=" + id, MAUL_BUTTON_TEXT, buttonGroupTwo ?? buttenGroupOne, "_blank", true);
}

/**
 * Moves and auto-fills out the moving prompt for a thread.
 * @returns void
 */
function handleThreadMovePage() {
    if (!url.endsWith("?move_to_completed"))
        return;
    var breadcrumbs = document.querySelector(".p-breadcrumbs").textContent.trim().split("\n\n\n\n\n\n");
    breadcrumbs = breadcrumbs[breadcrumbs.length - 2];
    if (breadcrumbs.match(/^(Contest a Ban)|(Report a Player)$/)) { // Ban Contest or Report (Non-Completed)
        const CONTEST_COMPLETED = 1236;
        const REPORT_COMPLETED = 1235;
        var form = document.forms[1];
        var drop = form.querySelector("select.js-nodeList");
        var checkArr = Array.from(form.querySelectorAll(".inputChoices-choice"));
        var optArr = Array.from(drop.options);
        drop.selectedIndex = optArr.indexOf(optArr.find(el => el.value == (breadcrumbs.startsWith("Contest") ? CONTEST_COMPLETED : REPORT_COMPLETED)));
        if (drop.selectedIndex == -1) {
            throw "Could not find Completed forum";
        }
        try { // These buttons may not exist if you created the post yourself, this is just to prevent edge cases.
            checkArr.find(el => el.textContent === "Notify members watching the destination forum").querySelector("label > input").checked = false;
            checkArr.find(el => el.textContent.startsWith("Notify thread starter of this action.")).querySelector("label > input").checked = false;
        } catch { }
        form.submit();
    }
}

/**
 * Checks if a given breadcrumbs string contains LE threads
 * @param {string} str 
 * @returns true if LE, false otherwise
 */
function isLeadership(str) {
    return str.match(/(Leadership|Report a Player|Report Completed)/);
}

/**
 * Adds misc. threads to main thread list
 */
function handleForumsList() {
    var private_category = document.querySelector(".block--category1240 > .block-container > .block-body");

    var subforum = document.createElement("div");
    subforum.classList.add("node", "node--forum", "node--id685");

    var forumHtml = document.createElement('html');
    fetch("https://www.edgegamers.com/forums/685/").then(function(response) {
            response.text().then(function(text) {
                forumHtml.innerHTML = text;
                var thread = forumHtml.querySelector(".js-threadList > :first-child");

                // If the last thread in the bin is unread, mark the forum as unread
                if(thread.classList.contains('is-unread')) {
                    subforum.classList.add("node--unread");
                }
                var userHref = thread.querySelector('.structItem-cell--main > .structItem-minor > .structItem-parts > li > a');
                var threadTitle = thread.querySelector('.structItem-cell--main > .structItem-title > a');
                var date = thread.querySelector('.structItem-cell--latest > a > time');
                var icon = thread.querySelector('.structItem-cell--icon > .structItem-iconContainer > a');

                subforum.innerHTML = '<div class="node-body"> <span class="node-icon" aria-hidden="true"> <i class="fa--xf far fa-comments" aria-hidden="true"></i> </span> <div class="node-main js-nodeMain"> <h3 class="node-title"> <a href="/forums/685/" data-xf-init="element-tooltip" data-shortcut="node-description" id="js-XFUniqueId87">Moderator Trash Bin</a> </h3> <div class="node-description node-description--tooltip js-nodeDescTooltip">Planes, Trains, and Plantains</div> <div class="node-meta"> <div class="node-statsMeta"> <dl class="pairs pairs--inline"> <dt>Threads</dt> <dd>18.2K</dd> </dl> <dl class="pairs pairs--inline"> <dt>Messages</dt> <dd>69.6K</dd> </dl> </div> </div> <div class="node-subNodesFlat"> <span class="node-subNodesLabel">Sub-forums:</span> </div> </div> <div class="node-stats"> <dl class="pairs pairs--rows"> <dt>Threads</dt> <dd>18.1K</dd> </dl> <dl class="pairs pairs--rows"> <dt>Messages</dt> <dd>98.4K</dd> </dl> </div> <div class="node-extra"> <div class="node-extra-icon">' + icon.outerHTML + '</div> <div class="node-extra-row">' + threadTitle.outerHTML + '</div> <div class="node-extra-row"> <ul class="listInline listInline--bullet"> <li> ' + date.outerHTML + '</li> <li class="node-extra-user">' + userHref.outerHTML + '</li> </ul> </div> </div> </div>';
                private_category.appendChild(subforum);
            });
    });
}

/**
 * Handles generic/nonspecific threads
 */
function handleGenericThread() {
    var breadcrumbs = document.querySelector(".p-breadcrumbs").innerText;
    if (breadcrumbs.match(/((Contest (a Ban|Completed))|(Report (a Player|Completed))) ?$/)) { // Ban Contest or Report
        handleBanReport();
    }
    if (isLeadership(breadcrumbs)) // LE Forums
        handleLeadership();
}

/**
 * Adds "View Bans" or "Lookup ID" button on report/contest threads.
 * TODO: Add support for other game IDs
 */
function handleBanReport() {
    var breadcrumbs = document.querySelector(".p-breadcrumbs").innerText;
    var post_title = document.querySelector(".p-title").innerText;
    var button_group = document.querySelector("div.buttonGroup");
    addMAULProfileButton(button_group, document.querySelector(".message-name > a.username").href.substring(35));

    var steam_id = post_title.match(/^.* - .* - ([^\d]*?(?<game_id>(\d+)|(STEAM_\d:\d:\d+)|(\[U:\d:\d+\])).*)$/)
    if (steam_id) {
        var unparsed_id = steam_id.groups.game_id;
        try {
            var steam_id_64 = (SteamIDConverter.isSteamID64(unparsed_id) ? unparsed_id : SteamIDConverter.toSteamID64(unparsed_id));
            addBansButton(button_group, steam_id_64);
        } catch (TypeError) {
            addBansButton(button_group, post_title.split(" - ")[2]);
            addLookupButton(button_group, post_title);
        }
    } else {
        addBansButton(button_group, post_title.split(" - ")[2]);
        addLookupButton(button_group, post_title);
    }

    if (!breadcrumbs.match(/Completed ?$/))
        addMoveButton(button_group, window.location.href);
}

/**
 * Adds "On Hold" templates to the menu and increases the size of the explain box.
 * @param {HTMLElementEventMap} event 
 * @returns void
 */
function handleOnHold(event) {
    if(event.target.nodeName != 'DIV' || !event.target.classList.contains('overlay-container'))
        return;

    // Event may fire twice - add a mark the first time it fires, and ignore the rest
    var mark = document.createElement('input');
    mark.type = 'hidden';
    event.target.append(mark);
    if(event.target.childNodes.length > 2)
        return;

    var body = event.target.querySelector('.overlay > .overlay-content > form > .block-container > .block-body');
    var reason = body.querySelector(':nth-child(1) > dd > input');
    var explain = body.querySelector(':nth-child(2) > dd > input');
    // Convert the explain input into a textarea
    explain.outerHTML = explain.outerHTML.replace('input', 'textarea');
    // Variable gets dereferenced - reference it again
    explain = body.querySelector(':nth-child(2) > dd > textarea');
    explain.style.height = '200px';
    explain.setAttribute('maxlength', '1024');
    var div = body.querySelector(':nth-child(4) > dd > div > .formSubmitRow-controls');

    addPreset("No MAUL account", div, function() {
        reason.value = "MAUL account must be created and verified";
        explain.value = "In order for you to fix this you'll need to click the MAUL link at the top of the page in the navbar, click \"Edit Game IDs,\" \
then click the Sign in through Steam button under the Source ID section. Once you've done so, please reply to this post!"
    })

    addPreset("Steam Verification", div, function() {
        reason.value = "Steam account must be verified in MAUL";
        explain.value = "In order for you to fix this you'll need to click the MAUL link at the top of the page in the navbar, click \"Edit Game IDs,\" \
then click the Sign in through Steam button under the Source ID section. Once you've done so, please reply to this post!"
    })

    addPreset("Minecraft Verification", div, function() {
        reason.value = "Minecraft ID must be verified in MAUL";
        explain.value = "In order for you to fix this you'll need to click the MAUL link at the top of the page in the navbar, click \"Edit Game IDs,\" \
then under ID for Minecraft, input your Minecraft username, click Convert to Game ID, then log onto our Minecraft server. Once you've done so, please reply to this post!"
    })

    addPreset("Battlefield Verification", div, function() {
        reason.value = "Battlefield account must be verified in MAUL";
        explain.value = "In order for you to fix this you'll need to click the MAUL link at the top of the page in the navbar, in MAUL hover over the home link in the top left, \
click help, then follow the instructions for Battlefield. Once you have done so, please reply to this post!";
    })

    addPreset("Discord Verification", div, function() {
        reason.value = "Discord ID must be verfied in MAUL";
        explain.value = "In order for you to fix this you'll need to click the MAUL link at the top of the page in the navbar, click \"Edit Game IDs,\" \
then click the sign in through Discord button under the discord ID section. Once you have done so, please reply to this post!"
    })

    addPreset("Inappropriate Name", div, function() {
        reason.value = "Inappropriate Name";
        explain.value = "As for your name, Please click [URL='https://www.edgegamers.com/account/username']here[/URL] and fill out a name change request. \
After you fill it out, please wait while your name change request is finalized and the change is completed. \
Once it is done your application process will resume. If you want to have an understanding on our naming policy inside of eGO please click [URL='https://www.edgegamers.com/threads/378540/']here[/URL].";
    });
}

/**
 * Adds Confidential banners on top and bottom of page
 */
function handleLeadership() {
    generateRedText("5%");
    generateRedText("80%");
}

/**
 * Changes the target of the application links to open in a new tab
 * @returns void
 */
function handleApplicationPage() {
    document.querySelector('.dataList-row > :nth-child(2)').childNodes[1].setAttribute('target', '_blank');
    document.querySelector('.dataList-row > :nth-child(2)').childNodes[3].setAttribute('target', '_blank');
}

(function () {
    // Determine what page we're on
    var url = window.location.href;

    document.body.addEventListener('DOMNodeInserted', tooltipMAULListener, false);
    document.body.addEventListener('DOMNodeInserted', handleOnHold, false);

    // Add Helpful Links to the Navigation Bar
    var nav_list = document.querySelector(".p-nav-list");
    addMAULNav(nav_list);

    addNav("https://gitlab.edgegamers.io/", "GitLab", nav_list);
    addNav("https://edgegamers.gameme.com/", "GameME", nav_list);

    if (url.match(/^https:\/\/www\.edgegamers\.com\/members\/\d+/))  // Members Page
        addMAULProfileButton(document.querySelector(".memberHeader-buttons"), window.location.pathname.substring(9));

    if (url.match(/^https:\/\/www\.edgegamers\.com\/threads\/\d+\/move(?:\?move_.*)?$/))  // Thread Move Page
        handleThreadMovePage();

    if (url.match(/^https:\/\/www\.edgegamers\.com\/forums\/?$/))  // Forums List
        handleForumsList();

    if (url.match(/^https:\/\/www\.edgegamers\.com\/application\/\d+\/?$/))  // Application Page
        handleApplicationPage();

    handleGenericThread();
})();
