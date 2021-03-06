import * as Bluebird from "bluebird";
import { AbstractFilterModule, Message } from "botyo-api";
import InstagramUtils from "../util/InstagramUtils";

const Instagram = require("instagram-private-api").V1;

export default class InstagramSneakPeekFilter extends AbstractFilterModule
{
    static readonly REGEX_URL =
        /instagram\.com\/([A-Za-z0-9_](?:(?:[A-Za-z0-9_]|(?:\.(?!\.))){0,28}(?:[A-Za-z0-9_]))?)/;
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
            .then((userMediaList: any) => {
                if (!userMediaList || userMediaList.length === 0) return;

                const numberOfPhotos = Math.min(this.maxPhotos, userMediaList.length);

                const urls: string[] = [];
                for (let i = 0; i < numberOfPhotos; i++) {
                    urls.push(...InstagramUtils.getAssetUrlsOfMedia(userMediaList[i]));
                }

                return this.getRuntime().getChatApi().sendMessage(msg.threadID, {
                    body: `Here's a sneak peek of @${username}`,
                    attachment: urls.map(InstagramUtils.createStreamForUrl)
                }) as any;
            })
            .catch((err: any) => {
                this.getRuntime().getLogger().error(err);
            });

        return msg;
    }
}
