'use strict';

/**
 * @template R
 * @typedef {(error: unknown, result?: R) => void} TaskCallback
 */

/**
 * @typedef QueueOptions
 * @property {number} concurency - the max number of channels
 */

/**
 * @template {...any[]} Args
 * @typedef {Array<(...args: Args) => void>} Listeners
*/

/**
 * @template T - type of task
 * @template R - type of task processing result
*/
class Queue {
  /**
   * @constructor
   *
   * @param {(task: T, cb: TaskCallback<R>) => void} runTask
   * @param {QueueOptions} options - queue options
   *
   * @returns {Queue<T, R>}
   */
  constructor(runTask, { concurency }) {
    /** @private */
    this.runTask = runTask;

    /** @private */
    this.count = 0;

    /** @private */
    this.concurency = concurency;

    /**
     * @private
     * @type {Array<T>}
     */
    this.waiting = [];

    /**
     * @private
     * @type {Listeners<[R, T]>}
     */
    this.successListeners = [];

    /**
     * @private
     * @type {Listeners<[unkown, T]>}
     */
    this.failureListeners = [];

    /**
     * @private
     * @type {Listeners<[unkown, R | undefined, T]>}
     */
    this.doneListeners = [];

    /**
     * @private
     * @type {Listeners<[]>}
     */
    this.drainListeners = [];
  }

  /**
  * @param {(task: T, cb: TaskCallback<R>) => void} runTask
  * @param {QueueOptions} options - queue options
  *
  * @returns {Queue<T, R>}
  */
  static process(runTask, options) {
    return new Queue(runTask, options);
  }

  stats() {
    const { count, concurency, waiting } = this;
    return {
      count,
      concurency,
      waiting: waiting.length,
    };
  }

  /**
   * add - adds the new task to the queue
   * @public
   *
   * @param {T} task - task to be added to the queue
   *
   * @returns {void}
   */
  add(task) {
    this.waiting.push(task);
    this._next();
  }

  /**
   * Adds success listener.
   * Use `queue.removeSuccessListener(listener)` to remove it
   *
   * @param {(result: R, task: T) => void} listener
   * @returns {this}
   */
  success(listener) {
    this.successListeners.push(listener);
    return this;
  }

  /**
   * Removes success listener.
   *
   * @param {(result: R, task: T) => void} listener
   * @returns {this}
   */
  removeSuccessListener(listener) {
    const index = this.successListeners.indexOf(listener);
    if (index >= 0) {
      this.successListeners.splice(index, 1);
    }
    return this;
  }

  /**
   * Adds error listener.
   * Use `queue.removeFailureListener(listener)` to remove it
   *
   * @param {(error: unknown, task: T) => void} listener
   * @returns {this}
   */
  failure(listener) {
    this.failureListeners.push(listener);
    return this;
  }

  /**
   * Removes error listener.
   *
   * @param {(error: unknown, task: T) => void} listener
   * @returns {this}
   */
  removeFailureListener(listener) {
    const index = this.failureListeners.indexOf(listener);
    if (index >= 0) {
      this.failureListenerssuccessListeners.splice(index, 1);
    }
    return this;
  }

  /**
   * Adds done listener.
   * Use `queue.removeDoneListener(listener)` to remove it
   *
   * @param {(error: unknown, result: R, task: T) => void} listener
   * @returns {this}
   */
  done(listener) {
    this.doneListeners.push(listener);
    return this;
  }

  /**
   * Removes done listener.
   *
   * @param {(error: unknown, result: R, task: T) => void} listener
   * @returns {this}
   */
  removeDoneListener(listener) {
    const index = this.doneListeners.indexOf(listener);
    if (index >= 0) {
      this.doneListenerssuccessListeners.splice(index, 1);
    }
    return this;
  }

  /**
 * Adds drain listener. Use `queue.removeDrainListener(listener)` to remove it
 *
 * @param {() => void} listener
 * @returns {this}
 */
  drain(listener) {
    this.drainListeners.push(listener);
    return this;
  }

  /**
   * Removes drain listener.
   *
   * @param {() => void} listener
   * @returns {this}
   */
  removeDrainListener(listener) {
    const index = this.drainListeners.indexOf(listener);
    if (index >= 0) {
      this.drainListenerssuccessListeners.splice(index, 1);
    }
    return this;
  }

  /** @private */
  _consume() {
    this.count += 1;
  }

  /** @private */
  _release() {
    this.count -= 1;
  }

  /** @private */
  _hasChannel() {
    return this.count < this.concurency;
  }

  /** @private */
  _isIdle() {
    return this.count === 0;
  }

  /** @private */
  _isNoWaitingTask() {
    return this.waiting.length === 0;
  }

  /** @private */
  _notifyProcessResult(error, result, task) {
    if (error != null) {
      this._notifyFailure(error, task);
    } else {
      this._notifySuccess(result, task);
    }

    this._notifyDone(error, result, task);
  }

  /** @private */
  _notifyDone(error, result, task) {
    this.doneListeners.forEach(
      (listener) => listener(error, result, task)
    );
  }

  /** @private */
  _notifySuccess(result, task) {
    this.successListeners.forEach(
      (listener) => listener(result, task)
    );
  }

  /** @private */
  _notifyFailure(error, task) {
    this.failureListeners.forEach(
      (listener) => listener(error, task)
    );
  }

  /** @private */
  _isDrain() {
    return this._isIdle() && this._isNoWaitingTask();
  }

  /** @private */
  _notifyDrain() {
    if (this._isDrain()) {
      this.drainListeners.forEach((listener) => listener());
    }
  }

  /** @private */
  _extractTask() {
    return this.waiting.shift();
  }

  /**
   * @private
   *
   * @param {T} task
   * @returns {void}
   */
  _run(task) {
    this._consume();

    this.runTask(task, (error, result) => {
      this._release();
      this._notifyProcessResult(error, result, task);
      this._next();
    });
  }

  /** @private */
  _next() {
    if (!this._hasChannel()) return;

    if (this._isNoWaitingTask()) {
      this._notifyDrain();
      return;
    }

    const task = this._extractTask();

    if (task == null) {
      this._nextAsync();
      return;
    }

    this._run(task);
  }

  /** @private */
  _nextAsync() {
    setTimeout(() => this._next(), 0);
  }
}

// Usage

/**
 * @typedef Task
 * @property {string} name
 * @property {number} interval
 */

/**
 * @param {Task} task
 * @param {TaskCallback<boolean>} cb
 */
const job = (task, cb) => {
  // eslint-disable-next-line no-use-before-define
  const { count, concurency, waiting } = queue.stats();

  console.log(
    `Started ${task.name}, count: ${count}/${concurency}, waiting: ${waiting}`
  );
  const result = task.interval % 2000 > 0;
  setTimeout(() => cb(null, result), task.interval);
};

const queue = Queue
  .process(job, { concurency: 3 })
  .done((err, res, task) => {
    const { count, concurency, waiting } = queue.stats();
    console.log(
      `Done: ${task.name}, count: ${count}/${concurency}, waiting: ${waiting}`
    );
  })
  .success((res, task) => {
    console.log(`Successful Result of ${task.name}: ${res}`);
  })
  .failure((err, task) => console.log(`Failure of ${task.name}:`, err))
  .drain(() => console.log('Queue drain'));

for (let i = 0; i < 10; i++) {
  queue.add({ name: `Task${i}`, interval: i * 1000 });
}
