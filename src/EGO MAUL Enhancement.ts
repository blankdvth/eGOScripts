// ==UserScript==
// @name         EdgeGamers MAUL Enhancement%RELEASE_TYPE%
// @namespace    https://github.com/blankdvth/eGOScripts/blob/master/src/EGO%20MAUL%20Enhancement.ts
// @version      4.6.2
// @description  Add various enhancements & QOL additions to the EdgeGamers MAUL page that are beneficial for CS Leadership members.
// @author       blank_dvth, Left, Skle, MSWS, PixeL
// @match        https://maul.edgegamers.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=edgegamers.com
// @require      https://peterolson.github.io/BigInteger.js/BigInteger.min.js
// @require      https://raw.githubusercontent.com/12pt/steamid-converter/master/js/converter-min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.4/moment-with-locales.min.js
// @require      https://raw.githubusercontent.com/pieroxy/lz-string/master/libs/lz-string.min.js
// @require      https://openuserjs.org/src/libs/sizzle/GM_config.js
// @resource     admins https://raw.githubusercontent.com/blankdvth/eGOScripts/master/admins.txt
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_getResourceText
// @grant        unsafeWindow
// ==/UserScript==
/// <reference path="../types/config/index.d.ts" />
/// <reference path="../types/moment.d.ts" />
/// <reference path="../types/lz-string.d.ts" />
/// <reference path="../types/forum_maul_c.d.ts" />

// Declare TypeScript types
interface Add_Preset {
    name: string;
    handle: string;
    length: number | string;
    reason: string;
    pa: boolean;
    notes: string;
}

interface Edit_Preset {
    name: string;
    length: number | string;
    reason: string;
    pa: boolean;
    notes: string;
    addUsername: boolean;
}

interface Flag_Field_Result {
    element: HTMLElement;
    message: string;
}

interface Unsafe_Window {
    generateFlagHash: (text: string) => void;
}

const knownAdmins: { [key: string]: string } = {}; // Known admin list
const presetsAdd: Add_Preset[] = []; // Presets for adding bans
const presetsEdit: Edit_Preset[] = []; // Presets for editing bans
const flagFields: { [key: string]: string } = {}; // Presets for flag fields
let USERNAME = ""; // Current username
let STEAMID_REGEX: RegExp; // SteamID regex

(unsafeWindow as any as Unsafe_Window).generateFlagHash = function (
    text: string
) {
    generateHash(text + GM_config.get("flag-salt")).then((hash) =>
        console.log(hash)
    );
};

/**
 * Adds a preset button to the div
 * @param {string} name Name of button
 * @param {id} name ID of the button, will be stored in data-preset-id
 * @param {HTMLDivElement} div Div to add to
 * @param {function} func Function to call on click
 */
function addMAULPreset(
    name: string,
    id: string,
    div: HTMLDivElement,
    func: (event: MouseEvent) => void
) {
    div.appendChild(createMAULPresetButton(name, id, func));
}

/**
 * Creates a preset div
 * @returns {HTMLDivElement} Div to add presets to
 */
function createPresetDiv(): HTMLDivElement {
    const div = document.createElement("div");
    const subtitle = document.createElement("h4");
    const child_container = document.getElementById("child_container");
    div.id = "preset_div";
    div.style.display = "flex";
    div.style.flexDirection = "row";
    div.style.paddingLeft = "15px";
    div.style.paddingBottom = "10px";
    subtitle.innerHTML = "Presets";
    subtitle.style.paddingLeft = "15px";
    child_container?.insertBefore(div, document.querySelector("form"));
    child_container?.insertBefore(subtitle, div);
    return div;
}

/**
 * Creates a preset button
 * @param {string} text Button text
 * @param {number} id ID of the button, will be stored in data-preset-id
 * @param {function} callback Function to call on click
 * @returns {HTMLButtonElement} Button
 */
function createMAULPresetButton(
    text: string,
    id: string,
    callback: (event: MouseEvent) => void
): HTMLButtonElement {
    const button = document.createElement("button");
    button.classList.add("btn", "btn-default");
    button.innerHTML = text;
    button.onclick = callback;
    button.style.marginRight = "4px";
    button.dataset.presetId = id;
    return button;
}

/**
 * Creates a link button
 * @param {string} text Text in the button
 * @param {string} link Link to open
 * @returns {HTMLAnchorElement} Button
 */
function createLinkButton(
    text: string,
    link: string,
    target = "_blank"
): HTMLAnchorElement {
    const a = document.createElement("a");
    a.classList.add("btn", "btn-default");
    a.href = link;
    a.target = target;
    a.innerHTML = text;
    a.style.marginRight = "4px";
    return a;
}

/**
 * Generates a SHA-256 hash of the given string
 * @param {string} string String to hash
 * @returns {Promise<string>} Promise that resolves to the hash
 */
async function generateHash(string: string): Promise<string> {
    const utf8 = new TextEncoder().encode(string);
    const hashBuffer = await crypto.subtle.digest("SHA-256", utf8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
        .map((bytes) => bytes.toString(16).padStart(2, "0"))
        .join("");
    return hashHex;
}

/**
 * Generates the proper forum thread link
 * @param {*} threadId Thread ID
 * @param {*} postId Post ID
 * @returns Formatted link
 */
function generateForumsURL(threadId: any, postId: any): string {
    return (
        `https://edgegamers.com/threads/${threadId}/` +
        (postId ? `#post-${postId}` : "")
    );
}

/**
 * Gets Steam ID 64 from an unknown format
 */
function getSteamID_M(unparsed_id: string): Promise<string> {
    return new Promise((resolve, reject) => {
        try {
            resolve(
                SteamIDConverter.isSteamID64(unparsed_id)
                    ? unparsed_id
                    : SteamIDConverter.toSteamID64(unparsed_id)
            );
        } catch (TypeError) {
            if (!GM_config.get("lookup-unknown-ids")) return reject("Could not find Steam ID");
            const profile_id = unparsed_id.match(
                /^(.*id\/)?(?<game_id>[^\/\n]*)\/?$/
            )?.groups?.game_id;
            if (!profile_id) return reject("Could not find Steam ID");
            GM_xmlhttpRequest({
                method: "GET",
                url: `https://api.findsteamid.com/steam/api/summary/${encodeURIComponent(
                    profile_id as string
                )}`,
                anonymous: true,
                timeout: 2500,
                responseType: "json",
                onload: (response) => {
                    const data = response.response;
                    if (data && data.length == 1) return resolve(data[0].steamid);
                    reject("Could not find Steam ID");
                },
                onerror: (error) => {
                    reject(error);
                },
                ontimeout: () => {
                    reject("Timeout");
                },
            });
        }
    });
}

/**
 * Setup the configuration manager and add a button to open it
 */
function setupMAULConfig() {
    // Initialize the configuration manager
    GM_config.init({
        id: "maul-config",
        title: "MAUL Enhancement Script Configuration",
        fields: {
            "steamid-regex": {
                label: "SteamID Regex",
                title: "The regex to use to find Steam IDs in ban notes. Recommended to test in regex101.com first.\nFirst match is left spacing character, second is the SteamID, third is right spacing character.",
                type: "text",
                default:
                    "(^|\\s|[!\"#$%&'()*+,\\-.:;<=>?@[\\]^`{|}~])(\\d{17})($|\\s|[!\"#$%&'()*+,\\-.:;<=>?@[\\]^`{|}~])",
            },
            "spur-account": {
                label: "Use Spur Account Link",
                title: "Link to Spur for logged in users, rather than anonymously.",
                type: "checkbox",
                default: false,
            },
            "convert-search": {
                label: "Convert Steam IDs to ID64 when Searching",
                title: "Converts all non-ID64 (ID3, ID) to ID64 when searching MAUL.",
                type: "checkbox",
                default: true,
            },
            "autoselect-division": {
                label: "Division Index",
                section: [
                    "Autoselect",
                    'See <a href="https://github.com/blankdvth/eGOScripts/wiki/Autoselect-Indexes" target="_blank">this guide</a> if you don\'t know how to get the indexes. Set to 0 for no autoselect.',
                ],
                type: "int",
                min: 0,
                default: 0,
            },
            "autoselect-gameid": {
                label: "Game ID Type Index",
                type: "int",
                min: 0,
                default: 0,
            },
            "presets-add-unchecked": {
                label: "Add Ban Presets",
                section: [
                    "Ban Presets",
                    'See <a href="https://github.com/blankdvth/eGOScripts/wiki/Config-Presets" target="_blank">this guide</a> on how to format and setup presets.<br>Note: This will not apply until the page is refreshed (your updated presets also won\'t show if you reopen the config popup until you refresh).',
                ],
                type: "textarea",
                save: false,
                default:
                    "Get IP (via Ban);x;1;x;;ip\nBan Evasion;;0;Ban Evasion;;",
            },
            "presets-edit-unchecked": {
                label: "Edit Ban Presets",
                type: "textarea",
                save: false,
                default: "Ban Evasion;0;Ban Evasion;y;;",
            },
            "presets-add": {
                type: "hidden",
                default:
                    "Get IP (via Ban);x;1;x;;ip\nBan Evasion;;0;Ban Evasion;;",
            },
            "presets-edit": {
                type: "hidden",
                default: "Ban Evasion;0;Ban Evasion;y;;",
            },
            "datetimeformat-expiration": {
                label: "Expiration Format",
                title: "Format to use to show expiration date on bans.",
                section: [
                    "Datetime Formats",
                    'See <a href="https://momentjs.com/docs/#/displaying/format/" target="_blank">this guide</a> for formatting options.',
                ],
                type: "text",
                default: "YYYY-MM-DD HH:mm",
            },
            "flag-enabled": {
                label: "Enable",
                section: [
                    "Field Flag",
                    'Flags certain bans based on the (trimmed) value of any field. All lines are in the format "hash;message".<br>The hash should be a SHA-256 hash with the Salt (see below) appended to the end of the value (no whitespace). Message is the message that is shown when it matches.<br>This does not check the date or ban duration fields on the List Bans page.<br>To quickly generate a hash, open console and type: generateFlagHash("your value here")',
                ],
                type: "checkbox",
                default: false,
            },
            "flag-force-lowercase": {
                label: "Force Lowercase",
                title: "Force the field value to be lowercase before hashing. This does not include the salt.",
                type: "checkbox",
                default: false,
            },
            "flag-ignore-notes": {
                label: "Ignore Notes",
                title: "Ignore the ban notes field when checking for flags.",
                type: "checkbox",
                default: false,
            },
            "flag-salt": {
                label: "Salt",
                title: "DO NOT SHARE THIS! Ctrl + A, Ctrl + C to copy. The salt to use when hashing the field values. If this is changed, all hashes need to be regenerated.",
                type: "text",
                default: "",
            },
            "flag-colour": {
                label: "List Bans Flag Colour",
                title: "The colour to use for the field flag on the List Bans page. Any valid CSS colour is allowed.",
                type: "text",
                default: "rgba(255, 0, 0, 0.25)",
            },
            "flag-alert": {
                label: "Alert Style",
                title: "What alert to use for the flag message.<br>success, info, warning, danger",
                type: "select",
                options: ["success", "info", "warning", "danger"],
                default: "info",
            },
            "flag-fields-unchecked": {
                label: "Flag Fields",
                type: "textarea",
                save: false,
                default: "",
            },
            "flag-fields": {
                type: "hidden",
                default: "",
            },
        },
        events: {
            init: function () {
                GM_config.set(
                    "presets-add-unchecked",
                    GM_config.get("presets-add")
                );
                GM_config.set(
                    "presets-edit-unchecked",
                    GM_config.get("presets-edit")
                );
                GM_config.set(
                    "flag-fields-unchecked",
                    GM_config.get("flag-fields")
                );
                if ((GM_config.get("flag-salt") as string).length == 0) {
                    GM_config.set(
                        "flag-salt",
                        [...Array(45)]
                            .map(() => (~~(Math.random() * 36)).toString(36))
                            .join("")
                    );
                    GM_config.save();
                }
            },
            open: function (doc) {
                GM_config.fields[
                    "presets-add-unchecked"
                ].node?.addEventListener(
                    "change",
                    function () {
                        const presets = GM_config.get(
                            "presets-add-unchecked",
                            true
                        ) as string;

                        if (
                            presets
                                .split(/\r?\n/)
                                .every((line) =>
                                    line.match(
                                        /^[^;\r\n]+;[^;\r\n]*;\d*;[^;\r\n]*;[^;\r\n]*;[^;\r\n]*$/
                                    )
                                )
                        )
                            GM_config.set("presets-add", presets);
                    },
                    false
                );
                GM_config.fields[
                    "presets-edit-unchecked"
                ].node?.addEventListener(
                    "change",
                    function () {
                        const presets = GM_config.get(
                            "presets-edit-unchecked",
                            true
                        ) as string;

                        if (
                            presets
                                .split(/\r?\n/)
                                .every((line) =>
                                    line.match(
                                        /^[^;\r\n]+;\d*;[^;\r\n]*;[^;\r\n]*;[^;\r\n]*;[^;\r\n]*$/
                                    )
                                )
                        )
                            GM_config.set("presets-edit", presets);
                    },
                    false
                );
                GM_config.fields[
                    "flag-fields-unchecked"
                ].node?.addEventListener(
                    "change",
                    function () {
                        const flagFields = GM_config.get(
                            "flag-fields-unchecked",
                            true
                        ) as string;

                        if (
                            flagFields
                                .split(/\r?\n/)
                                .every((line) =>
                                    line.match(/^[^;\r\n]+;[^;\r\n]+$/)
                                )
                        )
                            GM_config.set("flag-fields", flagFields);
                    },
                    false
                );
            },
            save: function (forgotten) {
                if (GM_config.isOpen) {
                    if (
                        forgotten["presets-add-unchecked"] !==
                        GM_config.get("presets-add")
                    )
                        alert(
                            'Invalid preset format for "Add Ban Presets", value not saved.\nVerify that each line has 6 semicolon-separated values, the preset name is not empty, and that length is either empty or a number > 0.'
                        );
                    if (
                        forgotten["presets-edit-unchecked"] !==
                        GM_config.get("presets-edit")
                    )
                        alert(
                            'Invalid preset format for "Edit Ban Presets", value not saved.\nVerify that each line has 6 semicolon-separated values, the preset name is not empty, and that length is either empty or a number > 0.'
                        );
                    if (
                        forgotten["flag-fields-unchecked"] !==
                        GM_config.get("flag-fields")
                    )
                        alert(
                            'Invalid flag format for "Flag Fields", value not saved.\nVerify that each line has 2 semicolon-separated values.'
                        );
                }
            },
        },
        css: "textarea {width: 100%; height: 160px; resize: vertical;} #maul-config_field_flag-salt {filter: blur(6px)} #maul-config_field_flag-salt:focus {filter: blur(0)}",
    });
    const dropdownMenu = document.querySelector(
        ".user-dropdown > ul.dropdown-menu"
    );
    if (dropdownMenu) {
        const configButton = document.createElement("li");
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
}

/**
 * Loads known admins from the admins resource into the knownAdmins dictionary
 */
function loadAdmins() {
    const admins = GM_getResourceText("admins");
    admins.split("\n").forEach((line: string) => {
        const separator = line.lastIndexOf("|");
        const username = line.substring(0, separator);
        const id = line.substring(separator + 1);
        knownAdmins[username] = id;
    });
}

/**
 * Attempt to retrieve the username of the current logged in user from the navbar
 */
function loadUsername() {
    if (USERNAME) return;
    const dropdown = document.querySelector(
        "a.dropdown-toggle"
    ) as HTMLAnchorElement;
    if (dropdown) USERNAME = dropdown.innerText.trim();
}

/**
 * Loads presets from the config
 */
function loadPresets() {
    if (presetsAdd.length > 0 || presetsEdit.length > 0) return;

    const presetsAddRaw = GM_config.get("presets-add") as string;
    const presetsEditRaw = GM_config.get("presets-edit") as string;

    presetsAddRaw.split(/\r?\n/).forEach((line) => {
        const parts = line.split(";");
        if (parts.length != 6) {
            alert("Invalid preset: " + line);
            return;
        }
        presetsAdd.push({
            name: parts[0],
            handle: parts[1],
            length: parts[2].match(/^\d+$/) ? parseInt(parts[2]) : parts[2],
            reason: parts[3],
            pa: parts[4].length > 0,
            notes: parts[5],
        });
    });
    presetsEditRaw.split(/\r?\n/).forEach((line) => {
        const parts = line.split(";");
        if (parts.length != 6) {
            alert("Invalid preset: " + line);
            return;
        }
        presetsEdit.push({
            name: parts[0],
            length: parts[1].match(/^\d+$/) ? parseInt(parts[1]) : parts[1],
            reason: parts[2],
            pa: parts[3].length > 0,
            notes: parts[4],
            addUsername: parts[5].length > 0,
        });
    });
}

/**
 * Loads flag fields from the config
 */
function loadFlagFields() {
    const flagFieldsRaw = GM_config.get("flag-fields") as string;
    if (flagFieldsRaw.length == 0) return;
    flagFieldsRaw.split(/\r?\n/).forEach((line) => {
        const parts = line.split(";");
        if (parts.length != 2) {
            alert("Invalid flag field: " + line);
            return;
        }
        flagFields[parts[0]] = parts[1];
    });
}

function loadSteamIDRegex() {
    STEAMID_REGEX = new RegExp(GM_config.get("steamid-regex") as string, "g");
}

/**
 * Adds presets for ban reason/duration/notes
 */
function handleAddBan(hash: string = "") {
    const div = createPresetDiv();

    // Set default dropdown options
    (document.getElementById("division") as HTMLSelectElement).selectedIndex =
        GM_config.get("autoselect-division") as number;
    (document.getElementById("idTypeId") as HTMLSelectElement).selectedIndex =
        GM_config.get("autoselect-gameid") as number;
    if (GM_config.get("autoselect-gameid") != 0)
        (document.getElementById("gameId") as HTMLInputElement).disabled =
            false;

    // Insert presets
    for (var i = 0; i < presetsAdd.length; i++) {
        addMAULPreset(
            presetsAdd[i].name,
            i.toString(),
            div,
            function (this: HTMLElement) {
                const preset =
                    presetsAdd[this.dataset.presetId as unknown as number];
                if (preset.handle)
                    (
                        document.getElementById("handle") as HTMLInputElement
                    ).value = preset.handle;
                if (typeof preset.length === "number") {
                    (
                        document.getElementById("length") as HTMLInputElement
                    ).value = preset.length as unknown as string;
                    if (preset.length == 0)
                        (
                            document.getElementById(
                                "length"
                            ) as HTMLInputElement
                        ).disabled = true;
                }
                if (preset.reason)
                    (
                        document.getElementById("reason") as HTMLInputElement
                    ).value = preset.reason;
                if (preset.notes)
                    (
                        document.getElementById("notes") as HTMLTextAreaElement
                    ).value = preset.notes;
                (
                    document.getElementById(
                        "preventAmnesty"
                    ) as HTMLInputElement
                ).checked = preset.pa;
            }
        );
    }

    // If this is an add ban short URL, fill in the specified fields. Only fill if the field is not disabled
    if (
        hash.length > 0 &&
        !(document.getElementById("gameId") as HTMLInputElement).disabled
    ) {
        const data: AddBan_Data = JSON.parse(
            LZString.decompressFromEncodedURIComponent(hash)
        );
        if (data.name)
            (document.getElementById("handle") as HTMLInputElement).value =
                data.name;
        if (data.threadId)
            (
                document.getElementById("notes") as HTMLTextAreaElement
            ).value = `https://edgegamers.com/threads/${data.threadId}/\n\n`;
        (document.getElementById("gameId") as HTMLInputElement).value = data.id;
        (
            document.querySelector("input[name='redirect']") as HTMLInputElement
        ).value = `https://maul.edgegamers.com/index.php?page=bans&qType=gameId&q=${data.id}`;
    }
}

/**
 * Adds presets for ban evasion, and misc. utility buttons
 */
function handleEditBan() {
    const div = createPresetDiv();

    // Insert presets
    for (var i = 0; i < presetsEdit.length; i++) {
        addMAULPreset(
            presetsEdit[i].name,
            i.toString(),
            div,
            function (this: HTMLElement) {
                const preset =
                    presetsEdit[this.dataset.presetId as unknown as number];
                if (typeof preset.length === "number") {
                    (
                        document.getElementById("length") as HTMLInputElement
                    ).value = preset.length as unknown as string;
                    if (preset.length == 0)
                        (
                            document.getElementById(
                                "length"
                            ) as HTMLInputElement
                        ).disabled = true;
                }
                if (preset.reason)
                    (
                        document.getElementById("reason") as HTMLInputElement
                    ).value = preset.reason;
                if (preset.notes)
                    (
                        document.getElementById("notes") as HTMLTextAreaElement
                    ).value +=
                        "\n\n" +
                        preset.notes +
                        (preset.addUsername ? " " + USERNAME : "");
                (
                    document.getElementById(
                        "preventAmnesty"
                    ) as HTMLInputElement
                ).checked = preset.pa;
            }
        );
    }

    // Steam ID buttons
    const idGroup = document.querySelector(
        ".control-label[for=gameId]"
    )?.parentElement;
    const id = idGroup?.querySelector("p")?.innerText;
    if (id) {
        const idDiv = document.createElement("div");
        idDiv.style.display = "flex";
        idDiv.style.flexDirection = "row";
        idDiv.style.paddingTop = "10px";
        idGroup?.appendChild(idDiv);
        idDiv.appendChild(
            createLinkButton(
                "Steam",
                "https://steamcommunity.com/profiles/" + id
            )
        );
        idDiv.appendChild(
            createLinkButton(
                "GameME",
                "https://edgegamers.gameme.com/search?si=uniqueid&rc=all&q=" +
                    SteamIDConverter.toSteamID(id)
            )
        );
        idDiv.appendChild(
            createLinkButton("SteamID (IO)", "https://steamid.io/lookup/" + id)
        );
        idDiv.appendChild(
            createLinkButton("SteamID (UK)", "https://steamid.uk/profile/" + id)
        );
    }

    // IP buttons
    const ipGroup = Array.from(
        document.querySelectorAll(".control-label")
    ).find((el) => el.textContent === "IP")?.parentElement; // BECAUSE MAUL HAS THE IP LABELED WITH THE WRONG FOR
    const ip = ipGroup?.querySelector("p")?.innerText;
    if (ip) {
        const ip_div = document.createElement("div");
        ip_div.style.display = "flex";
        ip_div.style.flexDirection = "row";
        ip_div.style.paddingTop = "10px";
        ipGroup?.appendChild(ip_div);
        ip_div.appendChild(
            createLinkButton(
                "Check Spur",
                GM_config.get("spur-account")
                    ? `https://spur.us/app/context?q=${ip}`
                    : `https://spur.us/context/${ip}`,
                "_blank"
            )
        );
        ip_div.appendChild(
            createLinkButton(
                "Check IPInfo",
                "https://ipinfo.io/" + ip,
                "_blank"
            )
        );
    }

    // Search for flag fields
    if (GM_config.get("flag-enabled"))
        findFlagFields(
            Array.from(
                document.querySelectorAll(
                    "div > p.form-control-static, div > input:not(input#preventAmnesty)" +
                        (GM_config.get("flag-ignore-notes")
                            ? ""
                            : ", div > textarea")
                )
            )
        ).then((arr) => {
            const insEl = div.parentElement!;
            const presetHeader = insEl.querySelector("h4");
            arr.forEach((result) => {
                const alert = document.createElement("div");
                alert.classList.add(
                    "alert",
                    "alert-" + GM_config.get("flag-alert")
                );
                alert.innerText = result.message;
                insEl.insertBefore(alert, presetHeader);
            });
            if (arr.length > 0)
                insEl.insertBefore(document.createElement("hr"), presetHeader);
        });
}

/**
 * Automatically converts old links to updated ones, and adds a GameME link
 */
function handleProfile() {
    const userNotes = [
        ...document.querySelectorAll("div.col-xs-6 > div > div:nth-child(3)"),
    ];
    userNotes.forEach((userNote) => {
        if (
            !userNote.textContent ||
            (userNote.innerHTML.includes("<") &&
                userNote.innerHTML.includes(">"))
        )
            // Empty or possible HTML injection
            return;
        userNote.innerHTML = userNote.textContent
            .replaceAll(/&amp;/g, "&") // Replace &amp; with &
            .replaceAll(
                /(?:https?:\/\/)?(?:www\.)?edge-gamers\.com\/forums\/showthread\.php\?p=(\d+)(?:#?post(\d+))?/g,
                function (match, threadId, postId) {
                    return generateForumsURL(threadId, postId);
                }
            )
            .replaceAll(
                /(?:https?:\/\/)?(?:www\.)?edge-gamers\.com\/forums\/showthread\.php\?(\d+)[\-a-zA-Z]*/g,
                function (match, threadId) {
                    return generateForumsURL(threadId, null);
                }
            )
            .replaceAll(
                /https?:\/\/(www\.)?[-a-zA-Z0-9.]{1,256}\.[a-zA-Z0-9]{2,6}\b(\/[-a-zA-Z0-9@:%_\+.~#?&\/=]*)/g,
                '<a href="$&" target="_blank" rel="external">$&</a>'
            )
            .replaceAll(
                /([^\/\d]|^)(\d{17})([^\/\d]|$)/g,
                '$1<a href="https://maul.edgegamers.com/index.php?page=bans&qType=gameId&q=$2" target="_blank">$2</a>$3'
            );
    });

    // Attempt to get Source ID
    const sourceIdHref = document.querySelector(
        'span.floatRight > a[href^="https://steamcommunity.com/profiles/"]'
    ) as HTMLAnchorElement;
    const id = sourceIdHref.innerText;
    const btn = createLinkButton(
        "GameME",
        "https://edgegamers.gameme.com/search?si=uniqueid&rc=all&q=" +
            SteamIDConverter.toSteamID(id),
        "_blank"
    );
    btn.classList.remove("btn", "btn-default");
    sourceIdHref.parentElement?.insertBefore(btn, sourceIdHref);
}

/**
 * Handles the List Bans page
 */
function handleBanList() {
    convertBanningAdmins();
    convertGameIDs();
    updateBanNoteURLs();
    convertDurationFields();
    if (GM_config.get("convert-search"))
        document
            .querySelector(
                "div.form-group.input-group > span.input-group-btn > button"
            )
            ?.addEventListener("click", function () {
                if (
                    (document.getElementById("banQType") as HTMLSelectElement)
                        .value == "gameId"
                ) {
                    const searchBox = document.querySelector(
                        "div.form-group.input-group > input[name='q']"
                    ) as HTMLInputElement | undefined;
                    const id = searchBox?.value;
                    if (
                        id &&
                        (SteamIDConverter.isSteamID(id) ||
                            SteamIDConverter.isSteamID3(id))
                    ) {
                        searchBox.value = SteamIDConverter.toSteamID64(id);
                    }
                }
            });
    if (GM_config.get("flag-enabled"))
        findFlagFields(
            Array.from(
                document.querySelectorAll(
                    "tbody > tr > td:not(.text-center)"
                ) as NodeListOf<HTMLTableRowElement>
            ).filter(
                (el) =>
                    el.innerText.trim() != "" &&
                    el.parentElement?.style.display != "none"
            )
        ).then((arr) => {
            arr.forEach((result) => {
                result.element.style.backgroundColor = GM_config.get(
                    "flag-colour"
                ) as string;
                result.element.title = result.message;
            });
        });
}

/**
 * Adds hyperlinks to each admin within a string
 * @param {string} str
 * @returns {string} The string with hyperlinks
 */
function assignAdminsOnlineHyperlink(str: string) {
    for (const admin of str.split(", ")) {
        const id = knownAdmins[admin];
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
    const headers = document.querySelectorAll(
        ".expand > td > span.pull-left"
    ) as NodeListOf<HTMLSpanElement>;
    let wasAdminOnline = false;
    for (const header of headers) {
        if (header.innerText === "Admins Online:") {
            wasAdminOnline = true;
            continue;
        } else if (!wasAdminOnline) continue;
        // Last header was Admins Online
        header.innerHTML = assignAdminsOnlineHyperlink(header.innerText);
        wasAdminOnline = false;
    }
}

/**
 * Changes Game IDs wo/ MAUL accounts to link to their personal List Bans page
 */
function convertGameIDs() {
    const banIDs = Array.from(
        document.querySelectorAll(
            "table.table-bordered td:not([class]):nth-child(3)"
        )
    ).filter((el) => !el.querySelector("a")) as HTMLTableCellElement[];
    banIDs.forEach((el) => {
        const id =
            el.childElementCount == 1 && el.firstChild!.nodeName === "SPAN"
                ? (el.firstChild! as HTMLSpanElement).title
                : el.innerText;
        el.innerHTML = `<i><a href="https://maul.edgegamers.com/index.php?page=bans&qType=gameId&q=${id}" style="color: inherit">${el.innerHTML}</a></i>`;
    });
}

/**
 * Converts the Duration on bans to show a more human readable version on hover.
 */
function convertDurationFields() {
    const banDurations = document.querySelectorAll(
        "table.table-bordered td:nth-child(5)"
    ) as NodeListOf<HTMLTableCellElement>;

    const convertMinutesToHuman = (minutes: number) => {
        const units: any = {
            year: 24 * 60 * 365,
            month: 24 * 60 * 30,
            week: 24 * 60 * 7,
            day: 24 * 60,
            hour: 60,
            minute: 1,
        };

        let str = undefined;

        for (const name in units) {
            const p = Math.floor(minutes / units[name]);

            if (p == 1) {
                str = `${p} ${name}`;
                break;
            }

            if (p >= 2) {
                str = `${p} ${name}s`;
                break;
            }

            minutes %= units[name];
        }

        return str;
    };

    banDurations.forEach((el: HTMLTableCellElement) => {
        let value = el.innerText;
        if (value == "Permanent") return;

        let convertedDuration = undefined;

        // The ban is not expired yet.
        if (value.includes("(")) {
            value = value.replaceAll("(", "").replaceAll(")", "");

            const split = value.split(" ");
            if (split.length != 2) return;

            const banDuration = Number(split[0]);

            const convertedExpiration = moment(
                (el.parentElement!.firstElementChild as HTMLTableCellElement)
                    .innerText
            )
                .add(banDuration, "minutes")
                .format(GM_config.get("datetimeformat-expiration") as string);

            convertedDuration = convertMinutesToHuman(banDuration);
            convertedDuration += ` (expires ${convertedExpiration})`;
        } else {
            convertedDuration = convertMinutesToHuman(Number(value));
        }

        if (!convertedDuration) return;

        el.setAttribute("title", convertedDuration);
    });
}

/**
 * Find all fields that match user provided flagFields
 * @param {Array<HTMLElement>} elements Elements to search through
 * @returns {Array<Flag_Field_Result>} Elements that match the flagFields
 */
async function findFlagFields(
    elements: Array<HTMLElement>
): Promise<Array<Flag_Field_Result>> {
    const results: Array<Flag_Field_Result> = [];
    for (const el of elements) {
        var value = (
            el.innerText ||
            (el as HTMLInputElement).value ||
            el.innerHTML
        ).trim();
        if (GM_config.get("flag-force-lowercase")) value = value.toLowerCase();
        const hash = await generateHash(value + GM_config.get("flag-salt"));
        const msg = flagFields[hash];
        if (msg) results.push({ element: el, message: msg });
    }
    return results;
}

/**
 * Adds hyperlinks to the Ban Notes fields (both Steam IDs and URLs)
 */
function updateBanNoteURLs() {
    const banNotes = document.querySelectorAll("span[id*=notes].col-xs-10");
    banNotes.forEach((banNote) => {
        const unescapedInnerHTML = banNote.innerHTML.replaceAll(/&amp;/g, "&"); // Replace &amp; with &
        // Replace the text with a linkified version
        const replaced = unescapedInnerHTML
            .replaceAll(
                /https?:\/\/(www\.)?[-a-zA-Z0-9.]{1,256}\.[a-zA-Z0-9]{2,6}\b(\/[-a-zA-Z0-9@:%_\+.~#?&\/=]*)/g,
                '<a href="$&" target="_blank" rel="external">$&</a>'
            )
            .replaceAll(
                STEAMID_REGEX, // The most finnicky regex in history, too many false-positives and false-negatives. User configurable for that reason.
                '$1<a href="https://maul.edgegamers.com/index.php?page=bans&qType=gameId&q=$2" target="_blank">$2</a>$3'
            );
        // If the text hasn't been changed, move on
        if (replaced === unescapedInnerHTML) return;
        // Store the original text as a data attribute
        (banNote as HTMLSpanElement).dataset.original = banNote.innerHTML;
        // Replace the text with a linkified version
        banNote.innerHTML = replaced;
        // Add an event listener to the edit button to restore the original text. The edit notes button takes the text from the span, and we need to avoid having the linkified text in the edit box.
        const editNotes = (
            banNote as HTMLSpanElement
        ).parentElement?.querySelector("span.edit_note_button");
        // We're using mousedown instead of click because the click event fires too late, and the textarea is already populated with the linkified text. The textarea is populated during click/mouseup, so mousedown fires before that.
        function handleEditNotesClick(event: MouseEvent) {
            banNote.innerHTML = (banNote as HTMLSpanElement).dataset
                .original as string;
            event.target?.removeEventListener(
                "mousedown",
                handleEditNotesClick as EventListener
            );
            delete (banNote as HTMLSpanElement).dataset.original;
        }
        editNotes?.addEventListener(
            "mousedown",
            handleEditNotesClick as EventListener
        );
    });
}

(function () {
    // Setup configuration stuff
    setupMAULConfig();
    loadPresets();
    loadFlagFields();
    loadSteamIDRegex();

    // Determine what page we're on
    const url = window.location.href;
    const hash = window.location.hash;
    loadUsername();

    if (
        url.match(
            /^https:\/\/maul\.edgegamers\.com\/index\.php\?page=editban\/?(?:#.+)?$/
        )
    )
        // Add Ban Page (not Edit, that will have &id=12345 in the URL)
        handleAddBan(hash.substring(1));
    else if (
        url.match(
            /^https:\/\/maul\.edgegamers\.com\/index\.php\?page=editban&id=\d+\/?$/
        )
    )
        // Edit Ban Page
        handleEditBan();
    else if (
        url.match(
            /^https:\/\/maul\.edgegamers\.com\/index\.php\?page=home&id=\d+\/?$/
        )
    )
        // Profile Page
        handleProfile();
    else if (
        url.match(
            /^https:\/\/maul\.edgegamers\.com\/index\.php\?.*page=bans.*$/
        )
    )
        // List Ban Page
        handleBanList();
})();
