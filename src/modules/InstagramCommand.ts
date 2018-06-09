import { AbstractCommandModule, Message } from "botyo-api";
import InstagramUtils from "../util/InstagramUtils";
import * as Bluebird from "bluebird";

const Instagram = require('instagram-private-api').V1;
const findHashtags = require("find-hashtags");

export default class InstagramCommand extends AbstractCommandModule
{
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
        const latest = args.startsWith("latest");

        const username = InstagramCommand.parseUsername(args);
        const hashtag = InstagramCommand.parseHashtag(args);

        const chatApi = this.getRuntime().getChatApi();

        if (username !== undefined && hashtag === undefined) {
            return Bluebird.resolve(this
                .getPhotoUrlByUsername(username, latest))
                .then(url => chatApi.sendMessage(msg.threadID, { attachment: InstagramUtils.createStreamForUrl(url) }))
                .catch(Instagram.Exceptions.IGAccountNotFoundError,
                    () => chatApi.sendMessage(msg.threadID, "No such Instagram user."))
                .catch(Instagram.Exceptions.PrivateUserError,
                    () => chatApi.sendMessage(msg.threadID, `@${username}'s profile is private.`))
                .catch(EmptyResultsError,
                    () => chatApi.sendMessage(msg.threadID, `@${username} has no photos`));
        }

        if (hashtag !== undefined && username === undefined) {
            return Bluebird.resolve(this
                .getPhotoUrlByHashtag(hashtag, latest))
                .then(url => chatApi.sendMessage(msg.threadID, { attachment: InstagramUtils.createStreamForUrl(url) }))
                .catch(EmptyResultsError, () => chatApi.sendMessage(msg.threadID, `@${username} has no photos`));
        }

        throw new Error("Illegal state.");
    }

    private async getPhotoUrlByHashtag(hashtag: string, latest: boolean): Promise<string>
    {
        const session = await this.sessionPromise;
        const media = await new Instagram.Feed.TaggedMedia(session, hashtag).get();

        if (media && media.length > 0) {
            const photo = InstagramCommand.pick<any>(media, latest);
            return InstagramUtils.getUrlOfBiggestImage(photo.params.images);
        }

        throw new EmptyResultsError();
    }

    private async getPhotoUrlByUsername(username: string, latest: boolean): Promise<string>
    {
        const session = await this.sessionPromise;
        const user = await this.getUserByUsernameOrCloseEnough(username);

        const media = await new Instagram.Feed.UserMedia(session, user.id).get();

        if (media && media.length > 0) {
            const photo = InstagramCommand.pick<any>(media, latest);
            return InstagramUtils.getUrlOfBiggestImage(photo.params.images);
        }

        throw new EmptyResultsError();
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

    // http://blog.jstassen.com/2016/03/code-regex-for-instagram-username-and-hashtags/
    static readonly REGEX_USERNAME =
        /(?:@)([A-Za-z0-9_](?:(?:[A-Za-z0-9_]|(?:\.(?!\.))){0,28}(?:[A-Za-z0-9_]))?)/;
}

class EmptyResultsError extends Error
{
    constructor(msg?: string)
    {
        super(msg);
    }
}