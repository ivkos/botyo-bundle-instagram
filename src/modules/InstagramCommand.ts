import * as Bluebird from "bluebird";
import { AbstractCommandModule, Message } from "botyo-api";
import InstagramUtils from "../util/InstagramUtils";

const Instagram = require("instagram-private-api").V1;
const findHashtags = require("find-hashtags");

export default class InstagramCommand extends AbstractCommandModule
{
    // http://blog.jstassen.com/2016/03/code-regex-for-instagram-username-and-hashtags/
    static readonly REGEX_USERNAME =
        /(?:@)([A-Za-z0-9_](?:(?:[A-Za-z0-9_]|(?:\.(?!\.))){0,28}(?:[A-Za-z0-9_]))?)/;
    private sessionPromise: Promise<any>;

    constructor()
    {
        super();

        this.sessionPromise = InstagramUtils.createSession(
            this.getRuntime().getConfiguration(),
            this.getRuntime().getApplicationConfiguration()
        );
    }

    getCommand(): string
    {
        return "ig";
    }

    getDescription(): string
    {
        return "Posts Instagram photos of @user or ones tagged with #hashtag";
    }

    getUsage(): string
    {
        return "[latest] <@user | #hashtag>";
    }

    validate(msg: Message, args: string): boolean
    {
        return args.length > 0 &&
            (InstagramCommand.parseUsername(args) !== undefined || InstagramCommand.parseHashtag(args) !== undefined);
    }

    async execute(msg: Message, args: string): Promise<any>
    {
        const isLatest = args.startsWith("latest");

        const username = InstagramCommand.parseUsername(args);
        const hashtag = InstagramCommand.parseHashtag(args);

        const chatApi = this.getRuntime().getChatApi();

        if (username !== undefined && hashtag === undefined) {
            return Bluebird.resolve(this
                .getAssetUrlsOfMediaByUsername(username, isLatest))
                .then(urls => chatApi.sendMessage(msg.threadID, {
                    attachment: urls.map(InstagramUtils.createStreamForUrl)
                }))
                .catch(Instagram.Exceptions.IGAccountNotFoundError,
                    () => chatApi.sendMessage(msg.threadID, "No such Instagram user."))
                .catch(Instagram.Exceptions.PrivateUserError,
                    () => chatApi.sendMessage(msg.threadID, `@${username}'s profile is private.`))
                .catch(EmptyResultsError,
                    () => chatApi.sendMessage(msg.threadID, `@${username} has no photos`));
        }

        if (hashtag !== undefined && username === undefined) {
            return Bluebird.resolve(this
                .getAssetUrlsOfMediaByHashtag(hashtag, isLatest))
                .then(urls => chatApi.sendMessage(msg.threadID, {
                    attachment: urls.map(InstagramUtils.createStreamForUrl)
                }))
                .catch(EmptyResultsError, () => chatApi.sendMessage(msg.threadID, `@${username} has no photos`));
        }

        throw new Error("Illegal state.");
    }

    private async getAssetUrlsOfMediaByHashtag(hashtag: string, isLatest: boolean): Promise<string[]>
    {
        const session = await this.sessionPromise;

        const mediaList = await new Instagram.Feed.TaggedMedia(session, hashtag).get();
        if (!mediaList || mediaList.length === 0) throw new EmptyResultsError();

        const media = InstagramCommand.pick<any>(mediaList, isLatest);

        return InstagramUtils.getAssetUrlsOfMedia(media);
    }

    private async getAssetUrlsOfMediaByUsername(username: string, isLatest: boolean): Promise<string[]>
    {
        const session = await this.sessionPromise;
        const user = await this.getUserByUsernameOrCloseEnough(username);

        const mediaList = await new Instagram.Feed.UserMedia(session, user.id).get();
        if (!mediaList || mediaList.length === 0) throw new EmptyResultsError();

        const media = InstagramCommand.pick<any>(mediaList, isLatest);

        return InstagramUtils.getAssetUrlsOfMedia(media);
    }

    private async getUserByUsernameOrCloseEnough(username: string): Promise<any>
    {
        const session = await this.sessionPromise;

        return Bluebird.resolve(Instagram.Account.searchForUser(session, username))
            .then((user: any) => [user])
            .catch(Instagram.Exceptions.IGAccountNotFoundError, () => Instagram.Account.search(session, username))
            .then((users: any[]) => users && users.length > 0
                ? users[0]
                : Promise.reject(new Instagram.Exceptions.IGAccountNotFoundError()));
    }

    private static pick<T>(collection: T[], first: boolean): T | undefined
    {
        if (!collection || collection.length === 0) return;

        return first ? collection[0] : collection[~~(Math.random() * collection.length)];
    }

    private static parseUsername(args: string): string | undefined
    {
        const matches = args.match(this.REGEX_USERNAME);

        if (!(matches !== null && findHashtags(args).length == 0)) return;

        return matches[1];
    }

    private static parseHashtag(args: string): string | undefined
    {
        const hashtags = findHashtags(args);

        if (!(hashtags.length > 0 && !this.REGEX_USERNAME.test(args))) return;

        return hashtags[0];
    }
}

class EmptyResultsError extends Error
{
    constructor(msg?: string)
    {
        super(msg);
    }
}