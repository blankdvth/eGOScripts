// ==UserScript==
// @name         EdgeGamers Forum Enhancement
// @namespace    https://github.com/blankdvth/eGOScripts/blob/master/src/EGO%20Forum%20Enhancement.ts
// @downloadURL  %DOWNLOAD_URL%
// @updateURL    %DOWNLOAD_URL%
// @version      4.0.0
// @description  Add various enhancements & QOL additions to the EdgeGamers Forums that are beneficial for Leadership members.
// @author       blank_dvth, Skle, MSWS
// @match        https://www.edgegamers.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=edgegamers.com
// @require      https://peterolson.github.io/BigInteger.js/BigInteger.min.js
// @require      https://raw.githubusercontent.com/12pt/steamid-converter/master/js/converter-min.js
// @require      https://openuserjs.org/src/libs/sizzle/GM_config.js
// @connect      maul.edgegamers.com
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// ==/UserScript==
/// <reference path="../config_types/index.d.ts" />

// Declare TypeScript types
interface Completed_Map {
    regex: RegExp;
    completedId: string;
}

declare var SteamIDConverter: any;

const completedMap: Completed_Map[] = [];
const signatureBlockList: string[] = [];

/**
 * Creates a preset button
 * @param {string} text Button text
 * @param {function(HTMLElementEventMap)} callback Function to call on click
 * @returns {HTMLSpanElement} Button
 */
function createForumsPresetButton(
    text: string,
    callback: (event: MouseEvent) => void
): HTMLSpanElement {
    const button = document.createElement("span");
    button.classList.add("button");
    button.innerHTML = text;
    button.onclick = callback;
    button.style.marginLeft = "4px";
    button.style.marginTop = "4px";
    return button;
}

/**
 * Adds a preset button to the div
 * @param {string} name Name of button
 * @param {HTMLDivElement} div Div to add to
 * @param {function(HTMLElementEventMap)} func Function to call on click
 */
function addForumsPreset(
    name: string,
    div: HTMLDivElement,
    func: (event: MouseEvent) => void
) {
    div.appendChild(createForumsPresetButton(name, func));
}

/**
 * Creates a button and adds it to the given div
 * @param {string} href URL that button should link to
 * @param {string} text Buttons' text
 * @param {HTMLDivElement} div Div to add/append to
 * @param {string} target Meta target for button
 * @param {boolean} append True to append, false to insert
 */
function createButton(
    href: string,
    text: string,
    div: HTMLDivElement,
    target: string = "_blank",
    append: boolean = false
) {
    const button = document.createElement("a");
    button.href = href;
    button.target = target;
    button.classList.add("button--link", "button");

    const button_text = document.createElement("span"); // Create button text
    button_text.classList.add("button-text");
    button_text.innerHTML = text;

    // Add all elements to their respective parents
    button.appendChild(button_text);
    append
        ? div.appendChild(button)
        : div.insertBefore(button, div.lastElementChild);
}

/**
 * Setup the configuration manager and create an event to find and add a button to open it
 */
function setupForumsConfig() {
    // Initialize the configuration manager
    GM_config.init({
        id: "forums-config",
        title: "Forums Enhancement Script Configuration",
        fields: {
            "maul-dropdown": {
                label: "Use dropdown for MAUL links",
                section: ["Feature Settings"],
                title: "When checked, all additional MAUL links will be in a dropdown in the original MAUL button. When unchecked, all MAUL buttons will be added to the navigation bar after the MAUL button.",
                type: "checkbox",
                default: true,
            },
            "confidential-reports": {
                label: "Show confidential watermark on reports",
                title: "When checked, reports will have a red confidential watermark on them.",
                type: "checkbox",
                default: true,
            },
            "show-list-bans-unknown": {
                label: "Show List Bans for Unknown Steam IDs",
                title: "Whether to show the List Bans button alongside Lookup ID if the Steam ID is in an unknown format.",
                type: "checkbox",
                default: true,
            },
            "confirm-trash": {
                label: "Confirm Trash",
                title: "Whether to show a confirmation dialog when clicking the trash button.",
                type: "checkbox",
                default: true,
            },
            "maul-button-text": {
                label: "MAUL Button Text",
                title: "The text to display on the MAUL buttons that are displayed on profiles",
                type: "text",
                default: "MAUL",
            },
            "maul-reauth-enable": {
                label: "Enable MAUL Reauthenthication",
                title: "When checked, the script will automatically reauthenthicate with MAUL in the background if it's been a while since the last authenthication (see timeout below).",
                type: "checkbox",
                default: true,
            },
            "maul-reauth": {
                label: "MAUL Reauthenthication Timeout",
                title: "The minimum duration to wait before automatically reauthenthicating MAUL in the background (in milliseconds).",
                type: "int",
                default: 1800000, // half an hour
                min: 300000, // 5 minutes, we don't want to spam the server
            },
            "move-to-completed-unchecked": {
                label: "Completed Forums Map",
                section: [
                    "Move to Completed",
                    'One map (forum -> completed) per line, use the format "regex;completed id". The ID is usually present in the URL bar when viewing that subforum list (/forums/ID here). For example: "Contest a Ban;1236".<br>Note: This will not apply until the page is refreshed (your updated maps also won\'t show if you reopen the config popup until you refresh).',
                ],
                type: "textarea",
                save: false,
                default:
                    "Contest a Ban ?$;1236\nReport a Player ?$;1235\nContact Leadership ?$;853",
            },
            "move-to-completed": {
                type: "hidden",
                default:
                    "Contest a Ban ?$;1236\nReport a Player ?$;1235\nContact Leadership ?$;853",
            },
            "signature-block-unchecked": {
                label: "Signature Block List",
                section: [
                    "Signature Block List",
                    "List of User IDs whose signatures will be blocked from loading automatically, separated by newlines.",
                ],
                type: "textarea",
                save: false,
                default: "",
            },
            "signature-block": {
                type: "hidden",
                default: "",
            },
        },
        events: {
            init: function () {
                GM_config.set(
                    "move-to-completed-unchecked",
                    GM_config.get("move-to-completed")
                );
                GM_config.set(
                    "signature-block-unchecked",
                    GM_config.get("signature-block")
                );
            },
            open: function (doc) {
                GM_config.fields[
                    "move-to-completed-unchecked"
                ].node?.addEventListener(
                    "change",
                    function () {
                        const maps = GM_config.get(
                            "move-to-completed-unchecked",
                            true
                        ) as string;
                        if (
                            maps
                                .split(/\r?\n/)
                                .every((map) => map.match(/^[^;\r\n]+;\d+$/))
                        )
                            GM_config.set("move-to-completed", maps);
                    },
                    false
                );
                GM_config.fields[
                    "signature-block-unchecked"
                ].node?.addEventListener("change", function () {
                    const ids = GM_config.get(
                        "signature-block-unchecked",
                        true
                    ) as string;
                    if (ids.split(/\r?\n/).every((id) => id.match(/^\d+$/)))
                        GM_config.set("signature-block", ids);
                });
            },
            save: function (forgotten) {
                if (
                    forgotten["move-to-completed-unchecked"] !==
                    GM_config.get("move-to-completed")
                )
                    alert(
                        'Invalid move to completed map, verify that all lines are in the format "regex:id".'
                    );
                if (
                    forgotten["signature-block-unchecked"] !==
                    GM_config.get("signature-block")
                )
                    alert(
                        "Invalid signature block ID list. Ensure each ID is on it's own line and all IDs are numerical."
                    );
            },
        },
        css: "textarea {width: 100%; height: 160px; resize: vertical;}",
    });

    const profileMenu = document.querySelector("div.js-visitorMenuBody");
    if (profileMenu)
        profileMenu.addEventListener(
            "DOMNodeInserted",
            handleProfileDropdown,
            false
        );
}

/**
 * Automatically authenthicates with MAUL in the background if it's been a while since the last authenthication
 */
function autoMAULAuth() {
    if (!GM_config.get("maul-reauth-enable")) return;
    const lastAuth = GM_getValue("lastMAULAuth", 0);
    if (Date.now() - lastAuth < (GM_config.get("maul-reauth") as number))
        return;
    const authLink = document.querySelector(
        'a.p-navEl-link[href^="/maul"]'
    ) as HTMLAnchorElement;
    if (!authLink) return;
    GM_xmlhttpRequest({
        method: "GET",
        url: authLink.href,
        onload: function () {
            GM_setValue("lastMAULAuth", Date.now());
        },
    });
}

/**
 * Loads completed threads map from config
 */
function loadCompletedMap() {
    const completedMapRaw = GM_config.get("move-to-completed") as string;
    completedMapRaw.split(/\r?\n/).forEach((map) => {
        const parts = map.split(";");
        if (parts.length != 2) {
            alert("Invalid map: " + map);
            return;
        }
        completedMap.push({
            regex: new RegExp(parts[0]),
            completedId: parts[1],
        });
    });
}

/**
 * Loads the signature block list IDs from config
 */
function loadSignatureBlockList() {
    const signatureBlockListRaw = GM_config.get("signature-block") as string;
    signatureBlockListRaw.split(/\r?\n/).forEach((id) => {
        signatureBlockList.push(id);
    });
}

/**
 * Adds a MAUL profile button to the given div
 * @param {HTMLDivElement} div Div to add to
 * @param {number} member_id Member's ID
 */
function addMAULProfileButton(div: HTMLDivElement, member_id: number | string) {
    createButton(
        "https://maul.edgegamers.com/index.php?page=home&id=" + member_id,
        GM_config.get("maul-button-text") as string,
        div
    );
}

/**
 * Adds a "List Bans" button to the div
 * @param {HTMLDivElement} div Div to add to
 * @param {number} steam_id_64 Steam ID to check
 * TODO: Add support for other game IDs
 */
function addBansButton(div: HTMLDivElement, steam_id_64: number) {
    createButton(
        "https://maul.edgegamers.com/index.php?page=bans&qType=gameId&q=" +
            steam_id_64,
        "List Bans",
        div
    );
}

/**
 * Adds a "Lookup ID" button to the div
 * @param {HTMLDivElement} div Div to add to
 * @param {string} post_title Title of the post
 */
function addLookupButton(div: HTMLDivElement, post_title: string) {
    const steam_id_unknown = post_title.match(
        /^.* - .* - (?<game_id>[\w\d\/\[\]\-\.:]*)$/
    );
    if (steam_id_unknown)
        createButton(
            "https://steamid.io/lookup/" + steam_id_unknown.groups!.game_id,
            "Lookup ID",
            div
        );
}

/**
 * Adds a Move button to the div {@see handleThreadMovePage}
 * @param {HTMLDivElement} div Div to add to
 * @param {string} url URL to move to
 * @param {string} text Text for the button
 * @param {string} id Movement ID, this is a parameter in the URL that is used to determine where to move in the movement handling page
 */
function addMoveButton(
    div: HTMLDivElement,
    url: string,
    text = "Move to Completed",
    id = "to_completed"
) {
    const post_id = url.match(/threads\/(?<post_id>\d+)/);
    if (post_id)
        createButton(
            "https://www.edgegamers.com/threads/" +
                post_id.groups!.post_id +
                "/move?move_" +
                id,
            text,
            div,
            "_self"
        );
}

/**
 * Adds a button to move a thread to the trash, with a confirmation dialog (if enabled)
 * @param {HTMLDivElement} before Element to add button before
 */
function addTrashButton(before: HTMLDivElement) {
    const trashButton = document.createElement("a");
    const post_id = window.location.href.match(/threads\/(?<post_id>\d+)/);
    if (!post_id) return;
    trashButton.innerHTML = "Trash thread";
    trashButton.style.cursor = "pointer";
    trashButton.onclick = function () {
        if (!GM_config.get("confirm-trash") || confirm("Trash this thread?"))
            window.location.href =
                "https://www.edgegamers.com/threads/" +
                post_id!.groups!.post_id +
                "/move?move_685";
    };
    trashButton.classList.add("menu-linkRow");
    before.parentElement?.insertBefore(trashButton, before);
}

/**
 * Adds a NAV item to the website's nav bar
 * @param {string} href URL to link to
 * @param {string} text Text for button
 * @param {HTMLElement} nav Nav to add to
 * @returns void
 */
function addNav(href: string, text: string, nav: HTMLElement) {
    const li = document.createElement("li");
    const div = document.createElement("div");
    const a = document.createElement("a");
    a.href = href;
    a.innerHTML = text;
    a.target = "_blank";
    a.classList.add("p-navEl-link");
    div.classList.add("p-navEl");
    div.appendChild(a);
    li.appendChild(div);
    nav.insertBefore(li, nav.childNodes[nav.childNodes.length - 5]);
}

/**
 * Adds dropdown options for MAUL specifically
 * @param {HTMLElement} nav_list Site's navbar
 * @returns void
 */
function addMAULNav(nav_list: HTMLUListElement) {
    if (GM_config.get("maul-dropdown")) {
        // MAUL DIV
        const maul_div = nav_list.childNodes[11].childNodes[1] as HTMLElement;
        maul_div.setAttribute("data-has-children", "true");
        const dropdown = document.createElement("a");

        dropdown.setAttribute("data-xf-key", "3");
        dropdown.setAttribute("data-xf-click", "menu");
        dropdown.setAttribute("data-menu-pos-ref", "< .p-navEl");
        dropdown.setAttribute("class", "p-navEl-splitTrigger");
        dropdown.setAttribute("role", "button");
        dropdown.setAttribute("tabindex", "0");
        dropdown.setAttribute("aria-label", "Toggle expanded");
        dropdown.setAttribute("aria-expanded", "false");
        dropdown.setAttribute("aria-haspopup", "true");

        maul_div.append(dropdown);

        const maul_dropdown = document.createElement("div");
        maul_dropdown.setAttribute("class", "menu menu--structural");
        maul_dropdown.setAttribute("data-menu", "menu");
        maul_dropdown.setAttribute("aria-hidden", "true");

        const dropdownhtml =
            '<div class="menu-content"> \
        <a href="https://maul.edgegamers.com/index.php?page=bans" target="_blank" class="menu-linkRow u-indentDepth0 js-offCanvasCopy " data-nav-id="maulBans">Bans</a> \
        <a href="https://maul.edgegamers.com/index.php?page=users" target="_blank" class="menu-linkRow u-indentDepth0 js-offCanvasCopy " data-nav-id="newProfilePosts">Users</a> \
        <hr class="menu-separator"> \
        </div>';

        maul_dropdown.innerHTML = dropdownhtml;
        maul_div.append(maul_dropdown);
    } else {
        addNav(
            "https://maul.edgegamers.com/index.php?page=bans",
            "Bans",
            nav_list
        );
        addNav(
            "https://maul.edgegamers.com/index.php?page=users",
            "Users",
            nav_list
        );
    }
}

/**
 * Generates large, transparent text (basically a watermark)
 * @param {string} top CSS Top Style
 * @param {string} str Text to display
 */
function generateRedText(top: string, str: string = "Confidential") {
    const text = document.createElement("div");
    document.body.appendChild(text);

    text.innerHTML = str;
    text.style.color = "rgba(255,0,0,0.25)";
    text.style.fontSize = "100px";
    text.style.position = "fixed";
    text.style.top = top;
    text.style.left = "50%";
    text.style.transform = "translateX(-50%)";
    text.style.pointerEvents = "none";
    text.style.zIndex = "999";
}

/**
 * Listens to and appends MAUL button when user hovers over a profile
 * @param {HTMLElementEventMap} event
 * @returns void
 */
function tooltipMAULListener(event: Event) {
    // Make sure this specific event is the node we want
    if (event.target == null) return;
    const target = event.target as HTMLElement;
    if (
        target.nodeName != "DIV" ||
        !target.classList.contains("tooltip-content-inner")
    )
        return;

    // The buttongroup containing the "Follow" button
    const buttenGroupOne = target.querySelector(
        ".memberTooltip > .memberTooltip-actions > :nth-child(1)"
    ) as HTMLDivElement;
    buttenGroupOne
        .querySelector("a")
        ?.href.match(
            /^https:\/\/www\.edgegamers\.com\/members\/(\d+)\/follow$/
        );
    const matches = buttenGroupOne
        .querySelector("a")
        ?.href.match(
            /^https:\/\/www\.edgegamers\.com\/members\/(\d+)\/follow$/
        );
    // Make sure matches were found, exit gracefully if not.
    if (!matches) return;

    const id = matches[1];
    // The buttongroup containing the "Start conversation" button
    const buttonGroupTwo = target.querySelector(
        ".memberTooltip > .memberTooltip-actions > :nth-child(2)"
    ) as HTMLDivElement;
    // If the user is banned, buttonGroupTwo will be null. Default to buttonGroupOne.
    createButton(
        "https://maul.edgegamers.com/index.php?page=home&id=" + id,
        GM_config.get("maul-button-text") as string,
        buttonGroupTwo ?? buttenGroupOne,
        "_blank",
        true
    );
}

/**
 * Moves and auto-fills out the moving prompt for a thread.
 * @param {string} url URL of the page
 * @returns void
 */
function handleThreadMovePage(url: string) {
    const completedId = url.match(/\?move_(\d+)$/);
    if (!completedId) return;
    const form = document.forms[1];
    const drop = form.querySelector("select.js-nodeList") as HTMLSelectElement;
    const checkArr = Array.from(form.querySelectorAll(".inputChoices-choice"));
    const optArr = Array.from(drop.options);
    drop.selectedIndex = optArr.indexOf(
        optArr.find((el) => el.value == completedId![1]) as HTMLOptionElement
    );
    if (drop.selectedIndex == -1) {
        throw "Could not find Completed forum";
    }
    try {
        // These buttons may not exist if you created the post yourself, this is just to prevent edge cases.
        (
            checkArr
                .find(
                    (el) =>
                        el.textContent ===
                        "Notify members watching the destination forum"
                )
                ?.querySelector("label > input") as HTMLInputElement
        ).checked = false;
        (
            checkArr
                .find((el) =>
                    el.textContent?.startsWith(
                        "Notify thread starter of this action."
                    )
                )
                ?.querySelector("label > input") as HTMLInputElement
        ).checked = false;
    } catch {}
    form.submit();
}

/**
 * Checks if a given breadcrumbs string contains LE threads
 * @param {string} str
 * @returns true if LE, false otherwise
 */
function isLeadership(str: string) {
    return GM_config.get("confidential-reports")
        ? str.match(/(Leadership|Report a Player|Report Completed)/)
        : str.match(/Leadership/);
}

/**
 * Adds misc. threads to main thread list
 */
function handleForumsList() {
    const private_category = document.querySelector(
        ".block--category1240 > .block-container > .block-body"
    );

    const subforum = document.createElement("div");
    subforum.classList.add("node", "node--forum", "node--id685");

    const forumHtml = document.createElement("html");
    fetch("https://www.edgegamers.com/forums/685/").then(function (response) {
        response.text().then(function (text) {
            forumHtml.innerHTML = text;
            const thread = forumHtml.querySelector(
                ".js-threadList > :first-child"
            );

            // If the last thread in the bin is unread, mark the forum as unread
            if (thread?.classList.contains("is-unread")) {
                subforum.classList.add("node--unread");
            }
            const userHref = thread?.querySelector(
                ".structItem-cell--main > .structItem-minor > .structItem-parts > li > a"
            )?.outerHTML;
            const threadTitle = thread?.querySelector(
                ".structItem-cell--main > .structItem-title"
            )?.innerHTML; // Queryselector gets the parent and var references all children in case of prefixes
            const date = thread?.querySelector(
                ".structItem-cell--latest > a > time"
            )?.outerHTML;
            const icon = thread?.querySelector(
                ".structItem-cell--icon > .structItem-iconContainer > a"
            )?.outerHTML;

            subforum.innerHTML =
                '<div class="node-body"> <span class="node-icon" aria-hidden="true"> <i class="fa--xf far fa-comments" aria-hidden="true"></i> </span> <div class="node-main js-nodeMain"> <h3 class="node-title"> <a href="/forums/685/" data-xf-init="element-tooltip" data-shortcut="node-description" id="js-XFUniqueId87">Moderator Trash Bin</a> </h3> <div class="node-description node-description--tooltip js-nodeDescTooltip">Planes, Trains, and Plantains</div> <div class="node-meta"> <div class="node-statsMeta"> <dl class="pairs pairs--inline"> <dt>Threads</dt> <dd>18.2K</dd> </dl> <dl class="pairs pairs--inline"> <dt>Messages</dt> <dd>69.6K</dd> </dl> </div> </div> <div class="node-subNodesFlat"> <span class="node-subNodesLabel">Sub-forums:</span> </div> </div> <div class="node-stats"> <dl class="pairs pairs--rows"> <dt>Threads</dt> <dd>18.1K</dd> </dl> <dl class="pairs pairs--rows"> <dt>Messages</dt> <dd>98.4K</dd> </dl> </div> <div class="node-extra"> <div class="node-extra-icon">' +
                icon +
                '</div> <div class="node-extra-row">' +
                threadTitle +
                '</div> <div class="node-extra-row"> <ul class="listInline listInline--bullet"> <li> ' +
                date +
                '</li> <li class="node-extra-user">' +
                userHref +
                "</li> </ul> </div> </div> </div>";
            private_category?.appendChild(subforum);
        });
    });
}

/**
 * Handles generic/nonspecific threads
 */
function handleGenericThread() {
    const breadcrumbs = (
        document.querySelector(".p-breadcrumbs") as HTMLUListElement
    ).innerText;
    if (
        breadcrumbs.match(
            /((Contest (a Ban|Completed))|(Report (a Player|Completed))) ?$/
        )
    ) {
        // Ban Contest or Report
        handleBanReportContest();
    }
    if (isLeadership(breadcrumbs))
        // LE Forums
        handleLeadership();

    const button_group = document.querySelector("div.buttonGroup");
    for (var i = 0; i < completedMap.length; i++) {
        if (breadcrumbs.match(completedMap[i].regex)) {
            addMoveButton(
                button_group as HTMLDivElement,
                window.location.href,
                "Move to Completed",
                completedMap[i].completedId
            );
            break;
        }
    }

    if (!breadcrumbs.match(/Moderator Trash Bin ?$/))
        addTrashButton(
            button_group?.querySelector(
                "div.menu > div.menu-content > a[href$=move]"
            ) as HTMLDivElement
        );

    blockSignatures();
}

/**
 * Adds "View Bans" or "Lookup ID" button on report/contest threads.
 * TODO: Add support for other game IDs
 */
function handleBanReportContest() {
    const post_title = (document.querySelector(".p-title") as HTMLDivElement)
        .innerText;
    const button_group = document.querySelector(
        "div.buttonGroup"
    ) as HTMLDivElement;
    addMAULProfileButton(
        button_group,
        (
            document.querySelector(
                ".message-name > a.username"
            ) as HTMLAnchorElement
        ).href.substring(35)
    );

    const steam_id = post_title.match(
        /^.* - .* - ([^\d]*?(?<game_id>(\d+)|(STEAM_\d:\d:\d+)|(\[U:\d:\d+\])).*)$/
    );
    if (steam_id) {
        const unparsed_id = steam_id.groups!.game_id;
        try {
            const steam_id_64 = SteamIDConverter.isSteamID64(unparsed_id)
                ? unparsed_id
                : SteamIDConverter.toSteamID64(unparsed_id);
            addBansButton(button_group, steam_id_64);
        } catch (TypeError) {
            if (GM_config.get("show-list-bans-unknown"))
                addBansButton(
                    button_group,
                    post_title.split(" - ")[2] as unknown as number
                );
            addLookupButton(button_group, post_title);
        }
    } else {
        if (GM_config.get("show-list-bans-unknown"))
            addBansButton(
                button_group,
                post_title.split(" - ")[2] as unknown as number
            );
        addLookupButton(button_group, post_title);
    }
}

/**
 * Adds "On Hold" templates to the menu and increases the size of the explain box.
 * @param {HTMLElementEventMap} event
 * @returns void
 */
function handleOnHold(event: Event) {
    if (event.target == null) return;
    const target = event.target as HTMLElement;
    if (
        target.nodeName != "DIV" ||
        !target.classList.contains("overlay-container") ||
        !(
            target.querySelector(".overlay > .overlay-title") as HTMLDivElement
        ).innerText.includes("on hold")
    )
        return;

    // Event may fire twice - add a mark the first time it fires, and ignore the rest
    const mark = document.createElement("input");
    mark.type = "hidden";
    target.append(mark);
    if (target.childNodes.length > 2) return;

    const body = target.querySelector(
        ".overlay > .overlay-content > form > .block-container > .block-body"
    ) as HTMLDivElement;
    const reason = body.querySelector(
        ":nth-child(1) > dd > input"
    ) as HTMLInputElement;
    var explain = body.querySelector(
        ":nth-child(2) > dd > input"
    ) as HTMLInputElement;
    // Convert the explain input into a textarea
    explain.outerHTML = explain.outerHTML.replace("input", "textarea");
    // Variable gets dereferenced - reference it again
    explain = body.querySelector(":nth-child(2) > dd > textarea")!;
    explain.style.height = "200px";
    explain.setAttribute("maxlength", "1024");
    const div = body.querySelector(
        ":nth-child(4) > dd > div > .formSubmitRow-controls"
    ) as HTMLDivElement;

    addForumsPreset("No MAUL Account", div, function () {
        reason.value = "MAUL account must be created and verified";
        explain.value =
            "In order for you to fix this you'll need to click the MAUL link at the top of the page in the navbar, click \"Edit Game IDs,\" \
then click the Sign in through Steam button under the Source ID section. Once you've done so, please reply to this post!";
    });

    addForumsPreset("Steam Verification", div, function () {
        reason.value = "Steam account must be verified in MAUL";
        explain.value =
            "In order for you to fix this you'll need to click the MAUL link at the top of the page in the navbar, click \"Edit Game IDs,\" \
then click the Sign in through Steam button under the Source ID section. Once you've done so, please reply to this post!";
    });

    addForumsPreset("Minecraft Verification", div, function () {
        reason.value = "Minecraft ID must be verified in MAUL";
        explain.value =
            "In order for you to fix this you'll need to click the MAUL link at the top of the page in the navbar, click \"Edit Game IDs,\" \
then under ID for Minecraft, input your Minecraft username, click Convert to Game ID, then log onto our Minecraft server. Once you've done so, please reply to this post!";
    });

    addForumsPreset("Battlefield Verification", div, function () {
        reason.value = "Battlefield account must be verified in MAUL";
        explain.value =
            "In order for you to fix this you'll need to click the MAUL link at the top of the page in the navbar, in MAUL hover over the home link in the top left, \
click help, then follow the instructions for Battlefield. Once you have done so, please reply to this post!";
    });

    addForumsPreset("Discord Verification", div, function () {
        reason.value = "Discord ID must be verfied in MAUL";
        explain.value =
            'In order for you to fix this you\'ll need to click the MAUL link at the top of the page in the navbar, click "Edit Game IDs," \
then click the sign in through Discord button under the discord ID section. Once you have done so, please reply to this post!';
    });

    addForumsPreset("Inappropriate Name", div, function () {
        reason.value = "Inappropriate Name";
        explain.value =
            "As for your name, Please click [URL='https://www.edgegamers.com/account/username']here[/URL] and fill out a name change request. \
After you fill it out, please wait while your name change request is finalized and the change is completed. \
Once it is done your application process will resume. If you want to have an understanding on our naming policy inside of eGO please click [URL='https://www.edgegamers.com/threads/378540/']here[/URL].";
    });
}

/**
 * Adds a button to open the script config in the user dropdown menu
 * @param {HTMLElementEventMap} event
 * @returns void
 */
function handleProfileDropdown(event: Event) {
    if (event.target == null) return;
    const target = event.target as HTMLElement;
    if (target.nodeName != "UL" || !target.classList.contains("tabPanes"))
        return;
    const btn = document.createElement("a");
    btn.classList.add("menu-linkRow");
    btn.innerHTML = "Forum Enhancement Script Config";
    btn.style.cursor = "pointer";
    btn.onclick = function () {
        GM_config.open();
    };
    target
        .querySelector("li.is-active")
        ?.insertBefore(
            btn,
            target.querySelector("li.is-active > a.menu-linkRow")
        );
}

/**
 * Adds Confidential banners on top and bottom of page
 * @returns void
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
    const children = (
        document.querySelector(
            ".dataList-row > .dataList-cell > a"
        ) as HTMLAnchorElement
    ).parentElement?.children;
    if (!children) return;
    Array.from(children).forEach(function (button) {
        button.setAttribute("target", "_blank");
    });
}

/**
 * Adds a "Find Issue Reason" button on the user awards page
 * @returns void
 */
function handleUserAwardPage() {
    if (document.querySelector("div.contentRow-snippet")) return; // This is our own award page, don't add the button
    const username = (
        document.querySelector(".p-title-value") as HTMLHeadingElement
    ).textContent?.match(/^(.*)'s Awards$/)![1];
    const blocks = document.querySelector(".blocks") as HTMLDivElement;
    Array.from(blocks.children).forEach(function (block) {
        const awardContainer = block.querySelector(
            "div > .userAwardsContainer"
        ) as HTMLOListElement;
        Array.from(awardContainer.children).forEach(function (award) {
            const contentDiv = award.querySelector("div") as HTMLDivElement;
            if (contentDiv.classList.contains("showAsDeleted")) {
                return;
            }

            const awardImageClasses = contentDiv.querySelector(
                ".contentRow-figure > span > img"
            )?.classList[1];
            const awardId = awardImageClasses?.substring(
                awardImageClasses.indexOf("--") + 2
            );
            if (!awardId) return;
            createButton(
                "/award-system/" + awardId + "/recent?username=" + username,
                "Find Issue Reason",
                contentDiv.querySelector(".contentRow-main") as HTMLDivElement,
                "_blank",
                true
            );
        });
    });
}

/**
 * Adds a form to the recent awards page to find a user's award
 * @returns void
 */
function handleRecentAwardPage() {
    const url = window.location.href;
    const awardId = url.match(
        /^https:\/\/www\.edgegamers\.com\/award-system\/(\d+)\/recent\/?$/
    )![1];
    const form = document.createElement("form");
    form.setAttribute("action", "/award-system/" + awardId + "/recent");
    form.setAttribute("method", "get");
    form.setAttribute("class", "block");
    form.innerHTML =
        '<div class="block-container"><h3 class="block-minorHeader">Find User Award</h3><div class="block-body block-row"><input type="text" class="input" data-xf-init="auto-complete" data-single="true" name="username" data-autosubmit="true" maxlength="50" placeholder="Name…" autocomplete="off"></div></div>';
    const pageWrapper = document.querySelector(".p-pageWrapper");
    pageWrapper?.insertBefore(form, pageWrapper.querySelector(".p-body"));
}

/**
 * Directs the url to the page containing the award of the username that was supplied
 * @returns void
 */
function handleFindAwardPage() {
    const url = window.location.href;
    const match = url.match(
        /^https:\/\/www\.edgegamers\.com\/award-system\/(\d+)\/recent\?username=(.+)$/
    )!;
    const awardId = match[1];
    const userToFind = match[2];
    const maxPagesA = document.querySelector(".pageNav-main > :last-child > a");
    if (maxPagesA != null) {
        var maxPages = parseInt(maxPagesA.innerHTML);
    } else {
        var maxPages = 1;
    }
    for (var i = 1; i <= maxPages; i++) {
        parseAwardPage(i, userToFind, awardId);
    }
}

/**
 * Internal function to parse a page of awards
 * @param {number} pageNum the current number of the page being parsed
 * @param {string} userToFind the username to find
 * @param {string} awardId the id of the award to find
 */
function parseAwardPage(pageNum: number, userToFind: string, awardId: string) {
    const pageHtml = document.createElement("html");
    fetch("/award-system/" + awardId + "/recent?page=" + pageNum).then(
        function (response) {
            response.text().then(function (text) {
                pageHtml.innerHTML = text;
                const bodyDiv = pageHtml.querySelector(".block-body")!;
                Array.from(bodyDiv.children).forEach(function (div) {
                    if (div.getAttribute("data-author") == userToFind) {
                        window.location.href =
                            "/award-system/" +
                            awardId +
                            "/recent?page=" +
                            pageNum +
                            "&spotlight=" +
                            userToFind;
                    }
                });
            });
        }
    );
}

/**
 * Handles Award Spotlight pages, scrolling to the spotlight
 */
function handleAwardSpotlight() {
    const url = window.location.href;
    const userToFind = url.match(
        /^https:\/\/www\.edgegamers\.com\/award-system\/\d+\/recent\?page=\d+\&spotlight=(.+)$/
    )![1];
    document
        .querySelectorAll('[data-author="' + userToFind + '"]')[0]
        .scrollIntoView({ behavior: "smooth" });
}

/**
 * Hides signatures behind a button, and prevents loading of most content (img, video, iframe)
 */
function blockSignatures() {
    if (signatureBlockList.length == 0) return;
    document.querySelectorAll("div.message-inner").forEach((post) => {
        const userId = (
            post.querySelector("a.username[data-user-id]") as
                | HTMLAnchorElement
                | undefined
        )?.dataset.userId;
        if (userId != null && signatureBlockList.includes(userId)) {
            const signature = post.querySelector(
                "aside.message-signature > div"
            ) as HTMLDivElement;
            // iframe's are added after page load, using a DOMNodeInserted event to work around that
            function signatureEvent(event: Event) {
                if (event.target == null) return;
                if (!((event.target as HTMLElement).nodeName === "IFRAME"))
                    return;
                (event.target as HTMLIFrameElement).dataset.src = (
                    event.target as HTMLIFrameElement
                ).src;
                (event.target as HTMLIFrameElement).src = "about:blank";
            }
            signature.addEventListener(
                "DOMNodeInserted",
                signatureEvent,
                false
            );
            // Set the SRC of content to nothing (data:,), empty string is not used as it may cause additional requests to the page
            // Issue originated back in 2009, unsure if it is still a problem but best to lean on the safe side.
            // Was fixed in FireFox a while ago, not sure about Chrome
            (
                signature.querySelectorAll(
                    "img[src]"
                ) as NodeListOf<HTMLImageElement>
            ).forEach((img) => (img.src = "data:,"));
            (
                signature.querySelectorAll(
                    "video[poster]"
                ) as NodeListOf<HTMLVideoElement>
            ).forEach((video) => {
                video.dataset.poster = video.poster;
                video.poster = "data:,";
            });
            (
                signature.querySelectorAll(
                    "source[src]"
                ) as NodeListOf<HTMLSourceElement>
            ).forEach((source) => {
                source.dataset.src = source.src;
                source.src = "data:,";
            });
            signature.style.display = "none";
            const btn = document.createElement("button");
            // Button to restore everything
            btn.onclick = function () {
                signature.style.display = "";
                (
                    signature.querySelectorAll(
                        "img[src][data-url]"
                    ) as NodeListOf<HTMLImageElement>
                ).forEach((img) => {
                    img.src = img.dataset.url as string;
                });
                (
                    signature.querySelectorAll(
                        "iframe[src][data-src]"
                    ) as NodeListOf<HTMLIFrameElement>
                ).forEach((iframe) => {
                    iframe.src = iframe.dataset.src as string;
                    delete iframe.dataset.src;
                });
                (
                    signature.querySelectorAll(
                        "video[poster][data-poster]"
                    ) as NodeListOf<HTMLVideoElement>
                ).forEach((video) => {
                    video.poster = video.dataset.poster as string;
                    delete video.dataset.poster;
                });
                (
                    signature.querySelectorAll(
                        "source[src][data-src]"
                    ) as NodeListOf<HTMLSourceElement>
                ).forEach((source) => {
                    source.src = source.dataset.src as string;
                    delete source.dataset.src;
                });
                signature.removeEventListener(
                    "DOMNodeInserted",
                    signatureEvent,
                    false
                );
                btn.remove();
            };
            btn.innerHTML = "Load Signature";
            btn.classList.add("button--link", "button");
            btn.style.cursor = "pointer";
            btn.style.display = "block";
            btn.style.margin = "auto";
            signature.parentElement?.appendChild(btn);
        }
    });
}

(function () {
    // Setup configuration
    setupForumsConfig();
    loadCompletedMap();
    loadSignatureBlockList();

    // Determine what page we're on
    const url = window.location.href;

    document.body.addEventListener(
        "DOMNodeInserted",
        tooltipMAULListener,
        false
    );
    document.body.addEventListener("DOMNodeInserted", handleOnHold, false);

    // Add Helpful Links to the Navigation Bar
    const nav_list = document.querySelector(".p-nav-list") as HTMLUListElement;
    addMAULNav(nav_list);
    // Reauthenthicate with MAUL if need be
    autoMAULAuth();

    addNav("https://gitlab.edgegamers.io/", "GitLab", nav_list);
    addNav("https://edgegamers.gameme.com/", "GameME", nav_list);

    if (url.match(/^https:\/\/www\.edgegamers\.com\/members\/\d+/))
        // Members Page
        addMAULProfileButton(
            document.querySelector(".memberHeader-buttons") as HTMLDivElement,
            window.location.pathname.match(/\/members\/(\d+)/)![1]
        );
    else if (
        url.match(
            /^https:\/\/www\.edgegamers\.com\/threads\/\d+\/move(?:\?move_.*)?$/
        )
    )
        // Thread Move Page
        handleThreadMovePage(url);
    else if (url.match(/^https:\/\/www\.edgegamers\.com\/forums\/?$/))
        // Forums List
        handleForumsList();
    else if (url.match(/^https:\/\/www\.edgegamers\.com\/application\/\d+\/?$/))
        // Application Page
        handleApplicationPage();
    else if (
        url.match(
            /^https:\/\/www\.edgegamers\.com\/award-system\/user\/awards\?user=\d+\/?$/
        )
    )
        // User Award Page
        handleUserAwardPage();
    else if (
        url.match(
            /^https:\/\/www\.edgegamers\.com\/award-system\/\d+\/recent\/?$/
        )
    )
        // Recent Award Page
        handleRecentAwardPage();
    else if (
        url.match(
            /^https:\/\/www\.edgegamers\.com\/award-system\/\d+\/recent\?username=.+$/
        )
    ) {
        // Find award page
        handleFindAwardPage();
    } else if (
        url.match(
            /^https:\/\/www\.edgegamers\.com\/award-system\/\d+\/recent\?page=\d+\&spotlight=.+$/
        )
    ) {
        // Award page with a spotlight
        handleAwardSpotlight();
    }

    if (!url.match(/^https:\/\/www\.edgegamers\.com\/-\/$/))
        handleGenericThread();
})();
