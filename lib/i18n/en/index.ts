// English source strings, one file per area. Keys are "area.key"; values may use {name} placeholders.
// Plurals: give "key_one" and "key_other" and pass { count }.
import shell from "./shell";
import artist from "./artist";
import chat from "./chat";
import pop from "./pop";
import you from "./you";
import home from "./home";
import artists from "./artists";
import unlock from "./unlock";
import common from "./common";

const en = { shell, artist, chat, pop, you, home, artists, unlock, common };
export default en;
export type Messages = typeof en;
