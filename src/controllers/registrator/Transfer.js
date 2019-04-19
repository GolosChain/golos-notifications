const Abstract = require('./Abstract');
const Event = require('../../models/Event');
const core = require('gls-core-service');
const BigNum = core.types.BigNum;

// const TRANSFER_ACTION_RECEIVER = 'cyber.token';
// const TRANSFER_ACTION_ACTOR = 'gls.issuer';
// const REWARD_ACTION_ACTOR = 'gls.publish';

class Transfer extends Abstract {
    async handle(
        { to: user, from, quantity, receiver, refBlockNum, memo },
        blockNum,
        transactionId
    ) {
        await this.waitForTransaction(transactionId);

        const amount = this._calculateAmount(quantity);

        if (await this._isInBlackList(from, user)) {
            return;
        }

        let type = 'transfer';
        let actor;
        let post;

        if (from === 'gls.publish' && user === 'gls.vesting') {
            // send to and reward type
            memo = memo.split(';');

            // username
            user = memo[0].split(': ')[1];

            // reward type and post id
            memo = memo[1].split('reward for post ');

            if (memo[0] === ' author') {
                type = 'reward';
            } else {
                type = 'curatorReward';
            }

            memo = memo[1].split(':');

            const contentId = {
                userId: memo[0],
                refBlockNum: memo[2],
                permlink: memo[1],
            };

            try {
                const response = await this.callPrismService({
                    contentId,
                });
                post = response.comment || response.post;
            } catch (error) {
                return;
            }

            actor = {
                id: from,
            };
        } else {
            try {
                const response = await this.callPrismService({ userId: from });
                actor = response.user;
            } catch (error) {
                return;
            }
        }

        const model = new Event({
            blockNum,
            refBlockNum,
            user,
            post,
            eventType: type,
            fromUsers: [from],
            actor,
            value: {
                amount,
                // TODO: wait for multiple currencies support
                currency: 'GLS',
            },
        });

        await model.save();

        this.emit('registerEvent', user, model.toObject());
    }

    _calculateAmount(quantity) {
        return new BigNum(quantity.amount).shiftedBy(-quantity.decs).toString();
    }
}

module.exports = Transfer;
