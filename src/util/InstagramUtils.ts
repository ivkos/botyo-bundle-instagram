import { ApplicationConfiguration, ModuleConfiguration } from "botyo-api";
import InstagramCommand from "../modules/InstagramCommand";
import InstagramSneakPeekFilter from "../modules/InstagramSneakPeekFilter";
import * as Bluebird from "bluebird";

const Instagram = require('instagram-private-api').V1;

namespace InstagramUtils
{
    const CONFIG_KEY_INSTAGRAM = "instagram";
    const CONFIG_KEY_COOKIES_FILE = "cookiesFile";
    const DEFAULT_COOKIES_FILE = "instagram_cookies.json";

    function resolveConfiguration(moduleConfig: ModuleConfiguration, appConfig: ApplicationConfiguration)
    {
        const config = {
            username: undefined,
            password: undefined
        };

        for (let key of Object.keys(config)) {
            (config as any)[key] = moduleConfig
                .getOrElse(key, appConfig.forModule(InstagramCommand)
                    .getOrElse(key, appConfig.forModule(InstagramSneakPeekFilter)
                        .getOrElse(key, appConfig
                            .getProperty(`${CONFIG_KEY_INSTAGRAM}.${key}`))));
        }

        const cookiesFile = moduleConfig
            .getOrElse(CONFIG_KEY_COOKIES_FILE, appConfig.forModule(InstagramCommand)
                .getOrElse(CONFIG_KEY_COOKIES_FILE, appConfig.forModule(InstagramSneakPeekFilter)
                    .getOrElse(CONFIG_KEY_COOKIES_FILE, appConfig
                        .getOrElse(`${CONFIG_KEY_INSTAGRAM}.${CONFIG_KEY_COOKIES_FILE}`, DEFAULT_COOKIES_FILE))));

        return {
            username: config.username,
            password: config.password,
            cookiesFile: cookiesFile
        };
    }

    export function createSession(moduleConfig: ModuleConfiguration, appConfig: ApplicationConfiguration)
    {
        const { username, password, cookiesFile } = resolveConfiguration(moduleConfig, appConfig);

        const device = new Instagram.Device(username);
        const storage = new Instagram.CookieFileStorage(cookiesFile);

        return Instagram.Session.create(device, storage, username, password);
    }}

export default InstagramUtils;