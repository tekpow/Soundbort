import * as Discord from "discord.js";

import * as models from "../../modules/database/models";
import { SoundboardEntranceSchema } from "../../modules/database/schemas/SoundboardEntranceSchema";

class EntranceManager {
    async addEntrance(userId: Discord.Snowflake, sampleId: string): Promise<void> {
        await models.entrances.insertOne(
            { userId, customSampleId: sampleId }
        );
    }

    async removeEntrance(userId: Discord.Snowflake, sampleId: string): Promise<void> {
        await models.entrances.deleteOne(
            { userId, customSampleId: sampleId },
        );
    }

    async findUserEntrance(userId: Discord.Snowflake): Promise<SoundboardEntranceSchema | null> {
        // TODO: renvoyer que les samples dont il a accès
        let entrance = await models.entrances.findOne({ userId });
        if (!entrance)
            return null;

        return entrance;
    }
}

export default new EntranceManager();
