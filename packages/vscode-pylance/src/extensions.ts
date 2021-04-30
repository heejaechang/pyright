// Jest won't load index.d.ts so put it in the same file.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare interface Promise<T> {
    // Catches task error and ignores them.
    ignoreErrors(): void;
}

/* eslint-disable @typescript-eslint/no-empty-function */
// Explicitly tells that promise should be run asynchronously.
Promise.prototype.ignoreErrors = function <T>(this: Promise<T>) {
    this.catch(() => {});
};
