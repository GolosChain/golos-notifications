const Event = require('../model/Event');
const core = require('griboyedov');
const logger = core.Logger;
const stats = core.Stats.client;
const BasicService = core.service.Basic;
const BlockSubscribe = core.service.BlockSubscribe;
const BlockSubscribeRestore = core.service.BlockSubscribeRestore;

class Registrator extends BasicService {
    async start() {
        await this.restore();

        const subscribe = new BlockSubscribe();

        this.addNested(subscribe);

        await subscribe.start((data, blockNum) => {
            this._restorer.trySync(data, blockNum);
            this._handleBlock(data, blockNum);
        });
    }

    async stop() {
        await this.stopNested();
    }

    async restore() {
        this._restorer = new BlockSubscribeRestore(
            Event,
            this._handleBlock.bind(this),
            this._handleBlockError.bind(this)
        );

        this.addNested(this._restorer);

        await this._restorer.start();
    }

    _handleBlockError(error) {
        stats.increment('block_registration_error');
        logger.error(`Load block error - ${error}`);
        process.exit(1);
    }

    _handleBlock(data, blockNum) {
        for (let transaction of data.transactions) {
            for (let operation of transaction.operations) {
                this._routeEventHandlers(operation, blockNum).catch(error => {
                    logger.error(`Event handler error - ${error}`);
                    process.exit(1);
                });
            }
        }

        this.emit('blockDone');
    }

    async _routeEventHandlers([type, body], blockNum) {
        switch (type) {
            case 'vote':
                await this._handleVoteAndFlag(body, blockNum);
                break;

            case 'transfer':
                await this._handleTransfer(body, blockNum);
                break;

            case 'comment':
                await this._handleReply(body, blockNum);
                break;

            case 'custom_json':
                await this._handleSubscribeOrUnsubscribe(body, blockNum);
                await this._handleRepost(body, blockNum);
                break;
        }
    }

    async _handleVoteAndFlag({ voter, author: user, permlink, weight }, blockNum) {
        if (weight === 0) {
            return;
        }

        let type;

        if (weight > 0) {
            type = 'vote';
        } else {
            type = 'flag';
        }

        this.emit(type, user, voter, permlink);

        let model = await Event.findOne({ eventType: type, user, permlink });

        if (model) {
            await Event.findOneAndUpdate(
                { _id: model._id },
                {
                    $inc: { counter: 1 },
                    $push: { fromUsers: voter },
                    $set: { fresh: true },
                }
            );
        } else {
            model = new Event({
                blockNum,
                user,
                eventType: type,
                counter: 1,
                permlink: permlink,
                fromUsers: [voter],
            });
            await model.save();
        }
    }

    async _handleTransfer({ to: user, from, amount }, blockNum) {
        amount = parseFloat(amount);

        this.emit('transfer', user, from, amount);

        const model = new Event({
            blockNum,
            user,
            eventType: 'transfer',
            fromUsers: [from],
            amount,
        });

        await model.save();
    }

    async _handleReply(
        { parent_author: user, parent_permlink: parentPermlink, author, permlink },
        blockNum
    ) {
        if (!user) {
            return;
        }

        this.emit('reply', user, author, permlink);

        let model = await Event.findOne({
            eventType: 'reply',
            user,
            parentPermlink,
        });

        if (model) {
            await Event.findOneAndUpdate(
                { _id: model._id },
                {
                    $inc: { counter: 1 },
                    $push: { fromUsers: author },
                    $set: { fresh: true },
                }
            );
        } else {
            model = new Event({
                blockNum,
                user,
                eventType: 'reply',
                counter: 1,
                permlink,
                parentPermlink,
                fromUsers: [author],
            });
        }

        await model.save();
    }

    async _handleSubscribeOrUnsubscribe(rawData, blockNum) {
        const { eventType, user, follower } = this._tryExtractSubscribe(rawData);

        if (!user) {
            return;
        }

        this.emit(eventType, user, follower);

        await this._saveSubscribe({eventType, user, follower}, blockNum);
    }

    _tryExtractSubscribe(rawData) {
        const { type, user: follower, data } = this._parseCustomJson(rawData);

        if (type !== 'follow') {
            return {};
        }

        try {
            if (data[0] !== 'follow') {
                return {};
            }

            const actionTypes = data[1].what;
            const user = data[1].following;
            let eventType;

            if (~actionTypes.indexOf('blog')) {
                eventType = 'subscribe';
            } else {
                eventType = 'unsubscribe';
            }

            return { eventType, user, follower };
        } catch (error) {
            logger.log(`Bad follow from - ${follower}`);
            return {};
        }
    }

    async _saveSubscribe({eventType, user, follower}, blockNum) {
        // TODO -
    }

    async _handleRepost(rawData, blockNum) {
        const { user, reposter, permlink } = this._tryExtractRepost(rawData);

        if (!user) {
            return;
        }

        this.emit('repost', user, reposter, permlink);

        await this._saveRepost({user, reposter, permlink}, blockNum);
    }

    _tryExtractRepost(rawData) {
        const { type, user: reposter, data } = this._parseCustomJson(rawData);

        if (type !== 'follow') {
            return {};
        }

        try {
            if (data[0] !== 'reblog') {
                return {};
            }

            const {author: user, permlink} = data[1];

            return {user, reposter, permlink};
        } catch (error) {
            logger.log(`Bad repost from - ${reposter}`);
            return {};
        }
    }

    async _saveRepost({user, reposter, permlink}, blockNum) {
        // TODO -
    }

    async _handleMention(data, blockNum) {
        // TODO ---
    }

    async _handleAward(data, blockNum) {
        // TODO wait blockchain implementation
    }

    async _handleCuratorAward(data, blockNum) {
        // TODO wait blockchain implementation
    }

    async _handleMessage(data, blockNum) {
        // TODO wait blockchain implementation
        // TODO filtrate from transactions
    }

    _parseCustomJson(rawData) {
        const type = rawData.id;
        const user = rawData.required_posting_auths[0];
        let data;

        try {
            data = JSON.parse(rawData.json);
        } catch (error) {
            logger.log(`Bad custom JSON from - ${user}`);
            return {};
        }

        return { type, user, data };
    }
}

module.exports = Registrator;
