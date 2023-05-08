declare var SteamIDConverter: SteamIDConverter;

interface SteamIDConverter {
    isSteamID64(id: string): boolean;
    isSteamID3(id: string): boolean;
    isSteamID(id: string): boolean;
    toSteamID64(id: string): string;
    toSteamID3(id: string): string;
    toSteamID(id: string): string;
    profileURL(id: string): string;
}

interface AddBan_Data {
    name?: string | undefined;
    id: string;
    threadId?: string | undefined;
    reporter?: string | undefined; // Currently unused
    game?: string | undefined; // Currently unused
}
