import { AbstractFilterModule, Message } from "botyo-api";
import InstagramUtils from "../util/InstagramUtils";
import * as Bluebird from "bluebird";
import * as request from "request";
import DuplexThrough from "../util/DuplexThrough";
import * as url from "url";
import { Readable } from "stream";

const Instagram = require('instagram-private-api').V1;

export default class InstagramSneakPeekFilter extends AbstractFilterModule
{
    private readonly sessionPromise: Promise<any>;
    private readonly maxPhotos: number;

    constructor()
    {
        super();

        this.sessionPromise = InstagramUtils.createSession(
            this.getRuntime().getConfiguration(),
            this.getRuntime().getApplicationConfiguration()
        );

        this.maxPhotos = this.getRuntime().getConfiguration().getOrElse<number, number>("maxPhotos", 3);
    }

    async filter(msg: Message): Promise<Message | void>
    {
        if (!msg.body) return msg;

        const regexResult = InstagramSneakPeekFilter.REGEX_URL.exec(msg.body);
        if (regexResult === null) return msg;

        const username = regexResult[1];

        // skip parsing some pages as usernames
        if (["p", "explore"].includes(username)) return msg;

        let theSession: any;
        this.sessionPromise
            .then(session => { theSession = session })
            .then(() => Bluebird.resolve(Instagram.Account.searchForUser(theSession, username)))
            .then(user => new Instagram.Feed.UserMedia(theSession, user.id).get())
            .then(media => {
                if (!media || media.length === 0) return;

                const numberOfPhotos = Math.min(this.maxPhotos, media.length);

                let urls = [];
                for (let i = 0; i < numberOfPhotos; i++) {
                    urls.push(media[i].params.images[0].url); // 0=full size, 1=smaller img
                }

                return this.getRuntime().getChatApi().sendMessage(msg.threadID, {
                    body: `Here's a sneak peek of @${username}`,
                    attachment: urls.map(InstagramSneakPeekFilter.createStreamForUrl)
                });
            })
            .catch(err => {
                this.getRuntime().getLogger().error(err);
            });

        return msg;
    }

    private static createStreamForUrl(theUrl: string): Readable
    {
        const dt = new DuplexThrough({ highWaterMark: 64 * 1024 });

        // Hack alert! Trick request into thinking this is a stream created by fs.createReadStream
        // so that it guesses the mime-type by the pathname.
        (dt as any).path = url.parse(theUrl).pathname;
        (dt as any).mode = 1; // doesn't really matter

        request.get(theUrl).pipe(dt);

        return dt;
    }

    static readonly REGEX_URL =
        /instagram\.com\/([A-Za-z0-9_](?:(?:[A-Za-z0-9_]|(?:\.(?!\.))){0,28}(?:[A-Za-z0-9_]))?)/;
}
