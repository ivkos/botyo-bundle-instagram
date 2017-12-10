import { Bundle } from "botyo-api";
import InstagramSneakPeekFilter from "./modules/InstagramSneakPeekFilter";
import InstagramCommand from "./modules/InstagramCommand";

const BUNDLE = Bundle.ofModules([
    InstagramSneakPeekFilter,
    InstagramCommand
]);

export {
    InstagramSneakPeekFilter,
    InstagramCommand,
    BUNDLE as InstagramBundle
};