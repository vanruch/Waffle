import {arrayIntersection} from './utils';
import overwriteBigNumberFunction from './matchers/overwriteBigNumberFunction';

const solidity = (chai, utils) => {
  const {Assertion} = chai;

  Assertion.overwriteMethod('equal', (_super) => overwriteBigNumberFunction('eq', 'equal', _super, utils));
  Assertion.overwriteMethod('eq', (_super) => overwriteBigNumberFunction('eq', 'equal', _super, utils));
  Assertion.overwriteMethod('above', (_super) => overwriteBigNumberFunction('gt', 'above', _super, utils));
  Assertion.overwriteMethod('below', (_super) => overwriteBigNumberFunction('lt', 'below', _super, utils));
  Assertion.overwriteMethod('least', (_super) => overwriteBigNumberFunction('gte', 'at least', _super, utils));
  Assertion.overwriteMethod('most', (_super) => overwriteBigNumberFunction('lte', 'at most', _super, utils));

  Assertion.addProperty('reverted', function () {
    /* eslint-disable no-underscore-dangle */
    const promise = this._obj;
    const derivedPromise = promise.then(
      (value) => {
        this.assert(false,
          'Expected transaction to be reverted',
          'Expected transaction NOT to be reverted',
          'not reverted',
          'reverted');
        return value;
      },
      (reason) => {
        this.assert(reason.toString().search('revert') >= 0,
          `Expected transaction to be reverted, but other exception was thrown: ${reason}`,
          'Expected transaction NOT to be reverted',
          'Reverted',
          reason);
        return reason;
      }
    );
    this.then = derivedPromise.then.bind(derivedPromise);
    this.catch = derivedPromise.catch.bind(derivedPromise);
    return derivedPromise;
  });

  const filterLogsWithTopics = (logs, topics) =>
    logs.filter((log) => arrayIntersection(topics, log.topics).length > 0);

  Assertion.addMethod('emit', function (contract, eventName) {
    /* eslint-disable no-underscore-dangle */
    const promise = this._obj;
    const derivedPromise = promise.then((tx) =>
      contract.provider.getTransactionReceipt(tx.hash)
    ).then((receipt) => {
      const {topics} = contract.interface.events[eventName];
      this.logs = filterLogsWithTopics(receipt.logs, topics);
      if (this.logs.length < 1) {
        this.assert(false,
          `Expected event "${eventName}" to emitted, but wasn't`,
          `Expected event "${eventName}" NOT to emitted, but it was`,
          eventName,
          '');
      }
    });
    this.then = derivedPromise.then.bind(derivedPromise);
    this.catch = derivedPromise.catch.bind(derivedPromise);
    this.promise = derivedPromise;
    this.contract = contract;
    this.eventName = eventName;
    return this;
  });

  const assertArgsArraysEqual = (context, expectedArgs, actualArgs) => {
    context.assert(actualArgs.length === expectedArgs.length,
      `Expected "${context.eventName}" event to have ${expectedArgs.length} argument(s), but has ${actualArgs.length}`,
      `Do not combine .not. with .withArgs()`,
      expectedArgs.length,
      actualArgs.length);
    for (let index = 0; index < expectedArgs.length; index++) {
      new chai.Assertion(expectedArgs[index]).equal(actualArgs[index]);
    }
  };

  Assertion.addMethod('withArgs', function (...expectedArgs) {
    const derivedPromise = this.promise.then(() => {
      const event = this.contract.interface.events[this.eventName];
      const [{topics}] = this.logs;
      const [{data}] = this.logs;
      const actualArgs = event.parse(topics, data);
      assertArgsArraysEqual(this, expectedArgs, actualArgs);
    });
    this.then = derivedPromise.then.bind(derivedPromise);
    this.catch = derivedPromise.catch.bind(derivedPromise);
    return this;
  });

  Assertion.addProperty('properAddress', function () {
    /* eslint-disable no-underscore-dangle */
    const subject = this._obj;
    this.assert(/^0x[0-9-a-fA-F]{40}$/.test(subject),
      `Expected "${subject}" to be a proper address`,
      `Expected "${subject}" not to be a proper address`,
      'proper address (eg.: 0x1234567890123456789012345678901234567890)',
      subject);
  });

  Assertion.addProperty('properPrivateKey', function () {
    /* eslint-disable no-underscore-dangle */
    const subject = this._obj;
    this.assert(/^0x[0-9-a-fA-F]{64}$/.test(subject),
      `Expected "${subject}" to be a proper private key`,
      `Expected "${subject}" not to be a proper private key`,
      'proper address (eg.: 0x1234567890123456789012345678901234567890)',
      subject);
  });

  Assertion.addMethod('properHex', function (length) {
    /* eslint-disable no-underscore-dangle */
    const subject = this._obj;
    const regexp = new RegExp(`^0x[0-9-a-fA-F]{${length}}$`);
    this.assert(regexp.test(subject),
      `Expected "${subject}" to be a proper hex of length ${length}`,
      `Expected "${subject}" not to be a proper hex of length ${length}, but it was`,
      'proper address (eg.: 0x1234567890123456789012345678901234567890)',
      subject);
  });
};

export default solidity;
