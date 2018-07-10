const core = require('griboyedov');
const MongoDB = core.service.MongoDB;

module.exports = MongoDB.makeModel(
    'Event',
    {
        createdAt: {
            type: Date,
            default: Date.now,
        },
        updatedAt: {
            type: Date,
            default: Date.now,
        },
        blockNum: {
            type: Number,
            required: true,
        },
        user: {
            type: String,
            required: true,
        },
        eventType: {
            // vote | flag | transfer | reply | subscribe | unsubscribe
            // mention | repost | award | curatorAward | message
            type: String,
            required: true,
        },
        fresh: {
            type: Boolean,
            default: true,
        },
        // not used for transfer
        counter: {
            type: Number,
            default: 1,
        },

        /* Type-specified fields */

        // vote | flag | reply | mention | repost | award | curatorAward
        permlink: {
            type: String,
        },
        // vote | flag | transfer | reply | subscribe | unsubscribe
        // mention | repost | message
        fromUsers: {
            type: [String],
        },
        // transfer
        amount: {
            type: Number,
        },
        // award | curatorAward
        award: {
            golos: {
                type: Number,
            },
            golosPower: {
                type: Number,
            },
            gbg: {
                type: Number,
            },
        },
    },
    {
        index: [
            // History request
            {
                fields: {
                    user: 1,
                    type: 1,
                },
            },
            // Cleaner
            {
                fields: {
                    date: -1,
                },
            },
            // Restorer
            {
                fields: {
                    blockNum: -1,
                },
            },
        ],
    }
);