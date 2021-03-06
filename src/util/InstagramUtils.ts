import { ApplicationConfiguration, ModuleConfiguration } from "botyo-api";
import * as request from "request";
import { Readable } from "stream";
import * as url from "url";
import InstagramCommand from "../modules/InstagramCommand";
import InstagramSneakPeekFilter from "../modules/InstagramSneakPeekFilter";
import DuplexThrough from "./DuplexThrough";


const Instagram = require("instagram-private-api").V1;

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
    }

    export function createStreamForUrl(theUrl: string): Readable
    {
        const dt = new DuplexThrough({ highWaterMark: 64 * 1024 });

        // Hack alert! Trick request into thinking this is a stream created by fs.createReadStream
        // so that it guesses the mime-type by the pathname.
        (dt as any).path = url.parse(theUrl).pathname;
        (dt as any).mode = 1; // doesn't really matter

        request.get(theUrl).pipe(dt);

        return dt;
    }

    export function getAssetUrlsOfMedia(media: any): string[]
    {
        const urls: string[] = [];

        // This is needed because instagram-private-api has a bug that mutates
        // internal data structures when calling `media.params` multiple times
        const mediaParams = media.params;

        if (mediaParams.carouselMedia && mediaParams.carouselMedia.length > 0) {
            // This post has multiple photos/videos
            for (const m of mediaParams.carouselMedia) {
                urls.push(getAssetUrlOfSingleMedia(m));
            }
        } else {
            // This is a single photo/video
            urls.push(getAssetUrlOfSingleMedia(mediaParams));
        }

        return urls;
    }

    function getAssetUrlOfSingleMedia(media: any): string
    {
        const root = media.params || media; // some media contain their useful info in params prop

        if (root.videos && root.videos.length > 0) {
            return getUrlOfBiggestAsset(root.videos); // this exists only for videos
        } else {
            return getUrlOfBiggestAsset(root.images); // this exists for photos AND videos
        }
    }

    function getUrlOfBiggestAsset(imagesOrVideosObj: { width: number, height: number, url: string }[]): string
    {
        const sorted = imagesOrVideosObj.sort((img1, img2) => (img2.width * img2.height) - (img1.width * img1.height));
        return sorted[0].url;
    }
}

export default InstagramUtils;