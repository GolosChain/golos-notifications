const Abstract = require('./Abstract');
const Event = require('../../models/Event');
const core = require('gls-core-service');
const Logger = core.utils.Logger;

class Subscribe extends Abstract {
    static async handle(rawData, blockNum) {
        const { eventType, user, follower } = this._tryExtractSubscribe(rawData);

        if (!user || user === follower) {
            return;
        }

        this.emit(eventType, user, { follower });

        await this._saveSubscribe({ eventType, user, follower }, blockNum);
    }

    static _tryExtractSubscribe(rawData) {
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
            Logger.log(`Bad follow from - ${follower}`);
            return {};
        }
    }

    static async _saveSubscribe({ eventType, user, follower }, blockNum) {
        const model = new Event({
            blockNum,
            user,
            eventType,
            fromUsers: [follower],
        });

        await model.save();
    }
}

module.exports = Subscribe;