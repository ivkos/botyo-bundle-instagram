import { Duplex, DuplexOptions } from "stream";

export default class DuplexThrough extends Duplex
{
    constructor(opts?: DuplexOptions)
    {
        super(opts);
    }

    _write(chunk: any, encoding: string, callback: (err?: Error) => void): void
    {
        this.push(chunk, encoding);
        callback();
    }

    _read(size: number): void
    {
        return;
    }

    _final(callback: Function): void
    {
        this.push(null);
        callback();
    }
}