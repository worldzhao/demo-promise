const PENDING = "pending";
const FULFILLED = "fulfilled";
const REJECTED = "rejected";

class MyPromise {
  static resolve(value) {
    if (value instanceof MyPromise) {
      return value;
    }
    return new MyPromise((resolve) => resolve(value));
  }

  static reject = (reason) => {
    return new MyPromise((resolve, reject) => reject(reason));
  };

  static all(promises) {
    return new MyPromise((resolve, reject) => {
      const len = promises.length;
      const result = [];
      let index = 0;
      promises.forEach((p, i) => {
        p.then(
          (res) => {
            result[i] = res;
            index++;
            if (index === len) {
              resolve(result);
            }
          },
          (err) => reject(err)
        );
      });
    });
  }

  static race(promises) {
    return new Promise((resolve, reject) => {
      promises.forEach((p) => {
        p.then(
          (res) => {
            resolve(res);
          },
          (err) => reject(err)
        );
      });
    });
  }

  constructor(executor) {
    this._status = PENDING;
    this._value = undefined;
    this._resolveQueue = [];
    this._rejectQueue = [];

    let _resolve = (value) => {
      const run = () => {
        if (this._status !== PENDING) return;
        this._status = FULFILLED;
        this._value = value;
        while (this._resolveQueue.length) {
          const fn = this._resolveQueue.shift();
          fn(value);
        }
      };
      // 保证异步调用
      setTimeout(run);
    };

    let _reject = (reason) => {
      const run = () => {
        if (this._status !== PENDING) return;
        this._status = REJECTED;
        this._value = reason;
        while (this._rejectQueue.length) {
          const fn = this._rejectQueue.shift();
          fn(reason);
        }
      };
      setTimeout(run);
    };

    executor(_resolve, _reject);
  }

  then(resolveFn, rejectFn) {
    // 根据规范，如果then的参数不是function，则我们需要忽略它, 让链式调用继续往下执行
    if (typeof resolveFn !== "function") resolveFn = (value) => value;
    if (typeof rejectFn !== "function")
      rejectFn = (reason) => {
        throw new Error(reason instanceof Error ? reason.message : reason);
      };

    return new MyPromise((resolve, reject) => {
      const fulfilledFn = (value) => {
        try {
          const x = resolveFn(value);
          // 分类讨论返回值,如果是Promise,那么等待Promise状态变更,否则直接resolve
          x instanceof MyPromise ? x.then(resolve, reject) : resolve(x);
        } catch (error) {
          reject(error);
        }
      };

      const rejectedFn = (reason) => {
        try {
          const x = rejectFn(reason);
          x instanceof MyPromise ? x.then(resolve, reject) : reject(x);
        } catch (error) {
          reject(error);
        }
      };

      switch (this._status) {
        case PENDING:
          this._resolveQueue.push(fulfilledFn);
          this._rejectQueue.push(rejectedFn);
          break;
        // 当状态已经变为resolve/reject时,直接执行then回调
        case FULFILLED:
          fulfilledFn(this._value);
          break;
        case REJECTED:
          rejectedFn(this._value);
          break;
        default:
          break;
      }
    });
  }

  catch(rejectedFn) {
    return this.then(undefined, rejectedFn);
  }

  finally(callback) {
    return this.then(
      (value) => MyPromise.resolve(callback()).then(() => value),
      (reason) =>
        MyPromise.resolve(callback()).then(() => {
          throw reason;
        })
    );
  }
}
