const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class Transfer extends Abstract {
    async handle({ to: user, from, amount }, blockNum) {
        if (await this._isInBlackList(from, user)) {
            return;
        }

        const model = new Event({
            blockNum,
            user,
            eventType: 'transfer',
            fromUsers: [from],
            amount,
        });

        await model.save();

        this.emit('registerEvent', user, model.toObject());
    }
}

module.exports = Transfer;
