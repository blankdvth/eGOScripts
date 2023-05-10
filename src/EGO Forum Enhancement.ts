// ==UserScript==
// @name         EdgeGamers Forum Enhancement%RELEASE_TYPE%
// @namespace    https://github.com/blankdvth/eGOScripts/blob/master/src/EGO%20Forum%20Enhancement.ts
// @version      4.8.1
// @description  Add various enhancements & QOL additions to the EdgeGamers Forums that are beneficial for Leadership members.
// @author       blank_dvth, Skle, MSWS
// @match        https://www.edgegamers.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=edgegamers.com
// @require      https://peterolson.github.io/BigInteger.js/BigInteger.min.js
// @require      https://raw.githubusercontent.com/12pt/steamid-converter/master/js/converter-min.js
// @require      https://raw.githubusercontent.com/pieroxy/lz-string/master/libs/lz-string.min.js
// @require      https://openuserjs.org/src/libs/sizzle/GM_config.js
// @connect      maul.edgegamers.com
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// ==/UserScript==
/// <reference path="../types/config/index.d.ts" />
/// <reference path="../types/lz-string.d.ts" />
/// <reference path="../types/forum_maul_c.d.ts" />

// Declare TypeScript types
interface Completed_Map {
    originId: string;
    completedId: string;
}

interface NavbarURL_Map {
    text: string;
    url: string;
}

interface OnHold_Map {
    name: string;
    reason: string;
    explain: string;
}

interface CannedResponse {
    name: string;
    response: string;
}

const completedMap: Completed_Map[] = [];
const signatureBlockList: string[] = [];
const navbarURLs: NavbarURL_Map[] = [];
const navbarRemovals: string[] = [];
const onHoldTemplates: OnHold_Map[] = [];
const autoMentionForums: string[] = [];
const cannedResponses: { [category: string]: CannedResponse[] } = {};
const appealForums: string[] = ["1234", "1236"];
const reportForums: string[] = ["1233", "1235"];
const countingURL: string = "https://www.edgegamers.com/threads/333944/";

/**
 * Creates a preset button
 * @param {string} text Button text
 * @param {function(HTMLElementEventMap)} callback Function to call on click
 * @returns {HTMLSpanElement} Button
 */
function createForumsPresetButton(
    text: string,
    id: string,
    callback: (event: MouseEvent) => void
): HTMLSpanElement {
    const button = document.createElement("span");
    button.classList.add("button");
    button.innerHTML = text;
    button.onclick = callback;
    button.style.marginLeft = "4px";
    button.style.marginTop = "4px";
    button.dataset.presetId = id;
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
    id: string,
    div: HTMLDivElement,
    func: (event: MouseEvent) => void
) {
    div.appendChild(createForumsPresetButton(name, id, func));
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
                label: "Show List Bans for unknown Steam IDs",
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
            "append-profile": {
                label: "Append profile buttons",
                title: "When checked, a buttons added to profiles will be appended to their respective groups, else, they will be prepended. This does not apply to all buttons.",
                type: "checkbox",
                default: false,
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
            "autofill-counting": {
                label: "Autofill Counting",
                title: " Autofill the next number in the counting thread on click.",
                type: "checkbox",
                default: true,
            },
            "logo-link": {
                label: "Logo Link",
                title: "Replace the link the eGO logo (top-left) links to with the given URL. Leave empty to disable.",
                type: "text",
                default: "",
            },
            "move-to-completed-unchecked": {
                label: "Completed Forums Map",
                section: [
                    "Move to Completed",
                    'One map (forum -> completed) per line, use the format "origin id;completed id". The ID is usually present in the URL bar when viewing that subforum list (/forums/ID here), otherwise, open Inspect Element and look for the number after "node-" in "data-container-key" in the <html> tag. For example: "1234;1236".<br>Note: This will not apply until the page is refreshed (your updated maps also won\'t show if you reopen the config popup until you refresh).',
                ],
                type: "textarea",
                save: false,
                default: "1234;1236\n1233;1235\n852;853",
            },
            "move-to-completed": {
                type: "hidden",
                default: "1234;1236\n1233;1235\n852;853",
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
            "navbar-urls-unchecked": {
                label: "Navigation Bar URLs",
                section: [
                    "Navigation Bar URLs",
                    "List of URLs to add to the navigation bar, separated by newlines. Each line should be in the format 'text;url'. Your URLs cannot have a semicolon in them.",
                ],
                type: "textarea",
                save: false,
                default:
                    "GitLab;https://gitlab.edgegamers.io/\nGameME;https://edgegamers.gameme.com/",
            },
            "navbar-urls": {
                type: "hidden",
                default:
                    "GitLab;https://gitlab.edgegamers.io/\nGameME;https://edgegamers.gameme.com/",
            },
            "navbar-removals": {
                label: "Navigation Bar Removals",
                section: [
                    "Navigation Bar Removals",
                    "List of entries to remove from the navigation bar, separated by newlines. This removes the first full match for the text in the button, case-insensitive.",
                ],
                type: "textarea",
                default: "",
            },
            "on-hold-unchecked": {
                label: "On Hold Templates",
                section: [
                    "On Hold Templates",
                    "See <a  href='https://github.com/blankdvth/eGOScripts/wiki/On-Hold-Templates' target='_blank'>this guide</a> on how to format your templates.",
                ],
                type: "textarea",
                save: false,
                default:
                    "No MAUL Account (Reason);MAUL account must be created and verified;\nSteam Verification;Steam account must be verified in MAUL;In order for you to fix this you'll need to click the MAUL link at the top of the page in the navbar, click \"Edit Game IDs,\" then click the Sign in through Steam button under the Source ID section. Once you've done so, please reply to this post!\nMinecraft Verification;Minecraft ID must be verified in MAUL;In order for you to fix this you'll need to click the MAUL link at the top of the page in the navbar, click \"Edit Game IDs,\" then under ID for Minecraft, input your Minecraft username, click Convert to Game ID, then log onto our Minecraft server. Once you've done so, please reply to this post!\"\nBattlefield Verification;Battlefield account must be verified in MAUL;In order for you to fix this you'll need to click the MAUL link at the top of the page in the navbar, in MAUL hover over the home link in the top left, click help, then follow the instructions for Battlefield. Once you have done so, please reply to this post!\nDiscord Verification;Discord ID must be verfied in MAUL;In order for you to fix this you'll need to click the MAUL link at the top of the page in the navbar, click \"Edit Game IDs,\" then click the sign in through Discord button under the discord ID section. Once you have done so, please reply to this post!\nInappropriate Name;Inappropriate Name;As for your name, Please click [URL='https://www.edgegamers.com/account/username']here[/URL] and fill out a name change request. After you fill it out, please wait while your name change request is finalized and the change is completed. Once it is done your application process will resume. If you want to have an understanding on our naming policy inside of eGO please click [URL='https://www.edgegamers.com/threads/378540/']here[/URL].",
            },
            "on-hold": {
                type: "hidden",
                default:
                    "No MAUL Account (Reason);MAUL account must be created and verified;\nSteam Verification;Steam account must be verified in MAUL;In order for you to fix this you'll need to click the MAUL link at the top of the page in the navbar, click \"Edit Game IDs,\" then click the Sign in through Steam button under the Source ID section. Once you've done so, please reply to this post!\nMinecraft Verification;Minecraft ID must be verified in MAUL;In order for you to fix this you'll need to click the MAUL link at the top of the page in the navbar, click \"Edit Game IDs,\" then under ID for Minecraft, input your Minecraft username, click Convert to Game ID, then log onto our Minecraft server. Once you've done so, please reply to this post!\"\nBattlefield Verification;Battlefield account must be verified in MAUL;In order for you to fix this you'll need to click the MAUL link at the top of the page in the navbar, in MAUL hover over the home link in the top left, click help, then follow the instructions for Battlefield. Once you have done so, please reply to this post!\nDiscord Verification;Discord ID must be verfied in MAUL;In order for you to fix this you'll need to click the MAUL link at the top of the page in the navbar, click \"Edit Game IDs,\" then click the sign in through Discord button under the discord ID section. Once you have done so, please reply to this post!\nInappropriate Name;Inappropriate Name;As for your name, Please click [URL='https://www.edgegamers.com/account/username']here[/URL] and fill out a name change request. After you fill it out, please wait while your name change request is finalized and the change is completed. Once it is done your application process will resume. If you want to have an understanding on our naming policy inside of eGO please click [URL='https://www.edgegamers.com/threads/378540/']here[/URL].",
            },
            "auto-mention-unchecked": {
                label: "Auto Mention (Subforum IDs)",
                section: [
                    "Automention",
                    "Automatically mention the OP in the editor in certain forums. This is not guaranteed to work on the Rich Text editor (although it should).",
                ],
                type: "textarea",
                save: false,
                default: "",
            },
            "auto-mention": {
                type: "hidden",
                default: "",
            },
            "auto-mention-newlines": {
                label: "Number of newlines to add after mention",
                title: "This may be off by one when using the Rich Text editor.",
                type: "int",
                min: 0,
                default: 2,
            },
            "auto-mention-onclick": {
                label: "Fill on click instead of on load",
                type: "checkbox",
                default: true,
            },
            "auto-mention-focus": {
                label: "Focus after mentioning (only on load mode)",
                type: "checkbox",
                default: false,
            },
            "canned-responses-unchecked": {
                label: "Canned Responses",
                section: [
                    "Canned Responses",
                    "See <a href='https://github.com/blankdvth/eGOScripts/wiki/Canned-Responses' target='_blank'>this guide</a> on how to format your canned responses.",
                ],
                type: "textarea",
                save: false,
                default: "",
            },
            "canned-responses": {
                type: "hidden",
                default: "",
            },
            "canned-response-min-width": {
                label: "Minimum width of dropdown (in pixels)",
                type: "int",
                min: 0,
                default: 125,
            },
            "canned-response-focus": {
                label: "Focus after inserting canned response",
                type: "checkbox",
                default: true,
            },
            "canned-response-trigger-automention": {
                label: "Attempt to trigger automention before inserting canned response",
                type: "checkbox",
                default: true,
            },
            "canned-responses-hide-scrollbar": {
                label: "Hide scrollbars (scrolling will still work)",
                title: "May not work on all browsers.",
                type: "checkbox",
                default: false,
            },
            "ban-display-enable": {
                label: "Enable",
                section: [
                    "Ban Display",
                    "Automatically retrieve and display ban info in appeals. Only works when MAUL is authenticated.",
                ],
                type: "checkbox",
                default: true,
            },
            "ban-display-hidden": {
                label: "Hide behind button",
                title: "Whether to hide the ban display behind a button.",
                type: "checkbox",
                default: false,
            },
            "ban-display-silent-fail": {
                label: "Silently fail",
                title: "Whether to silently fail when a ban cannot be retrieved. No error message will be shown.",
                type: "checkbox",
                default: false,
            },
            "ban-display-hyperlink": {
                label: "Hyperlink",
                title: "Whether to hyperlink URLs in ban notes.",
                type: "checkbox",
                default: true,
            },
            "ban-display-steamid": {
                label: "Link Steam IDs",
                title: "Whether to link Steam IDs to their MAUL List Bans page. This is a bit finnicky, turn it off if you're experiencing problems.",
                type: "checkbox",
                default: true,
            },
            "ban-display-show-expired": {
                label: "Show expired bans",
                title: "Whether to show bans info if the latest ban is expired.",
                type: "checkbox",
                default: false,
            },
            "ban-display-show-date": {
                label: "Show date",
                title: "Whether to show the date of the ban in the display table.",
                type: "checkbox",
                default: true,
            },
            "ban-display-show-handle": {
                label: "Show handle",
                title: "Whether to show the handle in the display table.",
                type: "checkbox",
                default: true,
            },
            "ban-display-show-id": {
                label: "Show Steam ID",
                title: "Whether to show the Steam ID in the display table.",
                type: "checkbox",
                default: false,
            },
            "ban-display-show-division": {
                label: "Show division",
                title: "Whether to show the division in the display table.",
                type: "checkbox",
                default: false,
            },
            "ban-display-show-banning-admin": {
                label: "Show banning admin",
                title: "Whether to show the banning admin in the display table.",
                type: "checkbox",
                default: true,
            },
            "ban-display-show-admins-online": {
                label: "Show admins online",
                title: "Whether to show the admins online in the display table.",
                type: "checkbox",
                default: false,
            },
            "ban-display-show-duration": {
                label: "Show duration",
                title: "Whether to show the duration of the ban in the display table.",
                type: "checkbox",
                default: true,
            },
            "ban-display-show-reason": {
                label: "Show reason",
                title: "Whether to show the reason for the ban in the display table.",
                type: "checkbox",
                default: true,
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
                GM_config.set(
                    "navbar-urls-unchecked",
                    GM_config.get("navbar-urls")
                );
                GM_config.set("on-hold-unchecked", GM_config.get("on-hold"));
                GM_config.set(
                    "auto-mention-unchecked",
                    GM_config.get("auto-mention")
                );
                GM_config.set(
                    "canned-responses-unchecked",
                    GM_config.get("canned-responses")
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
                            maps.length == 0 ||
                            maps
                                .split(/\r?\n/)
                                .every((map) => map.match(/^\d+;\d+$/))
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
                GM_config.fields[
                    "navbar-urls-unchecked"
                ].node?.addEventListener("change", function () {
                    const urls = GM_config.get(
                        "navbar-urls-unchecked",
                        true
                    ) as string;
                    if (
                        urls.length == 0 ||
                        urls
                            .split(/\r?\n/)
                            .every((url) =>
                                url.match(
                                    /^[^;\r\n]+;https?:\/\/(www\.)?[-a-zA-Z0-9.]{1,256}\.[a-zA-Z0-9]{2,6}\b(?:\/[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/
                                )
                            )
                    )
                        GM_config.set("navbar-urls", urls);
                });
                GM_config.fields["on-hold-unchecked"].node?.addEventListener(
                    "change",
                    function () {
                        const onHold = GM_config.get(
                            "on-hold-unchecked",
                            true
                        ) as string;
                        if (
                            onHold.length == 0 ||
                            onHold
                                .split(/\r?\n/)
                                .every((line) =>
                                    line.match(
                                        /^[^;\r\n]+;[^;\r\n]*;[^;\r\n]*$/
                                    )
                                )
                        )
                            GM_config.set("on-hold", onHold);
                    }
                );
                GM_config.fields[
                    "auto-mention-unchecked"
                ].node?.addEventListener("change", function () {
                    const autoMention = GM_config.get(
                        "auto-mention-unchecked",
                        true
                    ) as string;
                    if (
                        autoMention.length == 0 ||
                        autoMention
                            .split(/\r?\n/)
                            .every((id) => id.match(/^\d+$/))
                    )
                        GM_config.set("auto-mention", autoMention);
                });
                GM_config.fields[
                    "canned-responses-unchecked"
                ].node?.addEventListener("change", function () {
                    const cannedResponses = GM_config.get(
                        "canned-responses-unchecked",
                        true
                    ) as string;
                    // Check if entire config matches the regex by matching all and rejoining the matches, then comparing to the original
                    if (
                        [
                            ...cannedResponses.matchAll(
                                /(?:===\n|^)- (?<name>.+)\n- (?<category>.+)\n(?<response>(?:.|\n)+?)\n===/gm
                            ),
                        ]
                            .map((i) => i[0])
                            .join("\n") === cannedResponses
                    )
                        GM_config.set("canned-responses", cannedResponses);
                });
            },
            save: function (forgotten) {
                if (
                    forgotten["move-to-completed-unchecked"] !==
                    GM_config.get("move-to-completed")
                )
                    alert(
                        'Invalid move to completed map, verify that all lines are in the format "origin id:completed id".'
                    );
                if (
                    forgotten["signature-block-unchecked"] !==
                    GM_config.get("signature-block")
                )
                    alert(
                        "Invalid signature block ID list. Ensure each ID is on it's own line and all IDs are numerical."
                    );
                if (
                    forgotten["navbar-urls-unchecked"] !==
                    GM_config.get("navbar-urls")
                )
                    alert(
                        "Invalid navbar URL list. Ensure each URL is valid, on it's own line, and all URLs are in the format 'text;url'."
                    );
                if (forgotten["on-hold-unchecked"] !== GM_config.get("on-hold"))
                    alert(
                        "Invalid on hold list. Ensure each line is in the format 'name;reason;explain' and that no field contains a semicolon."
                    );
                if (
                    forgotten["auto-mention-unchecked"] !==
                    GM_config.get("auto-mention")
                )
                    alert(
                        "Invalid auto mention list. Ensure each ID is on it's own line and all IDs are numerical."
                    );
                if (
                    forgotten["canned-responses-unchecked"] !==
                    GM_config.get("canned-responses")
                )
                    alert(
                        "Invalid canned responses list. Ensure each response is in the proper format (see the wiki for more information)."
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
    if (completedMapRaw.length == 0) return;
    completedMapRaw.split(/\r?\n/).forEach((map) => {
        const parts = map.split(";");
        if (parts.length != 2) {
            alert("Invalid completed map: " + map);
            return;
        } else if (!parts[1].match(/\d+/)) {
            alert("Invalid ID: " + parts[1]);
        } else if (!parts[0].match(/\d+/)) {
            // Separate to provide update notice
            alert(
                `Invalid ID: ${parts[0]}.\nThe completed map format has been changed to use IDs instead of regexes. Please update your config.`
            );
        }
        completedMap.push({
            originId: parts[0],
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
 * Loads the navbar URL list from config
 */
function loadNavbarURLs() {
    const navbarURLsRaw = GM_config.get("navbar-urls") as string;
    if (navbarURLsRaw.length == 0) return;
    navbarURLsRaw.split(/\r?\n/).forEach((url) => {
        const parts = url.split(";");
        if (parts.length != 2) {
            alert("Invalid URL: " + url);
            return;
        }
        navbarURLs.push({
            text: parts[0],
            url: parts[1],
        });
    });
}

/**
 * Loads the navbar removals from config
 */
function loadNavbarRemovals() {
    const navbarRemovalsRaw = GM_config.get("navbar-removals") as string;
    if (navbarRemovalsRaw.length == 0) return;
    navbarRemovalsRaw.split(/\r?\n/).forEach((removal) => {
        navbarRemovals.push(removal.toLowerCase());
    });
}

/**
 * Loads the on hold templates from config
 */
function loadOnHoldTemplates() {
    const onHoldTemplatesRaw = GM_config.get("on-hold") as string;
    if (onHoldTemplatesRaw.length == 0) return;
    onHoldTemplatesRaw.split(/\r?\n/).forEach((line) => {
        const parts = line.split(";");
        if (parts.length != 3) {
            alert("Invalid on hold line: " + line);
            return;
        }
        onHoldTemplates.push({
            name: parts[0],
            reason: parts[1],
            explain: parts[2],
        });
    });
}

/**
 * Loads the auto mention list from config
 */
function loadAutoMentionList() {
    const autoMentionListRaw = GM_config.get("auto-mention") as string;
    autoMentionListRaw.split(/\r?\n/).forEach((id) => {
        autoMentionForums.push(id);
    });
}

/**
 * Loads the canned responses from config
 */
function loadCannedResponses() {
    const cannedResponsesRaw = GM_config.get("canned-responses") as string;
    [
        ...cannedResponsesRaw.matchAll(
            /(?:===\n|^)- (?<name>.+)\n- (?<category>.+)\n(?<response>(?:.|\n)+?)\n===/gm
        ),
    ].forEach((match) => {
        const category = match.groups!.category;
        if (!cannedResponses[category]) cannedResponses[category] = [];
        cannedResponses[category].push({
            name: match.groups!.name,
            response: match.groups!.response,
        });
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
        div,
        "_blank",
        GM_config.get("append-profile") as boolean
    );
}

/**
 * Adds a "Add Ban" button to the div
 * @param {HTMLDivElement} div Div to add to
 * @param {data} data Data to pass to the ban page
 */
function addAddBanButton(div: HTMLDivElement, data: AddBan_Data) {
    const urlData = LZString.compressToEncodedURIComponent(
        JSON.stringify(data)
    );
    createButton(
        `https://maul.edgegamers.com/index.php?page=editban#${urlData}`,
        "Add Ban",
        div,
        "_blank"
    );
}

/**
 * Adds a "List Bans" button to the div
 * @param {HTMLDivElement} div Div to add to
 * @param {number} steam_id_64 Steam ID to check
 * TODO: Add support for other game IDs
 */
function addBansButton(div: HTMLDivElement, steam_id_64: string) {
    createButton(
        "https://maul.edgegamers.com/index.php?page=bans&qType=gameId&q=" +
            steam_id_64,
        "List Bans",
        div,
        "_blank"
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
                "/move#" +
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
                "/move#685";
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
 * Adds all nav buttons to the navbar
 */
function addNavButtons(urls: NavbarURL_Map[], nav: HTMLElement) {
    urls.forEach((url) => {
        addNav(url.url, url.text, nav);
    });
}

/**
 * Removes nav buttons from the navbar
 */
function removeNavButtons(removals: string[], nav: HTMLElement) {
    (
        nav.querySelectorAll(
            "li > div > a:first-of-type"
        ) as NodeListOf<HTMLAnchorElement>
    ).forEach((a) => {
        if (removals.includes(a.innerText.toLowerCase()))
            a.parentElement?.parentElement?.remove();
    });
}

/**
 * Replaces the logo link with a new one
 */
function replaceLogoLink() {
    if ((GM_config.get("logo-link") as string).length == 0) return;
    (
        document.querySelectorAll(
            "div.p-header-logo > a, div.p-nav-smallLogo > a"
        ) as NodeListOf<HTMLAnchorElement>
    ).forEach((a: HTMLAnchorElement) => {
        a.href = GM_config.get("logo-link") as string;
    });
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
        maul_div
            .querySelector("a.p-navEl-link")
            ?.classList.add("p-navEl-link--splitMenu");
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
 * Get the content of the post box
 */
function getPostBox() {
    if (
        document.querySelector("#xfBbCode-1")?.classList.contains("fr-active")
    ) {
        // BBCode Editor
        const editors = document.querySelectorAll(
            'textarea.input[name="message"]'
        ) as NodeListOf<HTMLTextAreaElement>;
        return editors[editors.length - 1]?.value;
    } else {
        // Rich Editor
        const editors = document.querySelectorAll(
            "div.fr-element.fr-view"
        ) as NodeListOf<HTMLDivElement>;
        return editors[editors.length - 1]?.innerText;
    }
}

/**
 * Get the post box element
 * @returns The post box element
 */
function getPostBoxEl() {
    if (
        document.querySelector("#xfBbCode-1")?.classList.contains("fr-active")
    ) {
        // BBCode Editor
        const editors = document.querySelectorAll(
            'textarea.input[name="message"]'
        ) as NodeListOf<HTMLTextAreaElement>;
        return editors[editors.length - 1];
    } else {
        // Rich Editor
        const editors = document.querySelectorAll(
            "div.fr-element.fr-view"
        ) as NodeListOf<HTMLDivElement>;
        return editors[editors.length - 1];
    }
}

/**
 * Add or append text to the post editor box
 * @param text Text to add to post box
 * @param append True to append text, false to replace
 */
function editPostBox(text: string, append: boolean = false) {
    if (
        document.querySelector("#xfBbCode-1")?.classList.contains("fr-active")
    ) {
        // BBCode Editor
        const editors = document.querySelectorAll(
            'div.message textarea.input[name="message"]'
        );
        const editor = editors[editors.length - 1] as HTMLTextAreaElement;
        editor.value = append ? editor.value + text : text;
    } else {
        // Rich Editor
        const editors = document.querySelectorAll("div.fr-element.fr-view");
        const editor = editors[editors.length - 1] as HTMLDivElement;
        editor.innerText = append ? editor.innerText.trim() + text : text;
        editor.dispatchEvent(new Event("mouseup"));
    }
}

/**
 * Get the ID of the current forum
 * @returns {string} Forum ID
 */
function getForumId() {
    return document
        .getElementById("XF")!
        .dataset.containerKey?.replace("node-", "");
}

/**
 * Get the username of the current user
 * @returns {string} Username of current user
 */
function getUsername() {
    return (
        document.querySelector(
            "a.p-navgroup-link--user > span.p-navgroup-linkText"
        ) as HTMLSpanElement | null
    )?.innerText;
}

/**
 * Get the username of the OP of the current thread
 * @returns {string} Username of the OP
 */
function getOP() {
    return document.querySelector("a.username") as HTMLAnchorElement | null;
}

/**
 * Retrieves and displays ban information for a user
 */
function displayBanInfo(steam_id_64: string, insertBefore: HTMLElement) {
    GM_xmlhttpRequest({
        method: "GET",
        url: `https://maul.edgegamers.com/index.php?q=${steam_id_64}&qType=gameId&page=bans`,
        onload: function (res) {
            const display = document.createElement("div");
            display.style.textAlign = "center";
            display.style.marginBottom = "8px";
            insertBefore.parentElement?.insertBefore(display, insertBefore);

            if (
                !res.responseText ||
                res.responseText.includes("<title>Login | MAUL</title>")
            ) {
                if (!GM_config.get("ban-display-silent-fail"))
                    display.innerHTML =
                        "<i>Error retrieving ban information, not authenticated?</i>";
                return;
            }
            const html = new DOMParser().parseFromString(
                res.responseText,
                "text/html"
            );
            const latestBan = html.querySelector("table.table > tbody > tr") as
                | HTMLTableRowElement
                | undefined
                | null;
            if (!latestBan) {
                if (!GM_config.get("ban-display-silent-fail"))
                    display.innerHTML = "<i>No bans found.</i>";
                return;
            }

            display.style.display = "flex";
            const left = document.createElement("div");
            display.appendChild(left);
            left.style.flex = "1";
            left.style.paddingRight = "5px";
            const right = document.createElement("div");
            display.appendChild(right);
            right.style.flex = "3";
            right.style.paddingLeft = "5px";
            right.style.paddingTop = "2px";
            right.style.paddingBottom = "2px";
            right.style.border = "1px solid #3e3e42";
            right.style.borderRadius = "3px";

            const dataList = document.createElement("div");
            left.appendChild(dataList).classList.add("dataList");
            const table = document.createElement("table");
            dataList.appendChild(table).classList.add("dataList-table");
            const tableBody = document.createElement("tbody");
            table.appendChild(tableBody);

            /*
                0 - Date
                1 - Handle
                2 - Game ID
                3 - Admin Name
                4 - Duration
                5 - Reason (may be truncated with ...)
                6 - Actions (don't touch)
            */
            const cols = latestBan.querySelectorAll(
                "td"
            ) as NodeListOf<HTMLTableCellElement>;
            // Indexes change, there is always Division and Admins Online, but additional rows may be added if overflowed in the table
            const expand = html.getElementById(
                "expand_" + latestBan.dataset.num
            )!;
            const expandColsHeader = expand.querySelectorAll(
                "span.pull-left:not(.col-xs-9)"
            ) as NodeListOf<HTMLSpanElement>;
            const expandColsData = expand.querySelectorAll(
                "span.pull-left.col-xs-9"
            ) as NodeListOf<HTMLSpanElement>;
            const expandCols: { [key: string]: string } = {};
            for (var i = 0; i < expandColsHeader.length; i++) {
                expandCols[expandColsHeader[i].innerText.replace(":", "")] =
                    expandColsData[i].innerText;
            }

            if (
                !(
                    GM_config.get("ban-display-show-expired") ||
                    (expandCols["Duration"] ?? cols[4].innerText).includes(
                        "("
                    ) ||
                    (expandCols["Duration"] ?? cols[4].innerText) == "Permanent"
                )
            ) {
                display.style.display = "block";
                if (GM_config.get("ban-display-silent-fail"))
                    display.innerHTML = "";
                else {
                    display.innerText = `Not currently banned. Last ban was on ${
                        expandCols["Date"] ?? cols[0].innerText
                    } for ${
                        expandCols["Reason"] ?? cols[5].innerText
                    }, lasting ${expandCols["Duration"] ?? cols[4].innerText}`;
                    display.innerHTML = `<i>${display.innerHTML}</i>`;
                }
            }

            const banData: { [key: string]: string } = {};
            const allowedHTMLData = ["Banning Admin"];
            // We're checking expandCols for everything on the off-chance they overflow, but the only ones that actually have before are Handle, Game ID, and Reason.
            if (GM_config.get("ban-display-show-date"))
                banData["Date"] = expandCols["Date"]
                    ? expandCols["Date"]
                    : cols[0].innerText;
            if (GM_config.get("ban-display-show-handle"))
                banData["Handle"] = expandCols["Handle"]
                    ? expandCols["Handle"]
                    : cols[1].innerText;
            if (GM_config.get("ban-display-show-id"))
                banData["Game ID"] = expandCols["Game ID"]
                    ? expandCols["Game ID"]
                    : cols[2].innerText;
            if (GM_config.get("ban-display-show-division"))
                banData["Division"] = expandCols["Division"];
            if (GM_config.get("ban-display-show-banning-admin"))
                banData["Banning Admin"] = (
                    expandCols["Banning Admin"]
                        ? expandCols["Banning Admin"]
                        : cols[3].innerHTML
                ).replace(
                    'href="',
                    'target="_blank" href="https://maul.edgegamers.com/'
                ); // Hyperlink it
            if (GM_config.get("ban-display-show-admins-online"))
                banData["Admins Online"] = expandCols["Admins Online"];
            if (GM_config.get("ban-display-show-duration"))
                banData["Duration"] = expandCols["Duration"]
                    ? expandCols["Duration"]
                    : cols[4].innerText;
            if (GM_config.get("ban-display-show-reason"))
                banData["Reason"] = expandCols["Reason"]
                    ? expandCols["Reason"]
                    : cols[5].innerText;

            for (const [key, value] of Object.entries(banData)) {
                const row = document.createElement("tr");
                tableBody.appendChild(row).classList.add("dataList-row");
                const keyCell = document.createElement("td");
                row.appendChild(keyCell).classList.add(
                    "dataList-cell",
                    "small-cell"
                );
                keyCell.innerText = key;
                keyCell.style.textAlign = "left";
                const valueCell = document.createElement("td");
                row.appendChild(valueCell).classList.add(
                    "dataList-cell",
                    "small-cell"
                );
                if (allowedHTMLData.includes(key)) valueCell.innerHTML = value;
                else valueCell.innerText = value;
                valueCell.style.textAlign = "right";
            }

            const notes = html.getElementById(
                "notes_" + latestBan.dataset.num
            )!.innerHTML;
            if (
                [...notes.matchAll(/<(.+?)>/g)].some(
                    (match) => match[1] != "br"
                )
            ) {
                // Failsafe checking, MAUL should always replace these with &lt; and &gt;, if they don't, something is wrong.
                display.style.display = "block";
                if (GM_config.get("ban-display-silent-fail"))
                    display.innerHTML = "";
                else
                    display.innerHTML =
                        "<i>Potential injection detected, aborting</i>";
                return;
            }
            const notesDiv = document.createElement("div");
            right.appendChild(notesDiv);
            var replacedNotes = notes;
            if (GM_config.get("ban-display-hyperlink")) {
                replacedNotes = replacedNotes
                    .replaceAll(/&amp;/g, "&")
                    .replaceAll(
                        /https?:\/\/(www\.)?[-a-zA-Z0-9.]{1,256}\.[a-zA-Z0-9]{2,6}\b(\/[-a-zA-Z0-9@:%_\+.~#?&\/=]*)/g,
                        '<a href="$&" target="_blank" rel="external"><u>$&</u></a>'
                    );
            }
            if (GM_config.get("ban-display-steamid"))
                // TODO: Allow user to customize this (like MAUL)
                replacedNotes = replacedNotes.replaceAll(
                    /(^|\s|[!"#$%&'()*+,\-.:;<=>?@[\]^`{|}~])(\d{17})($|\s|[!"#$%&'()*+,\-.:;<=>?@[\]^`{|}~])/g,
                    '$1<a href="https://maul.edgegamers.com/index.php?page=bans&qType=gameId&q=$2" target="_blank"><u>$2</u></a>$3'
                );
            notesDiv.innerHTML = replacedNotes;
            notesDiv.style.textAlign = "left";
            notesDiv.style.maxHeight = table.offsetHeight + "px";
            notesDiv.style.overflowY = "auto";
        },
    });
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
 * Fills in placeholders in a canned response string with the proper data then returns it
 */
function generateResponseText(response: string) {
    return response
        .replaceAll("{{{username}}}", getUsername() ?? "")
        .replaceAll("{{{op username}}}", getOP()?.innerText ?? "");
}

/**
 * Listens to and appends MAUL button when user hovers over a profile
 * @param {HTMLElementEventMap} event
 * @returns void
 */
function tooltipMAULListener(event: Event) {
    // Make sure this specific event is the node we want
    if (!event.target) return;
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
    if (!buttenGroupOne) return;
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
        GM_config.get("append-profile") as boolean
    );
}

/**
 * Moves and auto-fills out the moving prompt for a thread.
 * @param {string} hash The hash of the URL, should be the thread ID only
 * @returns void
 */
function handleThreadMovePage(hash: string) {
    const completedId = hash.substring(1);
    if (!completedId) return;
    const form = document.forms[1];
    const drop = form.querySelector("select.js-nodeList") as HTMLSelectElement;
    const checkArr = Array.from(form.querySelectorAll(".inputChoices-choice"));
    const optArr = Array.from(drop.options);
    drop.selectedIndex = optArr.indexOf(
        optArr.find((el) => el.value == completedId!) as HTMLOptionElement
    );
    if (drop.selectedIndex == -1) {
        throw "Could not find forum ID";
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
    const forumId = getForumId();
    if (forumId) {
        if (appealForums.includes(forumId) || reportForums.includes(forumId))
            // Ban appeal or Report
            handleBanAppealReport(reportForums.includes(forumId));

        const button_group = document.querySelector("div.buttonGroup");
        for (var i = 0; i < completedMap.length; i++) {
            if (forumId == completedMap[i].originId) {
                addMoveButton(
                    button_group as HTMLDivElement,
                    window.location.href,
                    "Move to Completed",
                    completedMap[i].completedId
                );
                break;
            }
        }

        if (forumId !== "685")
            // Trash Bin
            addTrashButton(
                button_group?.querySelector(
                    "div.menu > div.menu-content > a[href$=move]"
                ) as HTMLDivElement
            );
    }
    if (isLeadership(breadcrumbs))
        // LE Forums
        handleLeadership();

    const observer = new MutationObserver((mutations) => {
        mutations.every((mutation) => {
            // Using every so that we can return false to stop observing
            if (!mutation.addedNodes) return true;

            for (let i = 0; i < mutation.addedNodes.length; i++) {
                const node = mutation.addedNodes[i];
                if (node.nodeName === "DIV") {
                    handlePostBox(observer);
                    return false;
                }
            }

            return true;
        });
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false,
    });

    blockSignatures();
}

/**
 * Adds "View Bans" or "Lookup ID" button on appeal/report threads.
 * TODO: Add support for other game IDs
 */
function handleBanAppealReport(report: boolean = false) {
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

    const title_match = post_title.match(
        /^(?<game>.*) - (?<handle>.*) - ([^\d]*?(?<game_id>(\d+)|(STEAM_\d:\d:\d+)|(\[U:\d:\d+\])).*)$/
    );
    if (title_match) {
        const unparsed_id = title_match.groups!.game_id;
        try {
            const steam_id_64 = SteamIDConverter.isSteamID64(unparsed_id)
                ? unparsed_id
                : SteamIDConverter.toSteamID64(unparsed_id);
            if (report)
                addAddBanButton(button_group, {
                    name: title_match.groups!.handle,
                    id: steam_id_64,
                    threadId: document
                        .getElementById("XF")!
                        .dataset.contentKey?.replace("thread-", ""),
                    reporter: getOP()?.innerText,
                    game: title_match.groups!.game,
                });
            else if (GM_config.get("ban-display-enable")) {
                if (GM_config.get("ban-display-hidden")) {
                    const button = document.createElement("a");
                    button.classList.add("button--link", "button");
                    button.onclick = () => {
                        button.remove();
                        displayBanInfo(
                            steam_id_64,
                            document.querySelector(".p-body-main")!
                        );
                    };

                    const button_text = document.createElement("span"); // Create button text
                    button_text.classList.add("button-text");
                    button_text.innerHTML = "Get Ban Info";

                    // Add all elements to their respective parents
                    button.appendChild(button_text);
                    button_group.insertBefore(
                        button,
                        button_group.lastElementChild
                    );
                } else
                    displayBanInfo(
                        steam_id_64,
                        document.querySelector(".p-body-main")!
                    );
            }
            addBansButton(button_group, steam_id_64);
        } catch (TypeError) {
            if (GM_config.get("show-list-bans-unknown"))
                addBansButton(button_group, post_title.split(" - ")[2]);
            addLookupButton(button_group, post_title);
        }
    } else {
        if (GM_config.get("show-list-bans-unknown"))
            addBansButton(button_group, post_title.split(" - ")[2]);
        addLookupButton(button_group, post_title);
    }
}

/**
 * Adds "On Hold" templates to the menu and increases the size of the explain box.
 * @param {HTMLElementEventMap} event
 * @returns void
 */
function handleOnHold(event: Event) {
    if (!event.target) return;
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

    // Insert presets
    for (var i = 0; i < onHoldTemplates.length; i++) {
        addForumsPreset(
            onHoldTemplates[i].name,
            i.toString(),
            div,
            function (this: HTMLElement) {
                const preset =
                    onHoldTemplates[this.dataset.presetId as unknown as number];
                if (preset.reason) reason.value = preset.reason;
                if (preset.explain) explain.value = preset.explain;
            }
        );
    }
}

/**
 * Adds a button to open the script config in the user dropdown menu
 * @param {HTMLElementEventMap} event
 * @returns void
 */
function handleProfileDropdown(event: Event) {
    if (!event.target) return;
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
 * Mention the original poster in a thread
 * @param focus Whether to focus the post box after mentioning the user
 */
function autoMention(focus: boolean) {
    const user = getOP();
    if (!user) return;
    const username = user.innerText;
    const userId = user.dataset.userId;
    if (username && userId && getPostBox()?.trim().length == 0) {
        editPostBox(
            `[USER=${userId}]@${username}[/USER]${"\n".repeat(
                GM_config.get("auto-mention-newlines") as number
            )}`
        );
        if (focus) getPostBoxEl().focus();
    }
}

/**
 * Handles adding auto counting functionality to the post box
 */
function autoCount() {
    if (getPostBox()?.trim().length != 0) return;
    // For some reason using a[class=""] doesn't work, so we have to use a:not(a[class])
    const posts = document.querySelectorAll(
        "header.message-attribution > ul.message-attribution-opposite > li > a:not(a[class])"
    ) as NodeListOf<HTMLAnchorElement>;
    if (posts.length == 0) return;
    const lastNum = Number(
        posts[posts.length - 1].innerText.substring(1).replaceAll(",", "")
    ); // Remove the # and commas from the post number
    editPostBox(`${lastNum + 1}`);
}

/**
 * Handles operations that should be performed when the post box is loaded
 * @param observer
 */
function handlePostBox(observer: MutationObserver) {
    const postBox = document.querySelector("div.fr-box") as HTMLDivElement;
    if (!postBox) return;
    const forumId = getForumId();
    observer.disconnect();

    if (forumId && autoMentionForums.includes(forumId)) handleAutoMention();
    if (
        GM_config.get("autofill-counting") &&
        window.location.href.startsWith(countingURL)
    )
        handleAutoCount();
    handleCannedResponses();
}

/**
 * Handles adding auto mention functionality to the post box
 */
function handleAutoMention() {
    const postBox = document.querySelector("div.fr-box") as HTMLDivElement;
    if (GM_config.get("auto-mention-onclick")) {
        function autoMentionListener() {
            autoMention(true);
            postBox.removeEventListener("click", autoMentionListener);
        }
        postBox.addEventListener("click", autoMentionListener);
    } else {
        postBox.click();
        autoMention(GM_config.get("auto-mention-focus") as boolean);
    }
}

/**
 * Handles automatic counting
 */
function handleAutoCount() {
    const postBox = document.querySelector("div.fr-box") as HTMLDivElement;
    function autoCountListener() {
        autoCount();
        postBox.removeEventListener("click", autoCountListener);
    }
    postBox.addEventListener("click", autoCountListener);
}

/**
 * Handles adding canned responses to the post box
 */
function handleCannedResponses() {
    const bar = document.querySelector(
        "div.formButtonGroup-extra"
    ) as HTMLDivElement;
    if (!bar) {
        console.warn("Could not find post box button bar");
        return;
    }
    if (GM_config.get("canned-responses-hide-scrollbar")) {
        // @ts-ignore - Firefox only
        bar.style.scrollbarWidth = "none";
        // @ts-ignore - Webkit only
        bar.style.webkitScrollbar = "none";
    }
    bar.style.whiteSpace = "nowrap";
    bar.style.overflowX = "auto";
    Object.entries(cannedResponses).forEach((cannedResponse) => {
        const [category, responses] = cannedResponse;
        const dropdown = document.createElement("span");
        dropdown.classList.add("p-navEl-splitTrigger"); // Adds various styling for dropdowns, technically for the navbar but it works here
        dropdown.style.float = "none"; // Class makes it float left, so we need to override it
        dropdown.style.textAlign = "center";
        dropdown.style.lineHeight = bar.clientHeight + "px";
        dropdown.style.paddingLeft = "8px";
        dropdown.dataset.category = category;
        dropdown.innerText = category;

        const dropdownMenu = document.createElement("div");
        dropdownMenu.classList.add(
            "menu",
            "menu--structural",
            "menu--potentialFixed",
            "menu--left"
        );
        dropdownMenu.style.zIndex = "800";
        dropdownMenu.style.display = "none";
        dropdownMenu.style.position = "fixed";
        dropdownMenu.style.minWidth =
            GM_config.get("canned-response-min-width") + "px";
        dropdownMenu.style.overflow = "auto";
        if (GM_config.get("canned-responses-hide-scrollbar")) {
            // @ts-ignore - Firefox only
            dropdownMenu.style.scrollbarWidth = "none";
            // @ts-ignore - Webkit only
            dropdownMenu.style.webkitScrollbar = "none";
        }
        dropdownMenu.hidden = true;

        dropdown.append(dropdownMenu);
        dropdown.addEventListener("mouseover", function () {
            var rect = dropdown.getBoundingClientRect();
            dropdownMenu.hidden = false;
            dropdownMenu.style.display = "block";
            dropdownMenu.style.top = rect.bottom + "px";
            dropdownMenu.style.left = rect.left + "px";
            dropdownMenu.style.maxHeight =
                window.innerHeight - rect.top - 25 + "px";
            dropdownMenu.style.maxWidth =
                window.innerWidth - rect.left - 25 + "px";
            dropdownContent.style.maxHeight = dropdownMenu.style.maxHeight;
            dropdownMenu.classList.add("is-active");
        });
        dropdown.addEventListener("mouseout", function () {
            dropdownMenu.hidden = true;
            dropdownMenu.style.display = "none";
            dropdownMenu.classList.remove("is-active");
        });

        const dropdownContent = document.createElement("div");
        dropdownContent.classList.add("menu-content");
        dropdownContent.style.overflow = "none";
        if (GM_config.get("canned-responses-hide-scrollbar")) {
            // @ts-ignore - Firefox only
            dropdownContent.style.scrollbarWidth = "none";
            // @ts-ignore - Webkit only
            dropdownContent.style.webkitScrollbar = "none";
        }
        dropdownMenu.append(dropdownContent);
        bar.append(dropdown);

        responses.forEach((response) => {
            const btn = document.createElement("a");
            btn.classList.add("menu-linkRow", "u-indentDepth0");
            btn.innerText = response.name;
            btn.style.cursor = "pointer";
            btn.style.paddingLeft = "4px";
            btn.style.paddingRight = "0px";
            btn.style.paddingTop = "1px";
            btn.style.paddingBottom = "1px";
            btn.addEventListener("click", function () {
                const postBox = getPostBoxEl();
                if (GM_config.get("canned-response-trigger-automention")) {
                    const forumId = getForumId();
                    if (forumId && autoMentionForums.includes(forumId))
                        autoMention(false);
                }
                editPostBox(generateResponseText(response.response), true);
                dropdown.dispatchEvent(new MouseEvent("mouseout"));
                postBox.dispatchEvent(new Event("autosize:update"));
                if (GM_config.get("canned-response-focus")) postBox.focus();
            });
            dropdownContent.append(btn);
        });
    });
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
                if (!event.target) return;
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
    loadNavbarURLs();
    loadNavbarRemovals();
    loadOnHoldTemplates();
    loadAutoMentionList();
    loadCannedResponses();

    // Determine what page we're on
    const url = window.location.href;
    const hash = window.location.hash;

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

    addNavButtons(navbarURLs, nav_list);
    removeNavButtons(navbarRemovals, nav_list);
    replaceLogoLink();

    if (url.match(/^https:\/\/www\.edgegamers\.com\/members\/\d+/))
        // Members Page
        addMAULProfileButton(
            document.querySelector(".memberHeader-buttons") as HTMLDivElement,
            window.location.pathname.match(/\/members\/(\d+)/)![1]
        );
    else if (
        url.match(
            /^^https:\/\/www\.edgegamers\.com\/threads\/\d+\/move(?:#\d+)?$/
        ) &&
        hash != ""
    )
        // Thread Move Page
        handleThreadMovePage(hash);
    else if (url.match(/^https:\/\/www\.edgegamers\.com\/forums\/?$/))
        // Forums List
        handleForumsList();
    else if (url.match(/^https:\/\/www\.edgegamers\.com\/application\/\d+\/?$/))
        // Application Page
        handleApplicationPage();

    if (!url.match(/^https:\/\/www\.edgegamers\.com\/-\/$/))
        handleGenericThread();
})();
